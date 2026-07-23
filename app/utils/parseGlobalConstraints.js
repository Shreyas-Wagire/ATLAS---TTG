import { normalizeYearHeader } from "./parseLoadSheet";

export function parseGlobalConstraints(rows) {
    const constraints = [];

    let currentYear = "";

    rows.forEach((row) => {
        const col0 = String(row[0] || "").trim();
        const col1 = row[1];

        // Detect Year Header
        const normalizedYear = normalizeYearHeader(col0);
        if (normalizedYear) {
            currentYear = normalizedYear;
            return;
        }

        // Skip Empty Rows
        if (
            row.every(
                (cell) =>
                    String(cell || "").trim() === ""
            )
        ) {
            return;
        }

        // Detect Constraint Row
        if (
            col0 &&
            !isNaN(Number(col1))
        ) {
            constraints.push({
                year: currentYear,

                courseName: col0,

                L: Number(row[1]) || 0,
                T: Number(row[2]) || 0,
                P: Number(row[3]) || 0,

                divisions: {
                    A: String(row[4] || "").trim(),
                    B: String(row[5] || "").trim(),
                    C: String(row[6] || "").trim(),
                },

                day: String(row[7] || "").trim(),

                time: String(row[8] || "").trim(),
            });
        }
    });

    return constraints;
}