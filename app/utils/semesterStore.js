/**
 * semesterStore.js
 * localStorage CRUD for Semester Management System.
 * Each semester is a self-contained workspace with timetable + config snapshot.
 */

const STORAGE_KEY = "atlas_semesters";

let isMigrationDone = false;

function loadAll() {
    if (typeof window === "undefined") return [];
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return [];
        const parsed = JSON.parse(raw);
        if (!isMigrationDone && Array.isArray(parsed)) {
            isMigrationDone = true;
            // Check if any existing semester still holds heavy uncompacted grids
            const hasHeavyData = parsed.some(
                (s) => s && (s.facultyTimetable || s.locationTimetable || s.batchTimetable || s.resourceResolutionPreview)
            );
            if (hasHeavyData) {
                setTimeout(() => {
                    saveAll(parsed);
                }, 0);
            }
        }
        return parsed;
    } catch {
        return [];
    }
}

/**
 * Strips redundant derived grids, heavy debug dumps, and deep diagnostic objects
 * to reduce localStorage footprint by ~85-95% while keeping all essential data.
 */
function compactSemesterForStorage(semester) {
    if (!semester || typeof semester !== "object") return semester;

    // Compact timetable cells if present
    let compactedTimetable = semester.timetable;
    if (compactedTimetable && typeof compactedTimetable === "object") {
        compactedTimetable = {};
        Object.entries(semester.timetable).forEach(([divKey, dayMap]) => {
            compactedTimetable[divKey] = {};
            if (dayMap && typeof dayMap === "object") {
                Object.entries(dayMap).forEach(([day, slots]) => {
                    compactedTimetable[divKey][day] = (slots || []).map((cell) => {
                        if (!cell) return null;
                        const cleanCell = { ...cell };
                        delete cleanCell.diagnosticReason;
                        delete cleanCell.rejectionReasons;
                        if (Array.isArray(cleanCell.batchAllocations)) {
                            cleanCell.batchAllocations = cleanCell.batchAllocations.map((alloc) => {
                                if (!alloc) return alloc;
                                const cleanAlloc = { ...alloc };
                                if (cleanAlloc.labResolution) {
                                    cleanAlloc.labResolution = {
                                        primaryLab: cleanAlloc.labResolution.primaryLab,
                                        assignedLab: cleanAlloc.labResolution.assignedLab,
                                        status: cleanAlloc.labResolution.status,
                                    };
                                }
                                return cleanAlloc;
                            });
                        }
                        return cleanCell;
                    });
                });
            }
        });
    }

    const compactMissing = (arr = []) => (arr || []).slice(0, 20).map((s) => ({
        subject: s.subject || s.subjectName,
        year: s.year,
        division: s.division,
        batch: s.batch,
        faculty: s.faculty,
        type: s.type,
        diagnosticReason: s.diagnosticReason || (s.rejectionReasons && s.rejectionReasons[0]),
    }));

    return {
        ...semester,
        scheduleVersions: (semester.scheduleVersions || []).slice(-3),
        auditTrail: (semester.auditTrail || []).slice(-30),
        configuredDepartments: semester.configuredDepartments || [],
        reviewedDepartments: semester.reviewedDepartments || [],
        timetable: compactedTimetable,
        // Pre-compute cachedStats for fast dashboard card rendering
        cachedStats: getSemesterStats(semester),
        // Exclude redundant derived grids (they are easily re-derived from timetable on load)
        facultyTimetable: null,
        locationTimetable: null,
        batchTimetable: null,
        resourceResolutionPreview: null,
        // Keep essential report summaries
        report: semester.report ? {
            totalSessions: semester.report.totalSessions,
            allocatedSessions: semester.report.allocatedSessions,
            allocationRate: semester.report.allocationRate,
            unallocatedCount: semester.report.unallocatedCount,
            summary: semester.report.summary,
            missingLectures: compactMissing(semester.report.missingLectures),
            missingTutorials: compactMissing(semester.report.missingTutorials),
            missingPracticals: compactMissing(semester.report.missingPracticals),
        } : null,
        conflictReport: semester.conflictReport ? {
            summary: semester.conflictReport.summary,
            totalClashes: semester.conflictReport.totalClashes,
            conflicts: (semester.conflictReport.conflicts || []).slice(0, 30),
        } : null,
        facultyWorkloadReport: semester.facultyWorkloadReport && typeof semester.facultyWorkloadReport === "object"
            ? Object.fromEntries(
                Object.entries(semester.facultyWorkloadReport).map(([k, v]) => [
                    k,
                    {
                        faculty: v.faculty || k,
                        lectures: v.lectures || 0,
                        tutorials: v.tutorials || 0,
                        practicals: v.practicals || 0,
                        totalHours: v.totalHours || 0,
                        status: v.status || ((v.totalHours || 0) > 18 ? "HEAVY LOAD" : "OPTIMAL"),
                    }
                ])
            )
            : null,
        resourceUtilizationReport: semester.resourceUtilizationReport ? {
            summary: semester.resourceUtilizationReport.summary,
            resources: (semester.resourceUtilizationReport.resources || []).map((r) => ({
                name: r.name,
                type: r.type,
                usedSlots: r.usedSlots,
                totalSlots: r.totalSlots,
                utilizationRate: r.utilizationRate,
                status: r.status,
            })),
        } : null,
        optimizationReport: semester.optimizationReport ? {
            initialScore: semester.optimizationReport.initialScore,
            finalScore: semester.optimizationReport.finalScore,
        } : null,
    };
}

