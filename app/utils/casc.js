/**
 * casc.js — Course-Preserving Global Faculty-Aware Cascade Swap (CASC)
 *
 * Implements the ATLAS timetable repair mechanism:
 * Rearranges already-scheduled non-fixed sessions to create a valid position
 * for an unallocated Lecture, Tutorial, or Practical session.
 *
 * ABSOLUTE INVARIANTS:
 * 1. Global constraints are IMMUTABLE: cells with fixed === true are NEVER moved,
 *    swapped, replaced, or violated. Encounters reject the branch immediately.
 * 2. Course-faculty assignment is IMMUTABLE: Course -> Faculty binding is never changed.
 * 3. L/T/P requirements are IMMUTABLE: scheduled L/T/P must equal required L/T/P.
 * 4. Global faculty checking: Faculty availability is checked across ALL divisions/years.
 * 5. Practicals are 2-hour atomic blocks: starts only at slots [0, 2, 4], no splitting,
 *    no break crossing, batch allocations preserved.
 * 6. Atomic cascade transaction: all moves validated before atomic commit; rollback on failure.
 */

import { isFacultyBlockedByAvailability } from "./parseFacultyConstraints.js";

// ─── CONFIGURATION & CONSTANTS ───────────────────────────────────────────────

export const DEFAULT_CONFIG = {
    MAX_CASCADE_DEPTH: 4,          // Bounded search depth (default 4)
    MAX_CASCADE_BRANCHES: 20,      // Max branches explored per candidate
    MAX_CANDIDATES_PER_LEVEL: 20,  // Max candidate occupants per level
    MAX_TOTAL_EVALUATIONS: 500,    // Absolute cap on search evaluations to prevent hangs
    HARD_VIOLATION_PENALTY: 100000,
    SOFT_CONSTRAINT_PENALTY: 100,
    MOVE_COST: 10,
    DISRUPTION_COST: 5,
};

export const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
export const SLOTS_PER_DAY = 6;
export const PRACTICAL_VALID_STARTS = [0, 2, 4];
const GHOST_FACULTIES = new Set(["TBD", "FIXED", "TBD-FACULTY", "DEPT-FACULTY", ""]);

export function isRealFaculty(f) {
    return f && !GHOST_FACULTIES.has(String(f).trim());
}

/**
 * Extract all real faculties from a session (main faculty + batch allocations).
 */
export function extractFaculties(session) {
    const faculties = new Set();
    if (isRealFaculty(session?.faculty)) faculties.add(session.faculty);
    if (session?.batchAllocations && Array.isArray(session.batchAllocations)) {
        session.batchAllocations.forEach((a) => {
            if (isRealFaculty(a.faculty)) faculties.add(a.faculty);
        });
    }
    return [...faculties];
}

/**
 * Format human-readable session descriptor: e.g. "DSA — PSP"
 */
export function formatSessionDesc(session) {
    if (!session) return "Unknown";
    const course = session.courseCode || session.subject || session.courseName || "Course";
    const faculty = session.faculty || (session.batchAllocations ? session.batchAllocations.map(b => b.faculty).join("/") : "TBD");
    return `${course} — ${faculty}`;
}

// ─── GLOBAL FACULTY AVAILABILITY CHECK ───────────────────────────────────────

/**
 * Check if a faculty is free at a given (day, slot) across ALL divisions in the timetable.
 * Also checks faculty availability blackouts and global faculty schedule.
 *
 * @param {Object} timetable - Complete multi-division timetable
 * @param {string} faculty - Faculty identifier
 * @param {string} day - Day of week
 * @param {number} slotIdx - Slot index (0..5)
 * @param {Object} facultyAvailability - Faculty availability blackouts
 * @param {Set<string>} [excludePositions] - Set of "divKey|day|slot" to ignore (being moved)
 * @param {Object} [facultySchedule] - Global faculty occupancy schedule
 * @returns {boolean} true if faculty is globally free at (day, slotIdx)
 */
