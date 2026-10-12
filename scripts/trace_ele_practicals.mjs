import fs from "fs";
import * as XLSX from "xlsx";
import { parseMultiDeptWorkbook } from "../app/utils/parseMultiDeptWorkbook.js";
import { buildFacultyRegistry } from "../app/utils/facultyRegistry.js";
import { buildCollegeResources } from "../app/utils/parseMultiDeptWorkbook.js";
import { buildCourseLabResolutions } from "../app/utils/courseLabResolver.js";
import { createEmptyTimetable } from "../app/utils/createEmptyTimetable.js";
import { CollegeOccupancy } from "../app/utils/collegeOccupancy.js";
import { applyFixedConstraints } from "../app/utils/applyFixedConstraints.js";
import { applyConstraintCounts } from "../app/utils/applyConstraintCounts.js";
import { generateSessionPool } from "../app/utils/generateSessionPool.js";
import { packPracticals } from "../app/utils/practicalPacking.js";

const cseBuf = fs.readFileSync("./public/Test-load/CSE_TT_Load.xlsx");
const cseWb = XLSX.read(cseBuf, { type: "buffer" });
const eleBuf = fs.readFileSync("./public/Test-load/electrical_tt_load.xlsx");
const eleWb = XLSX.read(eleBuf, { type: "buffer" });

const combinedSheets = {};
combinedSheets["CSE-Load"] = XLSX.utils.sheet_to_json(cseWb.Sheets["Load"], { header: 1, defval: "" }).filter(r => r.some(c => c !== ""));
combinedSheets["CSE-Location"] = XLSX.utils.sheet_to_json(cseWb.Sheets["Location"], { header: 1, defval: "" }).filter(r => r.some(c => c !== ""));
combinedSheets["CSE-Fixed"] = XLSX.utils.sheet_to_json(cseWb.Sheets["Global"], { header: 1, defval: "" }).filter(r => r.some(c => c !== ""));

combinedSheets["ELE-Load"] = XLSX.utils.sheet_to_json(eleWb.Sheets["Load"], { header: 1, defval: "" }).filter(r => r.some(c => c !== ""));
combinedSheets["ELE-Location"] = XLSX.utils.sheet_to_json(eleWb.Sheets["Location"], { header: 1, defval: "" }).filter(r => r.some(c => c !== ""));
combinedSheets["ELE-Fixed"] = XLSX.utils.sheet_to_json(eleWb.Sheets["Global"], { header: 1, defval: "" }).filter(r => r.some(c => c !== ""));

const collegeData = parseMultiDeptWorkbook(combinedSheets, Object.keys(combinedSheets));
const facultyRegistry = buildFacultyRegistry(collegeData, {});
Object.entries(collegeData.departments).forEach(([deptCode, deptData]) => {
    facultyRegistry.rewriteDepartmentFaculty(deptData, deptCode);
});
const collegeResources = buildCollegeResources(collegeData);

const deptLabResolutions = {};
Object.entries(collegeData.departments).forEach(([deptCode, deptData]) => {
    const locData = deptData.locationData || null;
    const resolveResult = buildCourseLabResolutions(deptData.subjects, locData);
    deptLabResolutions[deptCode] = resolveResult.resolutions;
});

const masterTimetable = {};
Object.entries(collegeData.departments).forEach(([deptCode, deptData]) => {
    const clonedYearWise = JSON.parse(JSON.stringify(deptData.yearWiseData));
    Object.entries(createEmptyTimetable(clonedYearWise)).forEach(([divKey, grid]) => {
        masterTimetable[`${deptCode}:${divKey}`] = grid;
    });
});

const collegeOccupancy = new CollegeOccupancy(masterTimetable, collegeResources, {});

// Step: Run CSE practical packing first
console.log("=== RUNNING CSE ===");
collegeOccupancy.setActiveDepartment("CSE");
const cseYearWise = JSON.parse(JSON.stringify(collegeData.departments["CSE"].yearWiseData));
applyConstraintCounts(cseYearWise, collegeData.departments["CSE"].fixedConstraints || []);
const csePool = generateSessionPool(cseYearWise, collegeData.departments["CSE"].syncRules || [], deptLabResolutions["CSE"]);
csePool.forEach(s => {
    s.department = "CSE";
    s._deptDivKey = `CSE:${s.year}-${s.division}`;
});

// Alias for CSE
const originalKeysCSE = {};
csePool.forEach(s => {
    const simpleKey = `${s.year}-${s.division}`;
    if (!masterTimetable[simpleKey]) {
        originalKeysCSE[simpleKey] = true;
        masterTimetable[simpleKey] = masterTimetable[s._deptDivKey];
    }
});
packPracticals(masterTimetable, csePool, collegeOccupancy, { verbose: true, printLogs: true });
Object.keys(originalKeysCSE).forEach(k => delete masterTimetable[k]);
collegeOccupancy.setActiveDepartment(null);

console.log("CSE Practicals allocated:", csePool.filter(s => s.type === "PRACTICAL" && s.allocated).length, "/", csePool.filter(s => s.type === "PRACTICAL").length);

// Now inspect ELE
console.log("\n=== RUNNING ELE ===");
collegeOccupancy.setActiveDepartment("ELE");
const eleYearWise = JSON.parse(JSON.stringify(collegeData.departments["ELE"].yearWiseData));
applyConstraintCounts(eleYearWise, collegeData.departments["ELE"].fixedConstraints || []);
const elePool = generateSessionPool(eleYearWise, collegeData.departments["ELE"].syncRules || [], deptLabResolutions["ELE"]);
elePool.forEach(s => {
    s.department = "ELE";
    s._deptDivKey = `ELE:${s.year}-${s.division}`;
});

const originalKeysELE = {};
elePool.forEach(s => {
    const simpleKey = `${s.year}-${s.division}`;
    if (!masterTimetable[simpleKey]) {
        originalKeysELE[simpleKey] = true;
        masterTimetable[simpleKey] = masterTimetable[s._deptDivKey];
    }
});

const elePracs = elePool.filter(s => s.type === "PRACTICAL");
console.log("Total ELE practicals to pack:", elePracs.length);
console.log("ELE SY practicals:");
elePracs.filter(s => s.year === "SY").forEach(s => {
    console.log(`  ${s.year}-${s.division} | ${s.subject} | batch:${s.batch} | fac:${s.faculty} | primaryLab:${s.primaryLabInitial}`);
});

packPracticals(masterTimetable, elePool, collegeOccupancy, { verbose: true, printLogs: false });

console.log("\nELE Practicals allocated after packPracticals:", elePool.filter(s => s.type === "PRACTICAL" && s.allocated).length, "/", elePracs.length);
elePracs.filter(s => !s.allocated).forEach(s => {
    console.log(`  UNALLOCATED: ${s.year}-${s.division} | ${s.subject} | batch:${s.batch} | fac:${s.faculty} | lab:${s.primaryLabInitial}`);
});
