/**
 * generateFacultyTimetable.js
 * Derives faculty-wise timetable view from division timetables.
 * Output: { "NHS": { Monday: [cell, ...], ... }, "SDK": {...}, ... }
 */
export function generateFacultyTimetable(timetable) {
    const facultyTimetables = {};
    const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
    const SLOTS = 6;

    function initFacultyGrid(faculty) {
        if (!facultyTimetables[faculty]) {
            const grid = {};
            DAYS.forEach((day) => {
                grid[day] = Array(SLOTS).fill(null);
            });
            facultyTimetables[faculty] = grid;
        }
    }

    function isInvalidFaculty(f) {
        return !f || f === "TBD" || f === "FIXED" || f === "DEPT-FACULTY" || f === "TBD-FACULTY" || String(f).trim() === "";
    }

    Object.entries(timetable || {}).forEach(([classKey, daysMap]) => {
        DAYS.forEach((day) => {
            const slots = daysMap?.[day] || [];
            slots.forEach((cell, slotIdx) => {
                if (!cell) return;

                const type = cell.type;

                // For practicals/tutorials, check batchAllocations
                if ((type === "PRACTICAL" || type === "TUTORIAL") && Array.isArray(cell.batchAllocations)) {
                    // Group batchAllocations by faculty
                    const facultyGroups = {};
                    cell.batchAllocations.forEach((alloc) => {
                        const fac = alloc.faculty || cell.faculty;
                        if (isInvalidFaculty(fac)) return;
                        if (!facultyGroups[fac]) facultyGroups[fac] = [];
                        facultyGroups[fac].push(alloc);
                    });

                    Object.entries(facultyGroups).forEach(([fac, allocList]) => {
                        initFacultyGrid(fac);
                        const batchesStr = allocList.map((a) => a.batch).filter(Boolean).join(", ");
                        const first = allocList[0];

                        facultyTimetables[fac][day][slotIdx] = {
                            classKey,
                            batch: batchesStr ? `${classKey} (${batchesStr})` : classKey,
                            subject: first.subject || cell.subject,
                            location: first.location || cell.location || "",
                            type,
                            span: cell.span || 1,
                        };
                    });
                } else if (cell.faculty && !isInvalidFaculty(cell.faculty)) {
                    const fac = cell.faculty;
                    initFacultyGrid(fac);

                    facultyTimetables[fac][day][slotIdx] = {
                        classKey,
                        batch: classKey,
                        subject: cell.subject,
                        location: cell.location || "",
                        type: type || "LECTURE",
                        span: cell.span || 1,
                        fixed: cell.fixed || false,
                    };
                }
            });
        });
    });

    return facultyTimetables;
}
