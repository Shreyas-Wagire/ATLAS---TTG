/**
 * practicalPacking.js — Maximum Parallel Practical Stacking for ATLAS
 *
 * Implements PRIORITY 2: PRACTICAL / BATCH SESSIONS
 *
 * PRIMARY OBJECTIVE: MAXIMIZE PARALLEL PRACTICAL STACKING ACROSS DIFFERENT COURSES
 *
 * Stack Priority:
 *    4 practicals
 *       ↓
 *    3 practicals
 *       ↓
 *    2 practicals
 *       ↓
 *    1 practical
 *
 * ABSOLUTE INVARIANTS:
 * - Practicals from DIFFERENT COURSES can and should be stacked in the same 2-hour slot.
 * - Course name alone is NEVER a conflict (cross-course stacking is preferred).
 * - Primary hard conflicts:
 *     FACULTY_CONFLICT        → Same faculty cannot be in the same stack or busy elsewhere.
 *     BATCH_CONFLICT          → Same batch cannot appear twice in the same window.
 *     RESOURCE_CONFLICT       → Each practical must have its own distinct, available lab.
 *     GLOBAL_SESSION_CONFLICT → Global / fixed sessions remain completely immutable.
 * - Stack size priority is ABSOLUTE (4 → 3 → 2 → 1). Never reduce 4 to 3 for scarcity.
 * - When multiple valid stacks have the SAME SIZE:
 *     1. Prefer the stack containing more DIFFERENT COURSES (cross-course preference).
 *     2. Tie-break using DAPS / RCAA faculty & batch scarcity (constrained faculty first).
 * - Atomic transaction commit.
 * - Structured logging [PracticalStacking].
 */

import { isRealFaculty } from "./collegeOccupancy.js";

const VALID_PRACTICAL_STARTS = [0, 2, 4];
const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];

/**
 * Generate combinations of an array of items of a given size k.
 */
export function getCombinations(arr, k) {
    if (k === 1) return arr.map((item) => [item]);
    if (k === arr.length) return [arr];
    if (k > arr.length) return [];

    const result = [];
    for (let i = 0; i <= arr.length - k; i++) {
        const head = arr[i];
        const tailCombos = getCombinations(arr.slice(i + 1), k - 1);
        for (const tail of tailCombos) {
            result.push([head, ...tail]);
        }
    }
    return result;
}

/**
 * Resolve division key for a session matching the master timetable keys.
 */
export function getDivisionKeyForSession(session, timetable = {}) {
    if (session.year && session.division) {
        const fullKey = `${session.year}-${session.division}`;
        if (timetable[fullKey]) return fullKey;
    }
    if (session.division) {
        if (timetable[session.division]) return session.division;
        const matchingKey = Object.keys(timetable).find((k) => k.endsWith(`-${session.division}`));
        if (matchingKey) return matchingKey;
    }
    const keys = Object.keys(timetable);
    if (keys.length === 1) return keys[0];
    return session.year && session.division ? `${session.year}-${session.division}` : (keys[0] || "DIV_DEFAULT");
}

/**
 * Calculate course diversity (number of distinct courses) in a candidate group.
 */
export function getCourseDiversity(combo) {
    const courses = new Set();
    for (const session of combo) {
        const course = session.subject || session.subjectName || session.courseCode || "COURSE";
        courses.add(String(course).trim().toUpperCase());
    }
    return courses.size;
}

/**
 * Calculate scarcity score for a candidate group.
 * Lower remaining windows = higher scarcity weight (more constrained).
 */
export function getComboScarcityScore(combo, collegeOccupancy, divKey, courseUnallocatedCounts = {}) {
    let score = 0;
    for (const s of combo) {
        const facScarcity = collegeOccupancy.calculateFacultyPracticalScarcity(s.faculty);
        const facWeight = Math.max(0, 15 - facScarcity);

        const batchScarcity = collegeOccupancy.calculateBatchPracticalScarcity(s.batch, divKey);
        const batchWeight = Math.max(0, 15 - batchScarcity);

        const priorityBonus = s.priorityScore || 0;
        const cKey = (s.subject || s.subjectName || s.courseCode || "").toUpperCase().trim();
        const backlogBonus = (courseUnallocatedCounts[cKey] || 0) * 1000;

        score += backlogBonus + facWeight * 10 + batchWeight * 2 + priorityBonus;
    }
    return score;
}

