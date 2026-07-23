/**
 * generateLocationTimetable.js
 * Derives location-wise timetable view (classrooms, labs, tutorial rooms) from division timetables.
 * Output: { "CR1": { Monday: [cell, ...], ... }, "HPC": {...}, ... }
 */
export function generateLocationTimetable(timetable) {
    const locationTimetables = {};
    const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
    const SLOTS = 6;

    function initLocationGrid(location) {
        if (!locationTimetables[location]) {
            const grid = {};
            DAYS.forEach((day) => {
                grid[day] = Array(SLOTS).fill(null);
            });
            locationTimetables[location] = grid;
        }
    }

    function isInvalidLocation(loc) {
        return !loc || loc === "TBD" || String(loc).trim() === "";
    }

    Object.entries(timetable || {}).forEach(([classKey, daysMap]) => {
        DAYS.forEach((day) => {
            const slots = daysMap?.[day] || [];
            slots.forEach((cell, slotIdx) => {
                if (!cell) return;

                const type = cell.type;

                // For practicals/tutorials, check batchAllocations
                if ((type === "PRACTICAL" || type === "TUTORIAL") && Array.isArray(cell.batchAllocations)) {
                    // Group batchAllocations by location
                    const locationGroups = {};
                    cell.batchAllocations.forEach((alloc) => {
                        const loc = alloc.location || cell.location;
                        if (isInvalidLocation(loc)) return;
                        if (!locationGroups[loc]) locationGroups[loc] = [];
                        locationGroups[loc].push(alloc);
                    });

                    Object.entries(locationGroups).forEach(([loc, allocList]) => {
                        initLocationGrid(loc);
                        const batchesStr = allocList.map((a) => a.batch).filter(Boolean).join(", ");
                        const first = allocList[0];

                        locationTimetables[loc][day][slotIdx] = {
                            classKey,
                            batch: batchesStr ? `${classKey} (${batchesStr})` : classKey,
                            subject: first.subject || cell.subject,
                            faculty: first.faculty || cell.faculty || "",
                            type,
                            span: cell.span || 1,
                        };
                    });
                } else if (cell.location && !isInvalidLocation(cell.location)) {
                    const loc = cell.location;
                    initLocationGrid(loc);

                    locationTimetables[loc][day][slotIdx] = {
                        classKey,
                        batch: classKey,
                        subject: cell.subject,
                        faculty: cell.faculty || "",
                        type: type || "LECTURE",
                        span: cell.span || 1,
                        fixed: cell.fixed || false,
                    };
                }
            });
        });
    });

    return locationTimetables;
}
