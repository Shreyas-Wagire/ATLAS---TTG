import * as XLSX from "xlsx";
import fs from "fs";
import { parseResourcesSheet, buildResourcesFromLocation } from "../app/utils/parseResourcesSheet.js";
import { parseLoadSheet } from "../app/utils/parseLoadSheet.js";
import { buildYearWiseData } from "../app/utils/buildYearWiseData.js";
import { autoDetectSyncConstraints } from "../app/utils/parseSyncConstraints.js";
import { parseLocationSheet } from "../app/utils/parseLocationSheet.js";
import { parseGlobalConstraints } from "../app/utils/parseGlobalConstraints.js";
import { generateSmartTimetable } from "../app/utils/generateSmartTimetable.js";

const buf = fs.readFileSync("./public/Test-load/electrical_tt_load.xlsx");
const wb = XLSX.read(buf, { type: "buffer" });
const parsedLocationData = parseLocationSheet(XLSX.utils.sheet_to_json(wb.Sheets["Location"], { header: 1, defval: "" }).filter(r => r.some(c => c !== "")));
const legacyResources = parseResourcesSheet(XLSX.utils.sheet_to_json(wb.Sheets["Location"], { header: 1, defval: "" }).filter(r => r.some(c => c !== "")));
const parsedResources = buildResourcesFromLocation(legacyResources, parsedLocationData);
const parsedSubjects = parseLoadSheet(XLSX.utils.sheet_to_json(wb.Sheets["Load"], { header: 1, defval: "" }).filter(r => r.some(c => c !== "")));
const groupedData = buildYearWiseData(parsedSubjects);
const parsedConstraints = parseGlobalConstraints(XLSX.utils.sheet_to_json(wb.Sheets["Global"], { header: 1, defval: "" }).filter(r => r.some(c => c !== "")));
const autoDetectedSync = autoDetectSyncConstraints(parsedSubjects);

console.log("Auto detected sync constraints count:", autoDetectedSync.length);
autoDetectedSync.forEach(s => console.log(`  ${s.groupName}:`, s.courses));

const result = generateSmartTimetable(
    groupedData,
    parsedConstraints,
    autoDetectedSync,
    parsedResources,
    30,
    {},
    parsedSubjects
);

const report = result.report || {};
console.log(`\n================ GENERATION REPORT ================`);
console.log(`Allocation Rate: ${report.allocationRate}%`);
console.log(`Total Sessions: ${report.totalSessions}`);
console.log(`Allocated Sessions: ${report.allocatedSessions}`);
console.log(`Unallocated Sessions: ${report.unallocatedCount}`);
console.log(`Faculty Clashes: ${result.conflictReport?.summary?.FACULTY_CLASH || 0}`);
console.log(`Total Clashes: ${result.conflictReport?.totalClashes || 0}`);

const allMissing = [
    ...(report.missingLectures || []).map(s => ({ ...s, cat: 'LECTURE' })),
    ...(report.missingTutorials || []).map(s => ({ ...s, cat: 'TUTORIAL' })),
    ...(report.missingPracticals || []).map(s => ({ ...s, cat: 'PRACTICAL' })),
];
console.log(`Total Missing Sessions: ${allMissing.length}`);
allMissing.forEach((m, idx) => {
    console.log(`  [${idx+1}] ${m.cat} | Year: ${m.year} | Div: ${m.division} | Course: ${m.courseName || m.subject} | Fac: ${m.faculty} | Batch: ${m.batch || 'ALL'} | Reason: ${m.diagnosticReason}`);
});

console.log("\n================ OPEN ELECTIVE TIMETABLE SLOTS ================");
['TY-A', 'TY-B', 'BTECH-A', 'BTECH-B'].forEach(divKey => {
    const grid = result.timetable[divKey] || {};
    console.log(`\n--- ${divKey} ---`);
    for (const [day, slots] of Object.entries(grid)) {
        slots.forEach((cell, idx) => {
            if (!cell) return;
            const str = JSON.stringify(cell);
            if (str.toLowerCase().includes("open elective") || str.toLowerCase().includes("oe-")) {
                console.log(`  ${day} Slot ${idx}: ${cell.subject} (${cell.subjectName}) | Faculty: ${cell.faculty} | Loc: ${cell.location}`);
            }
        });
    }
});

console.log("\n================ TY PRACTICAL TIMETABLE SLOTS ================");
const tyBatchCounts = {};
for (let b = 1; b <= 8; b++) tyBatchCounts[`T${b}`] = 0;

['TY-A', 'TY-B'].forEach(divKey => {
    const grid = result.timetable[divKey] || {};
    console.log(`\n--- ${divKey} Practicals ---`);
    for (const [day, slots] of Object.entries(grid)) {
        slots.forEach((cell, idx) => {
            if (!cell || cell.type !== 'PRACTICAL' || cell.span !== 2) return;
            (cell.batchAllocations || []).forEach(b => {
                if (tyBatchCounts[b.batch] !== undefined) tyBatchCounts[b.batch]++;
            });
            const batches = (cell.batchAllocations || []).map(b => `${b.batch}:${b.subject || b.courseCode}(${b.faculty}@${b.location})`).join(', ');
            console.log(`  ${day} Slot ${idx}: [${batches}]`);
        });
    }
});

console.log("\n================ TY PRACTICAL COUNT PER BATCH ================");
Object.entries(tyBatchCounts).forEach(([batch, count]) => {
    console.log(`  ${batch}: ${count} practicals ${count === 5 ? '✓ (ALL 5)' : '✗ (INCOMPLETE)'}`);
});

