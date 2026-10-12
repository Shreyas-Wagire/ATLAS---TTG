/**
 * parseMultiDeptWorkbook.js — ATLAS v6.5 Multi-Department Workbook Parser
 *
 * Discovers department sheets from Global-Load.xlsx using the pattern:
 *   DEPT-Load, DEPT-Location, DEPT-Fixed
 * Plus a Global sheet for college-wide fixed sessions.
 *
 * Falls back to single-department mode for legacy workbooks (Load/Fixed/Location).
 *
 * Returns a structured college data object with per-department data and
 * college-wide global constraints.
 */

import { parseLoadSheet, normalizeYearHeader } from "./parseLoadSheet.js";
import { parseLocationSheet } from "./parseLocationSheet.js";
import { parseGlobalConstraints } from "./parseGlobalConstraints.js";
import { parseResourcesSheet, buildResourcesFromLocation } from "./parseResourcesSheet.js";
import { buildYearWiseData } from "./buildYearWiseData.js";
import { parseSyncConstraints, autoDetectSyncConstraints } from "./parseSyncConstraints.js";
import { parseFacultyConstraints } from "./parseFacultyConstraints.js";

// ── Sheet Name Patterns ──────────────────────────────────────────────────────

const LOAD_SUFFIX     = "-LOAD";
const LOCATION_SUFFIX = "-LOCATION";
const FIXED_SUFFIX    = "-FIXED";
const GLOBAL_SHEET    = "GLOBAL";

/**
 * Check if a sheet name matches the multi-dept naming convention.
 * Returns { deptCode, sheetType } or null.
 */
export function parseDeptSheetName(sheetName) {
    if (!sheetName || typeof sheetName !== "string") return null;
    const trimmed = sheetName.trim().toUpperCase();

    if (trimmed.endsWith(LOAD_SUFFIX)) {
        return { deptCode: trimmed.slice(0, -LOAD_SUFFIX.length), sheetType: "Load" };
    }
    if (trimmed.endsWith(LOCATION_SUFFIX)) {
        return { deptCode: trimmed.slice(0, -LOCATION_SUFFIX.length), sheetType: "Location" };
    }
    if (trimmed.endsWith(FIXED_SUFFIX)) {
        return { deptCode: trimmed.slice(0, -FIXED_SUFFIX.length), sheetType: "Fixed" };
    }
    return null;
}

/**
 * Detect whether a workbook is multi-department format.
 * Returns true if at least one sheet matches the DEPT-Load pattern.
 */
export function isMultiDeptWorkbook(sheetNames) {
    if (!sheetNames || !Array.isArray(sheetNames)) return false;
    return sheetNames.some((name) => {
        const parsed = parseDeptSheetName(name);
        return parsed && parsed.sheetType === "Load";
    });
}

/**
 * Discover all departments from sheet names.
 * Returns an array of unique department codes found.
 */
export function discoverDepartments(sheetNames) {
    const deptSet = new Set();
    (sheetNames || []).forEach((name) => {
        const parsed = parseDeptSheetName(name);
        if (parsed) {
            deptSet.add(parsed.deptCode);
        }
    });
    return Array.from(deptSet).sort();
}

// ── Validation Helpers ───────────────────────────────────────────────────────

/**
 * Validate a single department's data for common issues.
 * Returns an array of diagnostic messages.
 */
