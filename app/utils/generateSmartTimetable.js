import { createEmptyTimetable } from "./createEmptyTimetable";
import { generateSessionPool } from "./generateSessionPool";
import { applyFixedConstraints } from "./applyFixedConstraints";
import { allocateSessions } from "./allocateSessions";
import { allocateResources } from "./allocateResources";
import { applyConstraintCounts } from "./applyConstraintCounts";
import { validateTimetable } from "./validateTimetable";
import { generateConflictReport } from "./generateConflictReport";
import { generateFacultyWorkloadReport } from "./generateFacultyWorkloadReport";
import { generateResourceUtilizationReport } from "./generateResourceUtilizationReport";
import { generateBatchTimetable } from "./generateBatchTimetable";
import { generateFacultyTimetable } from "./generateFacultyTimetable";
import { generateLocationTimetable } from "./generateLocationTimetable";
import { computeValidationScore } from "./computeValidationScore";
import { isFacultyBlockedByAvailability } from "./parseFacultyConstraints";
import { optimizeTimetable } from "./optimizeTimetable";

export function generateSmartTimetable(
    groupedData,
    globalConstraints = [],
    syncRules = [],
    resources = {},
    maxTrials = 50,
    facultyAvailability = {}
) {
    let bestTimetable = null;
    let bestReport = null;
    let bestPenalty = Infinity;
    let bestConflictReport = null;
    let bestSessionPool = null;

    for (let trial = 1; trial <= maxTrials; trial++) {
        const clonedGroupedData = JSON.parse(JSON.stringify(groupedData));
        const timetableObj = createEmptyTimetable(clonedGroupedData);

        // Step 1: Deduct pre-allocated fixed constraint counts from course loads
        applyConstraintCounts(clonedGroupedData, globalConstraints);

        const sessionPool = generateSessionPool(clonedGroupedData, syncRules);

        // Shuffle session pool on retries to explore different placement orders
        if (trial > 1) {
            sessionPool.sort(() => Math.random() - 0.5);
        }

        // Step 2: Apply fixed constraints (hard)
        applyFixedConstraints(timetableObj, globalConstraints);

        // Step 3: Allocate practicals → tutorials → lectures (respecting faculty availability blackouts)
        allocateSessions(timetableObj, sessionPool, facultyAvailability);

        // Step 4: Assign resources (rooms, labs, tutorial rooms)
        allocateResources(timetableObj, resources);

        // Step 5: Run self-healing repair loop (also respects faculty availability)
        selfHealingRepairLoop(timetableObj, sessionPool, globalConstraints, resources, facultyAvailability);

        // Step 5b: Re-run resource allocation to guarantee 100% conflict-free rooms for all repaired sessions
        allocateResources(timetableObj, resources);

        // Step 6: Validate
        const report = validateTimetable(timetableObj, sessionPool, resources);
        const conflictReport = generateConflictReport(timetableObj, sessionPool, globalConstraints);

        const facultyClashCount = conflictReport.summary.FACULTY_CLASH;
        const unallocatedCount =
            (report.missingLectures || []).length +
            (report.missingTutorials || []).length +
            (report.missingPracticals || []).length;
        const resourceClashCount =
            conflictReport.summary.ROOM_CLASH +
            conflictReport.summary.LAB_CLASH +
            conflictReport.summary.TUTORIAL_ROOM_CLASH;
        const breakViolations = conflictReport.summary.PRACTICAL_BREAK_VIOLATION;

        // Unallocated sessions receive the HIGHEST penalty (100,000) so any trial with 0 missing sessions wins
        const penalty =
            unallocatedCount * 100000 +
            facultyClashCount * 10000 +
            resourceClashCount * 500 +
            breakViolations * 200;


        if (penalty < bestPenalty) {
            bestPenalty = penalty;
            bestTimetable = timetableObj;
            bestReport = report;
            bestConflictReport = conflictReport;
            bestSessionPool = sessionPool;
        }

        if (penalty === 0) {
            console.log(`✓ Perfect conflict-free timetable found on Trial #${trial}!`);
            break;
        }
    }

    // ── POST-GENERATION OPTIMIZATION ─────────────────────────────────────
    // Runs an in-memory optimization pass: builds faculty occupancy maps,
    // detects hard conflicts (double-bookings, consecutive overloads),
    // resolves them via session move/swap, then soft-optimizes for penalty.
    // This data is NEVER stored — only the returned timetable is used.
    const { timetable: optimizedTimetable, optimizationReport } = optimizeTimetable(bestTimetable);

    // Use winning trial session pool for downstream reports
    const winningSessionPool = bestSessionPool || (() => {
        const cloned = JSON.parse(JSON.stringify(groupedData));
        applyConstraintCounts(cloned, globalConstraints);
        return generateSessionPool(cloned, syncRules);
    })();

    const facultyWorkloadReport = generateFacultyWorkloadReport(optimizedTimetable, winningSessionPool);
    const resourceUtilizationReport = generateResourceUtilizationReport(optimizedTimetable, resources);
    const batchTimetable = generateBatchTimetable(optimizedTimetable);
    const facultyTimetable = generateFacultyTimetable(optimizedTimetable);
    const locationTimetable = generateLocationTimetable(optimizedTimetable);
    const validationScore = computeValidationScore(bestReport, bestConflictReport);

    return {
        timetable: optimizedTimetable,
        report: bestReport,
        conflictReport: bestConflictReport,
        facultyWorkloadReport,
        resourceUtilizationReport,
        batchTimetable,
        facultyTimetable,
        locationTimetable,
        validationScore,
        optimizationReport,
    };
}

