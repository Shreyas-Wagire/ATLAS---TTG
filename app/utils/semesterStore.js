/**
 * semesterStore.js
 * localStorage CRUD for Semester Management System.
 * Each semester is a self-contained workspace with timetable + config snapshot.
 */

const STORAGE_KEY = "atlas_semesters";

function loadAll() {
    if (typeof window === "undefined") return [];
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        return raw ? JSON.parse(raw) : [];
    } catch {
        return [];
    }
}

function saveAll(semesters) {
    if (typeof window === "undefined") return;
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(semesters));
    } catch (e) {
        console.warn("ATLAS: localStorage quota exceeded. Consider archiving old semesters.", e);
    }
}

/** Return all semesters sorted newest first */
export function getAllSemesters() {
    return loadAll().sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

/** Create a new blank semester and return it */
export function createSemester({ name, academicYear, semNumber, department = "" }) {
    const id = `sem_${Date.now()}`;
    const semester = {
        id,
        name,
        academicYear,
        semNumber: Number(semNumber),
        department,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        status: "draft", // draft | active | archived
        // Timetable outputs (populated after generation)
        timetable: null,
        report: null,
        conflictReport: null,
        facultyWorkloadReport: null,
        resourceUtilizationReport: null,
        validationScore: null,
        facultyTimetable: null,
        locationTimetable: null,
        // Config snapshots
        yearWiseData: {},
        globalConstraints: [],
        syncRules: [],
        resources: { classrooms: [], labs: [], tutorialRooms: [] },
        facultyConstraints: [],
    };

    const all = loadAll();
    all.push(semester);
    saveAll(all);
    return semester;
}

/** Load a single semester by ID */
export function getSemester(id) {
    return loadAll().find((s) => s.id === id) || null;
}

/** Save/update a semester's full state (timetable + config) */
export function saveSemester(id, updates) {
    const all = loadAll();
    const idx = all.findIndex((s) => s.id === id);
    if (idx === -1) return;
    all[idx] = {
        ...all[idx],
        ...updates,
        updatedAt: new Date().toISOString(),
        status: updates.timetable ? "active" : all[idx].status,
    };
    saveAll(all);
    return all[idx];
}

/** Archive a semester (read-only) */
export function archiveSemester(id) {
    saveSemester(id, { status: "archived" });
}

/** Update status of a semester (draft | active | archived) */
export function setSemesterStatus(id, status) {
    const all = loadAll();
    const idx = all.findIndex((s) => s.id === id);
    if (idx === -1) return;
    all[idx] = {
        ...all[idx],
        status,
        updatedAt: new Date().toISOString(),
    };
    saveAll(all);
    return all[idx];
}

/** Delete a semester permanently */
export function deleteSemester(id) {
    const all = loadAll().filter((s) => s.id !== id);
    saveAll(all);
}


/** Helper: check if a timetable has actual scheduled session data */
export function hasTimetableData(timetable) {
    if (!timetable || typeof timetable !== "object") return false;
    const keys = Object.keys(timetable);
    if (keys.length === 0) return false;
    return keys.some((k) => {
        const divisionSchedule = timetable[k];
        if (!divisionSchedule || typeof divisionSchedule !== "object") return false;
        return Object.values(divisionSchedule).some(
            (slots) => Array.isArray(slots) && slots.some((cell) => cell !== null && cell !== undefined)
        );
    });
}

/** Helper: inspect timetable to count allocated cells */
function inspectTimetableAllocations(timetable) {
    if (!timetable || typeof timetable !== "object") return { totalFilled: 0, divisions: 0 };
    let totalFilled = 0;
    let divisions = 0;
    Object.values(timetable).forEach((divisionSchedule) => {
        if (!divisionSchedule || typeof divisionSchedule !== "object") return;
        divisions++;
        Object.values(divisionSchedule).forEach((slots) => {
            if (Array.isArray(slots)) {
                slots.forEach((cell) => {
                    if (cell && (cell.subject || cell.courseCode || cell.type || (cell.batchAllocations && cell.batchAllocations.length > 0))) {
                        totalFilled++;
                    }
                });
            }
        });
    });
    return { totalFilled, divisions };
}

/** Get summary stats for dashboard card display */
export function getSemesterStats(semester) {
    if (!semester) {
        return { allocationRate: 0, conflictCount: 0, validationScore: 0, hasData: false };
    }

    const timetable = semester.timetable;
    const report = semester.report;
    const conflictReport = semester.conflictReport;
    const valScore = semester.validationScore;

    const hasData = hasTimetableData(timetable);
    if (!hasData) {
        return { allocationRate: 0, conflictCount: 0, validationScore: 0, hasData: false };
    }

    // 1. Allocation Rate
    let allocationRate = 0;
    if (typeof report?.allocationRate === "number") {
        allocationRate = Math.round(report.allocationRate);
    } else if (report?.totalSessions > 0 && typeof report?.allocatedSessions === "number") {
        allocationRate = Math.round((report.allocatedSessions / report.totalSessions) * 100);
    } else if (report?.summary) {
        const sum = report.summary;
        const req = (sum.lecture?.required || 0) + (sum.tutorial?.required || 0) + (sum.practical?.required || 0);
        const alloc = (sum.lecture?.allocated || 0) + (sum.tutorial?.allocated || 0) + (sum.practical?.allocated || 0);
        if (req > 0) {
            allocationRate = Math.round((alloc / req) * 100);
        }
    } else if (typeof valScore?.breakdown?.allocation?.rate === "number") {
        allocationRate = Math.round(valScore.breakdown.allocation.rate);
    } else {
        const { totalFilled } = inspectTimetableAllocations(timetable);
        if (totalFilled > 0) {
            allocationRate = 100;
        }
    }

    // 2. Conflict Count
    let conflictCount = 0;
    if (typeof conflictReport?.summary?.total === "number") {
        conflictCount = conflictReport.summary.total;
    } else if (Array.isArray(conflictReport?.conflicts)) {
        conflictCount = conflictReport.conflicts.length;
    } else if (Array.isArray(report?.facultyConflicts)) {
        conflictCount = report.facultyConflicts.length;
    }

    // 3. Validation / Quality Score (0 - 100)
    let validationScore = 0;
    if (typeof valScore?.totalScore === "number") {
        validationScore = Math.round(valScore.totalScore);
    } else if (typeof valScore?.overallScore === "number") {
        validationScore = Math.round(valScore.overallScore);
    } else if (typeof valScore === "number") {
        validationScore = Math.round(valScore);
    } else if (hasData) {
        // Derive quality score from allocation completeness and zero conflicts
        const allocPts = Math.round((allocationRate / 100) * 60);
        const conflictPts = conflictCount === 0 ? 20 : Math.max(0, 20 - conflictCount * 4);
        validationScore = Math.min(100, allocPts + conflictPts + 20);
    }

    return { allocationRate, conflictCount, validationScore, hasData };
}
