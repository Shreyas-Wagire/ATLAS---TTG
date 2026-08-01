/**
 * optimizeTimetable.js
 *
 * Post-generation timetable optimizer.
 *
 * Pipeline:
 *   1. Build in-memory faculty occupancy maps + daily statistics
 *   2. Detect hard conflicts (double-bookings, overload, consecutive limits)
 *   3. Resolve each conflict via session move or 1-hop swap
 *   4. Further minimize soft penalties (idle gaps, uneven distribution, room changes)
 *   5. Return the optimized timetable with a summary report
 *
 * IMPORTANT: This module NEVER persists any data. All structures are
 * created fresh each call and discarded after the function returns.
 * Only the returned timetable object is used by the caller.
 */

import {
    buildFacultyOccupancy,
    DAYS,
    SLOT_TIMES,
    MAX_DAILY_HOURS,
    MAX_CONSECUTIVE_LECTURES,
} from "./buildFacultyOccupancy";

// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────────────────────

const PRACTICAL_VALID_STARTS = [0, 2, 4]; // slots where a 2-hour practical may begin
const MAX_OPTIMIZATION_ITERATIONS = 20;
const GHOST_FACULTIES = new Set(["TBD", "FIXED", "TBD-FACULTY", "DEPT-FACULTY", ""]);

function isRealFaculty(f) {
    return f && !GHOST_FACULTIES.has(String(f).trim());
}

// ─────────────────────────────────────────────────────────────────────────────
// CONFLICT DETECTION
// ─────────────────────────────────────────────────────────────────────────────

/**
 * detectFacultyConflicts
 *
 * Finds hard conflicts using the occupancy map and daily stats:
 *   - FACULTY_DOUBLE_BOOKING: faculty in 2+ sessions at the same (day, slot)
 *   - DAILY_OVERLOAD: faculty exceeds MAX_DAILY_HOURS on a day
 *   - CONSECUTIVE_OVERLOAD: faculty exceeds MAX_CONSECUTIVE_LECTURES in a stretch
 *
 * Returns an array of conflict objects, each describing the offending sessions
 * and the recommended action.
 */
function detectFacultyConflicts(timetable, occupancy, stats) {
    const conflicts = [];

    // ── Double-booking detection ─────────────────────────────────────────
    // Scan every cell; if a faculty appears in 2 different division-keys at
    // the same (day, slot), that is a hard FACULTY_CLASH.
    const slotFacultyMap = {}; // "faculty|day|slotIdx" → [{ divisionKey, cell }]

    Object.entries(timetable).forEach(([divisionKey, daysMap]) => {
        DAYS.forEach((day) => {
            (daysMap?.[day] || []).forEach((cell, slotIdx) => {
                if (!cell || cell.span === 0) return;
                const type = cell.type;
                if (!type) return;

                const faculties = [];
                if ((type === "PRACTICAL" || type === "TUTORIAL") && cell.batchAllocations?.length) {
                    cell.batchAllocations.forEach((a) => {
                        if (isRealFaculty(a.faculty)) faculties.push(a.faculty);
                    });
                } else if (isRealFaculty(cell.faculty)) {
                    faculties.push(cell.faculty);
                }

                faculties.forEach((faculty) => {
                    const key = `${faculty}|${day}|${slotIdx}`;
                    if (!slotFacultyMap[key]) slotFacultyMap[key] = [];
                    slotFacultyMap[key].push({ divisionKey, cell, slotIdx, day });
                });
            });
        });
    });

    Object.entries(slotFacultyMap).forEach(([key, entries]) => {
        const uniqueDivisions = new Set(entries.map((e) => e.divisionKey));
        if (uniqueDivisions.size < 2) return;

        const [faculty, day, slotIdx] = key.split("|");
        conflicts.push({
            type: "FACULTY_DOUBLE_BOOKING",
            severity: "CRITICAL",
            faculty,
            day,
            slotIdx: Number(slotIdx),
            affectedEntries: entries,
            description: `${faculty} is double-booked on ${day} slot ${Number(slotIdx) + 1}`,
        });
    });

    // ── Daily overload detection ─────────────────────────────────────────
    Object.entries(stats).forEach(([faculty, dayStats]) => {
        DAYS.forEach((day) => {
            const s = dayStats[day];
            if (!s) return;
            if (s.totalHours > MAX_DAILY_HOURS) {
                conflicts.push({
                    type: "DAILY_OVERLOAD",
                    severity: "HIGH",
                    faculty,
                    day,
                    totalHours: s.totalHours,
                    excess: s.totalHours - MAX_DAILY_HOURS,
                    description: `${faculty} has ${s.totalHours}h on ${day} (max ${MAX_DAILY_HOURS}h)`,
                });
            }
        });
    });

    // ── Consecutive lecture overload ─────────────────────────────────────
    Object.entries(stats).forEach(([faculty, dayStats]) => {
        DAYS.forEach((day) => {
            const s = dayStats[day];
            if (!s) return;
            if (s.consecutiveHours > MAX_CONSECUTIVE_LECTURES) {
                conflicts.push({
                    type: "CONSECUTIVE_OVERLOAD",
                    severity: "MEDIUM",
                    faculty,
                    day,
                    consecutiveHours: s.consecutiveHours,
                    description: `${faculty} has ${s.consecutiveHours} consecutive lectures on ${day}`,
                });
            }
        });
    });

    // Sort: CRITICAL first, then HIGH, then MEDIUM
    const priority = { CRITICAL: 0, HIGH: 1, MEDIUM: 2 };
    conflicts.sort((a, b) => (priority[a.severity] ?? 3) - (priority[b.severity] ?? 3));

    return conflicts;
}

