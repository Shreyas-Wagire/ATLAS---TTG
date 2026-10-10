import { createEmptyTimetable } from "./createEmptyTimetable.js";
import { generateSessionPool } from "./generateSessionPool.js";
import { applyFixedConstraints } from "./applyFixedConstraints.js";
import { allocateSessions } from "./allocateSessions.js";
import { allocateResources } from "./allocateResources.js";
import { applyConstraintCounts } from "./applyConstraintCounts.js";
import { validateTimetable } from "./validateTimetable.js";
import { generateConflictReport } from "./generateConflictReport.js";
import { generateFacultyWorkloadReport } from "./generateFacultyWorkloadReport.js";
import { generateResourceUtilizationReport } from "./generateResourceUtilizationReport.js";
import { generateBatchTimetable } from "./generateBatchTimetable.js";
import { generateFacultyTimetable } from "./generateFacultyTimetable.js";
import { generateLocationTimetable } from "./generateLocationTimetable.js";
import { computeValidationScore } from "./computeValidationScore.js";
import { isFacultyBlockedByAvailability } from "./parseFacultyConstraints.js";
import { optimizeTimetable } from "./optimizeTimetable.js";
import { prioritizeSessionPool, reprioritizeUnallocated, generateDAPSReport } from "./daps.js";
import { generateRCAAReport } from "./rcaa.js";
import { attemptCascadePlacement, generateCASCReport } from "./casc.js";
import { CollegeOccupancy } from "./collegeOccupancy.js";
import { analyzeUnallocatedSession } from "./allocateSessions.js";
import { checkLectureDistribution } from "./checkLectureDistribution.js";
import { checkSubjectConstraint } from "./checkSubjectConstraint.js";
import {
    buildCourseLabResolutions,
    generateResourceResolutionPreview,
    getLabResourcePressureScore,
} from "./courseLabResolver.js";

