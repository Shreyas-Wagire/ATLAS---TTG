/**
 * allocateSessions.js — College-Wide Master Session Allocator for ATLAS
 *
 * Implements the mandatory COLLEGE-WIDE SCHEDULING PRIORITY:
 *
 *   PRIORITY 1 → GLOBAL COLLEGE-WIDE SESSIONS (pre-locked in CollegeOccupancy)
 *   PRIORITY 2 → PRACTICAL / BATCH SESSIONS (Maximum Parallel Practical Packing: 4 → 3 → 2 → 1)
 *   PRIORITY 3 → SYNCHRONIZED SESSIONS (Cross-division common time)
 *   PRIORITY 4 → TUTORIALS (Batch-level sessions)
 *   PRIORITY 5 → LECTURES (Division-level sessions + DEGES / smartHumanBrainScheduler)
 *   PRIORITY 6 → COURSE-PRESERVING CASCADE REPAIR (CASC in selfHealingRepairLoop)
 *   PRIORITY 7 → MTEFM OPTIMIZATION (post-generation)
 *
 * ABSOLUTE INVARIANTS:
 * - One college-wide master scheduling state (CollegeOccupancy).
 * - Never schedule department-by-department independently.
 * - Faculty assignment is 100% immutable (NEVER replace with TBD-FACULTY / DEPT-FACULTY).
 * - L/T/P counts are 100% immutable.
 * - Global constraints are 100% immutable.
 */

import { CollegeOccupancy, isRealFaculty } from "./collegeOccupancy.js";
import { packPracticals } from "./practicalPacking.js";
import { checkFacultyConstraint } from "./checkFacultyConstraint.js";
import { checkSubjectConstraint } from "./checkSubjectConstraint.js";
import { checkLectureDistribution } from "./checkLectureDistribution.js";
import { smartHumanBrainScheduler } from "./smartHumanBrainScheduler.js";
import { isFacultyBlockedByAvailability } from "./parseFacultyConstraints.js";

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];

/**
 * Main entry point for session allocation across the entire college.
 *
 * @param {Object} timetable - College master timetable
 * @param {Array} sessionPool - Session pool generated from course data
 * @param {Object} [facultyAvailability] - Faculty availability blackouts
 * @param {Object} [resources] - Classrooms, labs, tutorial rooms
 * @param {CollegeOccupancy} [existingOccupancy] - Master college occupancy instance
 * @param {Object} [options] - Configuration and logging options
 */
export function allocateSessions(
    timetable,
    sessionPool,
    facultyAvailability = {},
    resources = {},
    existingOccupancy = null,
    options = {}
) {
    // Ensure master college-wide occupancy state exists
    const collegeOccupancy = existingOccupancy || new CollegeOccupancy(timetable, resources, facultyAvailability);

    // If occupancy was just created, lock all global / fixed sessions immediately
    if (!existingOccupancy) {
        collegeOccupancy.lockGlobalSessions(timetable);
    }

    // ============================================================
    // PRIORITY 2: PRACTICAL / BATCH SESSIONS (MAXIMUM PARALLEL PACKING)
    // ============================================================
    packPracticals(timetable, sessionPool, collegeOccupancy, options);

    // ============================================================
    // PRIORITY 3: SYNCHRONIZED SESSIONS (CROSS-DIVISION)
    // ============================================================
    allocateSynchronizedSessions(timetable, sessionPool, collegeOccupancy);

    // ============================================================
    // PRIORITY 4: TUTORIALS (BATCH-LEVEL SESSIONS)
    // ============================================================
    allocateTutorials(timetable, sessionPool, collegeOccupancy, resources);

    // ============================================================
    // PRIORITY 5: LECTURES (DIVISION-LEVEL SESSIONS)
    // ============================================================
    allocateLectures(timetable, sessionPool, collegeOccupancy, facultyAvailability, resources);

    return { timetable, sessionPool, collegeOccupancy };
}

// ─── PRIORITY 3: SYNCHRONIZED SESSIONS ───────────────────────────────────────

/**
 * Allocate synchronized sessions across linked divisions simultaneously.
 * Only runs AFTER practical scheduling is complete.
 */