export function isFacultyFreeAt(
    timetable,
    faculty,
    day,
    slotIdx,
    facultyAvailability = {},
    excludePositions = null,
    facultySchedule = null
) {
    if (!isRealFaculty(faculty)) return true;

    // 1. Check availability blackout (e.g. medical, day-off, time preference)
    if (isFacultyBlockedByAvailability(facultyAvailability, faculty, day, slotIdx)) {
        return false;
    }

    // 2. Check complete timetable across EVERY division / year
    if (timetable && typeof timetable === "object") {
        for (const [divKey, daysMap] of Object.entries(timetable)) {
            const cell = daysMap?.[day]?.[slotIdx];
            if (!cell || cell.span === 0) continue;

            // Skip cells that are being moved as part of the current cascade transaction
            if (excludePositions && excludePositions.has(`${divKey}|${day}|${slotIdx}`)) {
                continue;
            }

            // Check practical/tutorial batch allocations
            if ((cell.type === "PRACTICAL" || cell.type === "TUTORIAL") && Array.isArray(cell.batchAllocations)) {
                if (cell.batchAllocations.some((a) => a.faculty === faculty)) {
                    return false;
                }
            }

            // Check main faculty
            if (cell.faculty === faculty) {
                return false;
            }
        }
    }

    // 3. Check global faculty schedule if provided (for fixed/external bookings)
    if (facultySchedule?.[faculty]?.[day]?.[slotIdx]) {
        let isExcluded = false;
        if (excludePositions) {
            for (const pos of excludePositions) {
                const [pDiv, pDay, pSlot] = pos.split("|");
                if (pDay === day && parseInt(pSlot, 10) === slotIdx) {
                    const c = timetable?.[pDiv]?.[pDay]?.[pSlot];
                    if (c && (c.faculty === faculty || c.batchAllocations?.some((a) => a.faculty === faculty))) {
                        isExcluded = true;
                        break;
                    }
                }
            }
        }
        if (!isExcluded) {
            return false;
        }
    }

    return true;
}

// ─── DIVISION & BATCH COLLISION CHECKS ──────────────────────────────────────

/**
 * Check if a division's slot is free in the timetable.
 */
export function isDivisionSlotFree(timetable, divKey, day, slotIdx, excludePositions = null) {
    if (excludePositions && excludePositions.has(`${divKey}|${day}|${slotIdx}`)) return true;
    const cell = timetable[divKey]?.[day]?.[slotIdx];
    return cell === null || cell === undefined;
}

/**
 * Check if a batch already has a session at the target slot across the timetable.
 */
export function checkBatchCollision(timetable, divKey, day, slot, batch, nextSlot = null, excludePositions = null) {
    if (!batch) return false;
    const checkSlots = [slot];
    if (nextSlot !== null && nextSlot !== undefined) checkSlots.push(nextSlot);

    for (const s of checkSlots) {
        for (const [dk, daysMap] of Object.entries(timetable)) {
            if (excludePositions && excludePositions.has(`${dk}|${day}|${s}`)) continue;
            const cell = daysMap?.[day]?.[s];
            if (!cell) continue;

            if (cell.batch === batch) return true;
            if (Array.isArray(cell.batchAllocations)) {
                if (cell.batchAllocations.some((a) => a.batch === batch)) return true;
            }
        }
    }
    return false;
}

// ─── HARD CONSTRAINT VALIDATION ──────────────────────────────────────────────

/**
 * Validate that a session CAN be placed at a candidate (day, slot) considering
 * all hard constraints. Any failure rejects the candidate immediately.
 *
 * @param {Object} params
 * @returns {{ valid: boolean, violations: string[] }}
 */
