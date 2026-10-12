import fs from "fs";
import * as XLSX from "xlsx";
import { parseMultiDeptWorkbook } from "../app/utils/parseMultiDeptWorkbook.js";
import { generateCollegeTimetable } from "../app/utils/generateCollegeTimetable.js";

const cseBuf = fs.readFileSync("./public/Test-load/CSE_TT_Load.xlsx");
const cseWb = XLSX.read(cseBuf, { type: "buffer" });

const eleBuf = fs.readFileSync("./public/Test-load/electrical_tt_load.xlsx");
const eleWb = XLSX.read(eleBuf, { type: "buffer" });

const combinedSheets = {};

// CSE Sheets
if (cseWb.Sheets["Load"]) {
    combinedSheets["CSE-Load"] = XLSX.utils.sheet_to_json(cseWb.Sheets["Load"], { header: 1, defval: "" })
        .filter((r) => r.some((c) => c !== ""));
}
if (cseWb.Sheets["Location"]) {
    combinedSheets["CSE-Location"] = XLSX.utils.sheet_to_json(cseWb.Sheets["Location"], { header: 1, defval: "" })
        .filter((r) => r.some((c) => c !== ""));
}
if (cseWb.Sheets["Global"]) {
    combinedSheets["CSE-Fixed"] = XLSX.utils.sheet_to_json(cseWb.Sheets["Global"], { header: 1, defval: "" })
        .filter((r) => r.some((c) => c !== ""));
}

// ELE Sheets
if (eleWb.Sheets["Load"]) {
    combinedSheets["ELE-Load"] = XLSX.utils.sheet_to_json(eleWb.Sheets["Load"], { header: 1, defval: "" })
        .filter((r) => r.some((c) => c !== ""));
}
if (eleWb.Sheets["Location"]) {
    combinedSheets["ELE-Location"] = XLSX.utils.sheet_to_json(eleWb.Sheets["Location"], { header: 1, defval: "" })
        .filter((r) => r.some((c) => c !== ""));
}
if (eleWb.Sheets["Global"]) {
    combinedSheets["ELE-Fixed"] = XLSX.utils.sheet_to_json(eleWb.Sheets["Global"], { header: 1, defval: "" })
        .filter((r) => r.some((c) => c !== ""));
}

// College Global Sheet
combinedSheets["Global"] = [
    ["Year", "Day", "Time Slot", "Course Code", "Course Name", "L", "T", "P", "Div A", "Div B", "Div C"],
    ["SY", "WED", "9:15 - 10:15", "GL101", "Institute Open Elective", 1, 0, 0, "ALL", "ALL", "ALL"],
];

const parsed = parseMultiDeptWorkbook(combinedSheets, Object.keys(combinedSheets));

const res = generateCollegeTimetable(parsed, { maxTrials: 5 });

console.log("\n================ REPORT ================");
console.log("Total sessions:", res.report.totalSessions);
console.log("Allocated:", res.report.allocatedSessions);
console.log("Missing count:", res.report.unallocatedCount);
console.log("CSE Department Results:", res.departmentResults?.CSE);
console.log("ELE Department Results:", res.departmentResults?.ELE);

const allMissing = [
    ...(res.report.missingLectures || []).map(s => ({ ...s, cat: 'LECTURE' })),
    ...(res.report.missingTutorials || []).map(s => ({ ...s, cat: 'TUTORIAL' })),
    ...(res.report.missingPracticals || []).map(s => ({ ...s, cat: 'PRACTICAL' })),
];
console.log(`\n================ ALL MISSING SESSIONS (${allMissing.length}) ================`);
allMissing.forEach((m, i) => {
    const dept = m.department || m._dept || (m._deptDivKey ? m._deptDivKey.split(':')[0] : 'UNKNOWN');
    console.log(`  [${i+1}] ${dept} | ${m.cat} | ${m.year}-${m.division} | ${m.subject || m.courseName} | Fac:${m.faculty} | batch:${m.batch || 'ALL'} | reason: ${m.diagnosticReason}`);
    if (m.rejectionReasons && m.rejectionReasons.length > 0) {
        console.log(`       Rejection reasons:`, m.rejectionReasons);
    }
});
