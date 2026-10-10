export function checkSubjectConstraint({ timetable, divisionKey, day, slot, session }) {
    if (!timetable || !timetable[divisionKey] || !timetable[divisionKey][day]) {
        return true;
    }

    const daySlots = timetable[divisionKey][day];
    const targetSubject = (session.subject || session.courseCode || session.courseName || "").toUpperCase().trim();
    if (!targetSubject) return true;

    // 1. Check No Same Course Consecutively (Hard Constraint)
    const prevCell = daySlots[slot - 1];
    const nextCell = daySlots[slot + 1];

    if (prevCell) {
        const prevSubj = (prevCell.subject || prevCell.courseCode || prevCell.courseName || "").toUpperCase().trim();
        if (prevSubj && prevSubj === targetSubject) return false;
    }
    if (nextCell) {
        const nextSubj = (nextCell.subject || nextCell.courseCode || nextCell.courseName || "").toUpperCase().trim();
        if (nextSubj && nextSubj === targetSubject) return false;
    }

    return true;
}
