export function parseLoadSheet(rows) {
    const subjects = [];

    let currentYear = "";

    rows.forEach((row) => {
        const col0 = String(row[0] || "").trim();
        const col1 = row[1];

        // Detect ONLY valid year headers
        const normalizedYear = normalizeYearHeader(col0);
        if (normalizedYear) {
            currentYear = normalizedYear;
            return;
        }

        // Skip empty rows
        if (
            row.every(
                (cell) =>
                    String(cell || "").trim() === ""
            )
        ) {
            return;
        }

        // Subject row
        if (
            col0 &&
            !isNaN(Number(col1))
        ) {
            const facultyA =
                String(row[4] || "").trim();

            const facultyB =
                String(row[5] || "").trim();

            const facultyC =
                String(row[6] || "").trim();

            const maxBatches = currentYear === "BTECH" ? 8 : 12;
            const batches = {};
            for (let b = 1; b <= maxBatches; b++) {
                const candidate1 = String(row[6 + b] || "").trim();
                const candidate2 = String(row[7 + b] || "").trim();
                const candidate3 = String(row[8 + b] || "").trim();
                const batchFaculty = candidate1 || candidate2 || candidate3;
                if (batchFaculty) {
                    batches[b] = batchFaculty;
                }
            }

            subjects.push({
                year: currentYear,

                courseName: col0,

                L: Number(row[1]) || 0,
                T: Number(row[2]) || 0,
                P: Number(row[3]) || 0,

                divisions: {
                    A: facultyA,
                    B: facultyB,
                    C: facultyC,
                },

                batches,
            });
        }
    });

    return subjects;
}

export function normalizeYearHeader(str) {
    const cleaned = String(str || "").toUpperCase().replace(/[^A-Z]/g, "");
    if (cleaned === "FY" || cleaned === "FE" || cleaned === "FIRSTYEAR") return "FY";
    if (cleaned === "SY" || cleaned === "SE" || cleaned === "SECONDYEAR") return "SY";
    if (cleaned === "TY" || cleaned === "TE" || cleaned === "THIRDYEAR") return "TY";
    if (
        cleaned === "BTECH" ||
        cleaned === "BT" ||
        cleaned === "BE" ||
        cleaned === "FINALYEAR" ||
        cleaned === "FOURTHYEAR" ||
        cleaned.includes("BTECH") ||
        cleaned.includes("BE")
    ) {
        return "BTECH";
    }
    return null;
}