export function validateDepartmentData(deptCode, subjects, fixedConstraints, locationData) {
    const diagnostics = [];

    // Check for empty load sheet
    if (!subjects || subjects.length === 0) {
        diagnostics.push({
            level: "ERROR",
            dept: deptCode,
            message: `${deptCode}-Load sheet is empty or could not be parsed. No courses found.`,
        });
        return diagnostics;
    }

    // Check for duplicate course names within same year
    const courseYearMap = {};
    subjects.forEach((subj) => {
        const key = `${subj.year}::${(subj.courseName || "").toLowerCase().trim()}`;
        if (!courseYearMap[key]) courseYearMap[key] = [];
        courseYearMap[key].push(subj);
    });
    Object.entries(courseYearMap).forEach(([key, entries]) => {
        if (entries.length > 1) {
            diagnostics.push({
                level: "WARNING",
                dept: deptCode,
                message: `Duplicate course "${entries[0].courseName}" found ${entries.length} times in year ${entries[0].year} of ${deptCode}-Load.`,
            });
        }
    });

    // Every listed course belongs to the divisions named in its year header.
    // Empty faculty cells in those divisions are incomplete assignments;
    // divisions omitted from the header are not expected to take that course.
    subjects.forEach((subj) => {
        if ((Number(subj.L) || 0) + (Number(subj.T) || 0) <= 0) return;
        const expectedDivisions = subj.divisionApplicability?.length ? subj.divisionApplicability : ["A", "B", "C"];
        const missingDivisions = expectedDivisions.filter((division) => {
            if (subj.unavailableDivisions?.includes(division)) return false;
            const faculty = String(subj.divisions?.[division] || "").trim().toUpperCase();
            // N/A explicitly means that this division does not take this course.
            // Empty cells remain incomplete; other placeholders still need review.
            if (faculty === "N/A") return false;
            return !faculty || [".", "-", "NA", "TBD"].includes(faculty);
        });
        if (missingDivisions.length) {
            diagnostics.push({
                level: "WARNING",
                dept: deptCode,
                message: `Course "${subj.courseName}" (${subj.year}) has no faculty assigned for division${missingDivisions.length > 1 ? "s" : ""} ${missingDivisions.join(", ")}.`,
            });
        }
    });

    // Validate fixed constraints have valid day/time
    const validDays = new Set(["MON", "MONDAY", "TUE", "TUESDAY", "WED", "WEDNESDAY", "THU", "THURSDAY", "FRI", "FRIDAY"]);
    (fixedConstraints || []).forEach((constraint, idx) => {
        if (constraint.day) {
            const days = constraint.day.split(/[-,\s]+/).map((d) => d.trim().toUpperCase()).filter(Boolean);
            days.forEach((d) => {
                if (!validDays.has(d)) {
                    diagnostics.push({
                        level: "ERROR",
                        dept: deptCode,
                        message: `Fixed constraint #${idx + 1} ("${constraint.courseName}") has invalid day "${d}".`,
                    });
                }
            });
        }
        if (constraint.time) {
            const validTimes = ["9:15", "10:15", "11:30", "12:30", "2:15", "3:15", "11:15", "1:30", "4:15"];
            const timeStr = String(constraint.time).replace(/\s+/g, "").replace(/\./g, ":");
            const hasValidTime = validTimes.some((vt) => timeStr.includes(vt));
            if (!hasValidTime) {
                diagnostics.push({
                    level: "WARNING",
                    dept: deptCode,
                    message: `Fixed constraint #${idx + 1} ("${constraint.courseName}") has unrecognized time "${constraint.time}".`,
                });
            }
        }
    });

    // Validate location data
    if (locationData) {
        if (locationData.parseWarnings) {
            locationData.parseWarnings.forEach((w) => {
                diagnostics.push({
                    level: "WARNING",
                    dept: deptCode,
                    message: `Location: ${w}`,
                });
            });
        }
    }

    return diagnostics;
}

/**
 * Check for cross-department conflicts in fixed/global constraints.
 * Returns an array of conflict diagnostics.
 */