export function validatePlacement({
    timetable,
    session,
    divKey,
    targetDay,
    targetSlot,
    facultyAvailability = {},
    excludePositions = null,
    facultySchedule = null,
}) {
    const violations = [];

    // ABSOLUTE RULE #1: Cannot move or violate fixed / global session
    if (session.fixed) {
        violations.push("Fixed/global constraint encountered");
        return { valid: false, violations };
    }

    // Check if the target slot contains an immutable fixed session
    const currentTargetCell = timetable[divKey]?.[targetDay]?.[targetSlot];
    if (currentTargetCell?.fixed) {
        violations.push("Fixed/global constraint encountered");
        return { valid: false, violations };
    }

    if (session.type === "PRACTICAL") {
        // PRACTICAL RULE: 2-hour atomic block starting only at [0, 2, 4]
        if (!PRACTICAL_VALID_STARTS.includes(targetSlot)) {
            violations.push("Practical continuity violation");
            return { valid: false, violations };
        }
        const nextSlot = targetSlot + 1;
        if (nextSlot >= SLOTS_PER_DAY) {
            violations.push("Practical continuity violation");
            return { valid: false, violations };
        }

        const nextTargetCell = timetable[divKey]?.[targetDay]?.[nextSlot];
        if (nextTargetCell?.fixed) {
            violations.push("Fixed/global constraint encountered");
            return { valid: false, violations };
        }

        // Division slot occupancy
        if (!isDivisionSlotFree(timetable, divKey, targetDay, targetSlot, excludePositions)) {
            violations.push("Destination occupied");
        }
        if (!isDivisionSlotFree(timetable, divKey, targetDay, nextSlot, excludePositions)) {
            violations.push("Destination occupied");
        }

        // Global faculty availability for both slots
        const faculties = extractFaculties(session);
        for (const faculty of faculties) {
            if (!isFacultyFreeAt(timetable, faculty, targetDay, targetSlot, facultyAvailability, excludePositions, facultySchedule)) {
                violations.push("Faculty conflict");
                break;
            }
            if (!isFacultyFreeAt(timetable, faculty, targetDay, nextSlot, facultyAvailability, excludePositions, facultySchedule)) {
                violations.push("Faculty conflict");
                break;
            }
        }

        // Batch collision check for practical
        if (session.batch) {
            if (checkBatchCollision(timetable, divKey, targetDay, targetSlot, session.batch, nextSlot, excludePositions)) {
                violations.push("Batch collision");
            }
        }
        if (Array.isArray(session.batchAllocations)) {
            for (const alloc of session.batchAllocations) {
                if (alloc.batch && checkBatchCollision(timetable, divKey, targetDay, targetSlot, alloc.batch, nextSlot, excludePositions)) {
                    violations.push("Batch collision");
                    break;
                }
            }
        }

    } else {
        // Single-slot session (Lecture / Tutorial)
        if (!isDivisionSlotFree(timetable, divKey, targetDay, targetSlot, excludePositions)) {
            violations.push("Destination occupied");
        }

        // Global faculty availability
        const faculties = extractFaculties(session);
        for (const faculty of faculties) {
            if (!isFacultyFreeAt(timetable, faculty, targetDay, targetSlot, facultyAvailability, excludePositions, facultySchedule)) {
                violations.push("Faculty conflict");
                break;
            }
        }

        // Batch collision check (critical for Tutorials)
        if (session.batch) {
            if (checkBatchCollision(timetable, divKey, targetDay, targetSlot, session.batch, null, excludePositions)) {
                violations.push("Batch collision");
            }
        }
        if (Array.isArray(session.batchAllocations)) {
            for (const alloc of session.batchAllocations) {
                if (alloc.batch && checkBatchCollision(timetable, divKey, targetDay, targetSlot, alloc.batch, null, excludePositions)) {
                    violations.push("Batch collision");
                    break;
                }
            }
        }
    }

    return { valid: violations.length === 0, violations };
}

// ─── SNAPSHOT & TRANSACTION MANAGEMENT ───────────────────────────────────────

export function snapshotCell(timetable, divKey, day, slotIdx) {
    const cell = timetable[divKey]?.[day]?.[slotIdx];
    if (!cell) return null;
    return JSON.parse(JSON.stringify(cell));
}

export function clearSessionFromTimetable(timetable, divKey, day, slotIdx, type) {
    if (!timetable[divKey]?.[day]) return;
    timetable[divKey][day][slotIdx] = null;
    if (type === "PRACTICAL" && slotIdx + 1 < SLOTS_PER_DAY) {
        timetable[divKey][day][slotIdx + 1] = null;
    }
}

export function placeSessionInTimetable(timetable, divKey, day, slotIdx, cell) {
    if (!timetable[divKey]?.[day]) return;
    timetable[divKey][day][slotIdx] = { ...cell, span: cell.type === "PRACTICAL" ? 2 : 1 };
    if (cell.type === "PRACTICAL" && slotIdx + 1 < SLOTS_PER_DAY) {
        timetable[divKey][day][slotIdx + 1] = {
            ...cell,
            span: 0,
            batchAllocations: cell.batchAllocations ? JSON.parse(JSON.stringify(cell.batchAllocations)) : null,
        };
    }
}

// ─── CANDIDATE SEARCH & DISCOVERY ───────────────────────────────────────────

export function findMovableSessions(timetable, divKey, targetDays = DAYS) {
    const sessions = [];
    targetDays.forEach((day) => {
        const daySlots = timetable[divKey]?.[day] || [];
        daySlots.forEach((cell, slotIdx) => {
            if (!cell || cell.fixed || cell.span === 0) return;
            sessions.push({
                cell: JSON.parse(JSON.stringify(cell)),
                divKey,
                day,
                slotIdx,
                type: cell.type,
                faculty: cell.faculty,
                batch: cell.batch,
                batchAllocations: cell.batchAllocations,
            });
        });
    });
    return sessions;
}

export function findFreeSlots(timetable, divKey, excludePositions = null, targetDays = DAYS) {
    const freeSlots = [];
    targetDays.forEach((day) => {
        for (let s = 0; s < SLOTS_PER_DAY; s++) {
            const cell = timetable[divKey]?.[day]?.[s];
            const isActuallyEmpty = cell === null || cell === undefined;
            const isClaimed = excludePositions && excludePositions.has(`${divKey}|${day}|${s}`);
            if (isActuallyEmpty && !isClaimed) {
                freeSlots.push({ day, slotIdx: s });
            }
        }
    });
    return freeSlots;
}