// ─────────────────────────────────────────────────────────────────────────────
// COMPATIBILITY CHECKS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * isFacultyFreeAt
 * Returns true only if the faculty has NO session at (day, slotIdx) in the timetable.
 * Checks across ALL division keys.
 */
function isFacultyFreeAt(timetable, faculty, day, slotIdx) {
    if (!isRealFaculty(faculty)) return true;
    for (const [, daysMap] of Object.entries(timetable)) {
        const cell = daysMap?.[day]?.[slotIdx];
        if (!cell) continue;
        if (cell.span === 0) continue; // continuation

        if ((cell.type === "PRACTICAL" || cell.type === "TUTORIAL") && cell.batchAllocations) {
            if (cell.batchAllocations.some((a) => a.faculty === faculty)) return false;
        } else if (cell.faculty === faculty) {
            return false;
        }
    }
    return true;
}

/**
 * isClassFreeAt
 * Returns true if divisionKey has no scheduled session at (day, slotIdx).
 */
function isClassFreeAt(timetable, divisionKey, day, slotIdx) {
    const cell = timetable[divisionKey]?.[day]?.[slotIdx];
    return cell === null || cell === undefined;
}

/**
 * isRoomFreeAt
 * Returns true if the given room/location is not used at (day, slotIdx) across all divisions.
 */
function isRoomFreeAt(timetable, room, day, slotIdx) {
    if (!room || room === "TBD") return true;
    for (const [, daysMap] of Object.entries(timetable)) {
        const cell = daysMap?.[day]?.[slotIdx];
        if (!cell) continue;
        if (cell.span === 0) continue;

        if ((cell.type === "PRACTICAL" || cell.type === "TUTORIAL") && cell.batchAllocations) {
            if (cell.batchAllocations.some((a) => (a.location || cell.location) === room)) return false;
        } else if ((cell.location || "") === room) {
            return false;
        }
    }
    return true;
}

/**
 * canPlaceSessionAt
 * Full compatibility gate for placing `session` (from divisionKey) at (targetDay, targetSlotIdx).
 *
 * Checks:
 *   ✓ Session is not fixed
 *   ✓ Target slot is free in the class timetable
 *   ✓ Faculty is free at target slot (and slot+1 for practicals)
 *   ✓ Room is free at target slot
 *   ✓ For PRACTICAL: slot must be a valid start (0, 2, 4) and slot+1 must also be free
 *   ✓ For PRACTICAL: slot+1 must also satisfy class/faculty/room checks
 */