export function detectFixedConflicts(collegeData) {
    const diagnostics = [];
    if (!collegeData || !collegeData.departments) return diagnostics;

    // Build a map of all fixed reservations: key = "day::slot::resource" → [dept, constraint]
    const reservationMap = {};

    const addReservation = (dept, constraint, day, slot, resourceKey) => {
        const key = `${day}::${slot}::${resourceKey}`;
        if (!reservationMap[key]) reservationMap[key] = [];
        reservationMap[key].push({ dept, constraint });
    };

    // Process department fixed constraints
    Object.entries(collegeData.departments).forEach(([deptCode, deptData]) => {
        (deptData.fixedConstraints || []).forEach((constraint) => {
            if (!constraint.day || !constraint.time) return;
            const days = constraint.day.split(/[-,\s]+/).map((d) => d.trim().toUpperCase()).filter(Boolean);
            days.forEach((day) => {
                // For faculty-level conflict detection
                ["A", "B", "C"].forEach((div) => {
                    const faculty = constraint.divisions?.[div];
                    if (faculty && String(faculty).trim()) {
                        addReservation(deptCode, constraint, day, constraint.time, `FACULTY:${String(faculty).trim()}`);
                    }
                });
            });
        });
    });

    // Process global constraints
    (collegeData.globalConstraints || []).forEach((constraint) => {
        if (!constraint.day || !constraint.time) return;
        const days = constraint.day.split(/[-,\s]+/).map((d) => d.trim().toUpperCase()).filter(Boolean);
        days.forEach((day) => {
            ["A", "B", "C"].forEach((div) => {
                const faculty = constraint.divisions?.[div];
                if (faculty && String(faculty).trim()) {
                    addReservation("GLOBAL", constraint, day, constraint.time, `FACULTY:${String(faculty).trim()}`);
                }
            });
        });
    });

    // Detect overlaps
    Object.entries(reservationMap).forEach(([key, entries]) => {
        if (entries.length > 1) {
            const depts = entries.map((e) => e.dept);
            const uniqueDepts = [...new Set(depts)];
            if (uniqueDepts.length > 1 || entries.some((e) => e.dept === "GLOBAL")) {
                const parts = key.split("::");
                diagnostics.push({
                    level: "ERROR",
                    message: `Fixed/Global reservation conflict at ${parts[0]} ${parts[2]}: ` +
                        entries.map((e) => `${e.dept}:"${e.constraint.courseName}"`).join(" vs "),
                });
            }
        }
    });

    return diagnostics;
}

// ── Main Multi-Department Parser ─────────────────────────────────────────────

/**
 * Parse a multi-department workbook into structured college data.
 *
 * @param {Object} allSheets - Map of sheet names → 2D row arrays from XLSX
 * @param {string[]} sheetNames - Ordered sheet names from workbook
 * @returns {Object} College data structure:
 * {
 *   isMultiDept: boolean,
 *   departments: {
 *     [deptCode]: {
 *       deptCode: string,
 *       subjects: Array,           // from parseLoadSheet
 *       yearWiseData: Object,      // from buildYearWiseData
 *       locationData: Object,      // from parseLocationSheet
 *       resources: Object,         // from buildResourcesFromLocation
 *       fixedConstraints: Array,   // from parseGlobalConstraints (dept-scoped)
 *       syncRules: Array,          // from parseSyncConstraints + autoDetect
 *       diagnostics: Array,        // validation diagnostics
 *     }
 *   },
 *   departmentOrder: string[],     // ordered list of dept codes
 *   globalConstraints: Array,      // from Global sheet
 *   globalDiagnostics: Array,      // cross-dept validation issues
 *   allSubjects: Array,            // flattened list of all subjects across depts
 * }
 */