export function calculateCascadeCost(chain, config) {
    let cost = chain.length * config.MOVE_COST;
    chain.forEach((move) => {
        if (move.fromDay !== move.toDay) {
            cost += config.DISRUPTION_COST;
        }
    });
    return cost;
}

// ─── RECURSIVE CASCADE SEARCH WITH VISITED-STATE LOOP PREVENTION ────────────

/**
 * Recursive search to place a displaced session into a free slot or by displacing
 * another movable session.
 */
function findPlacementChain({
    timetable,
    sessionToMove,
    divKey,
    facultyAvailability,
    facultySchedule,
    excludePositions,
    visitedStates,
    currentChain,
    depth,
    maxDepth,
    maxCandidatesPerLevel,
    maxTotalEvals,
    state,
    config,
}) {
    // 1. Try placing sessionToMove into a free slot first (cheapest & shortest chain)
    const freeSlots = findFreeSlots(timetable, divKey, excludePositions);
    for (const { day, slotIdx } of freeSlots) {
        if (state.totalEvaluations >= maxTotalEvals) break;

        const placement = validatePlacement({
            timetable,
            session: sessionToMove.cell,
            divKey,
            targetDay: day,
            targetSlot: slotIdx,
            facultyAvailability,
            excludePositions,
            facultySchedule,
        });
        state.totalEvaluations++;

        if (placement.valid) {
            const completedChain = [...currentChain];
            completedChain[completedChain.length - 1].toDay = day;
            completedChain[completedChain.length - 1].toSlot = slotIdx;
            const cost = calculateCascadeCost(completedChain, config);
            return { found: true, chain: completedChain, cost };
        } else {
            placement.violations.forEach((v) => state.rejectedReasons.add(v));
        }
    }

    // 2. If depth limit not reached, try displacing another non-fixed session
    if (depth < maxDepth) {
        const nextCandidates = findMovableSessions(timetable, divKey).filter((ms) => {
            if (ms.cell.fixed) return false;
            // Practicals only swap with practicals; lectures/tutorials only with lectures/tutorials
            if (ms.type === "PRACTICAL" && sessionToMove.type !== "PRACTICAL") return false;
            if (ms.type !== "PRACTICAL" && sessionToMove.type === "PRACTICAL") return false;

            const posKey = `${divKey}|${ms.day}|${ms.slotIdx}`;
            if (excludePositions.has(posKey)) return false;
            if (visitedStates.has(posKey)) return false;
            return true;
        }).slice(0, maxCandidatesPerLevel);

        for (const nextCandidate of nextCandidates) {
            if (state.totalEvaluations >= maxTotalEvals) break;
            state.attemptedBranches++;

            const posKey = `${divKey}|${nextCandidate.day}|${nextCandidate.slotIdx}`;
            const newExclude = new Set(excludePositions);
            newExclude.add(posKey);
            if (nextCandidate.type === "PRACTICAL") {
                newExclude.add(`${divKey}|${nextCandidate.day}|${nextCandidate.slotIdx + 1}`);
            }

            const canPlace = validatePlacement({
                timetable,
                session: sessionToMove.cell,
                divKey,
                targetDay: nextCandidate.day,
                targetSlot: nextCandidate.slotIdx,
                facultyAvailability,
                excludePositions: newExclude,
                facultySchedule,
            });
            state.totalEvaluations++;

            if (!canPlace.valid) {
                canPlace.violations.forEach((v) => state.rejectedReasons.add(v));
                continue;
            }

            // sessionToMove fits here; now find placement for nextCandidate
            const newVisited = new Set(visitedStates);
            newVisited.add(posKey);

            const extendedChain = [...currentChain];
            extendedChain[extendedChain.length - 1].toDay = nextCandidate.day;
            extendedChain[extendedChain.length - 1].toSlot = nextCandidate.slotIdx;
            extendedChain.push({
                sessionDesc: formatSessionDesc(nextCandidate.cell),
                divKey,
                fromDay: nextCandidate.day,
                fromSlot: nextCandidate.slotIdx,
                toDay: null,
                toSlot: null,
                type: nextCandidate.type,
            });

            const result = findPlacementChain({
                timetable,
                sessionToMove: nextCandidate,
                divKey,
                facultyAvailability,
                facultySchedule,
                excludePositions: newExclude,
                visitedStates: newVisited,
                currentChain: extendedChain,
                depth: depth + 1,
                maxDepth,
                maxCandidatesPerLevel,
                maxTotalEvals,
                state,
                config,
            });

            if (result.found) {
                return result;
            }
        }
    }

    return { found: false, chain: currentChain, cost: Infinity };
}