/**
 * Self-Healing Repair Loop
 * Tries to fix remaining unallocated sessions and remove conflicts after initial allocation.
 */
function selfHealingRepairLoop(timetable, sessionPool, globalConstraints, resources, facultyAvailability = {}) {
    const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
    const MAX_REPAIR_PASSES = 8; // Increased passes for better convergence

    // Helper: count available slots for a faculty after applying availability blackouts
    function availableSlotCount(faculty) {
        if (!faculty || !facultyAvailability[faculty]) return 30;
        let blocked = 0;
        days.forEach((day) => { blocked += (facultyAvailability[faculty][day] || []).length; });
        return Math.max(1, 30 - blocked);
    }

    for (let pass = 0; pass < MAX_REPAIR_PASSES; pass++) {
        let repaired = false;

        // Rebuild faculty schedule from current timetable state
        const facultySchedule = buildFacultySchedule(timetable, days);

        // Find all unallocated sessions
        const unallocated = sessionPool.filter((s) => !s.allocated);
        if (unallocated.length === 0) break;

        // STRATEGY 2: Sort unallocated sessions most-constrained-first in repair loop.
        // Faculty with fewest available slots are retried first — they need rescue the most.
        unallocated.sort((a, b) => availableSlotCount(a.faculty) - availableSlotCount(b.faculty));

        unallocated.forEach((session) => {
            const timetableKey = `${session.year}-${session.division}`;
            if (!timetable[timetableKey]) return;

            // --- Pass A: Direct placement into a free slot ---
            for (let d = 0; d < days.length; d++) {
                if (session.allocated) break;
                const day = days[d];
                const daySlots = timetable[timetableKey]?.[day];
                if (!daySlots) continue;

                if (session.type === "PRACTICAL") {
                    const validStarts = [0, 2, 4, 1, 3];
                    for (const slot of validStarts) {
                        if (session.allocated) break;
                        if (slot + 1 >= 6) continue;
                        if (isBusyInSchedule(facultySchedule, session.faculty, day, slot, facultyAvailability)) continue;
                        if (isBusyInSchedule(facultySchedule, session.faculty, day, slot + 1, facultyAvailability)) continue;

                        const cur = daySlots[slot];
                        const nxt = daySlots[slot + 1];

                        // Try merging into existing practical block first
                        if (cur?.type === "PRACTICAL" && cur.span === 2 && nxt?.type === "PRACTICAL" && nxt.span === 0) {
                            const existBatches = new Set((cur.batchAllocations || []).map((b) => b.batch));
                            const existFaculties = new Set((cur.batchAllocations || []).map((b) => b.faculty).filter(Boolean));
                            if (!existBatches.has(session.batch) && (!session.faculty || !existFaculties.has(session.faculty))) {
                                if (!cur.batchAllocations) cur.batchAllocations = [];
                                if (!nxt.batchAllocations) nxt.batchAllocations = [];
                                cur.batchAllocations.push(session);
                                nxt.batchAllocations.push(session);
                                markBusyInSchedule(facultySchedule, session.faculty, day, slot);
                                markBusyInSchedule(facultySchedule, session.faculty, day, slot + 1);
                                session.allocated = true;
                                repaired = true;
                            }
                        } else if (cur === null && nxt === null) {
                            // Open 2-hour window — create new practical block with batchAllocations
                            daySlots[slot] = { type: "PRACTICAL", span: 2, fixed: false, batchAllocations: [session] };
                            daySlots[slot + 1] = { type: "PRACTICAL", span: 0, fixed: false, batchAllocations: [session] };
                            markBusyInSchedule(facultySchedule, session.faculty, day, slot);
                            markBusyInSchedule(facultySchedule, session.faculty, day, slot + 1);
                            session.allocated = true;
                            repaired = true;
                        }
                    }
                    continue; // practicals handled above; skip the lecture path
                }

                for (let slot = 0; slot < 6; slot++) {
                    if (daySlots[slot] !== null) continue;
                    if (isBusyInSchedule(facultySchedule, session.faculty, day, slot, facultyAvailability)) continue;

                    daySlots[slot] = { ...session, span: 1, fixed: false };
                    markBusyInSchedule(facultySchedule, session.faculty, day, slot);
                    session.allocated = true;
                    repaired = true;
                    break;
                }
            }


            // --- Pass B: Availability-Aware 1-Hop Swap ---
            // Find a placed non-fixed lecture where:
            //   (i)  Our constrained faculty CAN teach in that slot (not blocked by availability)
            //   (ii) The occupant's faculty CAN be moved to some other empty slot
            if (!session.allocated) {
                for (let d = 0; d < days.length; d++) {
                    const day = days[d];
                    const daySlots = timetable[timetableKey]?.[day];
                    if (!daySlots) continue;

                    for (let slot = 0; slot < 6; slot++) {
                        const occupant = daySlots[slot];
                        if (!occupant || occupant.fixed || occupant.span === 0 || occupant.type !== "LECTURE") continue;
                        if (isBusyInSchedule(facultySchedule, session.faculty, day, slot, facultyAvailability)) continue;

                        let swapped = false;
                        for (let d2 = 0; d2 < days.length && !swapped; d2++) {
                            const newDay = days[d2];
                            const newDaySlots = timetable[timetableKey]?.[newDay];
                            if (!newDaySlots) continue;
                            for (let newSlot = 0; newSlot < 6; newSlot++) {
                                if (newDaySlots[newSlot] !== null) continue;
                                if (d2 === d && newSlot === slot) continue;
                                if (isBusyInSchedule(facultySchedule, occupant.faculty, newDay, newSlot, facultyAvailability)) continue;

                                // Execute 1-hop swap
                                newDaySlots[newSlot] = { ...occupant };
                                markBusyInSchedule(facultySchedule, occupant.faculty, newDay, newSlot);
                                unmarkBusyInSchedule(facultySchedule, occupant.faculty, day, slot);

                                daySlots[slot] = { ...session, span: 1, fixed: false };
                                markBusyInSchedule(facultySchedule, session.faculty, day, slot);
                                session.allocated = true;
                                repaired = true;
                                swapped = true;
                                break;
                            }
                        }
                        if (swapped) break;
                    }
                    if (session.allocated) break;
                }
            }

            // --- Pass C: STRATEGY 3 — Cascade 2-Hop Swap (A→C, B→A) ---
            // If 1-hop swap failed, try a chain:
            //   Step 1: Move an intermediate lecture B to any open slot C
            //   Step 2: This frees slot B for our constrained session A
            // This unblocks situations where all direct candidates are also stuck.
            if (!session.allocated) {
                const allPlacedLectures = [];
                days.forEach((day) => {
                    (timetable[timetableKey]?.[day] || []).forEach((cell, slotIdx) => {
                        if (cell && !cell.fixed && cell.span === 1 && cell.type === "LECTURE") {
                            allPlacedLectures.push({ day, slot: slotIdx, cell });
                        }
                    });
                });

                for (const { day: aDay, slot: aSlot } of allPlacedLectures) {
                    if (session.allocated) break;
                    // Can our session go to aDay+aSlot?
                    if (isBusyInSchedule(facultySchedule, session.faculty, aDay, aSlot, facultyAvailability)) continue;

                    const aOccupant = timetable[timetableKey][aDay][aSlot];
                    if (!aOccupant || aOccupant.fixed) continue;

                    // Can aOccupant be moved to any other empty slot?
                    for (let d2 = 0; d2 < days.length && !session.allocated; d2++) {
                        const bDay = days[d2];
                        const bSlots = timetable[timetableKey]?.[bDay];
                        if (!bSlots) continue;

                        for (let bSlot = 0; bSlot < 6 && !session.allocated; bSlot++) {
                            if (bSlots[bSlot] !== null) continue;
                            if (bDay === aDay && bSlot === aSlot) continue;
                            if (isBusyInSchedule(facultySchedule, aOccupant.faculty, bDay, bSlot, facultyAvailability)) continue;

                            // Execute 2-hop cascade: aOccupant → bDay+bSlot, session → aDay+aSlot
                            bSlots[bSlot] = { ...aOccupant };
                            markBusyInSchedule(facultySchedule, aOccupant.faculty, bDay, bSlot);
                            unmarkBusyInSchedule(facultySchedule, aOccupant.faculty, aDay, aSlot);

                            timetable[timetableKey][aDay][aSlot] = { ...session, span: 1, fixed: false };
                            markBusyInSchedule(facultySchedule, session.faculty, aDay, aSlot);
                            session.allocated = true;
                            repaired = true;
                        }
                    }
                }
            }
        });

        if (!repaired) break;
    }
}