export function parseMultiDeptWorkbook(allSheets, sheetNames) {
    const result = {
        isMultiDept: false,
        departments: {},
        departmentOrder: [],
        globalConstraints: [],
        globalDiagnostics: [],
        allSubjects: [],
    };

    const isMultiDept = isMultiDeptWorkbook(sheetNames);
    result.isMultiDept = isMultiDept;

    if (!isMultiDept) {
        // ── LEGACY SINGLE-DEPARTMENT MODE ────────────────────────────────────
        // Fall back to existing single-dept parsing for backwards compatibility
        const deptCode = "DEPT";
        result.departmentOrder = [deptCode];

        const loadSheetKey = sheetNames.find((n) => /^load|^sheet1/i.test(n)) || sheetNames[0];
        const fixSheetKey = sheetNames.find((n) => /^fix|^global/i.test(n)) || sheetNames[1];
        const locationSheetKey = sheetNames.find((n) => /^location|^resource|^sheet2/i.test(n)) || sheetNames[2];

        const loadSheet = allSheets[loadSheetKey] || allSheets[sheetNames[0]] || [];
        const fixedSheet = allSheets[fixSheetKey] || allSheets[sheetNames[1]] || [];
        const locationSheet = allSheets[locationSheetKey] || allSheets[sheetNames[2]] || [];

        const subjects = parseLoadSheet(loadSheet);
        const yearWiseData = buildYearWiseData(subjects);
        const locationData = parseLocationSheet(locationSheet);
        const legacyResources = parseResourcesSheet(locationSheet);
        const resources = buildResourcesFromLocation(legacyResources, locationData);
        const fixedConstraints = parseGlobalConstraints(fixedSheet);

        const syncSheetKey = sheetNames.find((n) => /^sync/i.test(n)) || sheetNames[3];
        const syncSheet = allSheets[syncSheetKey] || [];
        const parsedSync = parseSyncConstraints(syncSheet);
        const autoSync = autoDetectSyncConstraints(subjects);
        const syncRules = [...parsedSync, ...autoSync];

        const diagnostics = validateDepartmentData(deptCode, subjects, fixedConstraints, locationData);

        result.departments[deptCode] = {
            deptCode,
            subjects,
            yearWiseData,
            locationData,
            resources,
            fixedConstraints,
            syncRules,
            diagnostics,
        };

        result.globalConstraints = fixedConstraints;
        result.allSubjects = subjects;

        return result;
    }

    // ── MULTI-DEPARTMENT MODE ────────────────────────────────────────────────

    // Discover departments
    const deptCodes = discoverDepartments(sheetNames);
    result.departmentOrder = deptCodes;

    if (deptCodes.length === 0) {
        result.globalDiagnostics.push({
            level: "ERROR",
            message: "No department sheets found. Expected pattern: DEPT-Load, DEPT-Location, DEPT-Fixed.",
        });
        return result;
    }

    // Parse Global sheet (college-wide fixed constraints)
    const globalSheetKey = sheetNames.find(
        (n) => n.trim().toLowerCase() === GLOBAL_SHEET.toLowerCase()
    );
    if (globalSheetKey && allSheets[globalSheetKey]) {
        result.globalConstraints = parseGlobalConstraints(allSheets[globalSheetKey]);
    } else {
        result.globalDiagnostics.push({
            level: "INFO",
            message: `No "${GLOBAL_SHEET}" sheet found. College-wide fixed sessions will not be applied.`,
        });
    }

    // Parse each department
    deptCodes.forEach((deptCode) => {
        const loadKey = `${deptCode}${LOAD_SUFFIX}`;
        const locationKey = `${deptCode}${LOCATION_SUFFIX}`;
        const fixedKey = `${deptCode}${FIXED_SUFFIX}`;

        const loadSheet = allSheets[loadKey] || [];
        const locationSheet = allSheets[locationKey] || [];
        const fixedSheet = allSheets[fixedKey] || [];

        // Check for missing sheets
        const deptDiagnostics = [];
        if (!allSheets[loadKey]) {
            deptDiagnostics.push({
                level: "ERROR",
                dept: deptCode,
                message: `Missing required sheet "${loadKey}". Department ${deptCode} has no course load data.`,
            });
        }
        if (!allSheets[locationKey]) {
            deptDiagnostics.push({
                level: "WARNING",
                dept: deptCode,
                message: `Missing sheet "${locationKey}". Lab/room data will use defaults.`,
            });
        }
        if (!allSheets[fixedKey]) {
            deptDiagnostics.push({
                level: "INFO",
                dept: deptCode,
                message: `No "${fixedKey}" sheet found. Department will have no fixed sessions.`,
            });
        }

        // Parse department data
        const subjects = parseLoadSheet(loadSheet);
        const yearWiseData = buildYearWiseData(subjects);
        const locationData = parseLocationSheet(locationSheet);
        const legacyResources = parseResourcesSheet(locationSheet);
        const resources = buildResourcesFromLocation(legacyResources, locationData);
        const fixedConstraints = parseGlobalConstraints(fixedSheet);

        // Auto-detect sync constraints from course names
        const autoSync = autoDetectSyncConstraints(subjects);

        // Validate department data
        const validationDiags = validateDepartmentData(deptCode, subjects, fixedConstraints, locationData);

        // Tag all subjects with department
        subjects.forEach((s) => { s.department = deptCode; });

        result.departments[deptCode] = {
            deptCode,
            subjects,
            yearWiseData,
            locationData,
            resources,
            fixedConstraints,
            syncRules: autoSync,
            diagnostics: [...deptDiagnostics, ...validationDiags],
        };

        result.allSubjects.push(...subjects);
    });

    // Cross-department validation
    const crossDeptDiags = detectFixedConflicts(result);
    result.globalDiagnostics.push(...crossDeptDiags);

    return result;
}

