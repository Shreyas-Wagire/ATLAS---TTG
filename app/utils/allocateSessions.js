import { checkFacultyConstraint } from "./checkFacultyConstraint";
import { checkSubjectConstraint } from "./checkSubjectConstraint";
import { checkLectureDistribution } from "./checkLectureDistribution";
import { smartHumanBrainScheduler } from "./smartHumanBrainScheduler";
import { isFacultyBlockedByAvailability } from "./parseFacultyConstraints";

export function allocateSessions(timetable, sessionPool, facultyAvailability = {}) {
    const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    const facultySchedule = {}; // Tracks faculty -> day -> slot -> true

    function isFacultyBusy(faculty, day, slot) {
        if (!faculty || faculty === "TBD" || faculty === "FIXED" || faculty === "DEPT-FACULTY" || faculty === "TBD-FACULTY") return false;
        // Hard block from Faculty Availability Constraints (morning/midday/afternoon blackouts)
        if (isFacultyBlockedByAvailability(facultyAvailability, faculty, day, slot)) return true;
        return !!facultySchedule[faculty]?.[day]?.[slot];
    }

    function markFacultyBusy(faculty, day, slot) {
        if (!faculty || faculty === "TBD" || faculty === "FIXED" || faculty === "DEPT-FACULTY" || faculty === "TBD-FACULTY") return;
        if (!facultySchedule[faculty]) facultySchedule[faculty] = {};
        if (!facultySchedule[faculty][day]) facultySchedule[faculty][day] = {};
        facultySchedule[faculty][day][slot] = true;
    }

    /**
     * STRATEGY 1 — Most-Constrained-Faculty-First
     * Count how many of the 30 weekly slots (6 slots × 5 days) are actually
     * available to a faculty member after applying their availability blackouts.
     * Fewer available slots → higher placement priority.
     */
    function getAvailableSlotCount(faculty) {
        if (!faculty || !facultyAvailability[faculty]) return 30;
        const allDays = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
        let blocked = 0;
        allDays.forEach((day) => {
            blocked += (facultyAvailability[faculty][day] || []).length;
        });
        return Math.max(1, 30 - blocked); // never return 0 to avoid divide-by-zero
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
        // Strategy: Subject-group-first → all batches of same subject share one slot.
        // 3-Pass system: Group → Individual retry → Last-resort forced placement.
        // -----------------------------------------------
        const classPracticals = sessionPool.filter(
            (s) => s.year === year && s.division === division && s.type === "PRACTICAL" && !s.allocated
        );

        if (classPracticals.length > 0) {

            // Build ordered list of all valid (day, slot) pairs — stagger by division
            const validPracticalStarts = [0, 2, 4];
            const orderedDaySlots = [];
            const slotOrderByDiv = division === "B" ? [2, 4, 0] : division === "C" ? [4, 0, 2] : [0, 2, 4];
            for (let d = 0; d < 5; d++) {
                for (const slot of slotOrderByDiv) {
                    orderedDaySlots.push({ day: days[d], slot });
                }
            }
            // Fallback extended sequence (allows slots 1, 3 too)
            const extendedDaySlots = [...orderedDaySlots];
            for (let d = 0; d < 5; d++) {
                for (const slot of [1, 3]) {
                    extendedDaySlots.push({ day: days[d], slot });
                }
            }

            // Helper: count practicals for a batch on a specific day (counts span:2 cells only)
            function batchLabCountOnDay(batchLabel, day) {
                let count = 0;
                (timetable[timetableKey][day] || []).forEach((cell) => {
                    if (cell?.type === "PRACTICAL" && cell.span === 2 &&
                        (cell.batchAllocations || []).some((b) => b.batch === batchLabel)) count++;
                });
                return count;
            }

            // Helper: is this batch already placed in this specific slot?
            function batchAlreadyInSlot(batchLabel, day, slot) {
                const cell = timetable[timetableKey][day]?.[slot];
                if (!cell || !cell.batchAllocations) return false;
                return cell.batchAllocations.some((b) => b.batch === batchLabel);
            }

            // ── PASS A: Subject-group placement ──────────────────────────────
            // Group sessions by subject so all batches for same subject
            // can be placed in the same 2-hour slot (parallel, different labs).
            const subjectGroupMap = {};
            classPracticals.forEach((s) => {
                const sKey = s.subject || s.subjectName || "unknown";
                if (!subjectGroupMap[sKey]) subjectGroupMap[sKey] = [];
                subjectGroupMap[sKey].push(s);
            });

            Object.values(subjectGroupMap).forEach((subjectSessions) => {
                for (const { day, slot } of orderedDaySlots) {
                    const remaining = subjectSessions.filter((s) => !s.allocated);
                    if (remaining.length === 0) break;

                    if (slot >= 5) continue;
                    const currentCell = timetable[timetableKey][day][slot];
                    const nextCell = timetable[timetableKey][day][slot + 1];

                    const isCellFree = currentCell === null && nextCell === null;
                    const isCellPractical = currentCell?.type === "PRACTICAL" && currentCell.span === 2
                        && nextCell?.type === "PRACTICAL" && nextCell.span === 0;

                    if (!isCellFree && !isCellPractical) continue;

                    const usedFacultiesInSlot = new Set();
                    const existingBatchesInSlot = new Set();

                    if (isCellPractical) {
                        (currentCell.batchAllocations || []).forEach((b) => {
                            existingBatchesInSlot.add(b.batch);
                            if (b.faculty && b.faculty !== "TBD" && b.faculty !== "FIXED") usedFacultiesInSlot.add(b.faculty);
                        });
                    }

                    const allocatableNow = [];
                    for (const session of remaining) {
                        if (session.allocated) continue;
                        if (existingBatchesInSlot.has(session.batch)) continue;
                        if (batchLabCountOnDay(session.batch, day) >= 2) continue; // max 2 labs/day
                        if (isFacultyBusy(session.faculty, day, slot)) continue;
                        if (isFacultyBusy(session.faculty, day, slot + 1)) continue;
                        if (session.faculty && session.faculty !== "TBD" && session.faculty !== "FIXED" && usedFacultiesInSlot.has(session.faculty)) continue;

                        usedFacultiesInSlot.add(session.faculty);
                        existingBatchesInSlot.add(session.batch);
                        allocatableNow.push(session);
                    }

                    if (allocatableNow.length === 0) continue;

                    if (isCellFree) {
                        timetable[timetableKey][day][slot] = { type: "PRACTICAL", span: 2, fixed: false, batchAllocations: [...allocatableNow] };
                        timetable[timetableKey][day][slot + 1] = { type: "PRACTICAL", span: 0, fixed: false, batchAllocations: [...allocatableNow] };
                    } else {
                        if (!currentCell.batchAllocations) currentCell.batchAllocations = [];
                        if (!nextCell.batchAllocations) nextCell.batchAllocations = [];
                        allocatableNow.forEach((s) => { currentCell.batchAllocations.push(s); nextCell.batchAllocations.push(s); });
                    }
                    allocatableNow.forEach((s) => {
                        markFacultyBusy(s.faculty, day, slot);
                        markFacultyBusy(s.faculty, day, slot + 1);
                        s.allocated = true;
                    });
                }
            });

            // ── PASS B: Individual retry for still-unallocated practicals ────
            classPracticals.filter((s) => !s.allocated).forEach((session) => {
                for (const { day, slot } of extendedDaySlots) {
                    if (session.allocated) break;
                    if (slot >= 5) continue;
                    if (batchAlreadyInSlot(session.batch, day, slot)) continue;
                    if (batchLabCountOnDay(session.batch, day) >= 2) continue;
                    if (isFacultyBusy(session.faculty, day, slot)) continue;
                    if (isFacultyBusy(session.faculty, day, slot + 1)) continue;

                    const cur = timetable[timetableKey][day][slot];
                    const nxt = timetable[timetableKey][day][slot + 1];

                    if (cur === null && nxt === null) {
                        timetable[timetableKey][day][slot] = { type: "PRACTICAL", span: 2, fixed: false, batchAllocations: [session] };
                        timetable[timetableKey][day][slot + 1] = { type: "PRACTICAL", span: 0, fixed: false, batchAllocations: [session] };
                        markFacultyBusy(session.faculty, day, slot);
                        markFacultyBusy(session.faculty, day, slot + 1);
                        session.allocated = true;
                    } else if (cur?.type === "PRACTICAL" && cur.span === 2 && nxt?.type === "PRACTICAL" && nxt.span === 0) {
                        const existFaculties = new Set((cur.batchAllocations || []).map((b) => b.faculty).filter(Boolean));
                        if (!session.faculty || session.faculty === "TBD" || session.faculty === "FIXED" || !existFaculties.has(session.faculty)) {
                            if (!cur.batchAllocations) cur.batchAllocations = [];
                            if (!nxt.batchAllocations) nxt.batchAllocations = [];
                            cur.batchAllocations.push(session);
                            nxt.batchAllocations.push(session);
                            markFacultyBusy(session.faculty, day, slot);
                            markFacultyBusy(session.faculty, day, slot + 1);
                            session.allocated = true;
                        }
                    }
                }
            });

            // ── PASS C: Last-resort — force into any open 2-hour window ──────
            // Uses TBD-FACULTY if faculty is busy to guarantee placement.
            classPracticals.filter((s) => !s.allocated).forEach((session) => {
                for (const { day, slot } of extendedDaySlots) {
                    if (session.allocated) break;
                    if (slot >= 5) continue;
                    if (batchAlreadyInSlot(session.batch, day, slot)) continue;

                    const cur = timetable[timetableKey][day][slot];
                    const nxt = timetable[timetableKey][day][slot + 1];
                    const facultyToUse = isFacultyBusy(session.faculty, day, slot) ? "TBD-FACULTY" : session.faculty;
                    const entry = { ...session, faculty: facultyToUse };

                    if (cur === null && nxt === null) {
                        timetable[timetableKey][day][slot] = { type: "PRACTICAL", span: 2, fixed: false, batchAllocations: [entry] };
                        timetable[timetableKey][day][slot + 1] = { type: "PRACTICAL", span: 0, fixed: false, batchAllocations: [entry] };
                        markFacultyBusy(facultyToUse, day, slot);
                        markFacultyBusy(facultyToUse, day, slot + 1);
                        session.allocated = true;
                    } else if (cur?.type === "PRACTICAL" && cur.span === 2 && nxt?.type === "PRACTICAL" && nxt.span === 0) {
                        const existBatches = new Set((cur.batchAllocations || []).map((b) => b.batch));
                        if (!existBatches.has(session.batch)) {
                            if (!cur.batchAllocations) cur.batchAllocations = [];
                            if (!nxt.batchAllocations) nxt.batchAllocations = [];
                            cur.batchAllocations.push(entry);
                            nxt.batchAllocations.push(entry);
                            markFacultyBusy(facultyToUse, day, slot);
                            markFacultyBusy(facultyToUse, day, slot + 1);
                            session.allocated = true;
                        }
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

        // STRATEGY 1: Most-Constrained-Faculty-First
        // Sort so that faculty with the fewest available slots are allocated FIRST.
        // A faculty only available in Afternoon (10 slots) must get priority over
        // a faculty available all day (30 slots) — otherwise the afternoon slots
        // fill up and the constrained faculty is left with zero options.
        classLectures.sort((a, b) => getAvailableSlotCount(a.faculty) - getAvailableSlotCount(b.faculty));

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
    smartHumanBrainScheduler(timetable, sessionPool, facultySchedule, facultyAvailability);

    // ===============================================
    // GLOBAL FINAL AUDIT CLEANUP PASS (GUARANTEE ZERO MISSING SESSIONS)
    // ===============================================
    const remainingUnallocated = sessionPool.filter((s) => !s.allocated);
    remainingUnallocated.forEach((session) => {
        const timetableKey = `${session.year}-${session.division}`;
        if (!timetable[timetableKey]) return;

        if (session.type === "PRACTICAL") {
            // STEP A: Try standard allowed 2-hour practical blocks ONLY: [0, 1], [2, 3], [4, 5]
            const validStarts = [0, 2, 4];
            let placed = false;

            // Pass A1: Merge into existing practical block or find 2 empty slots
            for (let dayIndex = 0; dayIndex < 5 && !placed; dayIndex++) {
                const day = days[dayIndex];
                const daySlots = timetable[timetableKey]?.[day];
                if (!daySlots) continue;

                for (const slot of validStarts) {
                    const cell = daySlots[slot];
                    const nextCell = daySlots[slot + 1];

                    if (cell && cell.type === "PRACTICAL" && cell.span === 2 && nextCell && nextCell.span === 0) {
                        const existingBatches = new Set((cell.batchAllocations || []).map((b) => b.batch));
                        if (!existingBatches.has(session.batch)) {
                            const facultyToAssign = isFacultyBusy(session.faculty, day, slot) ? "DEPT-FACULTY" : session.faculty;
                            const entry = { ...session, faculty: facultyToAssign };
                            if (!cell.batchAllocations) cell.batchAllocations = [];
                            if (!nextCell.batchAllocations) nextCell.batchAllocations = [];
                            cell.batchAllocations.push(entry);
                            nextCell.batchAllocations.push(entry);
                            markFacultyBusy(facultyToAssign, day, slot);
                            markFacultyBusy(facultyToAssign, day, slot + 1);
                            session.allocated = true;
                            placed = true;
                            break;
                        }
                    } else if (cell === null && nextCell === null) {
                        const facultyToAssign = isFacultyBusy(session.faculty, day, slot) ? "DEPT-FACULTY" : session.faculty;
                        const entry = { ...session, faculty: facultyToAssign };
                        daySlots[slot] = { type: "PRACTICAL", span: 2, fixed: false, batchAllocations: [entry] };
                        daySlots[slot + 1] = { type: "PRACTICAL", span: 0, fixed: false, batchAllocations: [entry] };
                        markFacultyBusy(facultyToAssign, day, slot);
                        markFacultyBusy(facultyToAssign, day, slot + 1);
                        session.allocated = true;
                        placed = true;
                        break;
                    }
                }
            }

            // Pass A2: Displacement — Move single lectures out of (slot, slot+1) to free up 2-hour window
            if (!placed) {
                for (let dayIndex = 0; dayIndex < 5 && !placed; dayIndex++) {
                    const day = days[dayIndex];
                    const daySlots = timetable[timetableKey]?.[day];
                    if (!daySlots) continue;

                    for (const slot of [0, 2, 4]) {
                        const c0 = daySlots[slot];
                        const c1 = daySlots[slot + 1];

                        // Check if c0/c1 are single non-fixed lectures or null
                        const isC0Movable = c0 === null || (!c0.fixed && c0.span === 1 && c0.type === "LECTURE");
                        const isC1Movable = c1 === null || (!c1.fixed && c1.span === 1 && c1.type === "LECTURE");

                        if (!isC0Movable || !isC1Movable) continue;
                        if (c0 === null && c1 === null) continue; // handled in A1

                        // Find free slots in the week where c0 and c1's faculty are NOT busy
                        let c0Dest = null;
                        let c1Dest = null;

                        if (c0 !== null) {
                            for (let d2 = 0; d2 < 5 && !c0Dest; d2++) {
                                const d2Name = days[d2];
                                for (let s2 = 0; s2 < 6; s2++) {
                                    if (d2Name === day && (s2 === slot || s2 === slot + 1)) continue;
                                    if (timetable[timetableKey][d2Name][s2] === null && !isFacultyBusy(c0.faculty, d2Name, s2)) {
                                        c0Dest = { day: d2Name, slot: s2 };
                                        break;
                                    }
                                }
                            }
                            if (!c0Dest) continue; // Cannot move c0 without causing a clash
                        }

                        if (c1 !== null) {
                            for (let d2 = 0; d2 < 5 && !c1Dest; d2++) {
                                const d2Name = days[d2];
                                for (let s2 = 0; s2 < 6; s2++) {
                                    if (d2Name === day && (s2 === slot || s2 === slot + 1)) continue;
                                    if (c0Dest && d2Name === c0Dest.day && s2 === c0Dest.slot) continue;
                                    if (timetable[timetableKey][d2Name][s2] === null && !isFacultyBusy(c1.faculty, d2Name, s2)) {
                                        c1Dest = { day: d2Name, slot: s2 };
                                        break;
                                    }
                                }
                            }
                            if (!c1Dest) continue; // Cannot move c1 without causing a clash
                        }

                        // Relocate c0 and c1 safely
                        if (c0 !== null && c0Dest) {
                            timetable[timetableKey][c0Dest.day][c0Dest.slot] = { ...c0 };
                            markFacultyBusy(c0.faculty, c0Dest.day, c0Dest.slot);
                        }
                        if (c1 !== null && c1Dest) {
                            timetable[timetableKey][c1Dest.day][c1Dest.slot] = { ...c1 };
                            markFacultyBusy(c1.faculty, c1Dest.day, c1Dest.slot);
                        }

                        // Place practical block in freed window [slot, slot+1]
                        const facultyToAssign = isFacultyBusy(session.faculty, day, slot) ? "DEPT-FACULTY" : session.faculty;
                        const entry = { ...session, faculty: facultyToAssign };
                        daySlots[slot] = { type: "PRACTICAL", span: 2, fixed: false, batchAllocations: [entry] };
                        daySlots[slot + 1] = { type: "PRACTICAL", span: 0, fixed: false, batchAllocations: [entry] };
                        markFacultyBusy(facultyToAssign, day, slot);
                        markFacultyBusy(facultyToAssign, day, slot + 1);
                        session.allocated = true;
                        placed = true;
                        break;
                    }
                }
            }

            // Pass A3: Emergency 2-Hour Slot Unblocking — relocate single lectures to open 2-hour window
            if (!placed) {
                for (let dayIndex = 0; dayIndex < 5 && !placed; dayIndex++) {
                    const day = days[dayIndex];
                    const daySlots = timetable[timetableKey]?.[day];
                    if (!daySlots) continue;

                    for (const slot of [0, 2, 4]) {
                        const cell = daySlots[slot];
                        const nextCell = daySlots[slot + 1];

                        if (cell?.type === "PRACTICAL" && cell.span === 2 && nextCell?.type === "PRACTICAL" && nextCell.span === 0) {
                            const facultyToAssign = "DEPT-FACULTY";
                            const entry = { ...session, faculty: facultyToAssign };
                            if (!cell.batchAllocations) cell.batchAllocations = [];
                            if (!nextCell.batchAllocations) nextCell.batchAllocations = [];
                            cell.batchAllocations.push(entry);
                            nextCell.batchAllocations.push(entry);
                            session.allocated = true;
                            placed = true;
                            break;
                        }

                        if ((cell === null || (cell && !cell.fixed && cell.span === 1)) &&
                            (nextCell === null || (nextCell && !nextCell.fixed && nextCell.span === 1))) {

                            // Relocate non-null cells to any open slot in week
                            if (cell !== null) {
                                for (let d2 = 0; d2 < 5; d2++) {
                                    const freeS = (timetable[timetableKey][days[d2]] || []).findIndex((c) => c === null);
                                    if (freeS !== -1) {
                                        timetable[timetableKey][days[d2]][freeS] = { ...cell };
                                        break;
                                    }
                                }
                            }

                            if (nextCell !== null) {
                                for (let d2 = 0; d2 < 5; d2++) {
                                    const freeS = (timetable[timetableKey][days[d2]] || []).findIndex((c) => c === null);
                                    if (freeS !== -1) {
                                        timetable[timetableKey][days[d2]][freeS] = { ...nextCell };
                                        break;
                                    }
                                }
                            }

                            const facultyToAssign = isFacultyBusy(session.faculty, day, slot) ? "DEPT-FACULTY" : session.faculty;
                            const entry = { ...session, faculty: facultyToAssign };
                            daySlots[slot] = { type: "PRACTICAL", span: 2, fixed: false, batchAllocations: [entry] };
                            daySlots[slot + 1] = { type: "PRACTICAL", span: 0, fixed: false, batchAllocations: [entry] };
                            markFacultyBusy(facultyToAssign, day, slot);
                            markFacultyBusy(facultyToAssign, day, slot + 1);
                            session.allocated = true;
                            placed = true;
                            break;
                        }
                    }
                }
            }

            // Pass A4: Absolute Last Resort — place into any open single slot in the week
            if (!placed) {
                for (let dayIndex = 0; dayIndex < 5 && !placed; dayIndex++) {
                    const day = days[dayIndex];
                    const daySlots = timetable[timetableKey]?.[day];
                    if (!daySlots) continue;

                    for (let slot = 0; slot < 6; slot++) {
                        if (daySlots[slot] === null) {
                            const facultyToAssign = isFacultyBusy(session.faculty, day, slot) ? "DEPT-FACULTY" : session.faculty;
                            const entry = { ...session, faculty: facultyToAssign };
                            daySlots[slot] = { type: "PRACTICAL", span: 1, fixed: false, batchAllocations: [entry] };
                            markFacultyBusy(facultyToAssign, day, slot);
                            session.allocated = true;
                            placed = true;
                            break;
                        }
                    }
                }
            }

        } else {
            // For lectures & tutorials: find any empty slot across all 30 slots
            let placed = false;
            for (let dayIndex = 0; dayIndex < 5 && !placed; dayIndex++) {
                const day = days[dayIndex];
                const daySlots = timetable[timetableKey]?.[day];
                if (!daySlots) continue;

                for (let slot = 0; slot < 6; slot++) {
                    if (daySlots[slot] === null) {
                        const facultyToAssign = isFacultyBusy(session.faculty, day, slot) ? "DEPT-FACULTY" : session.faculty;
                        daySlots[slot] = {
                            ...session,
                            fixed: false,
                            span: 1,
                            faculty: facultyToAssign,
                        };
                        markFacultyBusy(facultyToAssign, day, slot);
                        session.allocated = true;
                        placed = true;
                        break;
                    }
                }
            }
        }
    });




    return timetable;
}