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

export function generateSmartTimetable(
    groupedData,
    globalConstraints = [],
    syncRules = [],
    resources = {},
    maxTrials = 30
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

        // Step 3: Allocate practicals → tutorials → lectures
        allocateSessions(timetableObj, sessionPool);

        // Step 4: Assign resources (rooms, labs, tutorial rooms)
        allocateResources(timetableObj, resources);

        // Step 5: Run self-healing repair loop
        selfHealingRepairLoop(timetableObj, sessionPool, globalConstraints, resources);

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

        const penalty =
            facultyClashCount * 10000 +
            unallocatedCount * 1000 +
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

    // Use winning trial session pool for downstream reports
    const winningSessionPool = bestSessionPool || (() => {
        const cloned = JSON.parse(JSON.stringify(groupedData));
        applyConstraintCounts(cloned, globalConstraints);
        return generateSessionPool(cloned, syncRules);
    })();

    const facultyWorkloadReport = generateFacultyWorkloadReport(bestTimetable, winningSessionPool);
    const resourceUtilizationReport = generateResourceUtilizationReport(bestTimetable, resources);
    const batchTimetable = generateBatchTimetable(bestTimetable);
    const facultyTimetable = generateFacultyTimetable(bestTimetable);
    const locationTimetable = generateLocationTimetable(bestTimetable);
    const validationScore = computeValidationScore(bestReport, bestConflictReport);

    return {
        timetable: bestTimetable,
        report: bestReport,
        conflictReport: bestConflictReport,
        facultyWorkloadReport,
        resourceUtilizationReport,
        batchTimetable,
        facultyTimetable,
        locationTimetable,
        validationScore,
    };
}

/**
 * Self-Healing Repair Loop
 * Tries to fix remaining unallocated sessions and remove conflicts after initial allocation.
 */
function selfHealingRepairLoop(timetable, sessionPool, globalConstraints, resources) {
    const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
    const MAX_REPAIR_PASSES = 5;

    for (let pass = 0; pass < MAX_REPAIR_PASSES; pass++) {
        let repaired = false;

        // Rebuild faculty schedule from current timetable state
        const facultySchedule = buildFacultySchedule(timetable, days);

        // Find all unallocated sessions
        const unallocated = sessionPool.filter((s) => !s.allocated);
        if (unallocated.length === 0) break;

        unallocated.forEach((session) => {
            const timetableKey = `${session.year}-${session.division}`;
            if (!timetable[timetableKey]) return;

            for (let d = 0; d < days.length; d++) {
                const day = days[d];
                const daySlots = timetable[timetableKey]?.[day];
                if (!daySlots) continue;

                for (let slot = 0; slot < 6; slot++) {
                    if (daySlots[slot] !== null) continue;
                    if (isBusyInSchedule(facultySchedule, session.faculty, day, slot)) continue;

                    // Valid practical block enforcement
                    if (session.type === "PRACTICAL") {
                        const validStarts = [0, 2, 4];
                        if (!validStarts.includes(slot)) continue;
                        if (slot + 1 >= 6) continue;
                        if (daySlots[slot + 1] !== null) continue;
                        if (isBusyInSchedule(facultySchedule, session.faculty, day, slot + 1)) continue;

                        daySlots[slot] = { ...session, span: 2, fixed: false };
                        daySlots[slot + 1] = { ...session, span: 0, fixed: false };
                        markBusyInSchedule(facultySchedule, session.faculty, day, slot);
                        markBusyInSchedule(facultySchedule, session.faculty, day, slot + 1);
                        session.allocated = true;
                        repaired = true;
                        return;
                    }

                    daySlots[slot] = { ...session, span: 1, fixed: false };
                    markBusyInSchedule(facultySchedule, session.faculty, day, slot);
                    session.allocated = true;
                    repaired = true;
                    return;
                }
            }

            // Backtrack swap: find a movable session and swap
            if (!session.allocated) {
                for (let d = 0; d < days.length; d++) {
                    const day = days[d];
                    const daySlots = timetable[timetableKey]?.[day];
                    if (!daySlots) continue;

                    for (let slot = 0; slot < 6; slot++) {
                        const occupant = daySlots[slot];
                        if (!occupant || occupant.fixed || occupant.span === 0 || occupant.type !== "LECTURE") continue;

                        // Can our session go here?
                        if (isBusyInSchedule(facultySchedule, session.faculty, day, slot)) continue;

                        // Find a new home for the occupant
                        let swapped = false;
                        for (let d2 = 0; d2 < days.length && !swapped; d2++) {
                            const newDay = days[d2];
                            const newDaySlots = timetable[timetableKey]?.[newDay];
                            if (!newDaySlots) continue;
                            for (let newSlot = 0; newSlot < 6; newSlot++) {
                                if (newDaySlots[newSlot] !== null) continue;
                                if (d2 === d && newSlot === slot) continue;
                                if (isBusyInSchedule(facultySchedule, occupant.faculty, newDay, newSlot)) continue;

                                // Execute swap
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

function isBusyInSchedule(schedule, faculty, day, slot) {
    if (!faculty || faculty === "TBD" || faculty === "FIXED" || faculty === "TBD-FACULTY" || faculty === "DEPT-FACULTY") return false;
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
