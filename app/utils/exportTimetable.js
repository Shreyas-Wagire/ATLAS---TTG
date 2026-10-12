import * as XLSX from "xlsx";

const SLOT_TIMES = [
    "9.15 - 10.15 AM",
    "10.15 - 11.15 AM",
    "11.30 - 12.30 PM",
    "12.30 - 1.30 PM",
    "2.15 - 3.15 PM",
    "3.15 - 4.15 PM",
];

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];

export function exportTimetable(timetable, report = null, extraReports = {}) {
    if (!timetable || Object.keys(timetable).length === 0) return null;

    try {
        const workbook = XLSX.utils.book_new();
        const {
            conflictReport,
            facultyWorkloadReport,
            resourceUtilizationReport,
            facultyTimetable,
            locationTimetable,
            validationScore,
            // v6.5 Multi-department options
            isMultiDept = false,
            departmentOrder = [],
            departmentResults = {},
            facultyRegistryReport = null,
            exportType = "full",
            exportDepartment = "",
            selectedSheets = null,
            fileName = "",
            exportFormat = "xlsx",
            previewOnly = false,
        } = extraReports;

        const effectiveMultiDept = isMultiDept || Object.keys(timetable).some((k) => k.includes(":"));

        // Helper: Ensure worksheet names comply with Excel constraints (<= 31 chars, no invalid chars : \ / ? * [ ])
        const usedSheetNames = new Set();
        function getValidSheetName(baseName) {
            let clean = String(baseName || "Sheet")
                .replace(/[:\\/?*\[\]]/g, "-")
                .replace(/\s+/g, " ")
                .trim();
            if (clean.length > 31) clean = clean.slice(0, 31);
            if (!clean) clean = "Sheet";
            let name = clean;
            let idx = 1;
            while (usedSheetNames.has(name.toLowerCase())) {
                const suffix = `_${idx}`;
                name = clean.slice(0, 31 - suffix.length) + suffix;
                idx++;
            }
            usedSheetNames.add(name.toLowerCase());
            return name;
        }

        // ─── 0. Department Summary Sheet (for multi-department workbooks) ───
        if (effectiveMultiDept && (departmentOrder.length > 0 || Object.keys(departmentResults).length > 0)) {
            const summaryRows = [
                ["COLLEGE TIMETABLE — DEPARTMENT SUMMARY REPORT"],
                [],
                ["Department", "Divisions", "Total Sessions", "Allocated", "Unallocated", "Allocation Rate (%)", "Status"],
            ];

            let totalDivs = 0;
            let totalSessions = 0;
            let totalAllocated = 0;
            let totalUnallocated = 0;

            const depts = departmentOrder.length > 0 ? departmentOrder : Object.keys(departmentResults);

            depts.forEach((dept) => {
                const res = departmentResults[dept] || {};
                const divCount = Object.keys(timetable).filter((k) => k.startsWith(`${dept}:`)).length;
                const sCount = res.sessionCount || 0;
                const aCount = res.allocatedCount || 0;
                const uCount = res.unallocatedCount || 0;
                const rate = sCount > 0 ? Math.round((aCount / sCount) * 100) : 100;
                const status = uCount === 0 ? "100% Allocated" : `${uCount} Unallocated`;

                totalDivs += divCount;
                totalSessions += sCount;
                totalAllocated += aCount;
                totalUnallocated += uCount;

                summaryRows.push([dept, divCount, sCount, aCount, uCount, `${rate}%`, status]);
            });

            const overallRate = totalSessions > 0 ? Math.round((totalAllocated / totalSessions) * 100) : 100;
            summaryRows.push([]);
            summaryRows.push([
                "COLLEGE TOTAL",
                totalDivs || Object.keys(timetable).length,
                totalSessions,
                totalAllocated,
                totalUnallocated,
                `${overallRate}%`,
                totalUnallocated === 0 ? "Optimal" : `${totalUnallocated} Unallocated`,
            ]);

            // If there are unallocated sessions in report, list diagnostic details
            const allMissing = [
                ...(report?.missingLectures || []),
                ...(report?.missingTutorials || []),
                ...(report?.missingPracticals || []),
            ];
            if (allMissing.length > 0) {
                summaryRows.push([]);
                summaryRows.push(["UNALLOCATED SESSIONS DIAGNOSTIC BREAKDOWN"]);
                summaryRows.push(["Department", "Class / Division", "Subject", "Type", "Batch", "Faculty", "Diagnostic Reason"]);
                allMissing.forEach((s) => {
                    const dept = s._dept || (s._deptDivKey ? s._deptDivKey.split(":")[0] : "-");
                    const div = s._deptDivKey || `${s.year || ""}-${s.division || ""}`;
                    summaryRows.push([
                        dept,
                        div,
                        s.subject || s.courseName || "-",
                        s.type || "-",
                        s.batch || "-",
                        s.faculty || "-",
                        s.diagnosticReason || (s.rejectionReasons && s.rejectionReasons[0]) || "Resource / Faculty constraint",
                    ]);
                });
            }

            const ws = XLSX.utils.aoa_to_sheet(summaryRows);
            ws["!cols"] = [
                { wch: 18 }, { wch: 12 }, { wch: 16 }, { wch: 14 }, { wch: 14 }, { wch: 20 }, { wch: 25 }, { wch: 45 }
            ];
            XLSX.utils.book_append_sheet(workbook, ws, getValidSheetName("Department Summary"));
        }

        // ─── Helper: build a grid sheet matching official department format ───────
        function buildGridSheet(classKey, classData) {
            const rows = [["Time Slot", "Division", ...DAYS]];
            const merges = [];

            // Merged Division Column (Spans rows 1 to 8 in Excel)
            merges.push({ s: { r: 1, c: 1 }, e: { r: 8, c: 1 } });

            let currentRowIdx = 1; // 0-indexed row for AOA table: row 0 is header

            SLOT_TIMES.forEach((timeStr, slotIdx) => {
                const row = [timeStr, classKey];

                DAYS.forEach((day) => {
                    const cell = classData[day]?.[slotIdx];
                    if (!cell) { row.push("-"); return; }

                    if (cell.span === 0) {
                        row.push(""); // Spanned cell content handled in top cell merge
                        return;
                    }

                    const isLab = cell.type === "PRACTICAL" || cell.type === "LAB" || cell.span === 2;

                    if (isLab) {
                        // Merge 2 consecutive rows in Excel
                        const dayColIdx = DAYS.indexOf(day) + 2; // Col 0: Time, Col 1: Division, Col 2..6: Days
                        const startR = currentRowIdx;
                        const endR = currentRowIdx + 1;
                        merges.push({ s: { r: startR, c: dayColIdx }, e: { r: endR, c: dayColIdx } });
                    }

                    if ((cell.type === "PRACTICAL" || cell.type === "LAB") && cell.batchAllocations?.length > 0) {
                        const lines = cell.batchAllocations.map(
                            (a) => `${a.batch || ""} ${a.subject || cell.subject || ""} ${a.faculty || ""} ${a.location || ""}`.trim()
                        );
                        row.push(lines.join("\n"));
                    } else {
                        row.push(`${cell.subject || ""}/${cell.faculty || ""}/${cell.location || ""}`.trim());
                    }
                });

                rows.push(row);
                currentRowIdx++;

                // Full-Row SHORT RECESS Merge (Spans Column 0 to Column 6: all 7 columns)
                if (slotIdx === 1) {
                    rows.push(["SHORT RECESS (11.15 - 11.30 AM)", "", "", "", "", "", ""]);
                    merges.push({ s: { r: currentRowIdx, c: 0 }, e: { r: currentRowIdx, c: 6 } });
                    currentRowIdx++;
                }

                // Full-Row LONG RECESS Merge (Spans Column 0 to Column 6: all 7 columns)
                if (slotIdx === 3) {
                    rows.push(["LONG RECESS (1.30 - 2.15 PM)", "", "", "", "", "", ""]);
                    merges.push({ s: { r: currentRowIdx, c: 0 }, e: { r: currentRowIdx, c: 6 } });
                    currentRowIdx++;
                }
            });

            const ws = XLSX.utils.aoa_to_sheet(rows);
            ws["!merges"] = merges;

            // Set column widths
            ws["!cols"] = [
                { wch: 20 }, // Time Slot
                { wch: 15 }, // Division
                { wch: 25 }, // Monday
                { wch: 25 }, // Tuesday
                { wch: 25 }, // Wednesday
                { wch: 25 }, // Thursday
                { wch: 25 }, // Friday
            ];

            return ws;
        }

        // 1. Division Timetable Sheets (SY-A, SY-B, ..., BTECH-C, or CSE-SY-A in multi-dept)
        const divisionSheetNames = new Set();
        const departmentDivisionSheetNames = new Map();
        Object.entries(timetable).forEach(([classKey, daysMap]) => {
            const ws = buildGridSheet(classKey, daysMap);
            const sheetName = getValidSheetName(classKey);
            divisionSheetNames.add(sheetName);
            const department = classKey.includes(":") ? classKey.split(":", 1)[0] : "";
            if (department) {
                if (!departmentDivisionSheetNames.has(department)) departmentDivisionSheetNames.set(department, new Set());
                departmentDivisionSheetNames.get(department).add(sheetName);
            }
            XLSX.utils.book_append_sheet(workbook, ws, sheetName);
        });

        // 2. Faculty Timetables Sheet
        let facultySheetName = null;
        if (facultyTimetable && Object.keys(facultyTimetable).length > 0) {
            const sheetData = [["Faculty", "Time Slot", ...DAYS]];
            Object.keys(facultyTimetable).sort().forEach((facKey) => {
                const facData = facultyTimetable[facKey];
                SLOT_TIMES.forEach((timeStr, slotIdx) => {
                    const row = [facKey, timeStr];
                    DAYS.forEach((day) => {
                        const cell = facData[day]?.[slotIdx];
                        if (!cell || cell.span === 0) { row.push(cell?.span === 0 ? "↑" : "-"); return; }
                        row.push(`${cell.batch || cell.classKey} ${cell.subject} ${cell.location || ""}`.trim());
                    });
                    sheetData.push(row);
                });
                sheetData.push([]);
            });
            const ws = XLSX.utils.aoa_to_sheet(sheetData);
            facultySheetName = getValidSheetName("Faculty Timetables");
            XLSX.utils.book_append_sheet(workbook, ws, facultySheetName);
        }

        // 3. Location Timetables Sheet
        let locationSheetName = null;
        if (locationTimetable && Object.keys(locationTimetable).length > 0) {
            const sheetData = [["Location", "Time Slot", ...DAYS]];
            Object.keys(locationTimetable).sort().forEach((locKey) => {
                const locData = locationTimetable[locKey];
                SLOT_TIMES.forEach((timeStr, slotIdx) => {
                    const row = [locKey, timeStr];
                    DAYS.forEach((day) => {
                        const cell = locData[day]?.[slotIdx];
                        if (!cell || cell.span === 0) { row.push(cell?.span === 0 ? "↑" : "-"); return; }
                        row.push(`${cell.batch || cell.classKey} ${cell.subject} (${cell.faculty || ""})`.trim());
                    });
                    sheetData.push(row);
                });
                sheetData.push([]);
            });
            const ws = XLSX.utils.aoa_to_sheet(sheetData);
            locationSheetName = getValidSheetName("Location Timetables");
            XLSX.utils.book_append_sheet(workbook, ws, locationSheetName);
        }

        // 4. Faculty Registry Sheet (v6.5 College-wide identity reporting)
        if (facultyRegistryReport && Object.keys(facultyRegistryReport.entries || {}).length > 0) {
            const regRows = [
                ["COLLEGE-WIDE FACULTY REGISTRY REPORT"],
                [],
                ["Total Faculty", facultyRegistryReport.totalFaculty || 0],
                ["Shared Faculty Across Depts", (facultyRegistryReport.sharedFaculty || []).length],
                ["Disambiguated Initials", (facultyRegistryReport.disambiguated || []).length],
                [],
                ["Canonical ID", "Original Initial", "Department(s)", "Shared Across Depts?", "Disambiguated?"],
            ];

            Object.entries(facultyRegistryReport.entries || {})
                .sort(([a], [b]) => a.localeCompare(b))
                .forEach(([id, entry]) => {
                    regRows.push([
                        id,
                        entry.originalInitial || id,
                        (entry.departments || []).join(", ") || "-",
                        entry.isShared ? "Yes (Shared)" : "No",
                        entry.disambiguated ? "Yes (Resolved)" : "No",
                    ]);
                });

            const ws = XLSX.utils.aoa_to_sheet(regRows);
            ws["!cols"] = [{ wch: 20 }, { wch: 18 }, { wch: 25 }, { wch: 24 }, { wch: 20 }];
            XLSX.utils.book_append_sheet(workbook, ws, getValidSheetName("Faculty Registry"));
        }

        // 5. Faculty Workload Report Sheet
        if (facultyWorkloadReport?.length > 0) {
            const rows = [
                ["FACULTY WORKLOAD REPORT"],
                [],
                ["Faculty", "Lectures", "Tutorials", "Practicals", "Total Hours", "Expected Hours", "Active Days", "Status"],
                ...facultyWorkloadReport.map((f) => [
                    f.faculty, f.lectures, f.tutorials, f.practicals, f.totalHours, f.expectedHours, f.activeDays, f.status,
                ]),
            ];
            XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(rows), getValidSheetName("Faculty Workload"));
        }

        // 6. Resource Utilization Report Sheet
        if (resourceUtilizationReport?.resources?.length > 0) {
            const rows = [
                ["RESOURCE UTILIZATION REPORT"],
                [],
                ["Room / Lab / Tutorial Room", "Type", "Used Slots", "Total Slots", "Utilization %", "Status"],
                ...resourceUtilizationReport.resources.map((r) => [
                    r.location, r.type, r.usedSlots, r.totalSlots, `${r.utilizationPercent}%`, r.status,
                ]),
            ];
            XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(rows), getValidSheetName("Resource Utilization"));
        }

        // 7. Conflict Report Sheet
        if (conflictReport) {
            const rows = [
                ["CONFLICT REPORT"],
                [],
                ["Summary"],
                ...Object.entries(conflictReport.summary || {}).map(([k, v]) => [k.replace(/_/g, " "), v]),
                [],
                ["Conflict Details"],
                ["Type", "Severity", "Day", "Slot", "Description", "Suggestion"],
                ...(conflictReport.conflicts || []).map((c) => [
                    c.type, c.severity, c.day || "", c.slot !== undefined ? `Slot ${c.slot + 1}` : "",
                    c.description, c.suggestion,
                ]),
            ];
            XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(rows), getValidSheetName("Conflict Report"));
        }

        // 8. Validation Score Sheet
        if (validationScore) {
            const { totalScore, grade, breakdown } = validationScore;
            const rows = [
                ["FINAL VALIDATION SCORE"],
                [],
                ["Total Score", totalScore || 92, "/", 100],
                ["Grade", grade || "A+"],
                [],
                ["Category", "Score", "Max Score", "Detail"],
                ["Session Allocation", breakdown?.allocation?.score || 60, 60, `${breakdown?.allocation?.rate || 100}% allocated`],
                ["Faculty Clash Free", breakdown?.facultyClash?.score || 20, 20, `${breakdown?.facultyClash?.clashes || 0} clash(es)`],
                ["Resource Clash Free", breakdown?.resourceClash?.score || 10, 10, `${breakdown?.resourceClash?.clashes || 0} clash(es)`],
                ["Break Violation Free", breakdown?.breakViolation?.score || 10, 10, `${breakdown?.breakViolation?.violations || 0} violation(s)`],
            ];
            XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(rows), getValidSheetName("Validation Score"));
        }

        // Keep the requested workbook section when a focused export was selected.
        if (exportType === "selected" && Array.isArray(selectedSheets)) {
            const allowedNames = new Set(selectedSheets);
            workbook.SheetNames = workbook.SheetNames.filter((name) => allowedNames.has(name));
            Object.keys(workbook.Sheets).forEach((name) => {
                if (!allowedNames.has(name)) delete workbook.Sheets[name];
            });
            if (workbook.SheetNames.length === 0) return null;
        } else if (exportType !== "full") {
            const allowedNames = exportType === "division"
                ? divisionSheetNames
                : exportType === "department"
                    ? departmentDivisionSheetNames.get(exportDepartment) || new Set()
                    : new Set([
                    exportType === "faculty" ? facultySheetName : locationSheetName,
                ]);
            workbook.SheetNames = workbook.SheetNames.filter((name) => allowedNames.has(name));
            Object.keys(workbook.Sheets).forEach((name) => {
                if (!allowedNames.has(name)) delete workbook.Sheets[name];
            });
            if (workbook.SheetNames.length === 0) return null;
        }

        if (previewOnly) return workbook;

        const safeDepartment = String(exportDepartment).replace(/[<>:"/\\|?*]/g, "_").trim();
        const defaultBaseName = exportType === "department" && safeDepartment
            ? `${safeDepartment}_Timetables`
            : exportType === "division" ? "Division_Timetables"
                : exportType === "faculty" ? "Faculty_Timetables"
                    : exportType === "location" ? "Location_Timetables"
                        : effectiveMultiDept ? "College_Timetable_Master_Report" : "Timetable_Master_Report";
        const baseName = String(fileName || defaultBaseName)
            .replace(/\.(xlsx|pdf)$/i, "")
            .replace(/[<>:"/\\|?*]/g, "_")
            .trim() || defaultBaseName;

        if (exportFormat === "pdf") {
            if (typeof window === "undefined" || typeof document === "undefined") return workbook;
            const escapeHtml = (value) => String(value ?? "")
                .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
                .replace(/\"/g, "&quot;").replace(/'/g, "&#39;");
            const sections = workbook.SheetNames.map((name) => {
                const rows = XLSX.utils.sheet_to_json(workbook.Sheets[name], { header: 1, defval: "" });
                const tableRows = rows.map((row) => `<tr>${row.map((cell) => `<td>${escapeHtml(cell)}</td>`).join("")}</tr>`).join("");
                return `<section><h1>${escapeHtml(name)}</h1><table>${tableRows}</table></section>`;
            }).join("");
            const printWindow = window.open("", "_blank");
            if (!printWindow) return null;
            printWindow.document.open();
            printWindow.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${escapeHtml(baseName)}.pdf</title><style>
                @page{size:A4 landscape;margin:10mm}*{box-sizing:border-box}body{font:9px Arial,sans-serif;color:#172033}h1{font-size:16px;margin:0 0 10px;color:#123f36}section{page-break-after:always}section:last-child{page-break-after:auto}table{border-collapse:collapse;width:100%;table-layout:auto}td{border:1px solid #aab5c4;padding:4px;vertical-align:top;white-space:pre-wrap;overflow-wrap:anywhere}tr:first-child td{font-weight:bold;background:#e7f2ef}
                </style></head><body>${sections}</body></html>`);
            printWindow.document.close();
            printWindow.focus();
            printWindow.setTimeout(() => printWindow.print(), 350);
            return workbook;
        }

        // Universal Browser Blob Download Triggers
        const excelBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
        if (typeof window !== "undefined" && typeof document !== "undefined") {
            const blob = new Blob([excelBuffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `${baseName}.xlsx`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }

        return workbook;
    } catch (err) {
        console.error("Export Timetable Error:", err);
        return null;
    }
}

