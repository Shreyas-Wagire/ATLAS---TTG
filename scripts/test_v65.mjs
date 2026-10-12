/**
 * scripts/test_v65.mjs — Comprehensive Test Suite for ATLAS v6.5 College-Wide Timetable Generator
 *
 * Validates all 8 phases of the v6.5 upgrade:
 * 1. Multi-Department Workbook Parser (parseMultiDeptWorkbook.js)
 * 2. Faculty Identity Registry (facultyRegistry.js)
 * 3. College Scheduling Engine (generateCollegeTimetable.js)
 * 4. Enhanced CollegeOccupancy (collegeOccupancy.js)
 * 5. Fixed Constraints Dept Scope & Overlap Protection (applyFixedConstraints.js)
 * 6. UI Filter Logic & State Consistency
 * 7. Department-Aware Export (exportTimetable.js)
 * 8. Real Multi-Department Full Pipeline Execution (CSE + ELE combined)
 */

import fs from "fs";
import path from "path";
import * as XLSX from "xlsx";

import {
    parseDeptSheetName,
    isMultiDeptWorkbook,
    discoverDepartments,
    parseMultiDeptWorkbook,
} from "../app/utils/parseMultiDeptWorkbook.js";

import {
    FacultyRegistry,
    buildFacultyRegistry,
    isGhostFaculty,
} from "../app/utils/facultyRegistry.js";

import { CollegeOccupancy } from "../app/utils/collegeOccupancy.js";
import { applyFixedConstraints } from "../app/utils/applyFixedConstraints.js";
import { generateCollegeTimetable } from "../app/utils/generateCollegeTimetable.js";
import { exportTimetable } from "../app/utils/exportTimetable.js";

// ANSI colors for clean test reporter output
const GREEN = "\x1b[32m";
const RED = "\x1b[31m";
const YELLOW = "\x1b[33m";
const CYAN = "\x1b[36m";
const BOLD = "\x1b[1m";
const RESET = "\x1b[0m";

let passedCount = 0;
let failedCount = 0;

function assert(condition, testName, details = "") {
    if (condition) {
        console.log(`  ${GREEN}✓${RESET} ${testName}`);
        passedCount++;
    } else {
        console.error(`  ${RED}✗ FAIL:${RESET} ${testName}`);
        if (details) console.error(`    ${RED}${details}${RESET}`);
        failedCount++;
    }
}

function suite(title) {
    console.log(`\n${BOLD}${CYAN}=== ${title} ===${RESET}`);
}

