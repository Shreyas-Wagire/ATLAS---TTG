export function parseLoadSheet(rows) {
    const subjects = [];

    // Auto-detect base column offset: some spreadsheets start data at col A (0),
    // others at col B (1). Scan rows for the first year header to determine offset.
    let baseCol = 0;
    for (const row of rows) {
        for (let c = 0; c <= 2; c++) {
            const cellVal = String(row[c] || "").trim();
            if (cellVal && normalizeYearHeader(cellVal)) {
                baseCol = c;
                break;
            }
        }
        if (baseCol > 0) break;
        // Also check if the first non-empty cell in a data row starts at col 1+
        // by looking for the "L" header label
        for (let c = 1; c <= 2; c++) {
            const cellVal = String(row[c] || "").trim();
            if (cellVal === "L" || normalizeYearHeader(cellVal)) {
                // If "L" header is at col c, then course name is at col c-1... unless c-1 is the year.
                // Actually if "L" is at col c and col c-1 has year header, base = c-1
                // If "L" is at col 2 and col 1 has a year header, base = 1
                // Simplify: check if col c has "L" and col c-1 has a year
                const prevVal = String(row[c - 1] || "").trim();
                if (normalizeYearHeader(prevVal)) {
                    baseCol = c - 1;
                }
                break;
            }
        }
        if (baseCol > 0) break;
    }

    let currentYear = "";
    let currentBatchColOffset = 7; // default: col 8 for Batch 1 (offset 7 + 1 = 8)
    let currentDivisions = ["A", "B", "C"];

    rows.forEach((row) => {
        const courseName = String(row[baseCol] || "").trim();
        const lVal = row[baseCol + 1];

        // Detect ONLY valid year headers
        const normalizedYear = normalizeYearHeader(courseName);
        if (normalizedYear) {
            currentYear = normalizedYear;
            const sectionDivisions = ["A", "B", "C"].filter((division, index) =>
                String(row[baseCol + 4 + index] || "").trim().toUpperCase() === division
            );
            currentDivisions = sectionDivisions.length ? sectionDivisions : ["A", "B", "C"];
            // Scan for column containing "1" to detect batch column start dynamically
            currentBatchColOffset = baseCol + 7;
            for (let c = baseCol + 4; c < row.length; c++) {
                const val = Number(row[c]);
                if (val === 1 || String(row[c]).trim() === "1") {
                    currentBatchColOffset = c - 1;
                    break;
                }
            }
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

        // Subject row: courseName is a course name, lVal is a numeric L value (> 0 or explicitly 0)
        // Skip rows where lVal is empty or non-numeric text like "L", "T", "P"
        const lValStr = String(lVal ?? "").trim();
        if (
            courseName &&
            lValStr !== "" &&
            !isNaN(Number(lValStr))
        ) {

            const rawDivisions = {
                A: String(row[baseCol + 4] || "").trim(),
                B: String(row[baseCol + 5] || "").trim(),
                C: String(row[baseCol + 6] || "").trim(),
            };
            const unavailableDivisions = Object.entries(rawDivisions)
                .filter(([, faculty]) => faculty.toUpperCase() === "N/A")
                .map(([division]) => division);
            const cleanFaculty = (faculty) => faculty.toUpperCase() === "N/A" ? "" : faculty;
            const facultyA = cleanFaculty(rawDivisions.A);
            const facultyB = cleanFaculty(rawDivisions.B);
            const facultyC = cleanFaculty(rawDivisions.C);

            const maxBatches = currentYear === "BTECH" ? 8 : 12;
            const batches = {};
            for (let b = 1; b <= maxBatches; b++) {
                const colIdx = currentBatchColOffset + b;
                const batchFaculty = String(row[colIdx] || "").trim();
                if (batchFaculty && batchFaculty !== "-" && batchFaculty.toUpperCase() !== "N/A") {
                    batches[b] = batchFaculty;
                }
            }

            subjects.push({
                year: currentYear,

                courseName: courseName,

                L: Number(row[baseCol + 1]) || 0,
                T: Number(row[baseCol + 2]) || 0,
                P: Number(row[baseCol + 3]) || 0,

                divisions: {
                    A: facultyA,
                    B: facultyB,
                    C: facultyC,
                },
                divisionApplicability: [...currentDivisions],
                unavailableDivisions,

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