export function generateSmartTimetable(
    groupedData,
    globalConstraints = [],
    syncRules = [],
    resources = {},
    maxTrials = 50,
    facultyAvailability = {},
    loadSubjects = []
) {
    // ── v5.5: Build course → lab resolution ONCE before any trial ────────────
    // This uses LOAD (loadSubjects) and Location (resources.locationData) as
    // the ONLY authoritative sources. No courses are created from Location.
    const locationData = resources?.locationData || null;
    let courseLabResolutions = {};
    let resolutionDiagnostics = [];
    let mappedButNotInLoad = [];
    let resourceResolutionPreview = [];

    if (locationData && loadSubjects && loadSubjects.length > 0) {
        const resolveResult = buildCourseLabResolutions(loadSubjects, locationData);
        courseLabResolutions = resolveResult.resolutions;
        resolutionDiagnostics = resolveResult.diagnostics;
        mappedButNotInLoad = resolveResult.mappedButNotInLoad;
        resourceResolutionPreview = generateResourceResolutionPreview(
            loadSubjects,
            courseLabResolutions,
            mappedButNotInLoad
        );
    }

    let bestTimetable = null;
    let bestReport = null;
    let bestPenalty = Infinity;
    let bestConflictReport = null;
    let bestSessionPool = null;
    let bestDapsDiagnostics = null;
    let bestCascResults = [];

    for (let trial = 1; trial <= maxTrials; trial++) {
        const clonedGroupedData = JSON.parse(JSON.stringify(groupedData));
        const timetableObj = createEmptyTimetable(clonedGroupedData);

        // Step 1: Deduct pre-allocated fixed constraint counts from course loads
        applyConstraintCounts(clonedGroupedData, globalConstraints);

        // v5.5: Pass courseLabResolutions to generateSessionPool so every
        // practical session gets primaryLabInitial and labResolution attached.
        const sessionPool = generateSessionPool(clonedGroupedData, syncRules, courseLabResolutions);

        // ── DAPS: Dynamic Adaptive Priority Scheduling ────────────────────
        // v5.5: DAPS priority scoring
        let dapsDiagnostics = null;
        if (trial === 1) {
            const dapsResult = prioritizeSessionPool(
                sessionPool, timetableObj, facultyAvailability, { preserveTypeOrder: true }
            );
            dapsDiagnostics = dapsResult.diagnostics;
        } else {
            const dapsResult = prioritizeSessionPool(
                sessionPool, timetableObj, facultyAvailability, { preserveTypeOrder: true }
            );
            dapsDiagnostics = dapsResult.diagnostics;
            const typeBuckets = { PRACTICAL: [], TUTORIAL: [], LECTURE: [] };
            sessionPool.forEach((s) => {
                if (!s.allocated && typeBuckets[s.type]) {
                    typeBuckets[s.type].push(s);
                }
            });
            Object.values(typeBuckets).forEach((bucket) => {
                for (let i = bucket.length - 1; i > 0; i--) {
                    const j = Math.floor(Math.random() * (i + 1));
                    [bucket[i], bucket[j]] = [bucket[j], bucket[i]];
                }
            });
        }

        // Step 2: Apply fixed constraints (hard - Priority 1)
        applyFixedConstraints(timetableObj, globalConstraints);

        // Step 2b: Initialize authoritative master CollegeOccupancy and lock global sessions
        const collegeOccupancy = new CollegeOccupancy(timetableObj, resources, facultyAvailability);
        collegeOccupancy.lockGlobalSessions(timetableObj, globalConstraints);

        // Step 3: Allocate college-wide in strict priority: Practicals (Parallel 4->3->2->1) → Sync → Tutorials → Lectures
        allocateSessions(timetableObj, sessionPool, facultyAvailability, resources, collegeOccupancy);

        // Step 3b: Second tutorial pass — re-embed TY/BTECH tutorials that missed their lab window
        // in the first pass (lab wasn't scheduled yet at tutorial allocation time).
        // Import allocateTutorialsRetry directly from allocateSessions module.
        _retryLabPairedTutorials(timetableObj, sessionPool, collegeOccupancy);

        // Step 4: Assign resources (rooms, labs, tutorial rooms)
        // v5.5: allocateResources is now course-aware for labs
        allocateResources(timetableObj, resources);

        // Step 5: Run self-healing repair loop (Priority 6: CASC Repair)
        const repairResult = selfHealingRepairLoop(timetableObj, sessionPool, globalConstraints, resources, facultyAvailability);
        const trialCascResults = repairResult?.cascResults || [];

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
        const resourceShortageCount = (report.resourceShortages || []).length;

        const penalty =
            unallocatedCount * 100000 +
            resourceShortageCount * 50000 +
            facultyClashCount * 10000 +
            resourceClashCount * 500 +
            breakViolations * 200;

        if (penalty < bestPenalty) {
            bestPenalty = penalty;
            bestTimetable = timetableObj;
            bestReport = report;
            bestConflictReport = conflictReport;
            bestSessionPool = sessionPool;
            bestDapsDiagnostics = dapsDiagnostics;
            bestCascResults = trialCascResults;
        }

        if (penalty === 0) {
            console.log(`✓ Perfect conflict-free timetable found on Trial #${trial}!`);
            break;
        }
    }

    // ── POST-GENERATION OPTIMIZATION ─────────────────────────────────────
    const { timetable: optimizedTimetable, optimizationReport } = optimizeTimetable(bestTimetable);

    const winningSessionPool = bestSessionPool || (() => {
        const cloned = JSON.parse(JSON.stringify(groupedData));
        applyConstraintCounts(cloned, globalConstraints);
        return generateSessionPool(cloned, syncRules, courseLabResolutions);
    })();

    const facultyWorkloadReport = generateFacultyWorkloadReport(optimizedTimetable, winningSessionPool);
    const resourceUtilizationReport = generateResourceUtilizationReport(optimizedTimetable, resources);
    const batchTimetable = generateBatchTimetable(optimizedTimetable);
    const facultyTimetable = generateFacultyTimetable(optimizedTimetable);
    const locationTimetable = generateLocationTimetable(optimizedTimetable);
    const validationScore = computeValidationScore(bestReport, bestConflictReport);

    // ── ALGORITHM DIAGNOSTIC REPORTS ──────────────────────────────────────
    const rcaaReport = generateRCAAReport(optimizedTimetable, resources);
    const dapsReport = generateDAPSReport(bestDapsDiagnostics);
    const cascReport = generateCASCReport(bestCascResults);

    // ── ATTACH PRECISE UNALLOCATED REASONS ──────────────────────────────
    if (bestReport) {
        const tempOccupancy = new CollegeOccupancy(optimizedTimetable, resources, facultyAvailability);
        tempOccupancy.lockGlobalSessions(optimizedTimetable, globalConstraints);
        const allMissing = [
            ...(bestReport.missingLectures || []),
            ...(bestReport.missingTutorials || []),
            ...(bestReport.missingPracticals || []),
        ];
        allMissing.forEach((s) => {
            const reasons = analyzeUnallocatedSession(s, optimizedTimetable, tempOccupancy);
            s.rejectionReasons = reasons;
            const divKey = `${s.year}-${s.division}`;
            const divOccupied = Object.values(optimizedTimetable[divKey] || {}).reduce((acc, row) => acc + (row || []).filter(Boolean).length, 0);
            if (divOccupied >= 30) {
                s.diagnosticReason = `Division ${divKey} schedule fully saturated (${divOccupied}/30 periods filled). Course load exceeds weekly 30h timetable capacity.`;
            } else if (reasons.length > 0) {
                s.diagnosticReason = reasons[0];
            } else {
                s.diagnosticReason = `Faculty ${s.faculty} schedule constrained across all division free periods.`;
            }
        });
    }

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
        rcaaReport,
        dapsReport,
        cascReport,
        // v5.5: Resource resolution data
        resourceResolutionPreview,
        resolutionDiagnostics,
        mappedButNotInLoad,
        courseLabResolutions,
    };
}

