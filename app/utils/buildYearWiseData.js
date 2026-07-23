export function buildYearWiseData(subjects) {
    const yearWiseData = {};

    subjects.forEach((subject) => {
        const year = subject.year;

        if (!yearWiseData[year]) {
            yearWiseData[year] = [];
        }

        yearWiseData[year].push({
            courseName: subject.courseName,

            // Auto Generate Course Code
            courseCode: generateCourseCode(
                subject.courseName
            ),

            divisions: {
                A: subject.divisions?.A || "",
                B: subject.divisions?.B || "",
                C: subject.divisions?.C || "",
            },

            batches: subject.batches || {},

            L: Number(subject.L) || 0,
            T: Number(subject.T) || 0,
            P: Number(subject.P) || 0,
        });
    });

    return yearWiseData;
}

function generateCourseCode(courseName) {
    const name = courseName.trim();

    // Modern Indian Language / Foreign Languages (MILFL)
    if (
        name.toLowerCase().includes("modern indian language") ||
        name.toLowerCase().includes("foreign language") ||
        name.toLowerCase().includes("milfl")
    ) {
        return "MILFL";
    }

    // Minor Courses
    const minorMatch =
        name.match(/Minor Course - [IVX]+/i);

    if (minorMatch) {
        return minorMatch[0];
    }

    // Open Electives
    if (name.includes("Open Elective - I"))
        return "OE-I";

    if (name.includes("Open Elective - II"))
        return "OE-II";

    if (name.includes("Open Elective - III"))
        return "OE-III";

    // Ignore these words
    const ignoreWords = [
        "and",
        "of",
        "the",
        "in",
        "for",
        "to",
        "on",
        "with",
    ];

    return name
        .split(/\s+/)
        .filter(
            word =>
                !ignoreWords.includes(
                    word.toLowerCase()
                )
        )
        .map(
            word =>
                word[0].toUpperCase()
        )
        .join("");
}