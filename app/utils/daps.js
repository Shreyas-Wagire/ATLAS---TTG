/**
 * daps.js — Dynamic Adaptive Priority Scheduling (DAPS)
 *
 * Computes a dynamic priority score for each unscheduled session based on
 * deterministic constraint information already available in ATLAS.
 *
 * The session with the HIGHEST priority (most constrained) should be
 * scheduled first — this reduces scheduling dead-ends by placing
 * hard-to-schedule sessions before they lose all valid slots.
 *
 * DAPS NEVER modifies:
 *   - L/T/P counts
 *   - Required session count
 *   - Fixed constraints
 *   - Session definitions
 *
 * Factors considered:
 *   w1: SlotScarcity         — How few valid slots remain for this session
 *   w2: FacultyScarcity      — How few total slots the faculty has available
 *   w3: ResourceScarcity     — How scarce the required resource type is
 *   w4: BatchConflictDensity — How many other sessions compete for this batch
 *   w5: SyncConstraint       — Whether this session belongs to a sync group
 *   w6: ConflictDensity      — How many other sessions compete for this session's slots
 *   w7: FacultyWorkload      — How loaded the faculty already is
 *   w8: PracticalWindowScarcity — (Practicals only) How few 2-hour windows remain
 */

import { isFacultyBlockedByAvailability } from "./parseFacultyConstraints";

// ─── CONSTANTS ───────────────────────────────────────────────────────────────

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
const SLOTS_PER_DAY = 6;
const TOTAL_SLOTS = DAYS.length * SLOTS_PER_DAY; // 30
const PRACTICAL_VALID_STARTS = [0, 2, 4];
const GHOST_FACULTIES = new Set(["TBD", "FIXED", "TBD-FACULTY", "DEPT-FACULTY", ""]);

// Weight configuration (deterministic, tuned for ATLAS workloads)
const WEIGHTS = {
    slotScarcity: 0.25,
    facultyScarcity: 0.20,
    resourceScarcity: 0.10,
    batchConflictDensity: 0.10,
    syncConstraint: 0.10,
    conflictDensity: 0.10,
    facultyWorkload: 0.05,
    practicalWindowScarcity: 0.10,
};

function isRealFaculty(f) {
    return f && !GHOST_FACULTIES.has(String(f).trim());
}

// ─── ANALYSIS HELPERS ────────────────────────────────────────────────────────

/**
 * Build a map of faculty → { day → Set<slot> } from current timetable state.
 * Includes both direct faculty assignments and batchAllocations.
 */
function buildFacultyOccupancyMap(timetable) {
    const map = {};
    Object.entries(timetable).forEach(([, daysMap]) => {
        DAYS.forEach((day) => {
            (daysMap?.[day] || []).forEach((cell, slotIdx) => {
                if (!cell) return;
                const faculties = [];
                if (isRealFaculty(cell.faculty)) faculties.push(cell.faculty);
                if (cell.batchAllocations) {
                    cell.batchAllocations.forEach((b) => {
                        if (isRealFaculty(b.faculty)) faculties.push(b.faculty);
                    });
                }
                faculties.forEach((f) => {
                    if (!map[f]) map[f] = {};
                    if (!map[f][day]) map[f][day] = new Set();
                    map[f][day].add(slotIdx);
                });
            });
        });
    });
    return map;
}

/**
 * Build a map of divisionKey → day → Set<occupied slot indices>
 */
function buildDivisionOccupancyMap(timetable) {
    const map = {};
    Object.entries(timetable).forEach(([divKey, daysMap]) => {
        map[divKey] = {};
        DAYS.forEach((day) => {
            map[divKey][day] = new Set();
            (daysMap?.[day] || []).forEach((cell, slotIdx) => {
                if (cell !== null) map[divKey][day].add(slotIdx);
            });
        });
    });
    return map;
}

/**
 * Count how many total slots are available for a faculty after blackouts + occupancy.
 */