function buildFacultySchedule(timetable, days) {
    const schedule = {};
    Object.keys(timetable).forEach((key) => {
        days.forEach((day) => {
            (timetable[key]?.[day] || []).forEach((cell, slot) => {
                if (!cell) return;
                if (cell.faculty) markBusyInSchedule(schedule, cell.faculty, day, slot);
                if (cell.batchAllocations) {
                    cell.batchAllocations.forEach((b) => markBusyInSchedule(schedule, b.faculty, day, slot));
                }
            });
        });
    });
    return schedule;
}

function isBusyInSchedule(schedule, faculty, day, slot, facultyAvailability = {}) {
    if (!faculty || faculty === "TBD" || faculty === "FIXED" || faculty === "TBD-FACULTY" || faculty === "DEPT-FACULTY") return false;
    // Check faculty availability blackout first
    if (isFacultyBlockedByAvailability(facultyAvailability, faculty, day, slot)) return true;
    return !!schedule[faculty]?.[day]?.[slot];
}

function markBusyInSchedule(schedule, faculty, day, slot) {
    if (!faculty || faculty === "TBD" || faculty === "FIXED" || faculty === "TBD-FACULTY" || faculty === "DEPT-FACULTY") return;
    if (!schedule[faculty]) schedule[faculty] = {};
    if (!schedule[faculty][day]) schedule[faculty][day] = {};
    schedule[faculty][day][slot] = true;
}

function unmarkBusyInSchedule(schedule, faculty, day, slot) {
    if (!faculty || !schedule[faculty]?.[day]) return;
    delete schedule[faculty][day][slot];
}
