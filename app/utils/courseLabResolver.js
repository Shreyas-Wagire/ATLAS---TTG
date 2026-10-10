/**
 * courseLabResolver.js — ATLAS v5.5 Course-Aware Lab Resource Resolver
 *
 * Implements the deterministic Course → Lab mapping pipeline:
 *
 *   LOAD course (P > 0)
 *     → Find in Location / Mapped Courses         → PRIMARY lab
 *     → Primary unavailable? Find compatible lab  → FALLBACK lab
 *     → User override                             → MANUAL
 *     → No compatible lab found                   → UNRESOLVED
 *
 * Resource States:
 *   MAPPED      — primary mapped laboratory assigned
 *   FALLBACK    — primary unavailable; compatible fallback assigned
 *   MANUAL      — user explicitly changed the laboratory
 *   UNRESOLVED  — no valid compatible resource available
 *   UNMAPPED    — course exists in LOAD with P>0 but has no Location mapping
 *
 * Diagnostics:
 *   RESOURCE_MAPPING_MISSING    — practical course has no Mapped Courses entry
 *   RESOURCE_UNAVAILABLE        — primary exists but cannot be scheduled
 *   FALLBACK_ASSIGNED           — primary unavailable; compatible fallback selected
 *   RESOURCE_UNRESOLVED         — no valid compatible resource found
 *   MAPPED_BUT_NOT_IN_LOAD      — mapping exists but course absent from LOAD (info only)
 *   MANUAL_RESOURCE_OVERRIDE    — user changed the laboratory
 *
 * HARD RULES:
 *   - Only courses present in LOAD may receive lab allocations.
 *   - Location/Mapped Courses NEVER creates courses.
 *   - A fallback lab MUST meet MIN_COMPATIBILITY_SCORE threshold.
 *   - NEVER assign a random free lab; UNRESOLVED is the correct state.
 *   - Manual overrides persist across rerenders/CASC unless explicitly cleared.
 */

import {
    getPrimaryLabForCourse,
    findCompatibleFallbackLabs,
    computeLabCompatibilityScore,
    normaliseCourseName,
    courseNamesMatch,
    MIN_COMPATIBILITY_SCORE,
} from "./parseLocationSheet.js";

// ── Resource Status Constants ─────────────────────────────────────────────────

export const LAB_STATUS = {
    MAPPED:     "MAPPED",
    FALLBACK:   "FALLBACK",
    MANUAL:     "MANUAL",
    UNRESOLVED: "UNRESOLVED",
    UNMAPPED:   "UNMAPPED",     // P>0 but no location mapping exists
};

export const DIAGNOSTIC = {
    RESOURCE_MAPPING_MISSING: "RESOURCE_MAPPING_MISSING",
    RESOURCE_UNAVAILABLE:     "RESOURCE_UNAVAILABLE",
    FALLBACK_ASSIGNED:        "FALLBACK_ASSIGNED",
    RESOURCE_UNRESOLVED:      "RESOURCE_UNRESOLVED",
    MAPPED_BUT_NOT_IN_LOAD:   "MAPPED_BUT_NOT_IN_LOAD",
    MANUAL_RESOURCE_OVERRIDE:  "MANUAL_RESOURCE_OVERRIDE",
};

// ── Build Course Lab Resolution Map ──────────────────────────────────────────

/**
 * Build a deterministic course → lab resolution for all practical courses in LOAD.
 *
 * This is called ONCE before timetable generation and produces a per-course
 * resolution record that the scheduler uses for every practical session.
 *
 * @param {Object[]} loadSubjects    - Parsed subjects from LOAD (parseLoadSheet)
 * @param {Object}   locationData   - Parsed location data (parseLocationSheet)
 * @returns {Object} Resolution map and diagnostics
 *   {
 *     resolutions: {
 *       [courseName]: {
 *         courseName:       string,
 *         primaryLab:       string|null,    // Lab Initial from Location
 *         assignedLab:      string|null,    // What will actually be used
 *         status:           LAB_STATUS,
 *         compatibleLabs:   string[],       // All compatible lab initials (incl. primary)
 *         fallbackOptions:  Array<{labInitial, score}>,
 *         diagnostics:      string[],       // DIAGNOSTIC keys
 *         diagnosticReason: string,         // Human-readable explanation
 *       }
 *     },
 *     diagnostics:        Object[],         // All diagnostic events
 *     mappedButNotInLoad: Object[],         // Info-only: mapped courses not in LOAD
 *   }
 */