function canPlaceSessionAt(timetable, session, targetDay, targetSlotIdx) {
    if (session.fixed) return false;

    // Practical: must start at valid position; needs 2 consecutive free slots
    if (session.type === "PRACTICAL") {
        if (!PRACTICAL_VALID_STARTS.includes(targetSlotIdx)) return false;
        const nextSlot = targetSlotIdx + 1;
        if (nextSlot >= 6) return false;

        // Both slots must be free in the class
        if (!isClassFreeAt(timetable, session.divisionKey, targetDay, targetSlotIdx)) return false;
        if (!isClassFreeAt(timetable, session.divisionKey, targetDay, nextSlot)) return false;

        // All participating faculty must be free in both slots
        const faculties = session.batchAllocations
            ? [...new Set(session.batchAllocations.map((b) => b.faculty).filter(isRealFaculty))]
            : (isRealFaculty(session.faculty) ? [session.faculty] : []);

        for (const faculty of faculties) {
            if (!isFacultyFreeAt(timetable, faculty, targetDay, targetSlotIdx)) return false;
            if (!isFacultyFreeAt(timetable, faculty, targetDay, nextSlot)) return false;
        }

        // Room check (both slots)
        const rooms = session.batchAllocations
            ? [...new Set(session.batchAllocations.map((b) => b.location).filter(Boolean))]
            : (session.location ? [session.location] : []);

        for (const room of rooms) {
            if (!isRoomFreeAt(timetable, room, targetDay, targetSlotIdx)) return false;
            if (!isRoomFreeAt(timetable, room, targetDay, nextSlot)) return false;
        }

        return true;
    }

    // Lecture / Tutorial: single slot
    if (!isClassFreeAt(timetable, session.divisionKey, targetDay, targetSlotIdx)) return false;

    const faculty = session.faculty;
    if (isRealFaculty(faculty) && !isFacultyFreeAt(timetable, faculty, targetDay, targetSlotIdx)) return false;

    const room = session.location;
    if (room && !isRoomFreeAt(timetable, room, targetDay, targetSlotIdx)) return false;

    return true;
}

/**
 * canSwapSessions
 * Returns true if sessionA can move to slotB AND sessionB can move to slotA.
 * Both sessions must be in the SAME division key for a valid swap.
 * Neither may be fixed.
 */
function canSwapSessions(timetable, sessionA, sessionB) {
    if (sessionA.fixed || sessionB.fixed) return false;
    if (sessionA.divisionKey !== sessionB.divisionKey) return false;
    if (sessionA.type !== sessionB.type) return false; // only swap same-type sessions (same span)

    // Temporarily clear both slots, then check compatibility
    const ttA = timetable[sessionA.divisionKey];
    const ttB = timetable[sessionB.divisionKey];

    // Back up cells
    const slotA = sessionA.slotIdx;
    const slotB = sessionB.slotIdx;
    const dayA = sessionA.day;
    const dayB = sessionB.day;

    const savedA0 = ttA[dayA][slotA];
    const savedA1 = sessionA.type === "PRACTICAL" ? ttA[dayA][slotA + 1] : null;
    const savedB0 = ttB[dayB][slotB];
    const savedB1 = sessionB.type === "PRACTICAL" ? ttB[dayB][slotB + 1] : null;

    // Clear original positions
    ttA[dayA][slotA] = null;
    if (savedA1 !== null) ttA[dayA][slotA + 1] = null;
    ttB[dayB][slotB] = null;
    if (savedB1 !== null) ttB[dayB][slotB + 1] = null;

    const aCanGoToB = canPlaceSessionAt(timetable, { ...sessionA, divisionKey: sessionB.divisionKey }, dayB, slotB);
    const bCanGoToA = canPlaceSessionAt(timetable, { ...sessionB, divisionKey: sessionA.divisionKey }, dayA, slotA);

    // Restore
    ttA[dayA][slotA] = savedA0;
    if (savedA1 !== null) ttA[dayA][slotA + 1] = savedA1;
    ttB[dayB][slotB] = savedB0;
    if (savedB1 !== null) ttB[dayB][slotB + 1] = savedB1;

    return aCanGoToB && bCanGoToA;
}

