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
        // Group sessions by division key so each linked division has a session queue
        const divSessionMap = {};
        groupSessions.forEach((s) => {
            const divKey = `${s.year}-${s.division}`;
            if (!divSessionMap[divKey]) divSessionMap[divKey] = [];
            divSessionMap[divKey].push(s);
        });

        const maxInstanceCount = Math.max(
            ...Object.values(divSessionMap).map((list) => list.length)
        );

        for (let instanceIdx = 0; instanceIdx < maxInstanceCount; instanceIdx++) {
            // Pick the instanceIdx-th session from each linked division
            const instanceSessions = Object.values(divSessionMap)
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

                        // Check division slot is free
                        if (has2HourSession || session.duration === 2) {
                            if (!collegeOccupancy.isDivisionFreeForPractical(divKey, day, slot)) return false;
                        } else {
                            if (!collegeOccupancy.isDivisionSlotFree(divKey, day, slot)) return false;
                        }

                        // Avoid scheduling duplicate lectures of the same course on the same day in the division
                        const existingDivDay = timetable[divKey]?.[day] || [];
                        const alreadyHasLecture = existingDivDay.some((c) => {
                            if (!c) return false;
                            const subj = (c.subject || c.courseCode || c.courseName || "").toUpperCase().trim();
                            const sessionSubj = (session.subject || session.courseCode || session.courseName || "").toUpperCase().trim();
                            return subj && sessionSubj && subj === sessionSubj;
                        });
                        if (alreadyHasLecture) return false;

                        // Faculty check
                        if (isRealFaculty(session.faculty)) {
                            if (has2HourSession || session.duration === 2) {
                                if (!collegeOccupancy.isFacultyFreeForPractical(session.faculty, day, slot)) return false;
                            } else {
                                if (!collegeOccupancy.isFacultyFree(session.faculty, day, slot)) return false;
                            }
                        }
                        return true;
                    });

                    if (canPlaceAll) {
                        // Commit all linked sessions simultaneously
                        const seenFaculties = new Set();
                        instanceSessions.forEach((session) => {
                            const divKey = `${session.year}-${session.division}`;
                            if (has2HourSession || session.duration === 2) {
                                timetable[divKey][day][slot] = {
                                    ...session,
                                    fixed: true,
                                    span: 2,
                                    isSync: true,
                                };
                                timetable[divKey][day][slot + 1] = {
                                    ...session,
                                    fixed: true,
                                    span: 0,
                                    isSync: true,
                                };
                                collegeOccupancy.markDivisionOccupied(divKey, day, slot, session);
                                collegeOccupancy.markDivisionOccupied(divKey, day, slot + 1, session);
                                if (isRealFaculty(session.faculty) && !seenFaculties.has(session.faculty)) {
                                    seenFaculties.add(session.faculty);
                                    collegeOccupancy.markFacultyOccupied(session.faculty, day, slot, session);
                                    collegeOccupancy.markFacultyOccupied(session.faculty, day, slot + 1, session);
                                }
                            } else {
                                collegeOccupancy.commitSingleSession(divKey, day, slot, { ...session, fixed: true, isSync: true });
                                if (isRealFaculty(session.faculty)) {
                                    seenFaculties.add(session.faculty);
                                }
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
 *
 * TY / BTECH rule: tutorials MUST be co-located in the same 2-hour lab window
 * as the paired practical session for that batch.  Location is always a
 * TUTORIAL_ROOM (or classroom fallback) — never a lab.
 *
 * SY (and other years without pairedWithLab): original parallel-batch logic.
 */
function allocateTutorials(timetable, sessionPool, collegeOccupancy, resources = {}) {
    const unallocatedTutorials = sessionPool.filter(
        (s) => s.type === "TUTORIAL" && !s.allocated
    );

    if (unallocatedTutorials.length === 0) return;

    // ── PASS A: TY / BTECH tutorials — MUST co-locate in lab (practical) window ──
    // For TY and BTECH, each tutorial batch is embedded into the practical cell
    // (tutorialAllocations array) — same 2-hour window, but uses TUTORIAL_ROOM not a lab.
    const labPairedTutorials = unallocatedTutorials.filter((s) => s.pairedWithLab);
    const regularTutorials = unallocatedTutorials.filter((s) => !s.pairedWithLab);

    labPairedTutorials.forEach((tutSession) => {
        if (tutSession.allocated) return;

        const divKey = `${tutSession.year}-${tutSession.division}`;
        if (!timetable[divKey]) return;

        // Find a practical block where this batch is free and faculty is free
        let labDay = null;
        let labSlot = null;

        outer:
        for (const day of DAYS) {
            const daySlots = timetable[divKey]?.[day] || [];
            for (let slot = 0; slot < 6; slot++) {
                const cell = daySlots[slot];
                if (!cell || cell.type !== "PRACTICAL" || cell.span !== 2) continue;
                const batchAllocations = cell.batchAllocations || [];
                const tutorialAllocations = cell.tutorialAllocations || [];
                // Batch must not be busy in practical or tutorial in this cell
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

        if (labDay !== null && labSlot !== null) {
            const labCell = timetable[divKey][labDay][labSlot];
            const labTailCell = timetable[divKey][labDay][labSlot + 1];

            let embedded = false;
            for (const subSlot of [labSlot, labSlot + 1]) {
                if (!collegeOccupancy.isFacultyFree(tutSession.faculty, labDay, subSlot)) continue;
                _embedTutorialInLabCell(labCell, labTailCell, tutSession, subSlot, collegeOccupancy, labDay);
                embedded = true;
                break;
            }
            if (!embedded) {
                _embedTutorialInLabCell(labCell, labTailCell, tutSession, labSlot, collegeOccupancy, labDay);
            }
        }

        // If no compatible batch-free practical window exists, use a genuine
        // free batch/division slot. Never force the tutorial into a practical
        // cell that already contains this batch's practical.
        if (!tutSession.allocated) {
            _placeTutorialInFreeSlot(tutSession, divKey, timetable, collegeOccupancy);
        }
    });

    // ── PASS B: SY (and other non-lab-paired) tutorials — original parallel logic ──
    const divTutorialMap = {};
    regularTutorials.forEach((s) => {
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

                    const isCellEmpty = currentCell === null;
                    const isCellTutorial = currentCell?.type === "TUTORIAL" && currentCell.span === 1;

                    if (!isCellEmpty && !isCellTutorial) continue;

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
            _placeTutorialInFreeSlot(s, divKey, timetable, collegeOccupancy);
        });
    });

    // ── PASS C: Final sweep — re-check lab-paired tutorials via lab window lookup ──
    labPairedTutorials.filter((s) => !s.allocated).forEach((s) => {
        const divKey = `${s.year}-${s.division}`;
        _placeTutorialInFreeSlot(s, divKey, timetable, collegeOccupancy);
    });
}

/**
 * Embed a tutorial session into the lab/practical cell of the timetable.
 * The tutorial is stored in cell.tutorialAllocations — same 2-hour block as lab,
 * but gets a TUTORIAL_ROOM location (never a lab), assigned later by allocateResources.
 */
function _embedTutorialInLabCell(labCell, labTailCell, tutSession, subSlot, collegeOccupancy, labDay) {
    if (!labCell) return;

    // Defensive invariant: tutorial and practical are mutually exclusive for
    // the same batch, even when another batch owns the practical cell.
    if ((labCell.batchAllocations || []).some((allocation) => allocation.batch === tutSession.batch)) return false;

    if (!labCell.tutorialAllocations) labCell.tutorialAllocations = [];
    if (labTailCell && !labTailCell.tutorialAllocations) labTailCell.tutorialAllocations = [];

    // Avoid duplicating the same batch tutorial
    const alreadyEmbedded = (labCell.tutorialAllocations || []).some(
        (t) => t.batch === tutSession.batch && t.subject === tutSession.subject
    );
    if (alreadyEmbedded) {
        tutSession.allocated = true;
        return true;
    }

    const tutEntry = {
        ...tutSession,
        resourceType: "TUTORIAL_ROOM",
        location: "",       // assigned later by allocateResources (tutorial room — never lab)
        embeddedInLab: true,
        labSubSlot: subSlot,
    };

    labCell.tutorialAllocations.push(tutEntry);
    if (labTailCell) labTailCell.tutorialAllocations = labCell.tutorialAllocations;

    // Mark faculty occupancy for the tutorial sub-slot within the lab window
    if (isRealFaculty(tutSession.faculty)) {
        collegeOccupancy.markFacultyOccupied(tutSession.faculty, labDay, subSlot, tutSession);
    }
    if (tutSession.batch) collegeOccupancy.markBatchOccupied(tutSession.batch, labDay, subSlot, tutSession);
    tutSession.allocated = true;
    return true;
}

/**
 * Place a tutorial in any free division slot (fallback when lab co-location unavailable).
 */
function _placeTutorialInFreeSlot(session, divKey, timetable, collegeOccupancy) {
    for (const day of DAYS) {
        if (session.allocated) break;
        for (let slot = 0; slot < 6; slot++) {
            if (!collegeOccupancy.isDivisionSlotFree(divKey, day, slot)) continue;
            if (!collegeOccupancy.isFacultyFree(session.faculty, day, slot)) continue;
            if (!collegeOccupancy.isBatchFree(session.batch, day, slot)) continue;

            collegeOccupancy.commitSingleSession(divKey, day, slot, session);
            break;
        }
    }
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

        const tryPlace = (lecture, allowRareDuplicate = false) => {
            // Sort days:
            // 1. Days with 0 lectures of this course first
            // 2. Days with fewer total lectures in this division (load balancing)
            const sortedDays = [...DAYS].sort((dayA, dayB) => {
                const targetSubj = (lecture.subject || lecture.courseCode || lecture.courseName || "").toUpperCase().trim();
                const slotsA = timetable[divKey]?.[dayA] || [];
                const slotsB = timetable[divKey]?.[dayB] || [];
                const countCourseA = slotsA.filter((c) => c && (c.subject || c.courseCode || c.courseName || "").toUpperCase().trim() === targetSubj).length;
                const countCourseB = slotsB.filter((c) => c && (c.subject || c.courseCode || c.courseName || "").toUpperCase().trim() === targetSubj).length;
                if (countCourseA !== countCourseB) return countCourseA - countCourseB;
                const totalA = slotsA.filter(Boolean).length;
                const totalB = slotsB.filter(Boolean).length;
                return totalA - totalB;
            });

            for (const day of sortedDays) {
                if (lecture.allocated) break;

                // Check daily lecture distribution:
                // Pass 1: STRICT (countOnDay must be 0 — strictly no duplicate lecture)
                // Pass 2: RARE FALLBACK ONLY (countOnDay < 2)
                if (!checkLectureDistribution({ timetable, divisionKey: divKey, day, session: lecture, allowRareFallback: allowRareDuplicate })) {
                    continue;
                }

                for (let slot = 0; slot < 6; slot++) {
                    if (!collegeOccupancy.isDivisionSlotFree(divKey, day, slot)) continue;
                    if (!collegeOccupancy.isFacultyFree(lecture.faculty, day, slot)) continue;

                    // Strictly forbid consecutive lectures of the same course
                    if (!checkSubjectConstraint({ timetable, divisionKey: divKey, day, slot, session: lecture })) continue;

                    collegeOccupancy.commitSingleSession(divKey, day, slot, lecture);
                    return true;
                }
            }
            return false;
        };

        // Pass 1: Strict distribution (STRICTLY max 1 lecture per course per day across distinct days)
        lectures.forEach((s) => {
            if (!s.allocated) tryPlace(s, false);
        });

        // Pass 2: Rare condition fallback:
        // ONLY if a course still has unallocated lectures and literally cannot be placed across distinct days
        lectures.forEach((s) => {
            if (!s.allocated) tryPlace(s, true);
        });
    });

    // Run smartHumanBrainScheduler heuristics to resolve remaining tight lectures via clean swaps
    smartHumanBrainScheduler(timetable, sessionPool, collegeOccupancy.facultyOccupancy, facultyAvailability);
}

/**
 * Count available slots for a faculty member after blackouts.
 */
function getAvailableSlotCount(faculty, facultyAvailability = {}) {
    if (!faculty || !facultyAvailability || !facultyAvailability[faculty]) return 30;
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
