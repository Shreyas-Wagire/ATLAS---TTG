export function smartHumanBrainScheduler(timetable, sessionPool, facultySchedule) {
    const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];

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

    function unmarkFacultyBusy(faculty, day, slot) {
        if (!faculty || !facultySchedule[faculty]?.[day]) return;
        delete facultySchedule[faculty][day][slot];
    }

    // Process all classes in timetable
    Object.keys(timetable).forEach((timetableKey) => {
        const classTable = timetable[timetableKey];
        const [year, division] = timetableKey.split("-");

        // Find unallocated lectures for this class
        const unallocatedLectures = sessionPool.filter(
            (s) => s.year === year && s.division === division && s.type === "LECTURE" && !s.allocated
        );

        if (unallocatedLectures.length === 0) return;

        unallocatedLectures.forEach((lecture) => {
            let placed = false;

            // Strategy 1: Direct placement into free empty cell where faculty is free
            for (let dayIdx = 0; dayIdx < days.length && !placed; dayIdx++) {
                const day = days[dayIdx];
                for (let slot = 0; slot < 6; slot++) {
                    if (classTable[day][slot] === null && !isFacultyBusy(lecture.faculty, day, slot)) {
                        classTable[day][slot] = {
                            ...lecture,
                            fixed: false,
                            span: 1,
                        };
                        markFacultyBusy(lecture.faculty, day, slot);
                        lecture.allocated = true;
                        placed = true;
                        break;
                    }
                }
            }

            // Strategy 2: Human Brain Backtracking & Swap Resolver
            if (!placed) {
                // Find an empty cell C_empty in timetableKey
                const emptyCells = [];
                for (let d = 0; d < days.length; d++) {
                    const day = days[d];
                    for (let s = 0; s < 6; s++) {
                        if (classTable[day][s] === null) {
                            emptyCells.push({ day, slot: s });
                        }
                    }
                }

                // Try swapping with an already placed non-fixed lecture C_occupied
                for (const empty of emptyCells) {
                    if (placed) break;

                    for (let d = 0; d < days.length && !placed; d++) {
                        const occupiedDay = days[d];
                        for (let occupiedSlot = 0; occupiedSlot < 6; occupiedSlot++) {
                            const candidateCell = classTable[occupiedDay][occupiedSlot];

                            // Must be a movable non-fixed single lecture
                            if (
                                candidateCell &&
                                candidateCell.type === "LECTURE" &&
                                !candidateCell.fixed &&
                                candidateCell.span === 1
                            ) {
                                const targetFaculty = lecture.faculty;
                                const existingFaculty = candidateCell.faculty;

                                // Can targetFaculty move to occupiedDay & occupiedSlot?
                                if (!isFacultyBusy(targetFaculty, occupiedDay, occupiedSlot)) {
                                    // Can existingFaculty move to empty.day & empty.slot?
                                    unmarkFacultyBusy(existingFaculty, occupiedDay, occupiedSlot);

                                    if (!isFacultyBusy(existingFaculty, empty.day, empty.slot)) {
                                        // EXECUTE SWAP!
                                        classTable[empty.day][empty.slot] = { ...candidateCell };
                                        markFacultyBusy(existingFaculty, empty.day, empty.slot);

                                        classTable[occupiedDay][occupiedSlot] = {
                                            ...lecture,
                                            fixed: false,
                                            span: 1,
                                        };
                                        markFacultyBusy(targetFaculty, occupiedDay, occupiedSlot);

                                        lecture.allocated = true;
                                        placed = true;
                                        break;
                                    } else {
                                        // Re-mark if swap failed
                                        markFacultyBusy(existingFaculty, occupiedDay, occupiedSlot);
                                    }
                                }
                            }
                        }
                    }
                }
            }

            // Strategy 3: Dynamic Department Backup Faculty Assignment if primary faculty is fully occupied
            if (!placed) {
                for (let d = 0; d < days.length && !placed; d++) {
                    const day = days[d];
                    for (let s = 0; s < 6; s++) {
                        if (classTable[day][s] === null) {
                            const backupFaculty = `${lecture.faculty || "DEPT"}-FACULTY`;
                            classTable[day][s] = {
                                ...lecture,
                                faculty: backupFaculty,
                                fixed: false,
                                span: 1,
                            };
                            markFacultyBusy(backupFaculty, day, s);
                            lecture.allocated = true;
                            placed = true;
                            break;
                        }
                    }
                }
            }
        });
    });

    return timetable;
}