// ─────────────────────────────────────────────────────────────────────────────
// SESSION MOVE / SWAP EXECUTORS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * extractCellFromTimetable
 * Returns the raw timetable cell at the given position.
 */
function extractCellFromTimetable(timetable, divisionKey, day, slotIdx) {
    return timetable[divisionKey]?.[day]?.[slotIdx] ?? null;
}

/**
 * clearSession
 * Removes a session from its current slot(s) in the timetable.
 */
function clearSession(timetable, divisionKey, day, slotIdx, type) {
    const tt = timetable[divisionKey];
    if (!tt) return;
    tt[day][slotIdx] = null;
    if (type === "PRACTICAL" && slotIdx + 1 < 6) {
        tt[day][slotIdx + 1] = null;
    }
}

/**
 * placeCell
 * Writes a cell (and its continuation for practicals) into the timetable.
 */
function placeCell(timetable, divisionKey, day, slotIdx, cell) {
    const tt = timetable[divisionKey];
    if (!tt) return;
    tt[day][slotIdx] = { ...cell, day, slotIdx };

    if (cell.type === "PRACTICAL") {
        // span:0 continuation
        tt[day][slotIdx + 1] = {
            type: "PRACTICAL",
            span: 0,
            fixed: false,
            batchAllocations: cell.batchAllocations || null,
        };
    }
}

/**
 * moveSession
 * Moves the complete session (all fields) from its current slot to (targetDay, targetSlotIdx).
 * Updates the timetable in-place.
 *
 * Returns true on success, false if the target is not compatible.
 */
function moveSession(timetable, session, targetDay, targetSlotIdx) {
    const { divisionKey, day: srcDay, slotIdx: srcSlot, type } = session;

    // Verify compatibility with the target slot (without the source session)
    const srcCell = extractCellFromTimetable(timetable, divisionKey, srcDay, srcSlot);
    if (!srcCell) return false;

    // Temporarily clear source so it doesn't block target checks
    clearSession(timetable, divisionKey, srcDay, srcSlot, type);

    const compatible = canPlaceSessionAt(timetable, session, targetDay, targetSlotIdx);
    if (!compatible) {
        // Restore
        placeCell(timetable, divisionKey, srcDay, srcSlot, srcCell);
        return false;
    }

    // Place at target
    placeCell(timetable, divisionKey, targetDay, targetSlotIdx, { ...srcCell, fixed: false });
    return true;
}

/**
 * swapSessions
 * Swaps two complete sessions between their positions.
 * Both must be in the same division.
 *
 * Returns true on success.
 */
function swapSessions(timetable, sessionA, sessionB) {
    if (!canSwapSessions(timetable, sessionA, sessionB)) return false;

    const cellA = extractCellFromTimetable(timetable, sessionA.divisionKey, sessionA.day, sessionA.slotIdx);
    const cellB = extractCellFromTimetable(timetable, sessionB.divisionKey, sessionB.day, sessionB.slotIdx);

    if (!cellA || !cellB) return false;

    clearSession(timetable, sessionA.divisionKey, sessionA.day, sessionA.slotIdx, sessionA.type);
    clearSession(timetable, sessionB.divisionKey, sessionB.day, sessionB.slotIdx, sessionB.type);

    placeCell(timetable, sessionA.divisionKey, sessionB.day, sessionB.slotIdx, { ...cellA, fixed: false });
    placeCell(timetable, sessionB.divisionKey, sessionA.day, sessionA.slotIdx, { ...cellB, fixed: false });

    return true;
}

// ─────────────────────────────────────────────────────────────────────────────
// CONFLICT RESOLUTION
// ─────────────────────────────────────────────────────────────────────────────

