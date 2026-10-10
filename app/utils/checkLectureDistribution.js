export function checkLectureDistribution({ timetable, divisionKey, day, session, allowRareFallback = false }) {
    if (!timetable || !timetable[divisionKey] || !timetable[divisionKey][day]) {
        return true;
    }

    const daySlots = timetable[divisionKey][day];
    const targetSubject = (session.subject || session.courseCode || session.courseName || "").toUpperCase().trim();
    if (!targetSubject) return true;

    // Count existing lectures of the same course scheduled on this day
    let countOnDay = 0;
    for (const cell of daySlots) {
        if (!cell) continue;
        const cellSubj = (cell.subject || cell.courseCode || cell.courseName || "").toUpperCase().trim();
        if (cellSubj === targetSubject && (cell.type === "LECTURE" || cell.type === "THEORY" || !cell.type)) {
            countOnDay++;
        }
    }

    // Default STRICT RULE: No same course lecture twice a day (strictly max 1 per day)
    if (!allowRareFallback) {
        return countOnDay === 0;
    }

    // RARE CONDITION ONLY: Allow at most 2 lectures of the same course on a day
    return countOnDay < 2;
}