/**
 * Verify whether a candidate group of practical sessions can be scheduled together
 * in the given (day, slot) window.
 *
 * Checks primary hard conflicts:
 * - FACULTY_CONFLICT: Duplicate faculty within stack or faculty busy in college
 * - BATCH_CONFLICT: Duplicate batch within stack or batch busy / daily limit reached
 * - RESOURCE_CONFLICT: Required lab busy or insufficient available labs
 * - GLOBAL_SESSION_CONFLICT: Division slot blocked by immutable global session
 *
 * Returns { valid: boolean, assignedLabs: string[], conflictType: string|null, reason: string|null }
 */
export function validateCandidateGroup(group, day, slot, collegeOccupancy, divKey) {
    // 0. Global / Division check
    if (divKey && !collegeOccupancy.isDivisionFreeForPractical(divKey, day, slot)) {
        return {
            valid: false,
            assignedLabs: [],
            conflictType: "GLOBAL_SESSION_CONFLICT",
            reason: `Slot blocked by global or fixed reservation in ${divKey}`,
        };
    }

    // Must contain at least one practical session (tutorials only accompany practicals)
    if (!group.some((s) => s.type === "PRACTICAL")) {
        return {
            valid: false,
            assignedLabs: [],
            conflictType: "TUTORIAL_REQUIRES_LAB",
            reason: "Tutorials must accompany a practical session in the lab window",
        };
    }

    // 1. Batch conflict check: All batches must be distinct and free
    const batches = new Set();
    for (const session of group) {
        if (!session.batch) {
            return {
                valid: false,
                assignedLabs: [],
                conflictType: "BATCH_CONFLICT",
                reason: `Session ${session.subject} has no batch identifier`,
            };
        }
        if (batches.has(session.batch)) {
            return {
                valid: false,
                assignedLabs: [],
                conflictType: "BATCH_CONFLICT",
                reason: `Duplicate batch ${session.batch} in parallel stack`,
            };
        }
        batches.add(session.batch);

        if (!collegeOccupancy.isBatchFreeForPractical(session.batch, day, slot)) {
            return {
                valid: false,
                assignedLabs: [],
                conflictType: "BATCH_CONFLICT",
                reason: `Batch ${session.batch} already occupied at ${day} L${slot + 1}-L${slot + 2}`,
            };
        }

        if (collegeOccupancy.getBatchDailyPracticalCount(session.batch, day) >= 2) {
            return {
                valid: false,
                assignedLabs: [],
                conflictType: "BATCH_CONFLICT",
                reason: `Batch ${session.batch} reached maximum daily practical limit (2) on ${day}`,
            };
        }
    }

    // 2. Faculty conflict check: All real faculties must be distinct and free.
    //    STRICT INVARIANT: Same faculty CANNOT take multiple batches simultaneously.
    //    Each batch MUST have a distinct faculty — strictly 1 batch per faculty at a time.
    const facultySessions = new Map();
    for (const session of group) {
        if (isRealFaculty(session.faculty)) {
            if (facultySessions.has(session.faculty)) {
                const prev = facultySessions.get(session.faculty);
                return {
                    valid: false,
                    assignedLabs: [],
                    conflictType: "FACULTY_CONFLICT",
                    reason: `Faculty ${session.faculty} cannot take multiple batches (${prev.batch} & ${session.batch}) at the same time. Each batch MUST have a different faculty.`,
                };
            }
            facultySessions.set(session.faculty, session);
            if (!collegeOccupancy.isFacultyFreeForPractical(session.faculty, day, slot)) {
                return {
                    valid: false,
                    assignedLabs: [],
                    conflictType: "FACULTY_CONFLICT",
                    reason: `Faculty ${session.faculty} is busy elsewhere at ${day} L${slot + 1}-L${slot + 2}`,
                };
            }
        }
    }

    // v5.5: Use course-to-lab resolution instead of any free lab.
    const assignedLabs = [];
    const usedLabs = new Set();

    for (const session of group) {

        const locationData = collegeOccupancy.resources?.locationData || null;

        // ── Case 0: Tutorial session merged into lab window ───────────────────
        if (session.type === "TUTORIAL") {
            const baseTR = collegeOccupancy.resources?.tutorialRooms || ["TR1", "TR2"];
            const baseCR = collegeOccupancy.resources?.classrooms || ["C1", "C2", "C3", "C4", "C5", "C6"];

            let assignedTutRoom = null;
            for (const tr of baseTR) {
                const norm = String(tr).toUpperCase().trim();
                if (!usedLabs.has(norm) && collegeOccupancy.isTutorialRoomFreeForPractical(tr, day, slot)) {
                    assignedTutRoom = tr;
                    usedLabs.add(norm);
                    break;
                }
            }
            if (!assignedTutRoom) {
                for (const cr of baseCR) {
                    const norm = String(cr).toUpperCase().trim();
                    if (!usedLabs.has(norm) && collegeOccupancy.isClassroomFreeForPractical(cr, day, slot)) {
                        assignedTutRoom = cr;
                        usedLabs.add(norm);
                        break;
                    }
                }
            }
            if (!assignedTutRoom) {
                assignedTutRoom = baseTR[0] || "TR1";
            }

            assignedLabs.push({
                labInitial: assignedTutRoom,
                status: "MAPPED",
                isTutorial: true,
                resourceType: "TUTORIAL_ROOM",
                reason: `Tutorial room "${assignedTutRoom}" assigned for merged tutorial`,
            });
            continue;
        }

        // ── Case A: Session already has a pre-assigned location (FIXED or MANUAL) ──
        if (session.location && session.location !== "TBD" && session.location !== "FIXED" && session.location !== "") {
            const locNorm = String(session.location).toUpperCase().trim();
            if (usedLabs.has(locNorm) || !collegeOccupancy.isLabFreeForPractical(session.location, day, slot)) {
                return {
                    valid: false,
                    assignedLabs: [],
                    conflictType: "RESOURCE_CONFLICT",
                    reason: `Required lab ${session.location} unavailable for batch ${session.batch}`,
                };
            }
            usedLabs.add(locNorm);
            assignedLabs.push({
                labInitial: session.location,
                status: session.labAssignedStatus || "MANUAL",
                primaryLab: session.primaryLabInitial || session.location,
                reason: "Pre-assigned location",
            });
            continue;
        }

        // ── Case B: Course has a v5.5 lab resolution ─────────────────────────
        const resolution = session.labResolution || null;
        const primaryLab = session.primaryLabInitial || null;

        if (resolution || primaryLab) {

            // Try primary lab first
            if (primaryLab && !usedLabs.has(primaryLab.toUpperCase()) &&
                collegeOccupancy.isLabFreeForPractical(primaryLab, day, slot)) {
                usedLabs.add(primaryLab.toUpperCase().trim());
                assignedLabs.push({
                    labInitial: primaryLab,
                    status: "MAPPED",
                    primaryLab,
                    reason: `Primary mapped lab "${primaryLab}" available`,
                });
                continue;
            }

            // Try compatible fallback labs
            const fallbacks = resolution?.fallbackOptions || [];
            let fallbackFound = false;
            for (const { labInitial, labName, score } of fallbacks) {
                if (!usedLabs.has(labInitial.toUpperCase()) &&
                    collegeOccupancy.isLabFreeForPractical(labInitial, day, slot)) {
                    usedLabs.add(labInitial.toUpperCase().trim());
                    assignedLabs.push({
                        labInitial,
                        status: "FALLBACK",
                        primaryLab,
                        fallbackLab: labInitial,
                        reason: `Primary lab "${primaryLab}" unavailable; fallback "${labInitial}" (${labName}) assigned (score ${score})`,
                    });
                    fallbackFound = true;
                    break;
                }
            }

            if (fallbackFound) continue;

            // No compatible lab available — RESOURCE_CONFLICT
            const checkedLabs = primaryLab
                ? [primaryLab, ...fallbacks.map((f) => f.labInitial)]
                : fallbacks.map((f) => f.labInitial);
            return {
                valid: false,
                assignedLabs: [],
                conflictType: "RESOURCE_CONFLICT",
                reason: `No compatible lab available for course "${session.subjectName || session.subject}" ` +
                    `batch ${session.batch}. Checked: [${checkedLabs.join(", ")}]. ` +
                    `Primary: ${primaryLab || "UNMAPPED"}. This is RESOURCE_UNRESOLVED — ` +
                    `do not assign a random lab.`,
            };
        }

        // ── Case C: Course with no explicit primary mapping ──────────────────
        // Minimize NO LAB allocations: check if any general physical lab is available in slot
        const baseLabs = collegeOccupancy.resources?.labs || [];
        let altLabFound = false;
        for (const lab of baseLabs) {
            const labNorm = String(lab).toUpperCase().trim();
            if (!usedLabs.has(labNorm) && collegeOccupancy.isLabFreeForPractical(lab, day, slot)) {
                usedLabs.add(labNorm);
                assignedLabs.push({
                    labInitial: lab,
                    status: "FALLBACK",
                    primaryLab: lab,
                    fallbackLab: lab,
                    reason: `Alternative lab "${lab}" allocated to minimize unresolved practical allocation`,
                });
                altLabFound = true;
                break;
            }
        }

        if (altLabFound) continue;

        // No physical lab available at all in this window — report conflict so another window is used
        return {
            valid: false,
            assignedLabs: [],
            conflictType: "RESOURCE_CONFLICT",
            reason: `All physical labs occupied on ${day} slot ${slot + 1}.`,
        };
    }

    return { valid: true, assignedLabs, conflictType: null, reason: null };
}