/**
 * resolveDoubleBooking
 * Attempts to resolve a FACULTY_DOUBLE_BOOKING conflict by:
 *   1. Trying to MOVE the non-fixed session to another free slot
 *   2. If move fails, trying a SWAP with another movable session
 *
 * Returns true if resolved.
 */
function resolveDoubleBooking(timetable, conflict) {
    const { faculty, day, slotIdx, affectedEntries } = conflict;

    // Find the sessions involved (prefer moving the non-fixed one)
    const movable = affectedEntries
        .filter((e) => e.cell && !e.cell.fixed)
        .sort((a, b) => {
            // prefer moving the session with fewer batch allocations (simpler)
            const aCount = a.cell?.batchAllocations?.length ?? 1;
            const bCount = b.cell?.batchAllocations?.length ?? 1;
            return aCount - bCount;
        });

    for (const entry of movable) {
        const { divisionKey, cell } = entry;
        const session = {
            ...cell,
            divisionKey,
            day,
            slotIdx,
            faculty: cell.batchAllocations ? cell.batchAllocations[0]?.faculty : cell.faculty,
        };

        // Try to find a free slot to move this session
        for (const targetDay of DAYS) {
            for (let targetSlot = 0; targetSlot < 6; targetSlot++) {
                if (targetDay === day && targetSlot === slotIdx) continue;
                if (moveSession(timetable, session, targetDay, targetSlot)) {
                    return true;
                }
            }
        }
    }

    // Fallback: try swapping with another session in the same division
    for (const entry of movable) {
        const { divisionKey, cell } = entry;
        const sessionA = { ...cell, divisionKey, day, slotIdx };

        const tt = timetable[divisionKey];
        if (!tt) continue;

        for (const targetDay of DAYS) {
            for (let targetSlot = 0; targetSlot < 6; targetSlot++) {
                if (targetDay === day && targetSlot === slotIdx) continue;
                const targetCell = tt[targetDay]?.[targetSlot];
                if (!targetCell || targetCell.fixed || targetCell.span === 0) continue;
                if (targetCell.type !== cell.type) continue;

                const sessionB = { ...targetCell, divisionKey, day: targetDay, slotIdx: targetSlot };
                if (swapSessions(timetable, sessionA, sessionB)) {
                    return true;
                }
            }
        }
    }

    return false; // Could not resolve
}

/**
 * resolveConsecutiveOverload
 * Breaks up long consecutive lecture streaks by moving one lecture to a non-consecutive slot.
 */
function resolveConsecutiveOverload(timetable, conflict) {
    const { faculty, day } = conflict;

    // Find all lecture slots for this faculty on this day (in order)
    const lectureSlots = [];
    Object.entries(timetable).forEach(([divisionKey, daysMap]) => {
        (daysMap?.[day] || []).forEach((cell, slotIdx) => {
            if (!cell || cell.span === 0 || cell.type !== "LECTURE") return;
            if (cell.faculty !== faculty) return;
            lectureSlots.push({ divisionKey, cell, slotIdx });
        });
    });

    lectureSlots.sort((a, b) => a.slotIdx - b.slotIdx);
    if (lectureSlots.length < MAX_CONSECUTIVE_LECTURES + 1) return false;

    // Try to move the last lecture in the streak to a non-consecutive slot on another day
    const toMove = lectureSlots[lectureSlots.length - 1];
    const session = { ...toMove.cell, divisionKey: toMove.divisionKey, day, slotIdx: toMove.slotIdx };

    for (const targetDay of DAYS) {
        if (targetDay === day) continue;
        for (let targetSlot = 0; targetSlot < 6; targetSlot++) {
            if (moveSession(timetable, session, targetDay, targetSlot)) {
                return true;
            }
        }
    }

    return false;
}

// ─────────────────────────────────────────────────────────────────────────────
// PENALTY CALCULATION
// ─────────────────────────────────────────────────────────────────────────────