export function buildCourseLabResolutions(loadSubjects, locationData) {
    const resolutions = {};
    const allDiagnostics = [];
    const mappedButNotInLoad = [];

    // Build a Set of active course names from LOAD (the only truth)
    const activeCourseNames = new Set(
        (loadSubjects || []).map((s) => normaliseCourseName(s.courseName))
    );

    // ── Check MAPPED_BUT_NOT_IN_LOAD ────────────────────────────────────────
    if (locationData?.labs) {
        for (const lab of locationData.labs) {
            for (const mappedCourse of lab.mappedCourses) {
                const norm = normaliseCourseName(mappedCourse);
                // Check if this mapped course is active in LOAD
                const isInLoad = Array.from(activeCourseNames).some((n) =>
                    courseNamesMatch(n, norm)
                );
                if (!isInLoad) {
                    mappedButNotInLoad.push({
                        courseName:   mappedCourse,
                        labName:      lab.labName,
                        labInitial:   lab.labInitial,
                        diagnostic:   DIAGNOSTIC.MAPPED_BUT_NOT_IN_LOAD,
                        reason:       `"${mappedCourse}" is mapped to lab "${lab.labInitial}" but does NOT exist in LOAD. It will never be scheduled.`,
                    });
                }
            }
        }
    }

    // ── Resolve each practical course in LOAD ───────────────────────────────
    for (const subject of (loadSubjects || [])) {
        if (!subject.P || Number(subject.P) <= 0) continue; // Only practical courses

        const courseName  = normaliseCourseName(subject.courseName);
        if (!courseName) continue;

        // Skip if already resolved (same course may appear in multiple year rows)
        if (resolutions[courseName]) continue;

        const primaryLab = getPrimaryLabForCourse(courseName, locationData);
        const diagnostics = [];
        let assignedLab    = null;
        let status         = LAB_STATUS.UNRESOLVED;
        let diagnosticReason = "";
        let fallbackOptions  = [];
        let compatibleLabs   = [];

        if (!primaryLab) {
            // No mapping in Location → UNMAPPED
            status = LAB_STATUS.UNMAPPED;
            diagnostics.push(DIAGNOSTIC.RESOURCE_MAPPING_MISSING);
            diagnosticReason = `Course "${courseName}" has P=${subject.P} but no Mapped Courses entry in the Location sheet. Lab must be manually assigned.`;
            allDiagnostics.push({
                course:    courseName,
                faculty:   null,
                P:         subject.P,
                primaryLab: null,
                assignedLab: null,
                status,
                diagnostic: DIAGNOSTIC.RESOURCE_MAPPING_MISSING,
                reason:    diagnosticReason,
            });
        } else {
            // Primary lab found
            assignedLab = primaryLab;
            status      = LAB_STATUS.MAPPED;
            diagnosticReason = `Course "${courseName}" mapped to primary lab "${primaryLab}".`;

            // Pre-compute compatible fallback labs (sorted by score, excluding primary)
            const fallbacks = findCompatibleFallbackLabs(courseName, primaryLab, locationData);
            fallbackOptions = fallbacks.map((f) => ({
                labInitial: f.labEntry.labInitial,
                labName:    f.labEntry.labName,
                score:      f.score,
            }));

            // Compatible labs = primary + valid fallbacks
            compatibleLabs = [primaryLab, ...fallbackOptions.map((f) => f.labInitial)];
        }

        resolutions[courseName] = {
            courseName,
            originalCourseName: subject.courseName,
            primaryLab,
            assignedLab,
            status,
            compatibleLabs,
            fallbackOptions,
            diagnostics,
            diagnosticReason,
            manualOverride: null, // Set when user manually changes lab
        };
    }

    return { resolutions, diagnostics: allDiagnostics, mappedButNotInLoad };
}

/**
 * Get the primary lab initial for a course from the pre-built resolution map.
 *
 * @param {string} courseName  - Course name (will be normalised)
 * @param {Object} resolutions - From buildCourseLabResolutions()
 * @returns {string|null}
 */
export function getResolutionForCourse(courseName, resolutions) {
    if (!courseName || !resolutions) return null;
    const norm = normaliseCourseName(courseName);

    // Direct key match
    if (resolutions[norm]) return resolutions[norm];

    // Loose match (handle minor discrepancies between LOAD and session pool names)
    for (const [key, res] of Object.entries(resolutions)) {
        if (courseNamesMatch(norm, key)) return res;
    }
    return null;
}

