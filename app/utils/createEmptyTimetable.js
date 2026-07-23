export function createEmptyTimetable(yearWiseData) {
    if (!yearWiseData || Object.keys(yearWiseData).length === 0) {
        return {
            "SY-A": createGrid(),
            "SY-B": createGrid(),
            "SY-C": createGrid(),

            "TY-A": createGrid(),
            "TY-B": createGrid(),
            "TY-C": createGrid(),

            "BTECH-A": createGrid(),
            "BTECH-B": createGrid(),
            "BTECH-C": createGrid(),
        };
    }

    const timetable = {};
    const possibleDivisions = ["A", "B", "C"];

    Object.entries(yearWiseData).forEach(([year, courses]) => {
        possibleDivisions.forEach((division) => {
            const divExists = courses.some(
                (c) => c.divisions?.[division] && String(c.divisions[division]).trim() !== ""
            );
            if (divExists) {
                timetable[`${year}-${division}`] = createGrid();
            }
        });
    });

    return timetable;
}

function createGrid() {
    return {
        Monday: [null, null, null, null, null, null],
        Tuesday: [null, null, null, null, null, null],
        Wednesday: [null, null, null, null, null, null],
        Thursday: [null, null, null, null, null, null],
        Friday: [null, null, null, null, null, null],
    };
}