import { normalizeYearHeader } from "./parseLoadSheet.js";

const LOAD_NAMES = /^(load|sheet\s*1|.*-load)$/i;
const CONSTRAINT_NAMES = /^(fixed|constraints?|global|sheet\s*2|.*-fixed)$/i;
const RESOURCE_NAMES = /^(location|resources?|sheet\s*3|.*-(location|resources?))$/i;

function issue(level, title, detail, sheet = "") {
    return { level, title, detail, sheet };
}

function getSheetName(sheetNames, pattern, fallbackIndex) {
    return sheetNames.find((name) => pattern.test(name.trim())) || sheetNames[fallbackIndex] || "";
}

function findLoadSheet(sheetNames, multiDepartment, department = "") {
    if (multiDepartment && department) return sheetNames.find((name) => name.toLowerCase() === `${department}-load`.toLowerCase()) || `${department}-Load`;
    return getSheetName(sheetNames, LOAD_NAMES, 0);
}

export function validateWorkbook({
    fileName = "",
    fileSize = 0,
    sheetNames = [],
    sheets = {},
    isMultiDepartment = false,
    collegeData = null,
    subjects = [],
}) {
    const issues = [];
    const validExtension = /\.(xlsx|xls)$/i.test(fileName);

    if (!validExtension) issues.push(issue("error", "Unsupported file type", "Choose an Excel workbook in .xlsx or .xls format."));
    if (fileSize > 10 * 1024 * 1024) issues.push(issue("error", "File exceeds the 10 MB limit", "Choose a smaller workbook and upload it again."));
    if (!sheetNames.length) issues.push(issue("error", "No worksheets found", "The workbook does not contain any readable sheets."));

    const populatedSheets = sheetNames.filter((name) => (sheets[name] || []).length > 0);
    if (sheetNames.length && populatedSheets.length === 0) {
        issues.push(issue("error", "Workbook is empty", "All worksheets are blank. Add course data and upload the workbook again."));
    }

    if (isMultiDepartment) {
        const departments = collegeData?.departmentOrder || [];
        if (!departments.length) {
            issues.push(issue("error", "No departments detected", "Use sheet names such as CSE-Load, CSE-Location, and CSE-Fixed."));
        }

        departments.forEach((department) => {
            const data = collegeData?.departments?.[department];
            const loadSheet = findLoadSheet(sheetNames, true, department);
            if (!(data?.subjects?.length)) {
                const rowCount = (sheets[loadSheet] || []).length;
                const rowsChecked = rowCount ? `Checked rows 1–${Math.min(rowCount, 12)}. ` : "";
                issues.push(issue("error", `${department} has no readable courses`, `${rowsChecked}Check that course rows include a year section and numeric lecture-load value.`, loadSheet));
            } else if (!(data?.locationData || data?.resources?.classrooms?.length || data?.resources?.labs?.length)) {
                issues.push(issue("warning", `${department} has no room data`, "Schedules can still be generated, but room and lab assignments may need review.", `${department}-Location`));
            }
            if (data?.subjects?.length) {
                (data.diagnostics || []).forEach((diagnostic) => {
                    const level = String(diagnostic.level || "warning").toLowerCase() === "error" ? "error" : "warning";
                    issues.push(issue(level, `${department} · Incomplete course assignment`, diagnostic.message || "Review this department's course assignments."));
                });
            }
        });

        if (!(collegeData?.globalConstraints || []).length) {
            issues.push(issue("info", "No college-wide fixed sessions", "Add a Global sheet if departments share fixed sessions or campus-wide events.", "Global"));
        }
        (collegeData?.globalDiagnostics || []).forEach((diagnostic) => {
            const level = String(diagnostic.level || "").toLowerCase() === "error" ? "error" : "warning";
            issues.push(issue(level, `${diagnostic.dept ? `${diagnostic.dept} · ` : ""}Workbook diagnostic`, diagnostic.message || "Review this department's workbook data."));
        });
    } else if (sheetNames.length) {
        const loadSheet = getSheetName(sheetNames, LOAD_NAMES, 0);
        const constraintSheet = getSheetName(sheetNames, CONSTRAINT_NAMES, 1);
        const resourceSheet = getSheetName(sheetNames, RESOURCE_NAMES, 2);

        if (!subjects.length) {
            const rows = sheets[loadSheet] || [];
            const hasYearSection = rows.some((row) => row.some((value) => normalizeYearHeader(value)));
            const rowsChecked = rows.length ? `Checked rows 1–${Math.min(rows.length, 12)}. ` : "";
            issues.push(issue(
                "error",
                "No course rows could be read",
                `${rowsChecked}${hasYearSection
                    ? "A year section was found, but no course row has a numeric lecture-load value. Check the load columns."
                    : "Add year sections (FY, SY, TY, or BTECH) and course rows with a numeric lecture-load value."}`,
                loadSheet
            ));
        } else {
            const missingDivisionFaculty = subjects.filter((subject) => !Object.values(subject.divisions || {}).some(Boolean)).length;
            if (missingDivisionFaculty) {
                issues.push(issue("warning", `${missingDivisionFaculty} course rows have no division faculty`, "Assign faculty initials in the course load sheet before generation for more reliable clash checks.", loadSheet));
            }
            const seenCourses = new Set();
            const duplicateCourses = new Set();
            subjects.forEach((subject) => {
                const key = `${subject.year}::${String(subject.courseName || "").trim().toLowerCase()}`;
                if (seenCourses.has(key)) duplicateCourses.add(key);
                seenCourses.add(key);
            });
            if (duplicateCourses.size) issues.push(issue("warning", `${duplicateCourses.size} duplicate course rows`, "Check repeated course names within the same academic year before generating." , loadSheet));
        }

        if (!constraintSheet || !(sheets[constraintSheet] || []).length) {
            issues.push(issue("warning", "No fixed-constraints sheet", "No fixed sessions were imported. Add a Fixed or Constraints sheet if needed.", constraintSheet || "Fixed"));
        }
        if (!resourceSheet || !(sheets[resourceSheet] || []).length) {
            issues.push(issue("warning", "No room and resource sheet", "Room assignments may be unresolved until room and lab data is added.", resourceSheet || "Location"));
        }
    }

    if (!issues.length) issues.push(issue("success", "Workbook is ready", "Course data was parsed and the workbook can proceed to configuration."));
    return issues;
}

export function getBlockingWorkbookIssues(issues = []) {
    return issues.filter((item) => item.level === "error");
}