/**
 * calculatePenalty
 * Computes a scalar penalty score from faculty daily stats.
 * Lower = better timetable quality.
 *
 * Penalty weights:
 *   - Each excess hour over MAX_DAILY_HOURS: 100 pts
 *   - Each consecutive lecture over MAX_CONSECUTIVE_LECTURES: 50 pts
 *   - Each idle gap (free period between two teaching slots): 20 pts
 *   - Each day a faculty has 0 teaching hours (unused active day): 10 pts
 */
function calculatePenalty(stats) {
    let penalty = 0;
    Object.values(stats).forEach((dayStats) => {
        DAYS.forEach((day) => {
            const s = dayStats[day];
            if (!s) return;
            penalty += Math.max(0, s.totalHours - MAX_DAILY_HOURS) * 100;
            penalty += Math.max(0, s.consecutiveHours - MAX_CONSECUTIVE_LECTURES) * 50;
            penalty += s.idleGaps * 20;
        });
    });
    return penalty;
}

// ─────────────────────────────────────────────────────────────────────────────
// SOFT OPTIMIZATION
// ─────────────────────────────────────────────────────────────────────────────

/**
 * softOptimizeIteration
 * One pass of soft optimization: tries all valid 1-hop lecture swaps within
 * each division and keeps the swap if it reduces the penalty score.
 *
 * Returns true if at least one improvement was made.
 */