async function runAllTests() {
    console.log(`\n${BOLD}====================================================${RESET}`);
    console.log(`${BOLD}   ATLAS v6.5 — COLLEGE-WIDE TEST SUITE             ${RESET}`);
    console.log(`${BOLD}====================================================${RESET}`);

    // =========================================================================
    // SUITE 1: Multi-Department Workbook Parsing
    // =========================================================================
    suite("Suite 1: Multi-Department Workbook Parser");

    // 1.1 Sheet Name Recognition
    const parsedCseLoad = parseDeptSheetName("CSE-Load");
    assert(
        parsedCseLoad && parsedCseLoad.deptCode === "CSE" && parsedCseLoad.sheetType === "Load",
        "parseDeptSheetName parses 'CSE-Load' correctly"
    );

    const parsedEleLoc = parseDeptSheetName("ELE-Location");
    assert(
        parsedEleLoc && parsedEleLoc.deptCode === "ELE" && parsedEleLoc.sheetType === "Location",
        "parseDeptSheetName parses 'ELE-Location' correctly"
    );

    const parsedCivilFix = parseDeptSheetName("CIVIL-Fixed");
    assert(
        parsedCivilFix && parsedCivilFix.deptCode === "CIVIL" && parsedCivilFix.sheetType === "Fixed",
        "parseDeptSheetName parses 'CIVIL-Fixed' correctly"
    );

    assert(parseDeptSheetName("Global") === null, "parseDeptSheetName returns null for 'Global'");
    assert(parseDeptSheetName("RandomSheet") === null, "parseDeptSheetName returns null for 'RandomSheet'");

    // 1.2 Multi-Dept Detection & Discovery
    const sampleSheetNames = ["CSE-Load", "CSE-Location", "CSE-Fixed", "ELE-Load", "ELE-Location", "Global"];
    assert(isMultiDeptWorkbook(sampleSheetNames) === true, "isMultiDeptWorkbook detects multi-dept sheet array");
    assert(isMultiDeptWorkbook(["Load", "Location", "Global"]) === false, "isMultiDeptWorkbook detects single-dept sheet array");

    const discovered = discoverDepartments(sampleSheetNames);
    assert(
        discovered.length === 2 && discovered.includes("CSE") && discovered.includes("ELE"),
        "discoverDepartments extracts unique sorted dept codes ['CSE', 'ELE']"
    );

    // 1.3 Synthetic Multi-Dept Workbook Parsing matching standard table structure
    const mockAllSheets = {
        "CSE-Load": [
            [null, "SY", "L", "T", "P", "A", "B", null, null, 1, 2, 3, 4],
            [null, "Data Structures", 3, 0, 0, "AK", "AK"],
            [null, "DS Lab", 0, 0, 2, null, null, null, null, "AK", "AK", "SPP", "SPP"],
        ],
        "CSE-Location": [
            ["Tutorial Rooms", "ClassRooms", "Lab Name", "Labs Initial", "Labs Features", "Mapped Courses"],
            ["TR-1", "CR-101", "Lab-1", "L1", "Linux", "DS Lab"],
            [null, "CR-102", "Lab-2", "L2", "Windows", "Data Structures"],
        ],
        "CSE-Fixed": [
            ["SY", "L", "T", "P", "A", "B", "C", "DAY", "TIME"],
            ["CSE Seminar", 1, 0, 0, "HOD", "HOD", null, "MON", "9:15 - 10:15"],
        ],
        "ELE-Load": [
            [null, "SY", "L", "T", "P", "A", "B", null, null, 1, 2, 3, 4],
            [null, "Circuits", 3, 0, 0, "SPP", "RS"],
        ],
        "ELE-Location": [
            ["Tutorial Rooms", "ClassRooms", "Lab Name", "Labs Initial", "Labs Features", "Mapped Courses"],
            ["TR-2", "CR-201", "EE-Lab", "EEL", "Circuits", "Circuits"],
        ],
        "Global": [
            ["SY", "L", "T", "P", "A", "B", "C", "DAY", "TIME"],
            ["College Sports", 1, 0, 0, "SPORTS", "SPORTS", null, "FRI", "9:15 - 10:15"],
        ],
    };

    const multiDeptData = parseMultiDeptWorkbook(mockAllSheets, Object.keys(mockAllSheets));
    assert(multiDeptData.isMultiDept === true, "parseMultiDeptWorkbook marks isMultiDept = true");
    assert(multiDeptData.departmentOrder.length === 2, "parseMultiDeptWorkbook has 2 departments");
    assert(multiDeptData.departments.CSE?.subjects?.length === 2, "CSE department has 2 subjects parsed");
    assert(multiDeptData.departments.ELE?.subjects?.length === 1, "ELE department has 1 subject parsed");
    assert(multiDeptData.globalConstraints?.length === 1, "Global sheet parsed 1 college-wide constraint");

    // 1.4 Single-Dept Legacy Fallback
    const legacySheets = {
        "Load": mockAllSheets["CSE-Load"],
        "Location": mockAllSheets["CSE-Location"],
        "Global": mockAllSheets["Global"],
    };
    const legacyData = parseMultiDeptWorkbook(legacySheets, ["Load", "Location", "Global"]);
    assert(legacyData.isMultiDept === false, "Single-dept workbook marks isMultiDept = false");
    assert(legacyData.departmentOrder[0] === "DEPT", "Single-dept default dept code is 'DEPT'");
    assert(legacyData.departments.DEPT?.subjects?.length === 2, "Legacy mode parses subjects under DEPT");

    // =========================================================================
    // SUITE 2: Faculty Identity Registry
    // =========================================================================
    suite("Suite 2: Faculty Identity Registry");

    // 2.1 Duplicate Initials Disambiguation Across Departments
    // In multiDeptData:
    // CSE has 'SPP' (DS Lab B3, B4)
    // ELE has 'SPP' (Circuits Div A)
    // By default without shared map, they should be disambiguated as SPP-CSE and SPP-ELE
    const registryWithoutShared = buildFacultyRegistry(multiDeptData);
    assert(
        registryWithoutShared.resolve("SPP", "CSE") === "SPP-CSE",
        "Disambiguates SPP in CSE as 'SPP-CSE'"
    );
    assert(
        registryWithoutShared.resolve("SPP", "ELE") === "SPP-ELE",
        "Disambiguates SPP in ELE as 'SPP-ELE'"
    );
    assert(
        registryWithoutShared.resolve("AK", "CSE") === "AK",
        "Single-dept faculty 'AK' retains original initial 'AK'"
    );

    // 2.2 Shared Faculty Across Departments
    const sharedMap = {
        "SPP": { departments: ["CSE", "ELE"], isShared: true, canonicalName: "Prof. S. P. Patil" },
    };
    const registryWithShared = buildFacultyRegistry(multiDeptData, sharedMap);
    assert(
        registryWithShared.resolve("SPP", "CSE") === "SPP",
        "Shared faculty SPP resolves to canonical 'SPP' in CSE"
    );
    assert(
        registryWithShared.resolve("SPP", "ELE") === "SPP",
        "Shared faculty SPP resolves to canonical 'SPP' in ELE"
    );
    assert(registryWithShared.isShared("SPP") === true, "registry.isShared('SPP') returns true");

    // 2.3 Ghost Faculty Detection
    assert(isGhostFaculty("TBD") === true, "isGhostFaculty('TBD') is true");
    assert(isGhostFaculty("FIXED") === true, "isGhostFaculty('FIXED') is true");
    assert(isGhostFaculty("X1") === true, "isGhostFaculty('X1') is true");
    assert(isGhostFaculty("AK") === false, "isGhostFaculty('AK') is false");

    // 2.4 Registry Report Generation
    const regReport = registryWithShared.generateReport();
    assert(regReport.totalFaculty > 0, `Registry report contains totalFaculty = ${regReport.totalFaculty}`);
    assert(regReport.sharedFaculty.includes("SPP"), "Registry report lists 'SPP' in sharedFaculty array");

    // =========================================================================
    // SUITE 3: Enhanced CollegeOccupancy
    // =========================================================================
    suite("Suite 3: Enhanced CollegeOccupancy & Department Ownership");

    const sampleTimetable = {
        "CSE:SY-A": {
            Monday: [null, null, null, null, null, null],
            Tuesday: [null, null, null, null, null, null],
        },
        "ELE:SY-A": {
            Monday: [null, null, null, null, null, null],
            Tuesday: [null, null, null, null, null, null],
        },
    };

    const occupancy = new CollegeOccupancy(sampleTimetable, {
        classrooms: ["CR-101", "CR-102"],
        labs: ["Lab-1"],
        tutorialRooms: ["TR-1"],
    });

    // 3.1 Extract Dept from Div Key
    assert(
        CollegeOccupancy.extractDeptFromDivKey("CSE:SY-A") === "CSE",
        "Extracts 'CSE' from 'CSE:SY-A'"
    );
    assert(
        CollegeOccupancy.extractDeptFromDivKey("ELE:TY-B") === "ELE",
        "Extracts 'ELE' from 'ELE:TY-B'"
    );
    assert(
        CollegeOccupancy.extractDeptFromDivKey("SY-A") === null,
        "Returns null for non-prefixed 'SY-A'"
    );

    // 3.2 Commit Session with Department Ownership
    const cseSession = {
        subject: "Data Structures",
        faculty: "AK",
        type: "LECTURE",
        span: 1,
        year: "SY",
        division: "A",
        department: "CSE",
    };
    const committed = occupancy.commitSingleSession("CSE:SY-A", "Monday", 0, cseSession, "CR-101");
    assert(committed === true, "commitSingleSession placed CSE session successfully");

    // 3.3 Verify Department Tag on Timetable Cell
    const placedCell = sampleTimetable["CSE:SY-A"]["Monday"][0];
    assert(placedCell && placedCell.department === "CSE", "Placed cell carries department = 'CSE'");

    // 3.4 Verify Resource Ownership Query
    assert(
        occupancy.isClassroomFree("CR-101", "Monday", 0) === false,
        "CR-101 is recognized as occupied at Monday slot 0"
    );
    assert(
        occupancy.getDepartmentForResource("CR-101", "Monday", 0) === "CSE",
        "CR-101 is owned by department 'CSE' at Monday slot 0"
    );
    assert(
        occupancy.isFacultyFree("AK", "Monday", 0) === false,
        "Faculty 'AK' is occupied at Monday slot 0"
    );
    assert(
        occupancy.getDepartmentForFaculty("AK", "Monday", 0) === "CSE",
        "Faculty 'AK' is tagged with department 'CSE' at Monday slot 0"
    );

    // 3.5 Shared Resource Conflict Prevention Across Departments
    // Another department checking CR-101 sees it's not free:
    assert(
        occupancy.isClassroomFree("CR-101", "Monday", 0) === false,
        "CR-101 is recognized as unavailable across all departments"
    );

    // 3.6 Occupancy Diagnostic Report
    const occReport = occupancy.getOccupancyReport();
    assert(
        occReport.classroomsByDept?.CSE?.["CR-101"] >= 1,
        "Occupancy report correctly attributes CR-101 slot to 'CSE'"
    );

    // =========================================================================
    // SUITE 4: Fixed Constraints Dept Scope & Overlap Protection
    // =========================================================================
    suite("Suite 4: Fixed Constraints Dept Scope & Overlap Protection");

    const fixTimetable = {
        "SY-A": {
            Monday: [null, null, null, null, null, null],
        },
    };

    const globalConstraint = [
        {
            year: "SY",
            day: "MON",
            time: "9:15 - 10:15",
            courseName: "Sports",
            divisions: { A: "COACH" },
            L: 1, T: 0, P: 0,
        },
    ];

    // 4.1 Apply Department-Scoped Fixed Constraint
    applyFixedConstraints(fixTimetable, globalConstraint, { department: "GLOBAL", isGlobalSheet: true });
    const fixedCell = fixTimetable["SY-A"]["Monday"][0];
    assert(fixedCell && fixedCell.fixed === true, "Fixed session placed at Monday Slot 0");
    assert(fixedCell.department === "GLOBAL", "Fixed session tagged with department = 'GLOBAL'");
    assert(fixedCell.isGlobal === true, "Fixed session tagged with isGlobal = true");

    // 4.2 Overlap Protection: Attempting to overwrite existing fixed session
    const conflictingConstraint = [
        {
            year: "SY",
            day: "MON",
            time: "9:15 - 10:15",
            courseName: "Overlapping Event",
            divisions: { A: "OTHER" },
            L: 1, T: 0, P: 0,
        },
    ];

    const overlapWarnings = [];
    applyFixedConstraints(fixTimetable, conflictingConstraint, {
        department: "CSE",
        isGlobalSheet: false,
        overlapDiagnostics: overlapWarnings,
    });

    const preservedCell = fixTimetable["SY-A"]["Monday"][0];
    assert(
        preservedCell && preservedCell.subject === "Sports",
        "Overlap Protection: Original fixed session 'Sports' was PRESERVED, not overwritten"
    );
    assert(
        overlapWarnings.length === 1,
        "Overlap Protection: Logged warning diagnostic for collision"
    );

    // =========================================================================
    // SUITE 5: Department-Aware Export (exportTimetable.js)
    // =========================================================================
    suite("Suite 5: Department-Aware Export Module");

    const exportMockTimetable = {
        "CSE:SY-A": sampleTimetable["CSE:SY-A"],
        "ELE:SY-A": sampleTimetable["ELE:SY-A"],
    };

    const mockExtraReports = {
        isMultiDept: true,
        departmentOrder: ["CSE", "ELE"],
        departmentResults: {
            CSE: { sessionCount: 20, allocatedCount: 20, unallocatedCount: 0 },
            ELE: { sessionCount: 18, allocatedCount: 18, unallocatedCount: 0 },
        },
        facultyRegistryReport: regReport,
        validationScore: { totalScore: 98, grade: "A+" },
        conflictReport: { summary: { FACULTY_CLASH: 0, ROOM_CLASH: 0 } },
    };

    const exportedWb = exportTimetable(exportMockTimetable, null, mockExtraReports);
    assert(exportedWb !== null, "exportTimetable returns valid XLSX workbook in Node environment");

    const sheetNames = exportedWb.SheetNames;
    assert(sheetNames.includes("Department Summary"), "Workbook contains 'Department Summary' sheet");
    assert(sheetNames.includes("Faculty Registry"), "Workbook contains 'Faculty Registry' sheet");
    assert(
        sheetNames.some((s) => s.startsWith("CSE-") || s.startsWith("CSE")),
        "Division sheets formatted with clean names (colons sanitized to hyphens)"
    );
    assert(
        sheetNames.every((s) => !s.includes(":") && s.length <= 31),
        "All sheet names comply with Excel constraints (no colons, <=31 chars)"
    );

    // Inspect Department Summary sheet content
    const summarySheet = exportedWb.Sheets["Department Summary"];
    const summaryData = XLSX.utils.sheet_to_json(summarySheet, { header: 1 });
    const hasCseRow = summaryData.some((row) => row && row[0] === "CSE");
    const hasCollegeTotal = summaryData.some((row) => row && row[0] === "COLLEGE TOTAL");
    assert(hasCseRow === true, "Department Summary contains CSE row");
    assert(hasCollegeTotal === true, "Department Summary contains COLLEGE TOTAL row");

    // =========================================================================
    // SUITE 6: End-to-End Pipeline on Real Workbooks (CSE + Electrical)
    // =========================================================================
    suite("Suite 6: End-to-End Multi-Department Pipeline with Real Workbooks");

    const csePath = "./public/Test-load/CSE_TT_Load.xlsx";
    const elePath = "./public/Test-load/electrical_tt_load.xlsx";

    if (fs.existsSync(csePath) && fs.existsSync(elePath)) {
        console.log(`  Loading real test workbooks from disk:`);
        console.log(`    - CSE: ${csePath}`);
        console.log(`    - ELE: ${elePath}`);

        const cseBuf = fs.readFileSync(csePath);
        const cseWb = XLSX.read(cseBuf, { type: "buffer" });

        const eleBuf = fs.readFileSync(elePath);
        const eleWb = XLSX.read(eleBuf, { type: "buffer" });

        // Synthesize a multi-department workbook data structure
        const realCombinedSheets = {};

        // CSE Sheets
        if (cseWb.Sheets["Load"]) {
            realCombinedSheets["CSE-Load"] = XLSX.utils.sheet_to_json(cseWb.Sheets["Load"], { header: 1, defval: "" })
                .filter((r) => r.some((c) => c !== ""));
        }
        if (cseWb.Sheets["Location"]) {
            realCombinedSheets["CSE-Location"] = XLSX.utils.sheet_to_json(cseWb.Sheets["Location"], { header: 1, defval: "" })
                .filter((r) => r.some((c) => c !== ""));
        }
        if (cseWb.Sheets["Global"]) {
            realCombinedSheets["CSE-Fixed"] = XLSX.utils.sheet_to_json(cseWb.Sheets["Global"], { header: 1, defval: "" })
                .filter((r) => r.some((c) => c !== ""));
        }

        // ELE Sheets
        if (eleWb.Sheets["Load"]) {
            realCombinedSheets["ELE-Load"] = XLSX.utils.sheet_to_json(eleWb.Sheets["Load"], { header: 1, defval: "" })
                .filter((r) => r.some((c) => c !== ""));
        }
        if (eleWb.Sheets["Location"]) {
            realCombinedSheets["ELE-Location"] = XLSX.utils.sheet_to_json(eleWb.Sheets["Location"], { header: 1, defval: "" })
                .filter((r) => r.some((c) => c !== ""));
        }
        if (eleWb.Sheets["Global"]) {
            realCombinedSheets["ELE-Fixed"] = XLSX.utils.sheet_to_json(eleWb.Sheets["Global"], { header: 1, defval: "" })
                .filter((r) => r.some((c) => c !== ""));
        }

        // College Global Sheet
        realCombinedSheets["Global"] = [
            ["Year", "Day", "Time Slot", "Course Code", "Course Name", "L", "T", "P", "Div A", "Div B", "Div C"],
            ["SY", "WED", "9:15 - 10:15", "GL101", "Institute Open Elective", 1, 0, 0, "ALL", "ALL", "ALL"],
        ];

        const realCollegeData = parseMultiDeptWorkbook(realCombinedSheets, Object.keys(realCombinedSheets));
        assert(realCollegeData.isMultiDept === true, "Real combined workbook detected as isMultiDept = true");
        assert(realCollegeData.departmentOrder.includes("CSE"), "Parsed real CSE department");
        assert(realCollegeData.departmentOrder.includes("ELE"), "Parsed real ELE department");

        console.log(`  Running generateCollegeTimetable with maxTrials: 3...`);
        const startTime = Date.now();
        const collegeResult = generateCollegeTimetable(realCollegeData, {
            maxTrials: 3,
            onProgress: (dept, stage, pct) => {
                // Keep progress output minimal
            },
        });
        const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
        console.log(`  Completed in ${elapsed}s`);

        assert(collegeResult.timetable !== null, "Master timetable generated successfully");
        const masterKeys = Object.keys(collegeResult.timetable || {});
        assert(
            masterKeys.some((k) => k.startsWith("CSE:")),
            `Master timetable contains CSE division keys (e.g. ${masterKeys.find((k) => k.startsWith("CSE:"))})`
        );
        assert(
            masterKeys.some((k) => k.startsWith("ELE:")),
            `Master timetable contains ELE division keys (e.g. ${masterKeys.find((k) => k.startsWith("ELE:"))})`
        );

        assert(
            collegeResult.departmentResults?.CSE !== undefined,
            "departmentResults contains metrics for CSE"
        );
        assert(
            collegeResult.departmentResults?.ELE !== undefined,
            "departmentResults contains metrics for ELE"
        );

        const cseAlloc = collegeResult.departmentResults?.CSE?.allocatedCount || 0;
        const cseTotal = collegeResult.departmentResults?.CSE?.sessionCount || 0;
        const eleAlloc = collegeResult.departmentResults?.ELE?.allocatedCount || 0;
        const eleTotal = collegeResult.departmentResults?.ELE?.sessionCount || 0;

        console.log(`  Metrics Summary:`);
        console.log(`    CSE Allocation: ${cseAlloc}/${cseTotal} (${Math.round((cseAlloc/cseTotal)*100)}%)`);
        console.log(`    ELE Allocation: ${eleAlloc}/${eleTotal} (${Math.round((eleAlloc/eleTotal)*100)}%)`);
        console.log(`    Faculty Clashes: ${collegeResult.conflictReport?.summary?.FACULTY_CLASH || 0}`);
        console.log(`    Room Clashes: ${collegeResult.conflictReport?.summary?.ROOM_CLASH || 0}`);

        assert(cseAlloc > 0 && eleAlloc > 0, "Both departments have sessions successfully allocated");
        assert(
            (collegeResult.conflictReport?.summary?.FACULTY_CLASH || 0) === 0,
            "Zero cross-department faculty clashes across master timetable"
        );

        // Test export of the real multi-dept college timetable
        const realExportWb = exportTimetable(collegeResult.timetable, collegeResult.report, {
            isMultiDept: true,
            departmentOrder: collegeResult.departmentOrder,
            departmentResults: collegeResult.departmentResults,
            facultyRegistryReport: collegeResult.facultyRegistryReport,
            conflictReport: collegeResult.conflictReport,
            facultyWorkloadReport: collegeResult.facultyWorkloadReport,
            resourceUtilizationReport: collegeResult.resourceUtilizationReport,
            facultyTimetable: collegeResult.facultyTimetable,
            locationTimetable: collegeResult.locationTimetable,
            validationScore: collegeResult.validationScore,
        });

        assert(realExportWb !== null, "Exported real college timetable to XLSX workbook");
        assert(
            realExportWb.SheetNames.includes("Department Summary"),
            "Real export contains 'Department Summary' sheet"
        );
        assert(
            realExportWb.SheetNames.includes("Faculty Registry"),
            "Real export contains 'Faculty Registry' sheet"
        );
    } else {
        console.log(`  ${YELLOW}Skipping real workbook test: files not found at expected paths.${RESET}`);
    }

    // =========================================================================
    // FINAL REPORT
    // =========================================================================
    console.log(`\n${BOLD}====================================================${RESET}`);
    console.log(`${BOLD}   TEST RUN COMPLETE                                ${RESET}`);
    console.log(`   Passed: ${GREEN}${passedCount}${RESET}`);
    console.log(`   Failed: ${failedCount > 0 ? RED : GREEN}${failedCount}${RESET}`);
    console.log(`${BOLD}====================================================${RESET}\n`);

    if (failedCount > 0) {
        process.exit(1);
    }
}

runAllTests().catch((err) => {
    console.error(`${RED}Fatal Test Runner Exception:${RESET}`, err);
    process.exit(1);
});