/**
 * Resolve the lab to assign for a practical session at scheduling time.
 *
 * Priority:
 *   1. MANUAL override (user selected) — persist unless invalid
 *   2. Primary mapped lab (if available)
 *   3. Compatible fallback lab (best score, available)
 *   4. UNRESOLVED
 *
 * @param {string}   courseName        - Course name
 * @param {Object}   resolution        - Resolution record for this course
 * @param {Object}   locationData      - Parsed location data
 * @param {Function} isLabAvailable    - (labInitial, day, slot) => boolean
 * @param {string}   day               - Scheduling day
 * @param {number}   slot              - Scheduling slot
 * @returns {{ labInitial: string|null, status: string, reason: string }}
 */
export function resolveLabForSlot(courseName, resolution, locationData, isLabAvailable, day, slot) {
    if (!resolution) {
        return {
            labInitial: null,
            status:     LAB_STATUS.UNRESOLVED,
            reason:     `No resolution record for course "${courseName}".`,
        };
    }

    // 1. Manual override takes absolute priority
    if (resolution.manualOverride) {
        const { labInitial } = resolution.manualOverride;
        if (isLabAvailable(labInitial, day, slot)) {
            return {
                labInitial,
                status: LAB_STATUS.MANUAL,
                reason: `User-selected lab "${labInitial}" is available.`,
            };
        }
        // Manual override conflicts — do NOT silently revert; caller must handle
        return {
            labInitial: null,
            status:     LAB_STATUS.UNRESOLVED,
            reason:     `User-selected lab "${labInitial}" (MANUAL OVERRIDE) is unavailable at ${day} slot ${slot + 1}.`,
            manualConflict: true,
        };
    }

    // 2. No primary lab mapping
    if (!resolution.primaryLab) {
        return {
            labInitial: null,
            status:     LAB_STATUS.UNMAPPED,
            reason:     `Course "${courseName}" has no lab mapping in Location sheet.`,
        };
    }

    // 3. Try primary lab
    if (isLabAvailable(resolution.primaryLab, day, slot)) {
        return {
            labInitial: resolution.primaryLab,
            status:     LAB_STATUS.MAPPED,
            reason:     `Primary lab "${resolution.primaryLab}" is available.`,
        };
    }

    // 4. Primary unavailable — try fallbacks in order
    for (const { labInitial, labName, score } of (resolution.fallbackOptions || [])) {
        if (isLabAvailable(labInitial, day, slot)) {
            return {
                labInitial,
                status: LAB_STATUS.FALLBACK,
                reason: `Primary lab "${resolution.primaryLab}" unavailable at ${day} slot ${slot + 1}. ` +
                        `Compatible fallback "${labInitial}" (${labName}, score ${score}) assigned.`,
                primaryLab:  resolution.primaryLab,
                fallbackLab: labInitial,
            };
        }
    }

    // 5. UNRESOLVED
    return {
        labInitial: null,
        status:     LAB_STATUS.UNRESOLVED,
        reason:     `Primary lab "${resolution.primaryLab}" and all compatible fallbacks are unavailable ` +
                    `for course "${courseName}" at ${day} slot ${slot + 1}. ` +
                    `Fallbacks checked: [${(resolution.fallbackOptions || []).map((f) => f.labInitial).join(", ")}].`,
    };
}

/**
 * Validate a user's manual lab change request.
 *
 * Validates:
 *   - The lab exists in Location
 *   - The lab is compatible with the course (score >= threshold)
 *   - The lab is available (both practical hours)
 *   - No other hard constraints are violated
 *
 * @param {string}   courseName     - Course name
 * @param {string}   newLabInitial  - Proposed new lab
 * @param {Object}   resolution     - Existing resolution for the course
 * @param {Object}   locationData   - Parsed location data
 * @param {Function} isLabAvailable - (labInitial, day, slot) => boolean
 * @param {string}   day            - Scheduling day
 * @param {number}   slot           - Scheduling slot
 * @returns {{ valid: boolean, reason: string }}
 */
export function validateManualLabChange(
    courseName,
    newLabInitial,
    resolution,
    locationData,
    isLabAvailable,
    day,
    slot
) {
    if (!newLabInitial) {
        return { valid: false, reason: "No lab initial provided." };
    }

    // 1. Lab must exist in Location
    const normInitial = newLabInitial.toUpperCase().trim();
    const labEntry = locationData?.labsByInitial?.[normInitial];
    if (!labEntry) {
        return {
            valid: false,
            reason: `Lab "${newLabInitial}" does not exist in the Location sheet. Only configured laboratories may be assigned.`,
        };
    }

    // 2. Compatibility check
    const score = computeLabCompatibilityScore(courseName, labEntry);
    // Direct mapping to this lab always valid (score 1000)
    // Otherwise must meet minimum threshold
    if (score < MIN_COMPATIBILITY_SCORE) {
        return {
            valid: false,
            reason: `Lab "${newLabInitial}" (${labEntry.labName}) is not compatible with course "${courseName}". ` +
                    `Compatibility score: ${score} (minimum required: ${MIN_COMPATIBILITY_SCORE}). ` +
                    `Only laboratories whose features or name match the course may be assigned.`,
        };
    }

    // 3. Availability check (both hours of the 2-hour practical)
    if (!isLabAvailable(newLabInitial, day, slot)) {
        return {
            valid: false,
            reason: `Lab "${newLabInitial}" is already occupied at ${day} slot ${slot + 1}-${slot + 2}.`,
        };
    }

    return {
        valid: true,
        reason: `Lab "${newLabInitial}" (${labEntry.labName}) is compatible (score ${score}) and available.`,
    };
}