function allocateSynchronizedSessions(timetable, sessionPool, collegeOccupancy) {
    const syncGroupMap = {};
    sessionPool.forEach((session) => {
        if (session.syncGroup && !session.allocated) {
            if (!syncGroupMap[session.syncGroup]) {
                syncGroupMap[session.syncGroup] = [];
            }
            syncGroupMap[session.syncGroup].push(session);
        }
    });

    Object.entries(syncGroupMap).forEach(([groupName, groupSessions]) => {
        const courseSessionMap = {};
        groupSessions.forEach((s) => {
            const key = s.subject || s.subjectName || "syncCourse";
            if (!courseSessionMap[key]) courseSessionMap[key] = [];
            courseSessionMap[key].push(s);
        });

        const maxInstanceCount = Math.max(
            ...Object.values(courseSessionMap).map((list) => list.length)
        );

        for (let instanceIdx = 0; instanceIdx < maxInstanceCount; instanceIdx++) {
            const instanceSessions = Object.values(courseSessionMap)
                .map((list) => list[instanceIdx])
                .filter((s) => s && !s.allocated);

            if (instanceSessions.length === 0) continue;

            const has2HourSession = instanceSessions.some((s) => s.duration === 2);
            const slotSequence = has2HourSession ? [0, 2, 4] : [0, 1, 2, 3, 4, 5];

            let syncPlaced = false;

            for (const day of DAYS) {
                if (syncPlaced) break;

                for (const slot of slotSequence) {
                    if (syncPlaced) break;
                    if (has2HourSession && slot + 1 >= 6) continue;

                    // Verify ALL linked divisions and faculties are free
                    const canPlaceAll = instanceSessions.every((session) => {
                        const divKey = `${session.year}-${session.division}`;
                        if (!timetable[divKey]) return false;

                        if (has2HourSession || session.duration === 2) {
                            if (!collegeOccupancy.isDivisionFreeForPractical(divKey, day, slot)) return false;
                            if (isRealFaculty(session.faculty) && !collegeOccupancy.isFacultyFreeForPractical(session.faculty, day, slot)) return false;
                        } else {
                            if (!collegeOccupancy.isDivisionSlotFree(divKey, day, slot)) return false;
                            if (isRealFaculty(session.faculty) && !collegeOccupancy.isFacultyFree(session.faculty, day, slot)) return false;
                        }
                        return true;
                    });

                    if (canPlaceAll) {
                        // Commit all linked sessions simultaneously
                        instanceSessions.forEach((session) => {
                            const divKey = `${session.year}-${session.division}`;
                            if (has2HourSession || session.duration === 2) {
                                timetable[divKey][day][slot] = {
                                    ...session,
                                    fixed: false,
                                    span: 2,
                                };
                                timetable[divKey][day][slot + 1] = {
                                    ...session,
                                    fixed: false,
                                    span: 0,
                                };
                                collegeOccupancy.markDivisionOccupied(divKey, day, slot, session);
                                collegeOccupancy.markDivisionOccupied(divKey, day, slot + 1, session);
                                if (isRealFaculty(session.faculty)) {
                                    collegeOccupancy.markFacultyOccupied(session.faculty, day, slot, session);
                                    collegeOccupancy.markFacultyOccupied(session.faculty, day, slot + 1, session);
                                }
                            } else {
                                collegeOccupancy.commitSingleSession(divKey, day, slot, session);
                            }
                            session.allocated = true;
                        });
                        syncPlaced = true;
                    }
                }
            }
        }
    });
}

// ─── PRIORITY 4: TUTORIALS ───────────────────────────────────────────────────

/**
 * Allocate tutorial sessions (1-hour, batch-level).
 * Supports parallel tutorial batches running concurrently in different tutorial rooms.
 */
