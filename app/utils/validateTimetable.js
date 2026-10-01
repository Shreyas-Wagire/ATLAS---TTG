export function validateTimetable(timetable, sessionPool, resources = {}) {
    const missingLectures = [];
    const missingTutorials = [];
    const missingPracticals = [];
    const facultyConflicts = [];
    const resourceShortages = [];

    // 1. Audit Session Pool Allocation Status
    let lectureRequired = 0, lectureAllocated = 0;
    let tutorialRequired = 0, tutorialAllocated = 0;
    let practicalRequired = 0, practicalAllocated = 0;

    sessionPool.forEach((session) => {
        const timetableKey = `${session.year}-${session.division}`;
        if (!timetable || !timetable[timetableKey]) return;

        if (session.type === "LECTURE") {
            lectureRequired++;
            if (session.allocated) lectureAllocated++;
            else missingLectures.push(session);
        } else if (session.type === "TUTORIAL") {
            tutorialRequired++;
            if (session.allocated) tutorialAllocated++;
            else missingTutorials.push(session);
        } else if (session.type === "PRACTICAL") {
            practicalRequired++;
            if (session.allocated) practicalAllocated++;
            else missingPracticals.push(session);
        }
    });

    // 2. Audit Faculty Conflicts & Resource Assignments across Timetable
    const facultySlotsMap = {}; // faculty -> day -> slot -> list of occurrences

    Object.entries(timetable || {}).forEach(([timetableKey, daysMap]) => {
        Object.entries(daysMap || {}).forEach(([day, slots]) => {
            (slots || []).forEach((cell, slotIdx) => {
                if (!cell) return;

                // Collect UNIQUE faculties in this single cell to avoid false self-clash reporting
                const uniqueFacultiesInCell = new Set();
                if (cell.faculty && cell.faculty !== "TBD" && cell.faculty !== "FIXED" && cell.faculty !== "DEPT-FACULTY") {
                    uniqueFacultiesInCell.add(cell.faculty);
                }
                if (cell.batchAllocations) {
                    cell.batchAllocations.forEach((b) => {
                        if (b.faculty && b.faculty !== "TBD" && b.faculty !== "FIXED" && b.faculty !== "DEPT-FACULTY") {
                            uniqueFacultiesInCell.add(b.faculty);
                        }
                    });
                }

                uniqueFacultiesInCell.forEach((faculty) => {
                    if (!facultySlotsMap[faculty]) facultySlotsMap[faculty] = {};
                    if (!facultySlotsMap[faculty][day]) facultySlotsMap[faculty][day] = {};
                    if (!facultySlotsMap[faculty][day][slotIdx]) {
                        facultySlotsMap[faculty][day][slotIdx] = [];
                    }
                    facultySlotsMap[faculty][day][slotIdx].push({
                        timetableKey,
                        subject: cell.subject || cell.courseCode || "SESSION",
                    });
                });

                // Check for missing locations
                if (cell.type === "PRACTICAL" && cell.batchAllocations) {
                    cell.batchAllocations.forEach((alloc) => {
                        if (!alloc.location) {
                            resourceShortages.push({
                                timetableKey,
                                day,
                                slot: slotIdx,
                                session: alloc,
                                reason: "No lab room assigned",
                            });
                        }
                    });
                } else if (cell.type && !cell.location) {
                    resourceShortages.push({
                        timetableKey,
                        day,
                        slot: slotIdx,
                        session: cell,
                        reason: "No classroom assigned",
                    });
                }
            });
        });
    });

    // Find actual double-booked faculty slots across DIFFERENT timetable classes
    Object.entries(facultySlotsMap).forEach(([faculty, days]) => {
        Object.entries(days).forEach(([day, slots]) => {
            Object.entries(slots).forEach(([slotIdx, occurrences]) => {
                // Filter out duplicate entries for same class
                const uniqueClasses = new Set(occurrences.map((o) => o.timetableKey));
                if (uniqueClasses.size > 1) {
                    facultyConflicts.push({
                        faculty,
                        day,
                        slot: Number(slotIdx),
                        occurrences,
                    });
                }
            });
        });
    });

    const totalSessions = lectureRequired + tutorialRequired + practicalRequired;
    const allocatedSessions = lectureAllocated + tutorialAllocated + practicalAllocated;
    const unallocatedSessions = totalSessions - allocatedSessions;
    const allocationRate = totalSessions > 0 ? Math.round((allocatedSessions / totalSessions) * 100) : 100;

    return {
        totalSessions,
        allocatedSessions,
        unallocatedSessions,
        allocationRate,
        summary: {
            lecture: { required: lectureRequired, allocated: lectureAllocated },
            tutorial: { required: tutorialRequired, allocated: tutorialAllocated },
            practical: { required: practicalRequired, allocated: practicalAllocated },
        },
        missingLectures,
        missingTutorials,
        missingPracticals,
        facultyConflicts,
        resourceShortages,
    };
}