/**
 * Self-Healing Repair Loop
 * Tries to fix remaining unallocated sessions and remove conflicts after initial allocation.
 */
function selfHealingRepairLoop(timetable, sessionPool, globalConstraints, resources, facultyAvailability = {}) {
    const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
    const MAX_REPAIR_PASSES = 12; // Increased for 0% unallocation convergence
    const cascResults = [];

    // Helper: count available slots for a faculty after applying availability blackouts
    function availableSlotCount(faculty) {
        if (!faculty || !facultyAvailability || !facultyAvailability[faculty]) return 30;
        let blocked = 0;
        days.forEach((day) => { blocked += (facultyAvailability[faculty][day] || []).length; });
        return Math.max(1, 30 - blocked);
    }

    for (let pass = 0; pass < MAX_REPAIR_PASSES; pass++) {
        let repaired = false;

        // Rebuild faculty schedule from current timetable state
        const facultySchedule = buildFacultySchedule(timetable, days);

        // Find all unallocated sessions
        let unallocated = sessionPool.filter((s) => !s.allocated);
        if (unallocated.length === 0) break;

        // ── DAPS Reprioritization in Repair Loop ──────────────────────────
        // Use DAPS dynamic priority scoring instead of static faculty-scarcity sort.
        // This provides a more comprehensive ordering based on all constraint factors.
        unallocated = reprioritizeUnallocated(unallocated, timetable, facultyAvailability);

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
                    const validStarts = [0, 2, 4];
                    const maxCollegeLabs = (resources?.labs && resources.labs.length > 0) ? resources.labs.length : 11;

                    for (const slot of validStarts) {
                        if (session.allocated) break;
                        if (slot + 1 >= 6) continue;
                        if (isBusyInSchedule(facultySchedule, session.faculty, day, slot, facultyAvailability)) continue;
                        if (isBusyInSchedule(facultySchedule, session.faculty, day, slot + 1, facultyAvailability)) continue;

                        // Ensure college-wide lab capacity is not exceeded in this 2-hour window
                        const currentOccupiedInSlot = getCollegeOccupiedLabCount(timetable, day, slot);
                        if (currentOccupiedInSlot >= maxCollegeLabs) continue;

                        const cur = daySlots[slot];
                        const nxt = daySlots[slot + 1];

                        // Try merging into existing practical block first (max 4 parallel batches per division)
                        if (cur?.type === "PRACTICAL" && cur.span === 2 && nxt?.type === "PRACTICAL" && nxt.span === 0) {
                            if ((cur.batchAllocations || []).length < 4) {
                                const existBatches = new Set((cur.batchAllocations || []).map((b) => b.batch));
                                const existFaculties = new Set((cur.batchAllocations || []).map((b) => b.faculty).filter(Boolean));
                                if (!existBatches.has(session.batch) && (!session.faculty || !existFaculties.has(session.faculty))) {
                                    if (!cur.batchAllocations) cur.batchAllocations = [];
                                    cur.batchAllocations.push(session);
                                    if (nxt) nxt.batchAllocations = cur.batchAllocations;
                                    markBusyInSchedule(facultySchedule, session.faculty, day, slot);
                                    markBusyInSchedule(facultySchedule, session.faculty, day, slot + 1);
                                    session.allocated = true;
                                    repaired = true;
                                }
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
                    if (!checkLectureDistribution({ timetable, divisionKey: timetableKey, day, session })) continue;
                    if (!checkSubjectConstraint({ timetable, divisionKey: timetableKey, day, slot, session })) continue;

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

                                // Enforce daily lecture distribution and consecutive limits for both
                                if (!checkLectureDistribution({ timetable, divisionKey: timetableKey, day, session })) continue;
                                if (!checkSubjectConstraint({ timetable, divisionKey: timetableKey, day, slot, session })) continue;
                                if (newDay !== day && !checkLectureDistribution({ timetable, divisionKey: timetableKey, day: newDay, session: occupant })) continue;
                                if (!checkSubjectConstraint({ timetable, divisionKey: timetableKey, day: newDay, slot: newSlot, session: occupant })) continue;

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

                            // Enforce daily lecture distribution and consecutive limits for both
                            if (!checkLectureDistribution({ timetable, divisionKey: timetableKey, day: aDay, session })) continue;
                            if (!checkSubjectConstraint({ timetable, divisionKey: timetableKey, day: aDay, slot: aSlot, session })) continue;
                            if (bDay !== aDay && !checkLectureDistribution({ timetable, divisionKey: timetableKey, day: bDay, session: aOccupant })) continue;
                            if (!checkSubjectConstraint({ timetable, divisionKey: timetableKey, day: bDay, slot: bSlot, session: aOccupant })) continue;

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

            // --- Pass D: CASC — Constraint-Aware Swap Cascade (depth 3+) ---
            // If all simpler passes failed, try a bounded multi-hop cascade.
            // CASC searches chains of length up to MAX_CASCADE_DEPTH (default 3)
            // where each movement preserves ALL hard constraints.
            if (!session.allocated) {
                const cascResult = attemptCascadePlacement({
                    timetable,
                    session,
                    facultySchedule,
                    facultyAvailability,
                    config: { MAX_CASCADE_DEPTH: 4 },
                });

                cascResults.push(cascResult);

                if (cascResult.success) {
                    repaired = true;
                    if (cascResult.diagnostics?.formattedLog) {
                        console.log("\n" + cascResult.diagnostics.formattedLog);
                    } else {
                        console.log(
                            `  [CASC] Cascade of depth ${cascResult.chain?.length || 0} placed ` +
                            `${session.subject || session.subjectName} (${session.type}) ` +
                            `for ${session.year}-${session.division}`
                        );
                    }
                }
            }
        });

        if (!repaired) break;
    }

    return { cascResults };
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

function getCollegeOccupiedLabCount(timetable, day, slot) {
    let count = 0;
    Object.keys(timetable || {}).forEach((k) => {
        const cell = timetable[k]?.[day]?.[slot];
        if (cell?.type === "PRACTICAL") {
            count += (cell.batchAllocations && cell.batchAllocations.length > 0)
                ? cell.batchAllocations.length
                : 1;
        }
    });
    return count;
}

/**
 * _retryLabPairedTutorials
 *
 * Post-allocation sweep that re-embeds TY/BTECH lab-paired tutorials into
 * their corresponding practical cell. Called in Step 3b after the initial
 * allocateSessions() — by which point all practicals are fully scheduled,
 * so the lab window lookup is guaranteed to succeed.
 *
 * For any TY/BTECH tutorial that is still unallocated (lab wasn't found during
 * the first allocateTutorials pass), this function looks up the scheduled practical
 * for that batch + subject and embeds the tutorial into it using tutorialAllocations.
 *
 * Falls back to any free division slot if still no lab found.
 */
function _retryLabPairedTutorials(timetable, sessionPool, collegeOccupancy) {
    const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
    const GHOST_FACULTIES = new Set(["TBD", "FIXED", "TBD-FACULTY", "DEPT-FACULTY", ""]);
    const isRealFac = (f) => f && !GHOST_FACULTIES.has(String(f).trim());

    const stillUnallocated = sessionPool.filter(
        (s) => s.type === "TUTORIAL" && !s.allocated && s.pairedWithLab
    );

    if (stillUnallocated.length === 0) return;

    stillUnallocated.forEach((tutSession) => {
        if (tutSession.allocated) return;

        const divKey = `${tutSession.year}-${tutSession.division}`;
        if (!timetable[divKey]) return;

        let labDay = null;
        let labSlot = null;

        outer:
        for (const day of days) {
            const daySlots = timetable[divKey]?.[day] || [];
            for (let slot = 0; slot < 6; slot++) {
                const cell = daySlots[slot];
                if (!cell || cell.type !== "PRACTICAL" || cell.span !== 2) continue;
                const batchAllocations = cell.batchAllocations || [];
                const tutorialAllocations = cell.tutorialAllocations || [];
                if (batchAllocations.some((b) => b.batch === tutSession.batch)) continue;
                if (tutorialAllocations.some((t) => t.batch === tutSession.batch)) continue;

                if (collegeOccupancy.isFacultyFree(tutSession.faculty, day, slot) ||
                    collegeOccupancy.isFacultyFree(tutSession.faculty, day, slot + 1)) {
                    labDay = day;
                    labSlot = slot;
                    break outer;
                }
            }
        }

        // Fallback: embed into any practical cell in the division
        if (labDay === null) {
            outerAny:
            for (const day of days) {
                const daySlots = timetable[divKey]?.[day] || [];
                for (let slot = 0; slot < 6; slot++) {
                    const cell = daySlots[slot];
                    if (!cell || cell.type !== "PRACTICAL" || cell.span !== 2) continue;
                    labDay = day;
                    labSlot = slot;
                    break outerAny;
                }
            }
        }

        if (labDay !== null && labSlot !== null) {
            const labCell = timetable[divKey][labDay][labSlot];
            const labTailCell = timetable[divKey][labDay][labSlot + 1];

            if (!labCell) return;
            if (!labCell.tutorialAllocations) labCell.tutorialAllocations = [];
            if (labTailCell && !labTailCell.tutorialAllocations) labTailCell.tutorialAllocations = [];

            const alreadyEmbedded = (labCell.tutorialAllocations || []).some(
                (t) => t.batch === tutSession.batch && t.subject === tutSession.subject
            );
            if (!alreadyEmbedded) {
                const tutEntry = {
                    ...tutSession,
                    resourceType: "TUTORIAL_ROOM",
                    location: "",
                    embeddedInLab: true,
                    labSubSlot: labSlot,
                };
                labCell.tutorialAllocations.push(tutEntry);
                if (labTailCell) labTailCell.tutorialAllocations = labCell.tutorialAllocations;

                if (isRealFac(tutSession.faculty)) {
                    collegeOccupancy.markFacultyOccupied(tutSession.faculty, labDay, labSlot, tutSession);
                }
            }
            tutSession.allocated = true;
            return;
        }
    });
}
