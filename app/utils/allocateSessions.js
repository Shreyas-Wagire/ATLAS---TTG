import { checkFacultyConstraint } from "./checkFacultyConstraint";
import { checkSubjectConstraint } from "./checkSubjectConstraint";
import { checkLectureDistribution } from "./checkLectureDistribution";
import { smartHumanBrainScheduler } from "./smartHumanBrainScheduler";

export function allocateSessions(timetable, sessionPool) {
    const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    const facultySchedule = {}; // Tracks faculty -> day -> slot -> true

    function isFacultyBusy(faculty, day, slot) {
        if (!faculty || faculty === "TBD" || faculty === "FIXED" || faculty === "DEPT-FACULTY" || faculty === "TBD-FACULTY") return false;
        return !!facultySchedule[faculty]?.[day]?.[slot];
    }

    function markFacultyBusy(faculty, day, slot) {
        if (!faculty || faculty === "TBD" || faculty === "FIXED" || faculty === "DEPT-FACULTY" || faculty === "TBD-FACULTY") return;
        if (!facultySchedule[faculty]) facultySchedule[faculty] = {};
        if (!facultySchedule[faculty][day]) facultySchedule[faculty][day] = {};
        facultySchedule[faculty][day][slot] = true;
    }

    // Step 0: Pre-mark faculty schedule for pre-placed fixed constraints in timetable
    Object.keys(timetable).forEach((key) => {
        days.forEach((day) => {
            (timetable[key][day] || []).forEach((cell, slot) => {
                if (!cell) return;
                if (cell.faculty) markFacultyBusy(cell.faculty, day, slot);
                if (cell.batchAllocations) {
                    cell.batchAllocations.forEach((b) => markFacultyBusy(b.faculty, day, slot));
                }
            });
        });
    });

    // ===============================================
    // STEP 1: ALLOCATE SYNCHRONIZED GROUPS (CROSS-DIVISION)
    // ===============================================
    const syncGroupMap = {};
    sessionPool.forEach((session) => {
        if (session.syncGroup) {
            if (!syncGroupMap[session.syncGroup]) {
                syncGroupMap[session.syncGroup] = [];
            }
            syncGroupMap[session.syncGroup].push(session);
        }
    });

    Object.entries(syncGroupMap).forEach(([groupName, groupSessions]) => {
        const courseSessionMap = {};
        groupSessions.forEach((s) => {
            if (!courseSessionMap[s.subject]) courseSessionMap[s.subject] = [];
            courseSessionMap[s.subject].push(s);
        });

        const maxInstanceCount = Math.max(
            ...Object.values(courseSessionMap).map((list) => list.length)
        );

        for (let instanceIdx = 0; instanceIdx < maxInstanceCount; instanceIdx++) {
            const instanceSessions = Object.values(courseSessionMap)
                .map((list) => list[instanceIdx])
                .filter(Boolean);

            const attemptSyncPlace = (enforceNoRepeatPerDay) => {
                let syncAllocated = false;

                for (let dayIndex = 0; dayIndex < 5 && !syncAllocated; dayIndex++) {
                    const day = days[dayIndex];

                    if (enforceNoRepeatPerDay) {
                        const alreadyPlacedToday = instanceSessions.some((session) => {
                            const key = `${session.year}-${session.division}`;
                            if (!timetable[key] || !timetable[key][day]) return false;
                            const daySlots = timetable[key][day];
                            const targetSubj = (session.subject || session.courseCode || "").toUpperCase().trim();
                            return daySlots.some((cell) => {
                                if (!cell) return false;
                                const cellSubj = (cell.subject || cell.courseCode || "").toUpperCase().trim();
                                return cellSubj === targetSubj;
                            });
                        });

                        if (alreadyPlacedToday) continue;
                    }

                    const has2HourSession = instanceSessions.some((s) => s.duration === 2);
                    const slotSequence = has2HourSession ? [4, 2, 0] : [0, 1, 2, 3, 4, 5];

                    for (const slot of slotSequence) {
                        if (syncAllocated) break;
                        const canPlaceAll = instanceSessions.every((session) => {
                            if (session.allocated) return false;
                            const key = `${session.year}-${session.division}`;
                            if (!timetable[key]) return false;

                            if (session.duration === 2) {
                                const validBlockStarts = [0, 2, 4];
                                if (!validBlockStarts.includes(slot)) return false;
                                if (slot >= 5) return false;
                                if (timetable[key][day][slot] !== null || timetable[key][day][slot + 1] !== null) return false;
                                if (isFacultyBusy(session.faculty, day, slot) || isFacultyBusy(session.faculty, day, slot + 1)) return false;
                                return true;
                            }

                            if (timetable[key][day][slot] !== null) return false;
                            if (isFacultyBusy(session.faculty, day, slot)) return false;
                            return true;
                        });

                        if (canPlaceAll) {
                            instanceSessions.forEach((session) => {
                                const key = `${session.year}-${session.division}`;
                                if (session.duration === 2) {
                                    timetable[key][day][slot] = {
                                        ...session,
                                        fixed: false,
                                        span: 2,
                                    };
                                    timetable[key][day][slot + 1] = {
                                        ...session,
                                        fixed: false,
                                        span: 0,
                                    };
                                    markFacultyBusy(session.faculty, day, slot);
                                    markFacultyBusy(session.faculty, day, slot + 1);
                                } else {
                                    timetable[key][day][slot] = {
                                        ...session,
                                        fixed: false,
                                        span: 1,
                                    };
                                    markFacultyBusy(session.faculty, day, slot);
                                }
                                session.allocated = true;
                            });
                            syncAllocated = true;
                        }
                    }
                }

                return syncAllocated;
            };

            let syncAllocated = attemptSyncPlace(true);
            if (!syncAllocated) {
                attemptSyncPlace(false);
            }
        }
    });

    // ===============================================
    // STEP 2: CLASS-BY-CLASS THREE-PHASE GENERATION STRATEGY
    // ===============================================
    const timetableOrder = [
        "SY-A", "SY-B", "SY-C",
        "TY-A", "TY-B", "TY-C",
        "BTECH-A", "BTECH-B", "BTECH-C",
    ];

    const activeKeys = [
        ...timetableOrder.filter((k) => timetable[k]),
        ...Object.keys(timetable).filter((k) => !timetableOrder.includes(k)),
    ];

    activeKeys.forEach((timetableKey) => {
        const [year, division] = timetableKey.split("-");

        // -----------------------------------------------
        // PHASE 1: ALLOCATE ALL PRACTICALS FOR THIS CLASS
        // -----------------------------------------------
        const classPracticals = sessionPool.filter(
            (s) => s.year === year && s.division === division && s.type === "PRACTICAL" && !s.allocated
        );

        if (classPracticals.length > 0) {
            const batchMap = {};
            classPracticals.forEach((s) => {
                if (!batchMap[s.batch]) batchMap[s.batch] = [];
                batchMap[s.batch].push(s);
            });

            const batchKeys = Object.keys(batchMap).sort();
            const practicalSlotSequences = [
                [4, 2, 0], // Pass 1: Preferred slots
                [0, 1, 2, 3, 4], // Pass 2: Smart fallback
            ];

            practicalSlotSequences.forEach((sequence) => {
                for (let dayIndex = 0; dayIndex < 5; dayIndex++) {
                    const day = days[dayIndex];

                    for (const slot of sequence) {
                        if (slot >= 5) continue;

                        const remainingPracticals = classPracticals.filter((s) => !s.allocated);
                        if (remainingPracticals.length === 0) break;

                        const currentCell = timetable[timetableKey][day][slot];
                        const nextCell = timetable[timetableKey][day][slot + 1];

                        const isCellFree = currentCell === null && nextCell === null;
                        const isCellPractical =
                            currentCell &&
                            currentCell.type === "PRACTICAL" &&
                            currentCell.span === 2 &&
                            nextCell &&
                            nextCell.type === "PRACTICAL" &&
                            nextCell.span === 0;

                        if (!isCellFree && !isCellPractical) continue;

                        const usedFacultiesInThisSlot = new Set();
                        const existingAllocations = currentCell?.batchAllocations || [];
                        existingAllocations.forEach((b) => {
                            if (b.faculty && b.faculty !== "TBD" && b.faculty !== "FIXED") {
                                usedFacultiesInThisSlot.add(b.faculty);
                            }
                        });

                        const allocatableThisSlot = [];

                        batchKeys.forEach((bKey) => {
                            const alreadyAssignedBatch = existingAllocations.some((item) => item.batch === bKey);
                            if (alreadyAssignedBatch) return;

                            const batchAlreadyHasPracticalToday = (timetable[timetableKey][day] || []).some((cell) => {
                                if (!cell || cell.type !== "PRACTICAL") return false;
                                const allocs = cell.batchAllocations || [];
                                return allocs.some((item) => item.batch === bKey);
                            });
                            if (batchAlreadyHasPracticalToday) return;

                            const batchSessions = batchMap[bKey] || [];
                            const candidate = batchSessions.find(
                                (s) =>
                                    !s.allocated &&
                                    !isFacultyBusy(s.faculty, day, slot) &&
                                    !isFacultyBusy(s.faculty, day, slot + 1) &&
                                    (!s.faculty || s.faculty === "TBD" || s.faculty === "FIXED" || !usedFacultiesInThisSlot.has(s.faculty))
                            );

                            if (candidate) {
                                if (candidate.faculty && candidate.faculty !== "TBD" && candidate.faculty !== "FIXED") {
                                    usedFacultiesInThisSlot.add(candidate.faculty);
                                }
                                allocatableThisSlot.push(candidate);
                            }
                        });

                        if (allocatableThisSlot.length === 0) continue;

                        if (isCellFree) {
                            timetable[timetableKey][day][slot] = {
                                type: "PRACTICAL",
                                span: 2,
                                fixed: false,
                                batchAllocations: [...allocatableThisSlot],
                            };
                            timetable[timetableKey][day][slot + 1] = {
                                type: "PRACTICAL",
                                span: 0,
                                fixed: false,
                                batchAllocations: [...allocatableThisSlot],
                            };
                        } else if (isCellPractical) {
                            if (!currentCell.batchAllocations) currentCell.batchAllocations = [];
                            if (!nextCell.batchAllocations) nextCell.batchAllocations = [];

                            allocatableThisSlot.forEach((s) => {
                                currentCell.batchAllocations.push(s);
                                nextCell.batchAllocations.push(s);
                            });
                        }

                        allocatableThisSlot.forEach((s) => {
                            markFacultyBusy(s.faculty, day, slot);
                            markFacultyBusy(s.faculty, day, slot + 1);
                            s.allocated = true;
                        });
                    }
                }
            });
        }

        // -----------------------------------------------
        // PHASE 2: ALLOCATE ALL TUTORIALS FOR THIS CLASS (PARALLEL TUTORIAL GROUPS)
        // -----------------------------------------------
        const classTutorials = sessionPool.filter(
            (s) => s.year === year && s.division === division && s.type === "TUTORIAL" && !s.allocated
        );

        const tutorialPairsMap = {};
        classTutorials.forEach((session) => {
            const batchNum = Number((session.batch || "").replace(/[^0-9]/g, "")) || 1;
            const pairGroupIndex = Math.ceil(batchNum / 2);
            const key = `${session.subject}-PAIR-${pairGroupIndex}`;
            if (!tutorialPairsMap[key]) tutorialPairsMap[key] = [];
            tutorialPairsMap[key].push(session);
        });

        Object.values(tutorialPairsMap).forEach((pairSessions) => {
            if (pairSessions.length === 0) return;
            let allocated = false;

            for (let dayIndex = 0; dayIndex < 5 && !allocated; dayIndex++) {
                const day = days[dayIndex];

                for (let slot = 0; slot < 6; slot++) {
                    const allocatable = pairSessions.filter(
                        (s) => !s.allocated && !isFacultyBusy(s.faculty, day, slot)
                    );

                    if (allocatable.length === 0) continue;

                    const currentCell = timetable[timetableKey][day][slot];

                    if (currentCell === null) {
                        timetable[timetableKey][day][slot] = {
                            type: "TUTORIAL",
                            span: 1,
                            fixed: false,
                            batchAllocations: [...allocatable],
                        };
                        allocatable.forEach((s) => {
                            markFacultyBusy(s.faculty, day, slot);
                            s.allocated = true;
                        });
                        allocated = true;
                        break;
                    } else if (currentCell && currentCell.type === "TUTORIAL" && currentCell.span === 1) {
                        if (!currentCell.batchAllocations) currentCell.batchAllocations = [];

                        const cellBatches = new Set(currentCell.batchAllocations.map((b) => b.batch));
                        const cellFaculties = new Set(currentCell.batchAllocations.map((b) => b.faculty));

                        const canMerge = allocatable.every(
                            (s) => !cellBatches.has(s.batch) && (!s.faculty || !cellFaculties.has(s.faculty))
                        );

                        if (canMerge) {
                            allocatable.forEach((s) => {
                                currentCell.batchAllocations.push(s);
                                markFacultyBusy(s.faculty, day, slot);
                                s.allocated = true;
                            });
                            allocated = true;
                            break;
                        }
                    }
                }
            }
        });

        // -----------------------------------------------
        // PHASE 3: ALLOCATE ALL LECTURES FOR THIS CLASS (100% COMPLETION BACKFILL)
        // -----------------------------------------------
        const classLectures = sessionPool.filter(
            (s) => s.year === year && s.division === division && s.type === "LECTURE" && !s.allocated
        );

        const tryPlaceLecture = (session, mode) => {
            for (let dayIndex = 0; dayIndex < 5; dayIndex++) {
                const day = days[dayIndex];
                for (let slot = 0; slot < 6; slot++) {
                    if (timetable[timetableKey][day][slot] !== null) continue;

                    if (mode === "STRICT") {
                        if (isFacultyBusy(session.faculty, day, slot)) continue;
                        if (!checkFacultyConstraint({ faculty: session.faculty, day, slot, facultySchedule })) continue;
                        if (!checkSubjectConstraint({ timetable, divisionKey: timetableKey, day, slot, session })) continue;
                        if (!checkLectureDistribution({ timetable, divisionKey: timetableKey, day, session })) continue;
                    } else if (mode === "RELAXED") {
                        if (isFacultyBusy(session.faculty, day, slot)) continue;
                        if (!checkFacultyConstraint({ faculty: session.faculty, day, slot, facultySchedule })) continue;
                    } else if (mode === "OPEN_SLOT_FACULTY_FREE") {
                        if (isFacultyBusy(session.faculty, day, slot)) continue;
                    } else if (mode === "SMART_MAPPING_BACKFILL") {
                        const facultyToAssign = isFacultyBusy(session.faculty, day, slot) ? "TBD-FACULTY" : session.faculty;
                        timetable[timetableKey][day][slot] = {
                            ...session,
                            fixed: false,
                            span: 1,
                            faculty: facultyToAssign,
                        };
                        markFacultyBusy(facultyToAssign, day, slot);
                        session.allocated = true;
                        return true;
                    }

                    timetable[timetableKey][day][slot] = {
                        ...session,
                        fixed: false,
                        span: 1,
                    };
                    markFacultyBusy(session.faculty, day, slot);
                    session.allocated = true;
                    return true;
                }
            }
            return false;
        };

        classLectures.forEach((session) => {
            if (!session.allocated) tryPlaceLecture(session, "STRICT");
        });

        classLectures.forEach((session) => {
            if (!session.allocated) tryPlaceLecture(session, "RELAXED");
        });

        classLectures.forEach((session) => {
            if (!session.allocated) tryPlaceLecture(session, "OPEN_SLOT_FACULTY_FREE");
        });

        classLectures.forEach((session) => {
            if (!session.allocated) tryPlaceLecture(session, "SMART_MAPPING_BACKFILL");
        });
    });

    // Execute Human Brain Backtracking & Swap Resolver
    smartHumanBrainScheduler(timetable, sessionPool, facultySchedule);

    // ===============================================
    // GLOBAL FINAL AUDIT CLEANUP PASS (GUARANTEE ZERO MISSING SESSIONS)
    // ===============================================
    const remainingUnallocated = sessionPool.filter((s) => !s.allocated);
    remainingUnallocated.forEach((session) => {
        const timetableKey = `${session.year}-${session.division}`;
        if (!timetable[timetableKey]) return;

        for (let dayIndex = 0; dayIndex < 5; dayIndex++) {
            const day = days[dayIndex];
            const daySlots = timetable[timetableKey]?.[day];
            if (!daySlots) continue;

            for (let slot = 0; slot < 6; slot++) {
                if (daySlots[slot] === null) {
                    const facultyToAssign = isFacultyBusy(session.faculty, day, slot) ? "TBD-FACULTY" : session.faculty;
                    daySlots[slot] = {
                        ...session,
                        fixed: false,
                        span: 1,
                        faculty: facultyToAssign || "TBD-FACULTY",
                    };
                    markFacultyBusy(facultyToAssign, day, slot);
                    session.allocated = true;
                    return;
                }
            }
        }
    });

    return timetable;
}