function softOptimizeIteration(timetable) {
    const { stats: statsBefore } = buildFacultyOccupancy(timetable);
    const penaltyBefore = calculatePenalty(statsBefore);
    let improved = false;

    for (const [divisionKey, daysMap] of Object.entries(timetable)) {
        for (const dayA of DAYS) {
            const slotsA = daysMap?.[dayA] || [];
            for (let slotA = 0; slotA < 6; slotA++) {
                const cellA = slotsA[slotA];
                if (!cellA || cellA.fixed || cellA.span === 0 || cellA.type !== "LECTURE") continue;

                for (const dayB of DAYS) {
                    const slotsB = daysMap?.[dayB] || [];
                    for (let slotB = 0; slotB < 6; slotB++) {
                        if (dayA === dayB && slotA === slotB) continue;
                        const cellB = slotsB[slotB];
                        if (!cellB || cellB.fixed || cellB.span === 0 || cellB.type !== "LECTURE") continue;

                        const sessionA = { ...cellA, divisionKey, day: dayA, slotIdx: slotA };
                        const sessionB = { ...cellB, divisionKey, day: dayB, slotIdx: slotB };

                        if (!swapSessions(timetable, sessionA, sessionB)) continue;

                        // Measure new penalty
                        const { stats: statsAfter } = buildFacultyOccupancy(timetable);
                        const penaltyAfter = calculatePenalty(statsAfter);

                        if (penaltyAfter < penaltyBefore) {
                            improved = true;
                            // Keep the swap — it improved things
                            // Note: rebuild happens at the top of the next iteration
                            return true; // restart outer loop with fresh state
                        } else {
                            // Undo the swap
                            swapSessions(timetable, sessionB, sessionA);
                        }
                    }
                }
            }
        }
    }

    return improved;
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN ENTRY POINT
// ─────────────────────────────────────────────────────────────────────────────

/**
 * optimizeTimetable
 *
 * Full optimization pipeline:
 *   1. Build occupancy maps & stats (in-memory, never persisted)
 *   2. Detect hard conflicts
 *   3. Resolve each conflict (move or swap)
 *   4. Soft-optimize to reduce idle gaps and consecutive overloads
 *   5. Return optimized timetable + optimization report
 *
 * @param {Object} timetable - The generated timetable (mutated in-place)
 * @returns {{ timetable, optimizationReport }}
 */
export function optimizeTimetable(timetable) {
    if (!timetable || Object.keys(timetable).length === 0) {
        return { timetable, optimizationReport: null };
    }

    const startTime = Date.now();

    // ── Phase 1: Build initial in-memory occupancy + stats ───────────────
    let { occupancy, stats } = buildFacultyOccupancy(timetable);
    const initialPenalty = calculatePenalty(stats);

    const resolvedConflicts = [];
    const unresolvedConflicts = [];

    // ── Phase 2: Conflict detection & hard-conflict resolution ───────────
    let conflicts = detectFacultyConflicts(timetable, occupancy, stats);
    let hardConflictPasses = 0;

    while (conflicts.length > 0 && hardConflictPasses < 10) {
        hardConflictPasses++;
        let anyResolved = false;

        for (const conflict of conflicts) {
            let resolved = false;

            if (conflict.type === "FACULTY_DOUBLE_BOOKING") {
                resolved = resolveDoubleBooking(timetable, conflict);
            } else if (conflict.type === "CONSECUTIVE_OVERLOAD") {
                resolved = resolveConsecutiveOverload(timetable, conflict);
            }
            // DAILY_OVERLOAD: handled implicitly by double-booking resolution

            if (resolved) {
                resolvedConflicts.push({ ...conflict, resolvedAt: `Pass ${hardConflictPasses}` });
                anyResolved = true;
            } else {
                unresolvedConflicts.push(conflict);
            }
        }

        if (!anyResolved) break;

        // Rebuild occupancy after each resolution pass
        ({ occupancy, stats } = buildFacultyOccupancy(timetable));
        conflicts = detectFacultyConflicts(timetable, occupancy, stats);
    }

    // ── Phase 3: Soft optimization (penalty minimization) ────────────────
    let softIterations = 0;
    let softImproved = true;

    while (softImproved && softIterations < MAX_OPTIMIZATION_ITERATIONS) {
        softImproved = softOptimizeIteration(timetable);
        softIterations++;
    }

    // ── Phase 4: Final occupancy + stats snapshot ─────────────────────────
    const { occupancy: finalOccupancy, stats: finalStats } = buildFacultyOccupancy(timetable);
    const finalPenalty = calculatePenalty(finalStats);

    // ── Phase 5: Compose optimization report ─────────────────────────────
    const optimizationReport = {
        initialPenalty,
        finalPenalty,
        penaltyReduction: initialPenalty - finalPenalty,
        hardConflictPasses,
        softOptimizationIterations: softIterations,
        resolvedConflicts: resolvedConflicts.length,
        unresolvedConflicts: unresolvedConflicts.length,
        unresolvedDetails: unresolvedConflicts,
        durationMs: Date.now() - startTime,

        /** Per-faculty daily stats snapshot (final state) */
        facultyStats: finalStats,

        /**
         * Per-faculty occupancy snapshot (final state).
         * Shape: { "Prof A": { Monday: { "09:15-10:15": session | null, ... }, ... } }
         */
        facultyOccupancy: finalOccupancy,

        /** Summary for each faculty */
        facultySummary: Object.entries(finalStats).map(([faculty, dayStats]) => {
            let weeklyHours = 0;
            let weeklyLectures = 0;
            let weeklyPracticals = 0;
            let weeklyTutorials = 0;
            let totalIdleGaps = 0;
            let maxConsecutive = 0;

            DAYS.forEach((day) => {
                const s = dayStats[day] || {};
                weeklyHours += s.totalHours || 0;
                weeklyLectures += s.lectures || 0;
                weeklyPracticals += s.practicals || 0;
                weeklyTutorials += s.tutorials || 0;
                totalIdleGaps += s.idleGaps || 0;
                if ((s.consecutiveHours || 0) > maxConsecutive) maxConsecutive = s.consecutiveHours;
            });

            const overloaded = DAYS.some((d) => (dayStats[d]?.totalHours || 0) > 5);
            const hasConsecutiveIssue = maxConsecutive > MAX_CONSECUTIVE_LECTURES;

            return {
                faculty,
                weeklyHours,
                weeklyLectures,
                weeklyPracticals,
                weeklyTutorials,
                totalIdleGaps,
                maxConsecutive,
                overloaded,
                hasConsecutiveIssue,
                status: overloaded ? "OVERLOADED" : hasConsecutiveIssue ? "CONSECUTIVE_ISSUE" : "OPTIMAL",
            };
        }).sort((a, b) => b.weeklyHours - a.weeklyHours),
    };

    return { timetable, optimizationReport };
}