function countFacultyAvailableSlots(faculty, facultyAvailability, facultyOccupancy) {
    if (!isRealFaculty(faculty)) return TOTAL_SLOTS;
    let available = 0;
    DAYS.forEach((day) => {
        for (let s = 0; s < SLOTS_PER_DAY; s++) {
            if (isFacultyBlockedByAvailability(facultyAvailability, faculty, day, s)) continue;
            if (facultyOccupancy[faculty]?.[day]?.has(s)) continue;
            available++;
        }
    });
    return Math.max(1, available);
}

/**
 * Count how many valid candidate slots exist for a session.
 */
function countValidSlots(session, timetable, divOccupancy, facultyOccupancy, facultyAvailability) {
    const divKey = `${session.year}-${session.division}`;
    if (!timetable[divKey]) return 0;
    let count = 0;

    DAYS.forEach((day) => {
        if (session.type === "PRACTICAL") {
            // Practicals need 2 contiguous free slots
            for (const start of PRACTICAL_VALID_STARTS) {
                const next = start + 1;
                if (next >= SLOTS_PER_DAY) continue;
                // Division slots must be free OR be a practical block we can merge into
                const cell0 = timetable[divKey]?.[day]?.[start];
                const cell1 = timetable[divKey]?.[day]?.[next];
                const bothFree = cell0 === null && cell1 === null;
                const canMerge = cell0?.type === "PRACTICAL" && cell0?.span === 2 &&
                    cell1?.type === "PRACTICAL" && cell1?.span === 0;
                if (!bothFree && !canMerge) continue;
                // Faculty must be free in both slots
                if (isRealFaculty(session.faculty)) {
                    if (isFacultyBlockedByAvailability(facultyAvailability, session.faculty, day, start)) continue;
                    if (isFacultyBlockedByAvailability(facultyAvailability, session.faculty, day, next)) continue;
                    if (facultyOccupancy[session.faculty]?.[day]?.has(start)) continue;
                    if (facultyOccupancy[session.faculty]?.[day]?.has(next)) continue;
                }
                count++;
            }
        } else {
            // Lectures / Tutorials need 1 free slot
            for (let s = 0; s < SLOTS_PER_DAY; s++) {
                if (divOccupancy[divKey]?.[day]?.has(s)) continue;
                if (isRealFaculty(session.faculty)) {
                    if (isFacultyBlockedByAvailability(facultyAvailability, session.faculty, day, s)) continue;
                    if (facultyOccupancy[session.faculty]?.[day]?.has(s)) continue;
                }
                count++;
            }
        }
    });

    return count;
}

/**
 * Count how many sessions in the pool compete for the same batch.
 */
function countBatchCompetitors(session, unallocated) {
    if (!session.batch) return 0;
    return unallocated.filter(
        (s) => s !== session && s.batch === session.batch && !s.allocated
    ).length;
}

/**
 * Count how many sessions in the pool compete for the same resource type + division.
 */
function countResourceCompetitors(session, unallocated) {
    return unallocated.filter(
        (s) =>
            s !== session &&
            !s.allocated &&
            s.resourceType === session.resourceType &&
            s.year === session.year &&
            s.division === session.division
    ).length;
}

/**
 * Count how many hours the faculty already has scheduled.
 */
function countFacultyWorkload(faculty, facultyOccupancy) {
    if (!isRealFaculty(faculty)) return 0;
    let hours = 0;
    Object.values(facultyOccupancy[faculty] || {}).forEach((daySlots) => {
        hours += daySlots.size;
    });
    return hours;
}

// ─── NORMALIZE ───────────────────────────────────────────────────────────────

/**
 * Normalize a value into [0, 1] range. Higher = more constrained.
 * For "scarcity" metrics: fewer slots → higher score.
 */
function normalizeScarcity(value, maxPossible) {
    if (maxPossible <= 0) return 1.0;
    return Math.max(0, Math.min(1, 1 - value / maxPossible));
}

/**
 * Normalize a value into [0, 1] range. Higher value → higher score.
 */
function normalizeDensity(value, maxPossible) {
    if (maxPossible <= 0) return 0;
    return Math.max(0, Math.min(1, value / maxPossible));
}

// ─── MAIN PRIORITY CALCULATOR ────────────────────────────────────────────────