function allocateTutorials(timetable, sessionPool, collegeOccupancy, resources = {}) {
    const unallocatedTutorials = sessionPool.filter(
        (s) => s.type === "TUTORIAL" && !s.allocated
    );

    if (unallocatedTutorials.length === 0) return;

    // Group tutorials by division
    const divTutorialMap = {};
    unallocatedTutorials.forEach((s) => {
        const divKey = `${s.year}-${s.division}`;
        if (!divTutorialMap[divKey]) divTutorialMap[divKey] = [];
        divTutorialMap[divKey].push(s);
    });

    Object.entries(divTutorialMap).forEach(([divKey, tutSessions]) => {
        // Group by subject/batch pairs to enable parallel batches
        const pairMap = {};
        tutSessions.forEach((s) => {
            const batchNum = Number(String(s.batch || "").replace(/[^0-9]/g, "")) || 1;
            const pairIndex = Math.ceil(batchNum / 2);
            const key = `${s.subject}-PAIR-${pairIndex}`;
            if (!pairMap[key]) pairMap[key] = [];
            pairMap[key].push(s);
        });

        Object.values(pairMap).forEach((pair) => {
            const unallocatedInPair = pair.filter((s) => !s.allocated);
            if (unallocatedInPair.length === 0) return;

            let placed = false;

            for (const day of DAYS) {
                if (placed) break;

                for (let slot = 0; slot < 6; slot++) {
                    const currentCell = timetable[divKey]?.[day]?.[slot];

                    // Check if slot is empty or an existing tutorial block that can merge another batch
                    const isCellEmpty = currentCell === null;
                    const isCellTutorial = currentCell?.type === "TUTORIAL" && currentCell.span === 1;

                    if (!isCellEmpty && !isCellTutorial) continue;

                    // Filter batches in this pair that are free at (day, slot)
                    const allocatableNow = unallocatedInPair.filter((s) => {
                        if (s.allocated) return false;
                        if (!collegeOccupancy.isFacultyFree(s.faculty, day, slot)) return false;
                        if (!collegeOccupancy.isBatchFree(s.batch, day, slot)) return false;
                        if (isCellTutorial && (currentCell.batchAllocations || []).some((b) => b.batch === s.batch)) return false;
                        return true;
                    });

                    if (allocatableNow.length === 0) continue;

                    if (isCellEmpty) {
                        timetable[divKey][day][slot] = {
                            type: "TUTORIAL",
                            span: 1,
                            fixed: false,
                            batchAllocations: [...allocatableNow],
                            batch: allocatableNow[0].batch,
                            subject: allocatableNow[0].subject,
                            faculty: allocatableNow[0].faculty,
                        };
                        collegeOccupancy.markDivisionOccupied(divKey, day, slot, timetable[divKey][day][slot]);

                        allocatableNow.forEach((s) => {
                            if (isRealFaculty(s.faculty)) collegeOccupancy.markFacultyOccupied(s.faculty, day, slot, s);
                            if (s.batch) collegeOccupancy.markBatchOccupied(s.batch, day, slot, s);
                            s.allocated = true;
                        });
                        placed = true;
                        break;
                    } else if (isCellTutorial) {
                        if (!currentCell.batchAllocations) currentCell.batchAllocations = [];
                        allocatableNow.forEach((s) => {
                            currentCell.batchAllocations.push(s);
                            if (isRealFaculty(s.faculty)) collegeOccupancy.markFacultyOccupied(s.faculty, day, slot, s);
                            if (s.batch) collegeOccupancy.markBatchOccupied(s.batch, day, slot, s);
                            s.allocated = true;
                        });
                        placed = true;
                        break;
                    }
                }
            }
        });

        // Individual retry for any still-unallocated tutorials
        tutSessions.filter((s) => !s.allocated).forEach((s) => {
            for (const day of DAYS) {
                if (s.allocated) break;
                for (let slot = 0; slot < 6; slot++) {
                    if (s.allocated) break;
                    if (!collegeOccupancy.isDivisionSlotFree(divKey, day, slot)) continue;
                    if (!collegeOccupancy.isFacultyFree(s.faculty, day, slot)) continue;
                    if (!collegeOccupancy.isBatchFree(s.batch, day, slot)) continue;

                    collegeOccupancy.commitSingleSession(divKey, day, slot, s);
                    break;
                }
            }
        });
    });
}

// ─── PRIORITY 5: LECTURES ────────────────────────────────────────────────────

/**
 * Allocate lecture sessions (1-hour, division-level).
 * Respects subject distribution, consecutive limits, and faculty occupancy.
 */