/**
 * Search for the best practical stack in a given window:
 * Absolute Priority: 4 → 3 → 2 → 1
 * Tie-breaker:
 *   1. Cross-course diversity (prefer more different courses)
 *   2. DAPS / RCAA faculty and batch scarcity (constrained faculty first)
 */
export function findBestPracticalStack(validCandidates, day, slot, collegeOccupancy, divKey, options = {}) {
    const courseUnallocatedCounts = {};
    validCandidates.forEach((s) => {
        const cKey = (s.subject || s.subjectName || s.courseCode || "").toUpperCase().trim();
        courseUnallocatedCounts[cKey] = (courseUnallocatedCounts[cKey] || 0) + 1;
    });

    const maxTargetSize = Math.min(4, validCandidates.length);
    let selectedStack = null;
    let selectedAssignedLabs = null;
    const searchLogs = [];
    let totalCombosChecked = 0;

    for (let targetSize = maxTargetSize; targetSize >= 1; targetSize--) {
        searchLogs.push(`Trying stack size:`);
        searchLogs.push(`${targetSize}`);
        searchLogs.push(``);

        // Sort subset candidates by course backlog first to ensure high-backlog courses are included in candidateSubset
        const sortedSubsetCandidates = [...validCandidates].sort((a, b) => {
            const cKeyA = (a.subject || a.subjectName || a.courseCode || "").toUpperCase().trim();
            const cKeyB = (b.subject || b.subjectName || b.courseCode || "").toUpperCase().trim();
            const backlogA = courseUnallocatedCounts[cKeyA] || 0;
            const backlogB = courseUnallocatedCounts[cKeyB] || 0;
            if (backlogA !== backlogB) return backlogB - backlogA; // high backlog first
            return 0;
        });

        // Limit candidate subset to top 24 scarcity-sorted candidates if pool is very large
        const candidateSubset = sortedSubsetCandidates.length > 24 ? sortedSubsetCandidates.slice(0, 24) : sortedSubsetCandidates;
        const combos = getCombinations(candidateSubset, targetSize);
        totalCombosChecked += combos.length;

        const validCombos = [];
        const conflictReasons = new Set();

        for (const combo of combos) {
            const validation = validateCandidateGroup(combo, day, slot, collegeOccupancy, divKey);
            if (validation.valid) {
                validCombos.push({
                    combo,
                    assignedLabs: validation.assignedLabs,
                    diversity: getCourseDiversity(combo),
                    scarcity: getComboScarcityScore(combo, collegeOccupancy, divKey, courseUnallocatedCounts),
                });
            } else {
                if (validation.conflictType) {
                    conflictReasons.add(validation.conflictType);
                }
            }
        }

        if (validCombos.length > 0) {
            // Rank valid combos:
            // 1. Cross-course diversity DESCENDING (prefer more different courses)
            // 2. Scarcity score DESCENDING (constrained faculty first)
            validCombos.sort((a, b) => {
                if (a.diversity !== b.diversity) return b.diversity - a.diversity;
                return b.scarcity - a.scarcity;
            });

            selectedStack = validCombos[0].combo;
            selectedAssignedLabs = validCombos[0].assignedLabs;
            break; // Found largest valid stack! 4 -> 3 -> 2 -> 1 is absolute!
        } else {
            // This stack size failed
            searchLogs.push(`${targetSize}-stack:`);
            searchLogs.push(`FAILED`);
            searchLogs.push(``);
            searchLogs.push(`Reason:`);
            searchLogs.push(`Candidate combinations contain:`);
            if (conflictReasons.size > 0) {
                Array.from(conflictReasons).forEach((r) => searchLogs.push(`- ${r}`));
            } else {
                searchLogs.push(`- NO_COMPATIBLE_COMBINATION`);
            }
            searchLogs.push(``);
            if (targetSize > 1) {
                searchLogs.push(`Trying:`);
                searchLogs.push(`${targetSize - 1}-stack`);
                searchLogs.push(``);
            }
        }
    }

    if (selectedStack) {
        searchLogs.push(`Candidate combinations checked:`);
        searchLogs.push(`${totalCombosChecked}`);
        searchLogs.push(``);
        searchLogs.push(`Selected stack:`);
        selectedStack.forEach((s) => {
            searchLogs.push(`${s.subject}-${s.batch}`);
        });
        searchLogs.push(``);
        searchLogs.push(`Stack size:`);
        searchLogs.push(`${selectedStack.length}`);
        searchLogs.push(``);
        searchLogs.push(`Courses:`);
        searchLogs.push(selectedStack.map((s) => s.subject).join(" / "));
        searchLogs.push(``);
        searchLogs.push(`Faculty:`);
        searchLogs.push(selectedStack.map((s) => s.faculty).join(" / "));
        searchLogs.push(``);
        searchLogs.push(`Result:`);
        searchLogs.push(`MAXIMUM VALID STACK`);
    } else {
        searchLogs.push(`Result:`);
        searchLogs.push(`NO VALID STACK`);
    }

    return {
        selectedStack,
        selectedAssignedLabs,
        searchLogs,
        totalCombosChecked,
    };
}