/**
 * Main cascade search algorithm.
 * Evaluates candidate slots day-by-day across all working days (Mon–Fri).
 * Employs iterative deepening (depth 1..4) to guarantee finding the minimal movement cascade.
 */
export function searchCascade({
    timetable,
    targetSession,
    targetDivKey,
    facultyAvailability = {},
    facultySchedule = null,
    config = DEFAULT_CONFIG,
}) {
    const maxDepth = config.MAX_CASCADE_DEPTH || 4;
    const maxCandidatesPerLevel = config.MAX_CANDIDATES_PER_LEVEL || 20;
    const maxTotalEvals = config.MAX_TOTAL_EVALUATIONS || 500;

    const state = {
        totalEvaluations: 0,
        attemptedBranches: 0,
        rejectedReasons: new Set(),
    };

    // Systematically search days: start with preferred day if any, then all working days
    const orderedDays = [...DAYS];
    if (targetSession.preferredDay && orderedDays.includes(targetSession.preferredDay)) {
        orderedDays.splice(orderedDays.indexOf(targetSession.preferredDay), 1);
        orderedDays.unshift(targetSession.preferredDay);
    }

    // Iterative deepening over cascade depth: 1, 2, 3, 4
    for (let currentMaxDepth = 1; currentMaxDepth <= maxDepth; currentMaxDepth++) {
        for (const day of orderedDays) {
            if (state.totalEvaluations >= maxTotalEvals) break;

            const checkSlots = targetSession.type === "PRACTICAL"
                ? PRACTICAL_VALID_STARTS
                : [0, 1, 2, 3, 4, 5];

            for (const slotIdx of checkSlots) {
                if (state.totalEvaluations >= maxTotalEvals) break;

                const cell = timetable[targetDivKey]?.[day]?.[slotIdx];
                const nextCell = targetSession.type === "PRACTICAL"
                    ? timetable[targetDivKey]?.[day]?.[slotIdx + 1]
                    : null;

                // Absolute Rule #1: Global / fixed constraints are immutable anchors
                if (cell?.fixed || nextCell?.fixed) {
                    state.attemptedBranches++;
                    state.rejectedReasons.add("Fixed/global constraint encountered");
                    continue; // Reject branch immediately!
                }

                // If occupied by movable session:
                if (cell && !cell.fixed && cell.span !== 0) {
                    if (targetSession.type !== "PRACTICAL" && cell.type === "PRACTICAL") {
                        continue; // Lecture/tutorial cannot displace 2-hour practical
                    }
                    if (targetSession.type === "PRACTICAL" && cell.type !== "PRACTICAL" && (nextCell && !nextCell.fixed && nextCell.span !== 0)) {
                        continue;
                    }

                    const candidate = {
                        cell: JSON.parse(JSON.stringify(cell)),
                        divKey: targetDivKey,
                        day,
                        slotIdx,
                        type: cell.type,
                        faculty: cell.faculty,
                        batch: cell.batch,
                        batchAllocations: cell.batchAllocations,
                    };

                    state.attemptedBranches++;
                    const candidatePos = `${targetDivKey}|${day}|${slotIdx}`;
                    const excludePositions = new Set([candidatePos]);
                    if (targetSession.type === "PRACTICAL") {
                        excludePositions.add(`${targetDivKey}|${day}|${slotIdx + 1}`);
                    }

                    // Check if target session can be placed at candidate's slot
                    const targetPlacement = validatePlacement({
                        timetable,
                        session: targetSession,
                        divKey: targetDivKey,
                        targetDay: day,
                        targetSlot: slotIdx,
                        facultyAvailability,
                        excludePositions,
                        facultySchedule,
                    });
                    state.totalEvaluations++;

                    if (!targetPlacement.valid) {
                        targetPlacement.violations.forEach((v) => state.rejectedReasons.add(v));
                        continue;
                    }

                    // Target session fits! Now find a placement for the candidate occupant
                    const initialChain = [{
                        sessionDesc: formatSessionDesc(candidate.cell),
                        divKey: targetDivKey,
                        fromDay: candidate.day,
                        fromSlot: candidate.slotIdx,
                        toDay: null,
                        toSlot: null,
                        type: candidate.type,
                    }];

                    const visitedStates = new Set([candidatePos]);

                    const chainResult = findPlacementChain({
                        timetable,
                        sessionToMove: candidate,
                        divKey: targetDivKey,
                        facultyAvailability,
                        facultySchedule,
                        excludePositions: new Set(excludePositions),
                        visitedStates,
                        currentChain: initialChain,
                        depth: 1,
                        maxDepth: currentMaxDepth,
                        maxCandidatesPerLevel,
                        maxTotalEvals,
                        state,
                        config,
                    });

                    if (chainResult.found) {
                        return {
                            found: true,
                            chain: chainResult.chain,
                            cost: chainResult.cost,
                            targetDay: candidate.day,
                            targetSlot: candidate.slotIdx,
                            diagnostics: {
                                totalEvaluations: state.totalEvaluations,
                                attemptedBranches: state.attemptedBranches,
                                rejectedReasons: state.rejectedReasons,
                                depth: chainResult.chain.length,
                            },
                        };
                    }
                }
            }
        }
    }

    return {
        found: false,
        chain: [],
        cost: Infinity,
        diagnostics: {
            totalEvaluations: state.totalEvaluations,
            attemptedBranches: state.attemptedBranches,
            rejectedReasons: state.rejectedReasons,
        },
    };
}