function saveAll(semesters) {
    if (typeof window === "undefined") return;
    const compacted = (semesters || []).map(compactSemesterForStorage);

    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(compacted));
        return;
    } catch (e) {
        console.warn("ATLAS: localStorage quota warning, initiating automatic storage recovery...", e);
    }

    // Tier 1: For older or non-active semesters, preserve cachedStats and metadata, release heavy timetable
    try {
        const tier1 = compacted.map((s, idx) => {
            if (idx === 0 || s.status === "active") return s;
            return {
                ...s,
                timetable: null,
                yearWiseData: null,
                cachedStats: getSemesterStats(s),
            };
        });
        localStorage.setItem(STORAGE_KEY, JSON.stringify(tier1));
        console.info("ATLAS: Successfully recovered localStorage quota via Tier 1 compaction.");
        return;
    } catch (e1) {
        console.warn("ATLAS: Tier 1 recovery failed, attempting Tier 2...", e1);
    }

    // Tier 2: Retain only the 3 most recently updated semesters
    try {
        const tier2 = compacted.slice(0, 3);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(tier2));
        console.info("ATLAS: Successfully recovered localStorage quota via Tier 2 compaction.");
        return;
    } catch (e2) {
        console.warn("ATLAS: Tier 2 recovery failed, attempting Tier 3...", e2);
    }

    // Tier 3: Retain only the active / newest semester
    try {
        const tier3 = compacted.slice(0, 1);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(tier3));
        console.info("ATLAS: Successfully recovered localStorage quota via Tier 3 compaction.");
        return;
    } catch (e3) {
        console.warn("ATLAS: Tier 3 recovery failed, attempting Tier 4 ultra-compact...", e3);
    }

    // Tier 4: Ultra-compact newest semester (timetable + cachedStats only)
    try {
        const newest = compacted[0];
        if (newest) {
            const ultra = [{
                id: newest.id,
                name: newest.name,
                academicYear: newest.academicYear,
                semNumber: newest.semNumber,
                department: newest.department,
                createdAt: newest.createdAt,
                updatedAt: newest.updatedAt,
                status: newest.status,
                timetable: newest.timetable,
                cachedStats: getSemesterStats(newest),
            }];
            localStorage.setItem(STORAGE_KEY, JSON.stringify(ultra));
            console.info("ATLAS: Successfully recovered localStorage quota via Tier 4 ultra-compaction.");
        }
    } catch (e4) {
        console.error("ATLAS: Fatal storage quota failure. Could not persist semester.", e4);
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
        collegeData: null,
        isMultiDept: false,
        departmentOrder: [],
        departmentResults: {},
        subjects: [],
        uploadValidation: [],
        uploadedFileName: "",
        scheduleVersions: [],
        auditTrail: [],
        configuredDepartments: [],
        reviewedDepartments: [],
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
    if (semester.cachedStats) {
        return semester.cachedStats;
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
