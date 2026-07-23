export function detectSyncViolations(timetable, syncConstraints) {
    if (!timetable || !syncConstraints || syncConstraints.length === 0) {
        return [];
    }

    const violations = [];
    const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];

    syncConstraints.forEach((syncGroup) => {
        const { groupName, courses } = syncGroup;
        const uppercaseCourses = courses.map((c) => c.toUpperCase().trim());

        // Map course -> Array of { divisionKey, day, slot }
        const coursePlacements = {};
        uppercaseCourses.forEach((c) => {
            coursePlacements[c] = [];
        });

        Object.entries(timetable).forEach(([divisionKey, divisionTable]) => {
            days.forEach((day) => {
                const slots = divisionTable[day] || [];
                slots.forEach((cell, slotIndex) => {
                    if (!cell) return;

                    // Handle single session cell or batch allocations
                    const cellCourses = [];
                    if (cell.subject) {
                        cellCourses.push(cell.subject.toUpperCase().trim());
                    }
                    if (cell.subjectName) {
                        cellCourses.push(cell.subjectName.toUpperCase().trim());
                    }
                    if (cell.batchAllocations) {
                        cell.batchAllocations.forEach((alloc) => {
                            if (alloc.subject) cellCourses.push(alloc.subject.toUpperCase().trim());
                            if (alloc.subjectName) cellCourses.push(alloc.subjectName.toUpperCase().trim());
                        });
                    }

                    uppercaseCourses.forEach((targetCourse) => {
                        if (cellCourses.includes(targetCourse)) {
                            coursePlacements[targetCourse].push({
                                divisionKey,
                                day,
                                slotIndex,
                            });
                        }
                    });
                });
            });
        });

        // Group placements by slot signature: `${day}-${slotIndex}`
        const slotMap = {}; // `${day}-${slotIndex}` -> Set of courses present

        Object.entries(coursePlacements).forEach(([course, placements]) => {
            placements.forEach(({ day, slotIndex }) => {
                const key = `${day}-${slotIndex}`;
                if (!slotMap[key]) slotMap[key] = new Set();
                slotMap[key].add(course);
            });
        });

        // Verify if all courses of the sync group appear together in their slots
        let isValid = true;
        Object.entries(slotMap).forEach(([slotKey, presentCourses]) => {
            if (presentCourses.size < uppercaseCourses.length) {
                isValid = false;
            }
        });

        if (!isValid || Object.keys(slotMap).length === 0) {
            violations.push({
                type: "SYNC_VIOLATION",
                groupName,
                courses,
                slotPlacements: slotMap,
                coursePlacements,
            });
        }
    });

    return violations;
}