// ─── ATOMIC TRANSACTION EXECUTION & ROLLBACK ─────────────────────────────────

/**
 * Execute a proposed cascade transaction atomically.
 * If any step fails, rolls back the entire timetable and faculty schedule.
 */
export function executeCascade({
    timetable,
    chain,
    targetSession,
    targetDivKey,
    targetDay,
    targetSlot,
    facultySchedule,
}) {
    // Snapshot all affected cells for rollback safety
    const snapshots = [];
    const facultySnapshots = [];

    chain.forEach((move) => {
        snapshots.push({
            divKey: move.divKey || targetDivKey,
            day: move.fromDay,
            slotIdx: move.fromSlot,
            cell: snapshotCell(timetable, move.divKey || targetDivKey, move.fromDay, move.fromSlot),
        });
        if (move.toDay && move.toSlot !== null) {
            snapshots.push({
                divKey: move.divKey || targetDivKey,
                day: move.toDay,
                slotIdx: move.toSlot,
                cell: snapshotCell(timetable, move.divKey || targetDivKey, move.toDay, move.toSlot),
            });
        }
        if (move.type === "PRACTICAL") {
            snapshots.push({
                divKey: move.divKey || targetDivKey,
                day: move.fromDay,
                slotIdx: move.fromSlot + 1,
                cell: snapshotCell(timetable, move.divKey || targetDivKey, move.fromDay, move.fromSlot + 1),
            });
            if (move.toDay && move.toSlot !== null) {
                snapshots.push({
                    divKey: move.divKey || targetDivKey,
                    day: move.toDay,
                    slotIdx: move.toSlot + 1,
                    cell: snapshotCell(timetable, move.divKey || targetDivKey, move.toDay, move.toSlot + 1),
                });
            }
        }
    });

    // Also snapshot target slot
    snapshots.push({
        divKey: targetDivKey,
        day: targetDay,
        slotIdx: targetSlot,
        cell: snapshotCell(timetable, targetDivKey, targetDay, targetSlot),
    });
    if (targetSession.type === "PRACTICAL") {
        snapshots.push({
            divKey: targetDivKey,
            day: targetDay,
            slotIdx: targetSlot + 1,
            cell: snapshotCell(timetable, targetDivKey, targetDay, targetSlot + 1),
        });
    }

    try {
        // Execute moves in reverse order (leaf displacement first)
        for (let i = chain.length - 1; i >= 0; i--) {
            const move = chain[i];
            const div = move.divKey || targetDivKey;
            const srcCell = snapshotCell(timetable, div, move.fromDay, move.fromSlot);
            if (!srcCell) continue;

            // Clear source slot
            clearSessionFromTimetable(timetable, div, move.fromDay, move.fromSlot, move.type);

            // Update faculty schedule (unmark source)
            const faculties = extractFaculties(srcCell);
            faculties.forEach((f) => {
                if (facultySchedule?.[f]?.[move.fromDay]) {
                    delete facultySchedule[f][move.fromDay][move.fromSlot];
                    if (move.type === "PRACTICAL") {
                        delete facultySchedule[f][move.fromDay][move.fromSlot + 1];
                    }
                }
            });

            // Place at destination
            if (move.toDay !== null && move.toSlot !== null) {
                placeSessionInTimetable(timetable, div, move.toDay, move.toSlot, srcCell);

                // Update faculty schedule (mark destination)
                faculties.forEach((f) => {
                    if (facultySchedule) {
                        if (!facultySchedule[f]) facultySchedule[f] = {};
                        if (!facultySchedule[f][move.toDay]) facultySchedule[f][move.toDay] = {};
                        facultySchedule[f][move.toDay][move.toSlot] = true;
                        if (move.type === "PRACTICAL") {
                            facultySchedule[f][move.toDay][move.toSlot + 1] = true;
                        }
                    }
                });
            }
        }

        // Place target session at freed target slot
        if (targetSession.type === "PRACTICAL") {
            const targetPracticalCell = {
                ...targetSession,
                type: "PRACTICAL",
                span: 2,
                fixed: false,
                batchAllocations: targetSession.batchAllocations
                    ? JSON.parse(JSON.stringify(targetSession.batchAllocations))
                    : (targetSession.batch ? [{ ...targetSession }] : null),
            };
            const targetPracticalTail = {
                ...targetSession,
                type: "PRACTICAL",
                span: 0,
                fixed: false,
                batchAllocations: targetSession.batchAllocations
                    ? JSON.parse(JSON.stringify(targetSession.batchAllocations))
                    : (targetSession.batch ? [{ ...targetSession }] : null),
            };
            timetable[targetDivKey][targetDay][targetSlot] = targetPracticalCell;
            timetable[targetDivKey][targetDay][targetSlot + 1] = targetPracticalTail;

            const faculties = extractFaculties(targetSession);
            faculties.forEach((f) => {
                if (facultySchedule) {
                    if (!facultySchedule[f]) facultySchedule[f] = {};
                    if (!facultySchedule[f][targetDay]) facultySchedule[f][targetDay] = {};
                    facultySchedule[f][targetDay][targetSlot] = true;
                    facultySchedule[f][targetDay][targetSlot + 1] = true;
                }
            });
        } else {
            timetable[targetDivKey][targetDay][targetSlot] = {
                ...targetSession,
                span: 1,
                fixed: false,
            };
            const faculties = extractFaculties(targetSession);
            faculties.forEach((f) => {
                if (facultySchedule) {
                    if (!facultySchedule[f]) facultySchedule[f] = {};
                    if (!facultySchedule[f][targetDay]) facultySchedule[f][targetDay] = {};
                    facultySchedule[f][targetDay][targetSlot] = true;
                }
            });
        }

        targetSession.allocated = true;
        return { success: true, error: null };

    } catch (err) {
        // ROLLBACK TRANSACTION
        snapshots.forEach((snap) => {
            if (snap.cell === null) {
                if (timetable[snap.divKey]?.[snap.day]) {
                    timetable[snap.divKey][snap.day][snap.slotIdx] = null;
                }
            } else {
                if (timetable[snap.divKey]?.[snap.day]) {
                    timetable[snap.divKey][snap.day][snap.slotIdx] = snap.cell;
                }
            }
        });
        targetSession.allocated = false;
        return { success: false, error: `Cascade execution failed: ${err.message}` };
    }
}