/**
 * Perform Maximum Parallel Practical Stacking for all practical sessions across the college.
 *
 * Follows the FINAL PRACTICAL STACKING RULE:
 * 1. Collect ALL currently unscheduled practical batches across all courses.
 * 2. Filter candidates for the window.
 * 3. Sort candidates by scarcity.
 * 4. Priority: 4 → 3 → 2 → 1.
 * 5. Commit atomically and update global occupancy.
 *
 * @param {Object} timetable - Master college timetable
 * @param {Array} sessionPool - All sessions pool
 * @param {CollegeOccupancy} collegeOccupancy - Authoritative college-wide occupancy
 * @param {Object} [options] - Configuration / logger options
 * @returns {{ packedCount: number, unallocatedCount: number, packingLogs: string[] }}
 */
export function packPracticals(timetable, sessionPool, collegeOccupancy, options = {}) {
    const verbose = options.verbose ?? true;
    const printLogs = options.printLogs ?? false;
    const packingLogs = [];

    function log(msg) {
        packingLogs.push(msg);
        if (verbose && printLogs) {
            console.log(msg);
        }
    }

    // Collect all unscheduled practical sessions
    const practicalSessions = sessionPool.filter((s) => s.type === "PRACTICAL" && !s.allocated);
    // Collect paired tutorials for TY and BTECH (merged with lab window)
    const pairedTutorials = sessionPool.filter(
        (s) => s.type === "TUTORIAL" && s.pairedWithLab && !s.allocated
    );

    if (practicalSessions.length === 0 && pairedTutorials.length === 0) {
        return { packedCount: 0, unallocatedCount: 0, packingLogs };
    }

    // Map practical sessions and paired tutorials by division key
    const divisionPracticalMap = {};
    practicalSessions.forEach((s) => {
        const divKey = getDivisionKeyForSession(s, timetable);
        if (!divisionPracticalMap[divKey]) divisionPracticalMap[divKey] = [];
        divisionPracticalMap[divKey].push(s);
    });
    pairedTutorials.forEach((s) => {
        const divKey = getDivisionKeyForSession(s, timetable);
        if (!divisionPracticalMap[divKey]) divisionPracticalMap[divKey] = [];
        divisionPracticalMap[divKey].push(s);
    });

    const divisionKeys = Object.keys(divisionPracticalMap);

    // Build staggered window ordering across valid 2-hour practical windows (Slots [0, 2, 4])
    const windowOrder = [];
    DAYS.forEach((day, dayIdx) => {
        VALID_PRACTICAL_STARTS.forEach((slot) => {
            windowOrder.push({ day, slot, dayIdx });
        });
    });

    // Track daily practical blocks committed per division to avoid over-packing a single day
    const divDailyPracticalCount = {};
    const getDivDailyCount = (divKey, day) => divDailyPracticalCount[`${divKey}_${day}`] || 0;
    const incDivDailyCount = (divKey, day) => {
        divDailyPracticalCount[`${divKey}_${day}`] = (divDailyPracticalCount[`${divKey}_${day}`] || 0) + 1;
    };

    // Staged passes:
    // Pass 1: Maximum parallel stacks (size >= 4), max 1 block per division per day
    // Pass 2: Parallel stacks (size >= 3), max 1 block per division per day
    // Pass 3: Pair stacks (size >= 2), max 1 block per division per day
    // Pass 4: Clean up any remaining singles (size >= 1), max 1 block per division per day
    const passes = [
        { minStack: 4, maxPerDay: 1 },
        { minStack: 3, maxPerDay: 1 },
        { minStack: 2, maxPerDay: 1 },
        { minStack: 1, maxPerDay: 1 },
    ];


    passes.forEach((pass) => {
        windowOrder.forEach(({ day, slot }) => {
            // Prioritize divisions with more unallocated sessions
            const sortedDivKeys = [...divisionKeys].sort((a, b) => {
                const unallocA = divisionPracticalMap[a].filter((s) => !s.allocated).length;
                const unallocB = divisionPracticalMap[b].filter((s) => !s.allocated).length;
                return unallocB - unallocA;
            });

            sortedDivKeys.forEach((divKey) => {
                const unallocatedInDiv = divisionPracticalMap[divKey].filter((s) => !s.allocated);
                if (unallocatedInDiv.length === 0) return;
                if (getDivDailyCount(divKey, day) >= pass.maxPerDay) return;

                // Check if division window is free
                if (!collegeOccupancy.isDivisionFreeForPractical(divKey, day, slot)) {
                    return;
                }

                // STEP 1: Collect candidates for this window across ALL courses
                const candidates = unallocatedInDiv;

                // STEP 2: Filter candidates that individually cannot use the window
                const validCandidates = candidates.filter((session) => {
                    if (!collegeOccupancy.isFacultyFreeForPractical(session.faculty, day, slot)) {
                        return false;
                    }
                    if (!collegeOccupancy.isBatchFreeForPractical(session.batch, day, slot)) {
                        return false;
                    }
                    if (collegeOccupancy.getBatchDailyPracticalCount(session.batch, day) >= 2) {
                        return false;
                    }
                    if (session.location && session.location !== "TBD" && session.location !== "FIXED") {
                        if (!collegeOccupancy.isLabFreeForPractical(session.location, day, slot)) {
                            return false;
                        }
                    } else if (session.primaryLabInitial) {
                        const primaryFree = collegeOccupancy.isLabFreeForPractical(session.primaryLabInitial, day, slot);
                        if (!primaryFree) {
                            const fallbacks = session.labResolution?.fallbackOptions || [];
                            const anyFallbackFree = fallbacks.some((f) => collegeOccupancy.isLabFreeForPractical(f.labInitial, day, slot));
                            if (!anyFallbackFree) return false;
                        }
                    }
                    return true;
                });

                if (validCandidates.length < pass.minStack) return;

                // STEP 3: Sort valid candidates by scarcity
                validCandidates.sort((a, b) => {
                    const facScarcityA = collegeOccupancy.calculateFacultyPracticalScarcity(a.faculty);
                    const facScarcityB = collegeOccupancy.calculateFacultyPracticalScarcity(b.faculty);
                    if (facScarcityA !== facScarcityB) return facScarcityA - facScarcityB;

                    const batchScarcityA = collegeOccupancy.calculateBatchPracticalScarcity(a.batch, divKey);
                    const batchScarcityB = collegeOccupancy.calculateBatchPracticalScarcity(b.batch, divKey);
                    if (batchScarcityA !== batchScarcityB) return batchScarcityA - batchScarcityB;

                    const pA = a.priorityScore || 0;
                    const pB = b.priorityScore || 0;
                    return pB - pA;
                });

                // STEP 4: Maximum Parallel Practical Stacking: 4 → 3 → 2 → 1 with cross-course preference
                const stackResult = findBestPracticalStack(
                    validCandidates,
                    day,
                    slot,
                    collegeOccupancy,
                    divKey,
                    options
                );

                // Record debug log
                const logHeader = [
                    `[PracticalStacking]`,
                    ``,
                    `Window:`,
                    `${day} L${slot + 1}-L${slot + 2}`,
                    ``,
                    `Total candidates:`,
                    `${candidates.length}`,
                    ``,
                ];
                const fullLog = [...logHeader, ...stackResult.searchLogs].join("\n");
                log(fullLog);

                // STEP 5: Commit atomically if stack meets minimum threshold for this pass.
                const requiredMinStack = pass.minStack;
                if (stackResult.selectedStack && stackResult.selectedStack.length >= requiredMinStack && stackResult.selectedAssignedLabs) {
                    collegeOccupancy.commitPracticalGroup(
                        divKey,
                        day,
                        slot,
                        stackResult.selectedStack,
                        stackResult.selectedAssignedLabs
                    );
                    incDivDailyCount(divKey, day);
                }
            });
        });
    });

    // ── Pass 5b: Post-pass embedding for any remaining practical sessions ────
    divisionKeys.forEach((divKey) => {
        const remainingPracs = (divisionPracticalMap[divKey] || []).filter(
            (s) => s.type === "PRACTICAL" && !s.allocated
        );
        if (remainingPracs.length === 0) return;

        remainingPracs.forEach((pracSession) => {
            if (pracSession.allocated) return;
            for (const { day, slot } of windowOrder) {
                const cell = timetable[divKey]?.[day]?.[slot];
                if (!cell || cell.type !== "PRACTICAL" || cell.span !== 2 || cell.fixed || cell.isGlobal) continue;
                if (!cell.batchAllocations) cell.batchAllocations = [];

                // Max 4 batches total per practical cell
                const totalInCell = (cell.batchAllocations || []).length + (cell.tutorialAllocations || []).length;
                if (totalInCell >= 4) continue;

                // Check batch is not already in practical or tutorial in this cell
                const practicalBatches = (cell.batchAllocations || []).map((b) => b.batch);
                const tutorialBatches = (cell.tutorialAllocations || []).map((t) => t.batch);
                if (practicalBatches.includes(pracSession.batch) || tutorialBatches.includes(pracSession.batch)) continue;

                // STRICT: Each batch must have a distinct faculty. Same faculty cannot teach multiple batches in this slot!
                const existingFaculties = (cell.batchAllocations || []).map((b) => b.faculty).filter(isRealFaculty);
                if (isRealFaculty(pracSession.faculty) && existingFaculties.includes(pracSession.faculty)) continue;

                // Check faculty is free
                if (!collegeOccupancy.isFacultyFreeForPractical(pracSession.faculty, day, slot)) continue;
                if (!collegeOccupancy.isBatchFreeForPractical(pracSession.batch, day, slot)) continue;

                // Find available compatible lab
                const primaryLab = pracSession.primaryLabInitial;
                const resolution = pracSession.labResolution;
                let assignedLab = null;

                if (primaryLab && collegeOccupancy.isLabFreeForPractical(primaryLab, day, slot)) {
                    assignedLab = primaryLab;
                } else if (resolution?.fallbackOptions) {
                    for (const { labInitial } of resolution.fallbackOptions) {
                        if (collegeOccupancy.isLabFreeForPractical(labInitial, day, slot)) {
                            assignedLab = labInitial;
                            break;
                        }
                    }
                } else {
                    const baseLabs = collegeOccupancy.resources?.labs || [];
                    for (const lab of baseLabs) {
                        if (collegeOccupancy.isLabFreeForPractical(lab, day, slot)) {
                            assignedLab = lab;
                            break;
                        }
                    }
                }

                if (!assignedLab) continue;

                const tail = timetable[divKey]?.[day]?.[slot + 1];
                const allocEntry = {
                    ...pracSession,
                    location: assignedLab,
                    allocated: true,
                    labAssignedInitial: assignedLab,
                };

                cell.batchAllocations.push(allocEntry);
                if (tail) tail.batchAllocations = cell.batchAllocations;

                collegeOccupancy.markFacultyOccupied(pracSession.faculty, day, slot, pracSession);
                collegeOccupancy.markFacultyOccupied(pracSession.faculty, day, slot + 1, pracSession);
                collegeOccupancy.markBatchOccupied(pracSession.batch, day, slot, pracSession);
                collegeOccupancy.markBatchOccupied(pracSession.batch, day, slot + 1, pracSession);
                collegeOccupancy.markLabOccupied(assignedLab, day, slot, pracSession);
                collegeOccupancy.markLabOccupied(assignedLab, day, slot + 1, pracSession);

                pracSession.allocated = true;
                pracSession.location = assignedLab;
                break;
            }
        });
    });

    // ── Pass 6: Post-pass embedding for any remaining paired tutorials ────
    divisionKeys.forEach((divKey) => {
        const remainingTuts = (divisionPracticalMap[divKey] || []).filter(
            (s) => s.type === "TUTORIAL" && s.pairedWithLab && !s.allocated
        );
        if (remainingTuts.length === 0) return;

        remainingTuts.forEach((tutSession) => {
            if (tutSession.allocated) return;
            for (const { day, slot } of windowOrder) {
                const cell = timetable[divKey]?.[day]?.[slot];
                if (!cell || cell.type !== "PRACTICAL" || cell.span !== 2 || cell.fixed || cell.isGlobal) continue;

                // Check batch is not already in practical or tutorial in this cell
                const practicalBatches = (cell.batchAllocations || []).map((b) => b.batch);
                const tutorialBatches = (cell.tutorialAllocations || []).map((t) => t.batch);
                if (practicalBatches.includes(tutSession.batch) || tutorialBatches.includes(tutSession.batch)) continue;

                // Check faculty is free
                if (!collegeOccupancy.isFacultyFreeForPractical(tutSession.faculty, day, slot)) continue;

                // Find free tutorial room / classroom
                const baseTR = collegeOccupancy.resources?.tutorialRooms || ["TR1", "TR2"];
                const baseCR = collegeOccupancy.resources?.classrooms || ["C1", "C2", "C3", "C4", "C5", "C6"];
                let room = baseTR.find((tr) => collegeOccupancy.isTutorialRoomFreeForPractical(tr, day, slot));
                if (!room) {
                    room = baseCR.find((cr) => collegeOccupancy.isClassroomFreeForPractical(cr, day, slot));
                }
                if (!room) room = baseTR[0] || "TR1";

                if (!cell.tutorialAllocations) cell.tutorialAllocations = [];
                const tail = timetable[divKey]?.[day]?.[slot + 1];
                if (tail && !tail.tutorialAllocations) tail.tutorialAllocations = [];

                const tutEntry = {
                    ...tutSession,
                    location: room,
                    resourceType: "TUTORIAL_ROOM",
                    embeddedInLab: true,
                    labSubSlot: slot,
                };

                cell.tutorialAllocations.push(tutEntry);
                if (tail) tail.tutorialAllocations = cell.tutorialAllocations;

                collegeOccupancy.markFacultyOccupied(tutSession.faculty, day, slot, tutSession);
                collegeOccupancy.markFacultyOccupied(tutSession.faculty, day, slot + 1, tutSession);
                collegeOccupancy.markBatchOccupied(tutSession.batch, day, slot, tutSession);
                collegeOccupancy.markBatchOccupied(tutSession.batch, day, slot + 1, tutSession);
                collegeOccupancy.markTutorialRoomOccupied(room, day, slot, tutSession);
                collegeOccupancy.markTutorialRoomOccupied(room, day, slot + 1, tutSession);

                tutSession.allocated = true;
                break;
            }
        });
    });

    const remainingUnallocated = practicalSessions.filter((s) => !s.allocated);
    const packedCount = practicalSessions.length - remainingUnallocated.length;

    return {
        packedCount,
        unallocatedCount: remainingUnallocated.length,
        packingLogs,
    };
}

