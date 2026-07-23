/**
 * generateFacultyWorkloadReport.js
 * Computes per-faculty session count and detects overload/underload.
 */
export function generateFacultyWorkloadReport(timetable, sessionPool) {
    const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
    const facultyMap = {}; // faculty -> { lectures, tutorials, practicals, totalHours, days: Set }

    function initFaculty(faculty) {
        if (!facultyMap[faculty]) {
            facultyMap[faculty] = {
                faculty,
                lectures: 0,
                tutorials: 0,
                practicals: 0,
                totalHours: 0,
                activeDays: new Set(),
                sessions: [],
            };
        }
    }

    function recordSession(faculty, type, day, slot, divisionKey, subject) {
        if (!faculty || faculty === "TBD" || faculty === "FIXED" || faculty === "TBD-FACULTY" || faculty === "DEPT-FACULTY") return;
        initFaculty(faculty);
        const entry = facultyMap[faculty];
        entry.activeDays.add(day);
        entry.sessions.push({ type, day, slot, divisionKey, subject });
        if (type === "LECTURE") { entry.lectures++; entry.totalHours++; }
        else if (type === "TUTORIAL") { entry.tutorials++; entry.totalHours++; }
        else if (type === "PRACTICAL") { entry.practicals++; entry.totalHours += 2; }
    }

    Object.entries(timetable || {}).forEach(([divisionKey, daysMap]) => {
        days.forEach((day) => {
            const slots = daysMap?.[day] || [];
            slots.forEach((cell, slotIdx) => {
                if (!cell || cell.span === 0) return; // skip continuation slots

                const type = cell.type;
                if (!type) return;

                if ((type === "PRACTICAL" || type === "TUTORIAL") && cell.batchAllocations) {
                    const seenFaculties = new Set();
                    cell.batchAllocations.forEach((alloc) => {
                        if (!alloc.faculty || seenFaculties.has(alloc.faculty)) return;
                        seenFaculties.add(alloc.faculty);
                        recordSession(alloc.faculty, type, day, slotIdx, divisionKey, alloc.subject || cell.subject);
                    });
                } else {
                    recordSession(cell.faculty, type, day, slotIdx, divisionKey, cell.subject);
                }
            });
        });
    });

    // Derive expected load from sessionPool
    const expectedLoad = {};
    (sessionPool || []).forEach((s) => {
        const faculty = s.faculty;
        if (!faculty || faculty === "TBD" || faculty === "FIXED") return;
        if (!expectedLoad[faculty]) expectedLoad[faculty] = { lectures: 0, tutorials: 0, practicals: 0 };
        if (s.type === "LECTURE") expectedLoad[faculty].lectures++;
        else if (s.type === "TUTORIAL") expectedLoad[faculty].tutorials++;
        else if (s.type === "PRACTICAL") expectedLoad[faculty].practicals++;
    });

    const report = Object.values(facultyMap).map((entry) => {
        const expected = expectedLoad[entry.faculty] || { lectures: 0, tutorials: 0, practicals: 0 };
        const expectedHours = expected.lectures + expected.tutorials + (expected.practicals * 2);
        const status =
            entry.totalHours === 0 ? "IDLE" :
            entry.totalHours > expectedHours * 1.2 ? "OVERLOADED" :
            entry.totalHours < expectedHours * 0.8 ? "UNDERLOADED" :
            "OPTIMAL";

        return {
            faculty: entry.faculty,
            lectures: entry.lectures,
            tutorials: entry.tutorials,
            practicals: entry.practicals,
            totalHours: entry.totalHours,
            expectedHours,
            activeDays: Array.from(entry.activeDays).length,
            status,
        };
    });

    report.sort((a, b) => b.totalHours - a.totalHours);
    return report;
}
