export function checkSubjectConstraint({ timetable, divisionKey, day, slot, session }) {
    if (!timetable || !timetable[divisionKey] || !timetable[divisionKey][day]) {
        return true;
    }

    const daySlots = timetable[divisionKey][day];
    const targetSubject = (session.subject || session.courseCode || "").toUpperCase().trim();

    // 1. Check No Same Course Consecutively
    const prevCell = daySlots[slot - 1];
    const nextCell = daySlots[slot + 1];

    if (prevCell) {
        const prevSubj = (prevCell.subject || prevCell.courseCode || "").toUpperCase().trim();
        if (prevSubj && prevSubj === targetSubject) return false;
    }
    if (nextCell) {
        const nextSubj = (nextCell.subject || nextCell.courseCode || "").toUpperCase().trim();
        if (nextSubj && nextSubj === targetSubject) return false;
    }

    // 2. Check No 3 Continuous Lectures
    // Check if slot-2, slot-1, slot would form 3 continuous slots
    const isSlotPrev1Busy = slot >= 1 && daySlots[slot - 1] !== null;
    const isSlotPrev2Busy = slot >= 2 && daySlots[slot - 2] !== null;
    if (isSlotPrev1Busy && isSlotPrev2Busy) return false;

    // Check if slot-1, slot, slot+1 would form 3 continuous slots
    const isSlotNext1Busy = slot <= 4 && daySlots[slot + 1] !== null;
    if (isSlotPrev1Busy && isSlotNext1Busy) return false;

    // Check if slot, slot+1, slot+2 would form 3 continuous slots
    const isSlotNext2Busy = slot <= 3 && daySlots[slot + 2] !== null;
    if (isSlotNext1Busy && isSlotNext2Busy) return false;

    return true;
}
