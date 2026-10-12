export function createScheduleDigest(timetable) {
    const digest = {};
    Object.entries(timetable || {}).forEach(([division, days]) => {
        Object.entries(days || {}).forEach(([day, slots]) => {
            (slots || []).forEach((cell, slot) => {
                if (!cell || cell.span === 0) return;
                digest[`${division}|${day}|${slot}`] = [
                    cell.type || "",
                    cell.subject || cell.courseName || cell.courseCode || "",
                    cell.faculty || "",
                    cell.location || cell.labAssignedInitial || "",
                ].join("::");
            });
        });
    });
    return digest;
}

export function compareScheduleDigests(previous = {}, current = {}) {
    const keys = new Set([...Object.keys(previous || {}), ...Object.keys(current || {})]);
    let changed = 0;
    let added = 0;
    let removed = 0;
    keys.forEach((key) => {
        if (previous[key] === current[key]) return;
        changed++;
        if (!previous[key] && current[key]) added++;
        if (previous[key] && !current[key]) removed++;
    });
    return { changed, added, removed };
}