/**
 * Build a merged resources object from all departments.
 * Classrooms and tutorial rooms are shared college-wide.
 * Labs are union of all dept labs (with dept ownership tracking).
 *
 * @param {Object} collegeData - from parseMultiDeptWorkbook
 * @returns {Object} Merged resources with dept ownership
 */
export function buildCollegeResources(collegeData) {
    const allClassrooms = new Set();
    const allLabs = new Set();
    const allTutorialRooms = new Set();
    const labOwnership = {};  // labInitial → [deptCode, ...]
    const allLocationData = {};

    Object.entries(collegeData.departments).forEach(([deptCode, deptData]) => {
        const res = deptData.resources || {};
        (res.classrooms || []).forEach((c) => allClassrooms.add(c));
        (res.labs || []).forEach((l) => {
            allLabs.add(l);
            if (!labOwnership[l]) labOwnership[l] = [];
            if (!labOwnership[l].includes(deptCode)) labOwnership[l].push(deptCode);
        });
        (res.tutorialRooms || []).forEach((t) => allTutorialRooms.add(t));

        if (deptData.locationData) {
            allLocationData[deptCode] = deptData.locationData;
        }
    });

    return {
        classrooms: Array.from(allClassrooms),
        labs: Array.from(allLabs),
        tutorialRooms: Array.from(allTutorialRooms),
        labOwnership,
        allLocationData,
        // Merged locationData for the college (combine all labs)
        locationData: _mergeLocationData(allLocationData),
    };
}

/**
 * Merge location data from multiple departments into one unified view.
 */
function _mergeLocationData(allLocationData) {
    const merged = {
        labs: [],
        classrooms: [],
        tutorialRooms: [],
        courseToLabInitial: {},
        labsByInitial: {},
        allLabInitials: [],
        parseWarnings: [],
    };

    const seenLabInitials = new Set();
    const seenClassrooms = new Set();
    const seenTutRooms = new Set();

    Object.entries(allLocationData).forEach(([deptCode, locData]) => {
        if (!locData) return;

        (locData.labs || []).forEach((lab) => {
            const key = lab.labInitial.toUpperCase().trim();
            if (!seenLabInitials.has(key)) {
                seenLabInitials.add(key);
                merged.labs.push({ ...lab, department: deptCode });
                merged.labsByInitial[key] = lab;
                merged.allLabInitials.push(lab.labInitial);
            }
        });

        (locData.classrooms || []).forEach((cr) => {
            if (!seenClassrooms.has(cr)) {
                seenClassrooms.add(cr);
                merged.classrooms.push(cr);
            }
        });

        (locData.tutorialRooms || []).forEach((tr) => {
            if (!seenTutRooms.has(tr)) {
                seenTutRooms.add(tr);
                merged.tutorialRooms.push(tr);
            }
        });

        // Merge course-to-lab mappings (prefix with dept to avoid collision)
        Object.entries(locData.courseToLabInitial || {}).forEach(([course, labInitial]) => {
            merged.courseToLabInitial[course] = labInitial;
            // Also store dept-qualified version
            merged.courseToLabInitial[`${deptCode}::${course}`] = labInitial;
        });
    });

    return merged;
}
