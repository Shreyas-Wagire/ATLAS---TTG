export function checkFacultyConstraint({ faculty, day, slot, facultySchedule }) {
    if (!faculty || faculty === "TBD" || faculty === "FIXED") return true;

    // Check if faculty taught in immediate previous slot or will teach in immediate next slot
    const prevSlotBusy = !!facultySchedule[faculty]?.[day]?.[slot - 1];
    const nextSlotBusy = !!facultySchedule[faculty]?.[day]?.[slot + 1];

    if (prevSlotBusy || nextSlotBusy) {
        return false;
    }

    return true;
}
