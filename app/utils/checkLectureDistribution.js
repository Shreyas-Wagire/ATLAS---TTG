export function checkLectureDistribution({ timetable, divisionKey, day, session }) {
    if (!timetable || !timetable[divisionKey] || !timetable[divisionKey][day]) {
        return true;
    }

    const daySlots = timetable[divisionKey][day];
    const targetSubject = (session.subject || session.courseCode || "").toUpperCase().trim();

    // Prevent scheduling more than 1 lecture of the same course per day for a division
    const alreadyPlacedToday = daySlots.some((cell) => {
        if (!cell) return false;
        const cellSubj = (cell.subject || cell.courseCode || "").toUpperCase().trim();
        return cellSubj === targetSubject;
    });

    if (alreadyPlacedToday) {
        return false;
    }

    return true;
}