function allocateLectures(timetable, sessionPool, collegeOccupancy, facultyAvailability = {}, resources = {}) {
    const unallocatedLectures = sessionPool.filter(
        (s) => s.type === "LECTURE" && !s.allocated
    );

    if (unallocatedLectures.length === 0) return;

    // Group lectures by division
    const divLectureMap = {};
    unallocatedLectures.forEach((s) => {
        const divKey = `${s.year}-${s.division}`;
        if (!divLectureMap[divKey]) divLectureMap[divKey] = [];
        divLectureMap[divKey].push(s);
    });

    Object.entries(divLectureMap).forEach(([divKey, lectures]) => {
        // Prioritize faculty with fewer available slots first (constrained faculty first)
        lectures.sort((a, b) => {
            const facScarcityA = getAvailableSlotCount(a.faculty, facultyAvailability);
            const facScarcityB = getAvailableSlotCount(b.faculty, facultyAvailability);
            if (facScarcityA !== facScarcityB) return facScarcityA - facScarcityB;
            return (b.priorityScore || 0) - (a.priorityScore || 0);
        });

        const tryPlace = (lecture, strict = true) => {
            for (const day of DAYS) {
                if (lecture.allocated) break;

                for (let slot = 0; slot < 6; slot++) {
                    if (!collegeOccupancy.isDivisionSlotFree(divKey, day, slot)) continue;
                    if (!collegeOccupancy.isFacultyFree(lecture.faculty, day, slot)) continue;

                    if (strict) {
                        if (!checkSubjectConstraint({ timetable, divisionKey: divKey, day, slot, session: lecture })) continue;
                        if (!checkLectureDistribution({ timetable, divisionKey: divKey, day, session: lecture })) continue;
                    }

                    collegeOccupancy.commitSingleSession(divKey, day, slot, lecture);
                    return true;
                }
            }
            return false;
        };

        // Pass 1: Strict placement (respects daily lecture distribution & consecutive limits)
        lectures.forEach((s) => {
            if (!s.allocated) tryPlace(s, true);
        });

        // Pass 2: Relaxed placement (places wherever division and faculty are free)
        lectures.forEach((s) => {
            if (!s.allocated) tryPlace(s, false);
        });
    });

    // Run smartHumanBrainScheduler heuristics to resolve remaining tight lectures via clean swaps
    smartHumanBrainScheduler(timetable, sessionPool, collegeOccupancy.facultyOccupancy, facultyAvailability);
}

/**
 * Count available slots for a faculty member after blackouts.
 */
function getAvailableSlotCount(faculty, facultyAvailability = {}) {
    if (!faculty || !facultyAvailability[faculty]) return 30;
    let blocked = 0;
    DAYS.forEach((day) => {
        blocked += (facultyAvailability[faculty][day] || []).length;
    });
    return Math.max(1, 30 - blocked);
}

// ─── UNALLOCATED SESSION DIAGNOSTICS ANALYZER ─────────────────────────────────

/**
 * Produce precise, non-generic rejection diagnostics for any unallocated session.
 * Lists the actual root causes blocking placement across all weekly slots.
 *
 * @param {Object} session - Unallocated session
 * @param {Object} timetable - Timetable state
 * @param {CollegeOccupancy} collegeOccupancy - Master college occupancy
 * @returns {Array<string>} List of specific rejection diagnostics
 */
export function analyzeUnallocatedSession(session, timetable, collegeOccupancy) {
    const divKey = `${session.year}-${session.division}`;
    const rejectionReasons = [];

    DAYS.forEach((day) => {
        const slotsToCheck = session.type === "PRACTICAL" ? [0, 2, 4] : [0, 1, 2, 3, 4, 5];
        slotsToCheck.forEach((slot) => {
            const reasonsForSlot = [];

            // Check global / fixed reservations
            if (collegeOccupancy.globalReservations?.[divKey]?.[day]?.[slot]) {
                reasonsForSlot.push("GLOBAL_SESSION_LOCKED");
            }

            // Check faculty occupancy
            if (isRealFaculty(session.faculty)) {
                if (!collegeOccupancy.isFacultyFree(session.faculty, day, slot)) {
                    reasonsForSlot.push(`FACULTY_BUSY (${session.faculty} occupied elsewhere or blacked out)`);
                }
            }

            // Check batch conflict
            if (session.batch && !collegeOccupancy.isBatchFree(session.batch, day, slot)) {
                reasonsForSlot.push(`BATCH_CONFLICT (${session.batch} occupied)`);
            }

            // Check division slot occupancy
            if (!collegeOccupancy.isDivisionSlotFree(divKey, day, slot)) {
                const cell = timetable[divKey]?.[day]?.[slot];
                if (cell && !cell.fixed) {
                    reasonsForSlot.push(`DESTINATION_OCCUPIED (${cell.subject} — ${cell.faculty})`);
                }
            }

            if (reasonsForSlot.length > 0) {
                rejectionReasons.push(`${day} Slot ${slot + 1}: ${reasonsForSlot.join(", ")}`);
            }
        });
    });

    return rejectionReasons;
}