/**
 * Apply a validated manual lab change to a resolution record.
 * Returns a new resolution object (does not mutate).
 *
 * @param {Object} resolution   - Current resolution
 * @param {string} newLabInitial - The new lab chosen by the user
 * @param {string} labName       - Full lab name
 * @returns {Object} Updated resolution
 */
export function applyManualLabOverride(resolution, newLabInitial, labName) {
    return {
        ...resolution,
        assignedLab: newLabInitial,
        status:      LAB_STATUS.MANUAL,
        manualOverride: { labInitial: newLabInitial, labName },
        diagnostics: [...(resolution.diagnostics || []), DIAGNOSTIC.MANUAL_RESOURCE_OVERRIDE],
        diagnosticReason: `User manually selected lab "${newLabInitial}" (${labName}).`,
    };
}

/**
 * Generate the Resource Resolution Preview table.
 *
 * Returns rows for each practical course in LOAD showing:
 *   Course | Faculty | P | Primary Lab | Assigned Lab | Status
 *
 * @param {Object[]} loadSubjects    - Parsed LOAD subjects
 * @param {Object}   resolutions     - From buildCourseLabResolutions()
 * @param {Object}   mappedButNotInLoad - From buildCourseLabResolutions()
 * @returns {Object[]} preview rows
 */
export function generateResourceResolutionPreview(loadSubjects, resolutions, mappedButNotInLoad = []) {
    const rows = [];
    const seen = new Set();

    for (const subject of (loadSubjects || [])) {
        if (!subject.P || Number(subject.P) <= 0) continue;

        const courseName = normaliseCourseName(subject.courseName);
        if (seen.has(courseName)) continue;
        seen.add(courseName);

        const res = getResolutionForCourse(courseName, resolutions);

        // Collect faculties across all divisions/batches
        const faculties = new Set();
        if (subject.divisions) {
            Object.values(subject.divisions).forEach((f) => { if (f && String(f).trim()) faculties.add(String(f).trim()); });
        }
        if (subject.batches) {
            Object.values(subject.batches).forEach((f) => { if (f && String(f).trim()) faculties.add(String(f).trim()); });
        }

        rows.push({
            courseName: subject.courseName,
            faculty:    [...faculties].join(", ") || "—",
            P:          subject.P,
            primaryLab: res?.primaryLab || "—",
            assignedLab: res?.assignedLab || "—",
            status:     res?.status || LAB_STATUS.UNRESOLVED,
            reason:     res?.diagnosticReason || "",
            fallbackOptions: res?.fallbackOptions || [],
        });
    }

    // Append MAPPED_BUT_NOT_IN_LOAD as informational rows
    for (const entry of (mappedButNotInLoad || [])) {
        rows.push({
            courseName:  entry.courseName,
            faculty:     "—",
            P:           "—",
            primaryLab:  entry.labInitial,
            assignedLab: "—",
            status:      "MAPPED_BUT_NOT_IN_LOAD",
            reason:      entry.reason,
            fallbackOptions: [],
            infoOnly:    true,
        });
    }

    return rows;
}

/**
 * Calculate DAPS resource pressure score for a course.
 * A practical with only one feasible laboratory has HIGHER scheduling pressure
 * than one with multiple compatible resources.
 *
 * @param {Object} resolution - Resolution record for the course
 * @returns {number} pressure score (higher = more pressure = schedule first)
 */
export function getLabResourcePressureScore(resolution) {
    if (!resolution) return 0;
    if (resolution.status === LAB_STATUS.UNMAPPED) return 0;
    if (resolution.status === LAB_STATUS.UNRESOLVED) return 0;

    const compatibleCount = (resolution.compatibleLabs || []).length;
    if (compatibleCount === 0) return 1000; // Maximum pressure
    if (compatibleCount === 1) return 500;  // Primary only, very constrained
    if (compatibleCount === 2) return 200;
    if (compatibleCount === 3) return 100;
    return Math.max(0, 50 - compatibleCount * 5);
}
