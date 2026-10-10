/**
 * generateBatchTimetable.js
 * Derives per-batch timetable views from division timetables.
 * Output: { "S1": { Monday: [...], ... }, "S2": {...}, ... }
 */
export function generateBatchTimetable(timetable) {
    const batchTimetables = {};

    const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
    const SLOTS = 6;

    Object.entries(timetable || {}).forEach(([divisionKey, daysMap]) => {
        days.forEach((day) => {
            const slots = daysMap?.[day];
            if (!slots) return;

            slots.forEach((cell, slotIdx) => {
                if (!cell) return;

                const type = cell.type;

                // For practicals & tutorials, scan batchAllocations
                if ((type === "PRACTICAL" || type === "TUTORIAL") && Array.isArray(cell.batchAllocations)) {
                    const uniqueBatches = new Set();
                    cell.batchAllocations.forEach((alloc) => {
                        const batchLabel = alloc.batch;
                        if (!batchLabel || uniqueBatches.has(batchLabel)) return;
                        uniqueBatches.add(batchLabel);

                        if (!batchTimetables[batchLabel]) {
                            batchTimetables[batchLabel] = initBatchGrid();
                        }

                        // Don't duplicate span-0 (second slot of practical)
                        if (cell.span === 0) {
                            batchTimetables[batchLabel][day][slotIdx] = {
                                type,
                                span: 0,
                                subject: alloc.subject || cell.subject,
                                faculty: alloc.faculty,
                                location: alloc.location || cell.location || "",
                            };
                        } else {
                            batchTimetables[batchLabel][day][slotIdx] = {
                                type,
                                span: cell.span || 1,
                                subject: alloc.subject || cell.subject,
                                faculty: alloc.faculty,
                                location: alloc.location || cell.location || "",
                            };
                        }
                    });

                    // Also process embedded tutorial allocations (TY/BTECH lab-merged tutorials)
                    // Each embedded tutorial batch gets a TUTORIAL entry at the same slot,
                    // with tutorial room location — appended as tutorialAllocations on the batch entry.
                    if (type === "PRACTICAL" && Array.isArray(cell.tutorialAllocations) && cell.span !== 0) {
                        const seenTutBatches = new Set();
                        cell.tutorialAllocations.forEach((tutAlloc) => {
                            const batchLabel = tutAlloc.batch;
                            if (!batchLabel || seenTutBatches.has(batchLabel)) return;
                            seenTutBatches.add(batchLabel);

                            if (!batchTimetables[batchLabel]) {
                                batchTimetables[batchLabel] = initBatchGrid();
                            }

                            // Embed the tutorial info into the existing batch practical entry
                            const existingEntry = batchTimetables[batchLabel][day][slotIdx];
                            if (existingEntry) {
                                existingEntry.embeddedTutorial = {
                                    type: "TUTORIAL",
                                    subject: tutAlloc.subject || tutAlloc.subjectName,
                                    faculty: tutAlloc.faculty,
                                    location: tutAlloc.location || "",
                                    batch: batchLabel,
                                };
                            }
                        });
                    }

                } else if (type === "LECTURE" && cell.span !== 0) {
                    // Lectures belong to the whole division — show in all batches of that division
                    const prefix = getBatchPrefix(divisionKey);
                    const batchCount = getBatchCount(divisionKey);

                    for (let b = 1; b <= batchCount; b++) {
                        const batchLabel = `${prefix}${b}`;
                        if (!batchTimetables[batchLabel]) {
                            batchTimetables[batchLabel] = initBatchGrid();
                        }
                        batchTimetables[batchLabel][day][slotIdx] = {
                            type: "LECTURE",
                            span: cell.span || 1,
                            subject: cell.subject,
                            faculty: cell.faculty,
                            location: cell.location || "",
                            fixed: cell.fixed || false,
                        };
                    }
                } else if (type === "LECTURE" && cell.span === 0) {
                    // Continuation slot for 2-hour lectures
                    const prefix = getBatchPrefix(divisionKey);
                    const batchCount = getBatchCount(divisionKey);
                    for (let b = 1; b <= batchCount; b++) {
                        const batchLabel = `${prefix}${b}`;
                        if (!batchTimetables[batchLabel]) {
                            batchTimetables[batchLabel] = initBatchGrid();
                        }
                        batchTimetables[batchLabel][day][slotIdx] = {
                            type: "LECTURE",
                            span: 0,
                            subject: cell.subject,
                            faculty: cell.faculty,
                            location: cell.location || "",
                        };
                    }
                }
            });
        });
    });

    return batchTimetables;
}

function initBatchGrid() {
    const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
    const grid = {};
    days.forEach((day) => {
        grid[day] = Array(6).fill(null);
    });
    return grid;
}

function getBatchPrefix(divisionKey) {
    // SY-A → S, TY-A → T, BTECH-A → B
    if (divisionKey.startsWith("SY")) return "S";
    if (divisionKey.startsWith("TY")) return "T";
    if (divisionKey.startsWith("BTECH")) return "B";
    return "X";
}

function getBatchCount(divisionKey) {
    if (divisionKey.startsWith("BTECH")) return 8;
    return 12;
}
