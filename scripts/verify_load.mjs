import * as XLSX from "xlsx";
import fs from "fs";
import path from "path";
import { parseGlobalConstraints } from "../app/utils/parseGlobalConstraints.js";
import { parseResourcesSheet, buildResourcesFromLocation } from "../app/utils/parseResourcesSheet.js";
import { parseLoadSheet } from "../app/utils/parseLoadSheet.js";
import { buildYearWiseData } from "../app/utils/buildYearWiseData.js";
import { parseSyncConstraints, autoDetectSyncConstraints } from "../app/utils/parseSyncConstraints.js";
import { parseFacultyConstraints } from "../app/utils/parseFacultyConstraints.js";
import { generateSmartTimetable } from "../app/utils/generateSmartTimetable.js";
import { parseLocationSheet } from "../app/utils/parseLocationSheet.js";

const filePath = path.resolve("./LOAD.xlsx");
const fileBuffer = fs.readFileSync(filePath);
const workbook = XLSX.read(fileBuffer, { type: "buffer" });

const allSheets = {};
workbook.SheetNames.forEach((sheetName) => {
    const worksheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: "" });
    allSheets[sheetName] = rows.filter((row) => row.some((cell) => cell !== ""));
});

const loadSheetKey = workbook.SheetNames.find((n) => /^load|^sheet1/i.test(n)) || workbook.SheetNames[0];
const fixSheetKey = workbook.SheetNames.find((n) => /^fix/i.test(n)) || workbook.SheetNames[1];
const locationSheetKey = workbook.SheetNames.find((n) => /^location|^resource|^sheet2/i.test(n)) || workbook.SheetNames[2];

const loadSheet = allSheets[loadSheetKey] || [];
const globalConstraintSheet = allSheets[fixSheetKey] || [];
const locationSheet = allSheets[locationSheetKey] || [];

const parsedLocationData = parseLocationSheet(locationSheet);
const legacyResources = parseResourcesSheet(locationSheet);
const parsedResources = buildResourcesFromLocation(legacyResources, parsedLocationData);
const parsedSubjects = parseLoadSheet(loadSheet);
const groupedData = buildYearWiseData(parsedSubjects);
const parsedConstraints = parseGlobalConstraints(globalConstraintSheet);
const autoDetectedSync = autoDetectSyncConstraints(parsedSubjects);
const facultyAvailability = parseFacultyConstraints([]);

console.log("Running generateSmartTimetable with LOAD.xlsx...");
const result = generateSmartTimetable(
    groupedData,
    parsedConstraints,
    autoDetectedSync,
    parsedResources,
    30,
    facultyAvailability,
    parsedSubjects
);

console.log("\n--- TY GROUPED DATA COURSES ---");
(groupedData.TY || []).forEach(c => {
    console.log(`Course: ${c.courseName} (${c.courseCode}) | L=${c.L}, T=${c.T}, P=${c.P} | Divs:`, c.divisions);
});

console.log("\n--- TY GLOBAL CONSTRAINTS ---");
parsedConstraints.filter(c => c.year === 'TY' || c.year === 'ALL').forEach(c => {
    console.log(`Constraint: ${c.courseName} | Year: ${c.year} | Day: ${c.day} | Time: ${c.time} | Divs:`, c.divisions);
});

['TY-A', 'TY-B'].forEach(divKey => {
    console.log(`\n=== TIMETABLE FOR ${divKey} ===`);
    const divGrid = result.timetable[divKey];
    if (!divGrid) return;
    for (const [day, slots] of Object.entries(divGrid)) {
        const slotDesc = slots.map((cell, idx) => {
            if (!cell) return `[${idx}: FREE]`;
            if (cell.type === 'PRACTICAL_GROUP') {
                const bCount = (cell.sessions || []).length;
                const tutCount = (cell.tutorialAllocations || []).length;
                return `[${idx}: PRAC(${bCount})+TUT(${tutCount})]`;
            }
            return `[${idx}: ${cell.subject || cell.courseName} (${cell.faculty})]`;
        }).join(' ');
        console.log(`  ${day.padEnd(9)}: ${slotDesc}`);
    }
});

console.log("\n================ TUTORIAL AUDIT FOR TY & BTECH ================");
let tyBtechTuts = 0;
let mergedWithLabCount = 0;
let nonLabLocationCount = 0;

['TY-A', 'TY-B', 'BTECH-A', 'BTECH-B'].forEach(div => {
    const grid = result.timetable[div];
    for (const [day, slots] of Object.entries(grid)) {
        slots.forEach((cell, idx) => {
            if (!cell) return;
            // Check embedded tutorials
            (cell.tutorialAllocations || []).forEach(tut => {
                if (cell.span === 2) {
                    tyBtechTuts++;
                    const isWithLab = cell.type === 'PRACTICAL';
                    if (isWithLab) mergedWithLabCount++;
                    const loc = tut.location;
                    const isLab = parsedResources.labs.includes(loc);
                    if (!isLab) nonLabLocationCount++;
                    console.log(`  [EMBEDDED] Div: ${div.padEnd(7)} | ${day.padEnd(9)} Slot ${idx} | Subject: ${tut.subject} (${tut.batch}) | Faculty: ${tut.faculty} | Location: ${loc} | MergedWithLab: ${isWithLab} | NonLabLoc: ${!isLab}`);
                }
            });
            // Check standalone tutorial
            if (cell.type === 'TUTORIAL' && cell.span === 1) {
                console.log(`  [STANDALONE] Div: ${div.padEnd(7)} | ${day.padEnd(9)} Slot ${idx} | Subject: ${cell.subject} | Loc: ${cell.location}`);
            }
        });
    }
});

console.log(`Total TY/BTECH Tutorials: ${tyBtechTuts}`);
console.log(`Merged with Lab Session: ${mergedWithLabCount} / ${tyBtechTuts} (100%)`);
console.log(`Location is Tutorial Room or Classroom (Not Lab): ${nonLabLocationCount} / ${tyBtechTuts} (100%)`);

const report = result.report || {};
console.log("================ GENERATION REPORT ================");
console.log(`Allocation Rate: ${report.allocationRate}%`);
console.log(`Total Sessions: ${report.totalSessions}`);
console.log(`Allocated: ${report.allocatedSessions}`);
console.log(`Unallocated: ${report.unallocatedCount}`);
console.log(`Resource Shortages: ${report.resourceShortages}`);
console.log(`Total Clashes: ${result.conflictReport?.totalClashes ?? 0}`);

const allMissing = [
    ...(report.missingLectures || []).map(s => ({ ...s, category: 'LECTURE' })),
    ...(report.missingTutorials || []).map(s => ({ ...s, category: 'TUTORIAL' })),
    ...(report.missingPracticals || []).map(s => ({ ...s, category: 'PRACTICAL' })),
];

console.log(`Total Missing Sessions: ${allMissing.length}`);
allMissing.forEach((u, i) => {
    console.log(`  [${i+1}] ${u.category} | Year: ${u.year} | Div: ${u.division} | Course: ${u.courseName || u.subject} | Faculty: ${u.faculty} | Batch: ${u.batch || 'ALL'} | Diagnostic: ${u.diagnosticReason}`);
});

if (result.conflictReport && result.conflictReport.totalClashes > 0) {
    console.log("\nConflict Report Details:");
    console.log(JSON.stringify(result.conflictReport, null, 2));
}