/**
 * Calculate the dynamic priority score for a single unscheduled session.
 *
 * @param {Object} session - The session to score
 * @param {Object} context - Precomputed analysis context
 * @returns {{ score: number, factors: Object }} Priority score and factor breakdown
 */
export function calculateSessionPriority(session, context) {
    const {
        timetable,
        divOccupancy,
        facultyOccupancy,
        facultyAvailability,
        unallocated,
        maxBatchCompetitors,
        maxResourceCompetitors,
        maxFacultyWorkload,
        totalPracticalWindows,
    } = context;

    // Factor 1: Slot Scarcity (fewer valid slots → higher priority)
    const validSlots = countValidSlots(
        session, timetable, divOccupancy, facultyOccupancy, facultyAvailability
    );
    const maxSlots = session.type === "PRACTICAL" ? totalPracticalWindows : TOTAL_SLOTS;
    const slotScarcity = normalizeScarcity(validSlots, maxSlots);

    // Factor 2: Faculty Scarcity (fewer available faculty slots → higher priority)
    const facultyAvailSlots = countFacultyAvailableSlots(
        session.faculty, facultyAvailability, facultyOccupancy
    );
    const facultyScarcity = normalizeScarcity(facultyAvailSlots, TOTAL_SLOTS);

    // Factor 3: Resource Scarcity (more competitors for same resource type → higher priority)
    const resourceCompetitors = countResourceCompetitors(session, unallocated);
    const resourceScarcity = normalizeDensity(resourceCompetitors, maxResourceCompetitors || 1);

    // Factor 4: Batch Conflict Density (more sessions for same batch → higher priority)
    const batchCompetitors = countBatchCompetitors(session, unallocated);
    const batchConflictDensity = normalizeDensity(batchCompetitors, maxBatchCompetitors || 1);

    // Factor 5: Sync Constraint (sync group sessions have higher priority)
    const syncConstraint = session.syncGroup ? 1.0 : 0.0;

    // Factor 6: Conflict Density (how many OTHER sessions share faculty → higher priority)
    const sameFacultyCount = unallocated.filter(
        (s) => s !== session && s.faculty === session.faculty && !s.allocated
    ).length;
    const conflictDensity = normalizeDensity(sameFacultyCount, unallocated.length || 1);

    // Factor 7: Faculty Workload (already busy faculty → higher priority to avoid overload)
    const workload = countFacultyWorkload(session.faculty, facultyOccupancy);
    const facultyWorkload = normalizeDensity(workload, maxFacultyWorkload || 1);

    // Factor 8: Practical Window Scarcity (only for practicals — fewer 2-hour windows → higher)
    let practicalWindowScarcity = 0;
    if (session.type === "PRACTICAL") {
        practicalWindowScarcity = normalizeScarcity(validSlots, totalPracticalWindows);
    }

    // Combine factors with weights
    const score =
        WEIGHTS.slotScarcity * slotScarcity +
        WEIGHTS.facultyScarcity * facultyScarcity +
        WEIGHTS.resourceScarcity * resourceScarcity +
        WEIGHTS.batchConflictDensity * batchConflictDensity +
        WEIGHTS.syncConstraint * syncConstraint +
        WEIGHTS.conflictDensity * conflictDensity +
        WEIGHTS.facultyWorkload * facultyWorkload +
        WEIGHTS.practicalWindowScarcity * practicalWindowScarcity;

    return {
        score,
        factors: {
            slotScarcity: parseFloat(slotScarcity.toFixed(4)),
            facultyScarcity: parseFloat(facultyScarcity.toFixed(4)),
            resourceScarcity: parseFloat(resourceScarcity.toFixed(4)),
            batchConflictDensity: parseFloat(batchConflictDensity.toFixed(4)),
            syncConstraint: parseFloat(syncConstraint.toFixed(4)),
            conflictDensity: parseFloat(conflictDensity.toFixed(4)),
            facultyWorkload: parseFloat(facultyWorkload.toFixed(4)),
            practicalWindowScarcity: parseFloat(practicalWindowScarcity.toFixed(4)),
            validSlots,
            facultyAvailableSlots: facultyAvailSlots,
        },
    };
}

// ─── PUBLIC API ──────────────────────────────────────────────────────────────