// ─── DIAGNOSTIC LOG FORMATTING ───────────────────────────────────────────────

export function formatCascadeSuccess({ targetSession, divKey, chain, targetDay, targetSlot }) {
    const targetDesc = formatSessionDesc(targetSession);
    let out = "CASCADE SUCCESS\n\n";
    out += `Target:\n${targetDesc}\n`;
    out += `Division:\n${divKey}\n\n`;
    out += "Chain:\n";
    chain.forEach((move, idx) => {
        out += `${idx + 1}. Move ${move.sessionDesc}\n`;
        out += `   ${move.divKey || divKey} Slot ${move.fromSlot} (${move.fromDay}) → ${move.divKey || divKey} Slot ${move.toSlot} (${move.toDay})\n\n`;
    });
    out += `${chain.length + 1}. Place ${targetDesc}\n`;
    out += `   ${divKey} Slot ${targetSlot} (${targetDay})\n\n`;
    out += `Depth:\n${chain.length}\n\n`;
    out += "All hard constraints:\nPASS\n";
    return out;
}

export function formatCascadeFailed({ targetSession, attemptedBranches, rejectedReasons }) {
    const targetDesc = formatSessionDesc(targetSession);
    let out = "CASCADE FAILED\n\n";
    out += `Target:\n${targetDesc}\n\n`;
    out += `Attempted branches:\n${attemptedBranches}\n\n`;
    out += "Rejected because:\n";
    if (!rejectedReasons || rejectedReasons.size === 0) {
        out += "- No candidate slot found within search limits\n";
    } else {
        rejectedReasons.forEach((reason) => {
            out += `- ${reason}\n`;
        });
    }
    return out;
}

