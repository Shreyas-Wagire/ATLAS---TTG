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


/** Get summary stats for dashboard card display */
export function getSemesterStats(semester) {
    const report = semester.report;
    const conflictReport = semester.conflictReport;
    const allocationRate = report?.totalSessions > 0
        ? Math.round((report.allocatedSessions / report.totalSessions) * 100)
        : 0;
    const conflictCount = conflictReport?.conflicts?.length || 0;
    const validationScore = semester.validationScore?.overallScore || 0;
    const hasData = !!semester.timetable;
    return { allocationRate, conflictCount, validationScore, hasData };
}