/**
 * Build a reusable DAPS analysis context from current timetable state.
 * This should be called once before scoring multiple sessions, and
 * rebuilt when the timetable state changes significantly.
 *
 * @param {Object} timetable - Current timetable state
 * @param {Array} sessionPool - Full session pool
 * @param {Object} facultyAvailability - Faculty availability blackouts
 * @returns {Object} Analysis context for calculateSessionPriority
 */
export function buildDAPSContext(timetable, sessionPool, facultyAvailability = {}) {
    const facultyOccupancy = buildFacultyOccupancyMap(timetable);
    const divOccupancy = buildDivisionOccupancyMap(timetable);
    const unallocated = sessionPool.filter((s) => !s.allocated);

    // Precompute normalization bounds
    let maxBatchCompetitors = 0;
    let maxResourceCompetitors = 0;
    let maxFacultyWorkload = 0;

    const batchCounts = {};
    const resourceCounts = {};
    unallocated.forEach((s) => {
        if (s.batch) {
            batchCounts[s.batch] = (batchCounts[s.batch] || 0) + 1;
        }
        const rKey = `${s.resourceType}-${s.year}-${s.division}`;
        resourceCounts[rKey] = (resourceCounts[rKey] || 0) + 1;
    });

    maxBatchCompetitors = Math.max(1, ...Object.values(batchCounts));
    maxResourceCompetitors = Math.max(1, ...Object.values(resourceCounts));

    Object.values(facultyOccupancy).forEach((dayMap) => {
        let hours = 0;
        Object.values(dayMap).forEach((slots) => { hours += slots.size; });
        if (hours > maxFacultyWorkload) maxFacultyWorkload = hours;
    });
    maxFacultyWorkload = Math.max(1, maxFacultyWorkload);

    // Total practical windows per division (3 valid starts × 5 days = 15)
    const totalPracticalWindows = PRACTICAL_VALID_STARTS.length * DAYS.length;

    return {
        timetable,
        divOccupancy,
        facultyOccupancy,
        facultyAvailability,
        unallocated,
        maxBatchCompetitors,
        maxResourceCompetitors,
        maxFacultyWorkload,
        totalPracticalWindows,
    };
}

/**
 * Sort unallocated sessions by dynamic priority (most constrained first).
 *
 * This function:
 *   1. Builds a DAPS analysis context from current state
 *   2. Scores every unallocated session
 *   3. Sorts sessions by priority (highest first)
 *   4. Preserves the existing Practical → Tutorial → Lecture ordering
 *      within each priority tier
 *
 * @param {Array} sessionPool - Full session pool (mutated: unallocated sessions reordered)
 * @param {Object} timetable - Current timetable state
 * @param {Object} facultyAvailability - Faculty availability blackouts
 * @param {Object} [options] - Optional configuration
 * @param {boolean} [options.preserveTypeOrder=true] - If true, maintain P→T→L ordering as primary sort
 * @returns {{ sessionPool: Array, diagnostics: Array }} Reordered pool + diagnostics
 */
export function prioritizeSessionPool(sessionPool, timetable, facultyAvailability = {}, options = {}) {
    const { preserveTypeOrder = true } = options;

    const context = buildDAPSContext(timetable, sessionPool, facultyAvailability);
    const diagnostics = [];

    // Score every unallocated session
    const scored = [];
    sessionPool.forEach((session, idx) => {
        if (session.allocated) return;

        const { score, factors } = calculateSessionPriority(session, context);
        scored.push({ session, score, factors, originalIndex: idx });

        diagnostics.push({
            subject: session.subject || session.subjectName || "?",
            type: session.type,
            faculty: session.faculty,
            division: `${session.year}-${session.division}`,
            batch: session.batch || "-",
            syncGroup: session.syncGroup || "-",
            priorityScore: parseFloat(score.toFixed(4)),
            factors,
            reason: buildPriorityReason(score, factors),
        });
    });

    // Type priority: PRACTICAL=0, TUTORIAL=1, LECTURE=2
    const typePriority = { PRACTICAL: 0, TUTORIAL: 1, LECTURE: 2 };

    // Sort: preserveTypeOrder → type first, then DAPS score descending
    scored.sort((a, b) => {
        if (preserveTypeOrder) {
            const typeA = typePriority[a.session.type] ?? 3;
            const typeB = typePriority[b.session.type] ?? 3;
            if (typeA !== typeB) return typeA - typeB;
        }
        return b.score - a.score; // Higher score = more constrained = first
    });

    // Rebuild pool: allocated sessions stay in place, unallocated reordered
    const allocatedInOrder = [];
    const unallocatedSlots = [];
    sessionPool.forEach((s, idx) => {
        if (s.allocated) {
            allocatedInOrder.push({ session: s, idx });
        } else {
            unallocatedSlots.push(idx);
        }
    });

    // Place scored sessions into the unallocated positions
    scored.forEach((entry, i) => {
        if (i < unallocatedSlots.length) {
            sessionPool[unallocatedSlots[i]] = entry.session;
        }
    });

    // Sort diagnostics by priority for debug output
    diagnostics.sort((a, b) => b.priorityScore - a.priorityScore);

    return { sessionPool, diagnostics };
}