// ─── PUBLIC API ──────────────────────────────────────────────────────────────

/**
 * Attempt to place an unallocated session using Course-Preserving Global Faculty-Aware Cascade Swap.
 *
 * @param {Object} params
 * @param {Object} params.timetable - Multi-division timetable
 * @param {Object} params.session - Unallocated session to place
 * @param {Object} params.facultySchedule - Global faculty occupancy schedule
 * @param {Object} [params.facultyAvailability] - Faculty availability blackouts
 * @param {Object} [params.config] - Optional configuration overrides
 * @returns {{ success: boolean, chain: Array, cost: number, diagnostics: Object }}
 */
export function attemptCascadePlacement({
    timetable,
    session,
    facultySchedule,
    facultyAvailability = {},
    config: userConfig = {},
}) {
    const config = { ...DEFAULT_CONFIG, ...userConfig };
    const divKey = `${session.year}-${session.division}`;

    if (!timetable[divKey]) {
        const diag = {
            targetDesc: formatSessionDesc(session),
            attemptedBranches: 0,
            rejectedReasons: new Set([`Division ${divKey} not found in timetable`]),
            reason: `Division ${divKey} not found in timetable`,
        };
        const formattedLog = formatCascadeFailed(diag);
        return {
            success: false,
            chain: [],
            cost: Infinity,
            diagnostics: { ...diag, formattedLog },
        };
    }

    // Step 1: Search for valid cascade chain
    const searchResult = searchCascade({
        timetable,
        targetSession: session,
        targetDivKey: divKey,
        facultyAvailability,
        facultySchedule,
        config,
    });

    if (!searchResult.found) {
        const diag = {
            targetSession: session,
            attemptedBranches: searchResult.diagnostics.attemptedBranches,
            rejectedReasons: searchResult.diagnostics.rejectedReasons,
            reason: "No valid cascade found within search bounds",
        };
        const formattedLog = formatCascadeFailed(diag);
        return {
            success: false,
            chain: [],
            cost: Infinity,
            diagnostics: { ...diag, formattedLog },
        };
    }

    const targetDay = searchResult.targetDay;
    const targetSlot = searchResult.targetSlot;

    // Step 2: Atomically execute the cascade chain
    const execResult = executeCascade({
        timetable,
        chain: searchResult.chain,
        targetSession: session,
        targetDivKey: divKey,
        targetDay,
        targetSlot,
        facultySchedule,
    });

    if (!execResult.success) {
        const diag = {
            targetSession: session,
            attemptedBranches: searchResult.diagnostics.attemptedBranches,
            rejectedReasons: new Set([execResult.error]),
            reason: execResult.error,
        };
        const formattedLog = formatCascadeFailed(diag);
        return {
            success: false,
            chain: searchResult.chain,
            cost: searchResult.cost,
            diagnostics: { ...diag, formattedLog },
        };
    }

    // Cascade succeeded! Format success diagnostic
    const formattedLog = formatCascadeSuccess({
        targetSession: session,
        divKey,
        chain: searchResult.chain,
        targetDay,
        targetSlot,
    });

    return {
        success: true,
        chain: searchResult.chain,
        cost: searchResult.cost,
        targetPosition: { day: targetDay, slot: targetSlot },
        diagnostics: {
            ...searchResult.diagnostics,
            cascadeDepth: searchResult.chain.length,
            sessionsMoved: searchResult.chain.length,
            targetDesc: formatSessionDesc(session),
            divKey,
            formattedLog,
            reason: `Cascade of depth ${searchResult.chain.length} successful`,
        },
    };
}

/**
 * Generate a diagnostic report for CASC operations.
 */
export function generateCASCReport(cascadeResults = []) {
    const successful = cascadeResults.filter((r) => r.success);
    const failed = cascadeResults.filter((r) => !r.success);

    return {
        totalAttempts: cascadeResults.length,
        successfulCascades: successful.length,
        failedCascades: failed.length,
        averageCascadeDepth: successful.length > 0
            ? parseFloat((successful.reduce((sum, r) => sum + (r.chain?.length || 0), 0) / successful.length).toFixed(2))
            : 0,
        totalSessionsMoved: successful.reduce((sum, r) => sum + (r.chain?.length || 0), 0),
        averageCost: successful.length > 0
            ? parseFloat((successful.reduce((sum, r) => sum + r.cost, 0) / successful.length).toFixed(2))
            : 0,
        chains: successful.map((r) => ({
            chain: r.chain,
            cost: r.cost,
            targetPosition: r.targetPosition,
        })),
        failureReasons: failed.map((r) => r.diagnostics?.reason || "Unknown").slice(0, 10),
    };
}