/**
 * Re-prioritize only the unallocated sessions (for use during repair loops).
 * Returns a new sorted array of unallocated sessions.
 *
 * @param {Array} unallocated - Array of unallocated sessions
 * @param {Object} timetable - Current timetable state
 * @param {Object} facultyAvailability - Faculty availability blackouts
 * @returns {Array} Sorted unallocated sessions (most constrained first)
 */
export function reprioritizeUnallocated(unallocated, timetable, facultyAvailability = {}) {
    const context = buildDAPSContext(timetable, unallocated, facultyAvailability);

    const scored = unallocated.map((session) => {
        const { score, factors } = calculateSessionPriority(session, context);
        return { session, score, factors };
    });

    scored.sort((a, b) => b.score - a.score);
    return scored.map((s) => s.session);
}

// ─── DIAGNOSTICS ─────────────────────────────────────────────────────────────

/**
 * Build a human-readable explanation of why a session has a given priority.
 */
function buildPriorityReason(score, factors) {
    const reasons = [];

    if (factors.slotScarcity > 0.7) {
        reasons.push(`Very few valid slots (${factors.validSlots} remaining)`);
    } else if (factors.slotScarcity > 0.4) {
        reasons.push(`Limited valid slots (${factors.validSlots} remaining)`);
    }

    if (factors.facultyScarcity > 0.6) {
        reasons.push(`Faculty highly constrained (${factors.facultyAvailableSlots} slots available)`);
    }

    if (factors.syncConstraint > 0) {
        reasons.push("Part of synchronized group");
    }

    if (factors.practicalWindowScarcity > 0.5) {
        reasons.push("Few 2-hour practical windows remaining");
    }

    if (factors.batchConflictDensity > 0.5) {
        reasons.push("High batch competition");
    }

    if (reasons.length === 0) {
        reasons.push("Standard priority");
    }

    return reasons.join("; ");
}

/**
 * Generate a summary report of DAPS prioritization for debug/diagnostic output.
 *
 * @param {Array} diagnostics - Diagnostics from prioritizeSessionPool
 * @returns {Object} Summary report
 */
export function generateDAPSReport(diagnostics) {
    if (!diagnostics || diagnostics.length === 0) {
        return { totalSessions: 0, topConstrained: [], summary: "No unallocated sessions to prioritize." };
    }

    return {
        totalSessions: diagnostics.length,
        topConstrained: diagnostics.slice(0, 10).map((d) => ({
            session: `${d.subject} (${d.type}) [${d.division}] ${d.batch}`,
            score: d.priorityScore,
            reason: d.reason,
        })),
        avgPriority: parseFloat(
            (diagnostics.reduce((sum, d) => sum + d.priorityScore, 0) / diagnostics.length).toFixed(4)
        ),
        highPriorityCount: diagnostics.filter((d) => d.priorityScore > 0.6).length,
        mediumPriorityCount: diagnostics.filter((d) => d.priorityScore > 0.3 && d.priorityScore <= 0.6).length,
        lowPriorityCount: diagnostics.filter((d) => d.priorityScore <= 0.3).length,
    };
}
