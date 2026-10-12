/**
 * generateCollegeTimetable.js — ATLAS v6.5 Multi-Department College-Wide Timetable Generator
 *
 * Orchestrates independent per-department scheduling pipelines, all coordinated
 * through one shared CollegeOccupancy instance.
 *
 * Scheduling Order (per the specification):
 *   1. Validate workbook and identities
 *   2. Reserve college-wide Global and department Fixed sessions
 *   3. Prioritize constrained practicals; preserve 4→3→2→1 batch packing
 *   4. Allocate synchronized sessions
 *   5. Allocate tutorials
 *   6. Allocate lectures
 *   7. Run college-wide conflict validation and bounded CASC repair
 *   8. Optimize soft constraints and run independent final validation
 *
 * Each department runs its own complete scheduling pipeline (parsing, session
 * generation, resource mapping, allocation, diagnostics, validation).
 * Never skip a department, copy another department's timetable, or reuse
 * another department's generated result.
 */

import { createEmptyTimetable } from "./createEmptyTimetable.js";
import { generateSessionPool } from "./generateSessionPool.js";
import { applyFixedConstraints } from "./applyFixedConstraints.js";
import { allocateSessions } from "./allocateSessions.js";
import { allocateResources } from "./allocateResources.js";
import { applyConstraintCounts } from "./applyConstraintCounts.js";
import { validateTimetable } from "./validateTimetable.js";
import { generateConflictReport } from "./generateConflictReport.js";
import { generateFacultyWorkloadReport } from "./generateFacultyWorkloadReport.js";
import { generateResourceUtilizationReport } from "./generateResourceUtilizationReport.js";
import { generateBatchTimetable } from "./generateBatchTimetable.js";
import { generateFacultyTimetable } from "./generateFacultyTimetable.js";
import { generateLocationTimetable } from "./generateLocationTimetable.js";
import { computeValidationScore } from "./computeValidationScore.js";
import { optimizeTimetable } from "./optimizeTimetable.js";
import { prioritizeSessionPool, reprioritizeUnallocated, generateDAPSReport } from "./daps.js";
import { generateRCAAReport } from "./rcaa.js";
import { attemptCascadePlacement, generateCASCReport } from "./casc.js";
import { CollegeOccupancy } from "./collegeOccupancy.js";
import { analyzeUnallocatedSession } from "./allocateSessions.js";
import { checkLectureDistribution } from "./checkLectureDistribution.js";
import { checkSubjectConstraint } from "./checkSubjectConstraint.js";
import { buildCourseLabResolutions, generateResourceResolutionPreview } from "./courseLabResolver.js";
import { isFacultyBlockedByAvailability } from "./parseFacultyConstraints.js";
import { parseFacultyConstraints } from "./parseFacultyConstraints.js";
import { buildFacultyRegistry } from "./facultyRegistry.js";
import { buildCollegeResources } from "./parseMultiDeptWorkbook.js";

// ── Constants ────────────────────────────────────────────────────────────────

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
const SLOTS_PER_DAY = 6;
const MAX_REPAIR_PASSES = 12;

/**
 * Generate a college-wide timetable from multi-department data.
 *
 * @param {Object} collegeData - from parseMultiDeptWorkbook
 * @param {Object} options - generation options
 * @param {number} options.maxTrials - max trial attempts (default 30)
 * @param {Object} options.facultyConstraints - raw faculty availability constraints
 * @param {Object} options.sharedFacultyMap - explicit shared faculty mapping
 * @param {Function} options.onProgress - progress callback (dept, stage, pct)
 * @returns {Object} college timetable result
 */
export function generateCollegeTimetable(collegeData, options = {}) {
    const {
        maxTrials = 30,
        facultyConstraints = [],
        sharedFacultyMap = {},
        onProgress = null,
    } = options;

    const startTime = Date.now();
    const progress = (dept, stage, pct) => {
        if (onProgress) {
            try { onProgress(dept, stage, pct); } catch (e) { /* ignore */ }
        }
    };

    // ── Step 0: Build faculty registry ────────────────────────────────────
    progress("COLLEGE", "Building faculty registry", 0);
    const facultyRegistry = buildFacultyRegistry(collegeData, sharedFacultyMap);

    // Rewrite all dept faculty references to canonical IDs
    Object.entries(collegeData.departments).forEach(([deptCode, deptData]) => {
        facultyRegistry.rewriteDepartmentFaculty(deptData, deptCode);
    });

    // ── Step 1: Build college-wide resources ──────────────────────────────
    progress("COLLEGE", "Building college resources", 5);
    const collegeResources = buildCollegeResources(collegeData);

    // Parse faculty availability
    const facultyAvailability = parseFacultyConstraints(facultyConstraints);

    // ── Step 2: Build per-department course-lab resolutions ───────────────
    progress("COLLEGE", "Resolving course-lab mappings", 10);
    const deptLabResolutions = {};
    const deptResolutionPreviews = {};

    Object.entries(collegeData.departments).forEach(([deptCode, deptData]) => {
        const locData = deptData.locationData || null;
        if (locData && deptData.subjects && deptData.subjects.length > 0) {
            const resolveResult = buildCourseLabResolutions(deptData.subjects, locData);
            deptLabResolutions[deptCode] = resolveResult.resolutions;
            deptResolutionPreviews[deptCode] = generateResourceResolutionPreview(
                deptData.subjects,
                resolveResult.resolutions,
                resolveResult.mappedButNotInLoad
            );
        } else {
            deptLabResolutions[deptCode] = {};
            deptResolutionPreviews[deptCode] = [];
        }
    });

    // ── Step 3: Multi-trial generation loop ──────────────────────────────
    let bestResult = null;
    let bestPenalty = Infinity;

    for (let trial = 1; trial <= maxTrials; trial++) {
        progress("COLLEGE", `Trial ${trial}/${maxTrials}`, 15 + (trial / maxTrials) * 70);

        const trialResult = _runSingleTrial(
            collegeData,
            collegeResources,
            deptLabResolutions,
            facultyAvailability,
            facultyRegistry,
            trial,
        );

        if (trialResult.penalty < bestPenalty) {
            bestPenalty = trialResult.penalty;
            bestResult = trialResult;
        }

        if (trialResult.penalty === 0) {
            console.log(`✓ Perfect college timetable found on Trial #${trial}!`);
            break;
        }
    }

    // ── Step 4: Post-generation optimization ─────────────────────────────
    progress("COLLEGE", "Optimizing timetable", 90);
    const baselineTimetable = JSON.parse(JSON.stringify(bestResult.masterTimetable));
    const baselineOptimizationCheck = { timetable: baselineTimetable, optimizationReport: null };
    const optimizedResult = optimizeTimetable(JSON.parse(JSON.stringify(bestResult.masterTimetable)));
    let optimizedTimetable = optimizedResult.timetable;
    let optimizationReport = optimizedResult.optimizationReport;

    // ── Step 5: Generate reports ──────────────────────────────────────────
    progress("COLLEGE", "Generating reports", 95);

    const allSessionPools = bestResult.departmentSessionPools;
    const mergedSessionPool = Object.values(allSessionPools).flat();

    // Optimization can move cells after the trial's validation. Reassign
    // resources and rebuild diagnostics from both candidates; keep the
    // optimized version only when it preserves all hard constraints.
    allocateResources(baselineOptimizationCheck.timetable, collegeResources);
    const baselineReport = validateTimetable(baselineOptimizationCheck.timetable, mergedSessionPool, collegeResources);
    const baselineConflictReport = generateConflictReport(baselineOptimizationCheck.timetable, mergedSessionPool, [
        ...(collegeData.globalConstraints || []),
        ...Object.values(collegeData.departments).flatMap((d) => d.fixedConstraints || []),
    ]);
    allocateResources(optimizedTimetable, collegeResources);
    const optimizedReport = validateTimetable(optimizedTimetable, mergedSessionPool, collegeResources);
    const optimizedConflictReport = generateConflictReport(optimizedTimetable, mergedSessionPool, [
        ...(collegeData.globalConstraints || []),
        ...Object.values(collegeData.departments).flatMap((d) => d.fixedConstraints || []),
    ]);
    const hardConstraintScore = (report, conflicts) => {
        const summary = conflicts?.summary || {};
        return ((report?.unallocatedSessions || 0) * 1_000_000)
            + ((report?.resourceShortages || []).length * 100_000)
            + ((summary.BATCH_SESSION_OVERLAP || 0) * 1_000_000)
            + ((summary.FIXED_CONSTRAINT_VIOLATION || 0) * 1_000_000)
            + ((summary.FACULTY_CLASH || 0) * 100_000)
            + ((summary.ROOM_CLASH || 0) * 100_000)
            + ((summary.LAB_CLASH || 0) * 100_000)
            + ((summary.TUTORIAL_ROOM_CLASH || 0) * 100_000)
            + ((summary.PRACTICAL_BREAK_VIOLATION || 0) * 100_000)
            + ((summary.PRACTICAL_FACULTY_DUPLICATE_BATCH || 0) * 100_000)
            + ((summary.SAME_COURSE_DUPLICATE_LECTURE_PER_DAY || 0) * 50_000);
    };
    const useBaseline = hardConstraintScore(optimizedReport, optimizedConflictReport)
        > hardConstraintScore(baselineReport, baselineConflictReport);
    const finalTimetable = useBaseline ? baselineOptimizationCheck.timetable : optimizedTimetable;
    const finalReport = useBaseline ? baselineReport : optimizedReport;
    const finalConflictReport = useBaseline ? baselineConflictReport : optimizedConflictReport;
    if (useBaseline) {
        optimizationReport = {
            ...(optimizationReport || {}),
            safetyFallback: true,
            safetyFallbackReason: "Soft optimization introduced hard timetable conflicts; the validated schedule was kept.",
        };
    }

    const facultyWorkloadReport = generateFacultyWorkloadReport(finalTimetable, mergedSessionPool);
    const resourceUtilizationReport = generateResourceUtilizationReport(finalTimetable, collegeResources);
    const batchTimetable = generateBatchTimetable(finalTimetable);
    const facultyTimetable = generateFacultyTimetable(finalTimetable);
    const locationTimetable = generateLocationTimetable(finalTimetable);
    const validationScore = computeValidationScore(finalReport, finalConflictReport);

    // Algorithm diagnostics
    const rcaaReport = generateRCAAReport(finalTimetable, collegeResources);
    const dapsReport = generateDAPSReport(bestResult.dapsDiagnostics);
    const cascReport = generateCASCReport(bestResult.cascResults || []);

    // Faculty registry report
    const facultyRegistryReport = facultyRegistry.generateReport();

    // ── Step 6: Attach unallocated reasons ────────────────────────────────
    if (finalReport) {
        const tempOccupancy = new CollegeOccupancy(finalTimetable, collegeResources, facultyAvailability);
        const allMissing = [
            ...(finalReport.missingLectures || []),
            ...(finalReport.missingTutorials || []),
            ...(finalReport.missingPracticals || []),
        ];
        allMissing.forEach((s) => {
            const reasons = analyzeUnallocatedSession(s, finalTimetable, tempOccupancy);
            s.rejectionReasons = reasons;
            const divKey = s._deptDivKey || `${s.year}-${s.division}`;
            const divOccupied = Object.values(finalTimetable[divKey] || {}).reduce(
                (acc, row) => acc + (row || []).filter(Boolean).length, 0
            );
            if (divOccupied >= 30) {
                s.diagnosticReason = `Division ${divKey} schedule fully saturated (${divOccupied}/30 periods filled).`;
            } else if (reasons.length > 0) {
                s.diagnosticReason = reasons[0];
            } else {
                s.diagnosticReason = `Faculty ${s.faculty} schedule constrained across all division free periods.`;
            }
        });
    }

    const elapsedMs = Date.now() - startTime;
    progress("COLLEGE", "Complete", 100);

    return {
        timetable: finalTimetable,
        report: finalReport,
        conflictReport: finalConflictReport,
        facultyWorkloadReport,
        resourceUtilizationReport,
        batchTimetable,
        facultyTimetable,
        locationTimetable,
        validationScore,
        optimizationReport,
        rcaaReport,
        dapsReport,
        cascReport,
        // v6.5: Multi-department data
        isMultiDept: collegeData.isMultiDept,
        departmentOrder: collegeData.departmentOrder,
        departmentResults: bestResult.departmentResults,
        facultyRegistryReport,
        collegeResources,
        deptResolutionPreviews,
        globalDiagnostics: collegeData.globalDiagnostics,
        // Performance metrics
        performanceMetrics: {
            elapsedMs,
            trialsRun: Math.min(maxTrials, bestResult.trialNumber || maxTrials),
            bestPenalty,
            departmentCount: collegeData.departmentOrder.length,
        },
    };
}

/**
 * Run a single trial of the college-wide scheduling pipeline.
 * Each department executes its own complete pipeline independently.
 */
function _runSingleTrial(
    collegeData,
    collegeResources,
    deptLabResolutions,
    facultyAvailability,
    facultyRegistry,
    trialNumber,
) {
    // ── Create master timetable with dept-qualified division keys ─────────
    const masterTimetable = {};
    const departmentSessionPools = {};
    const departmentResults = {};
    const allCascResults = [];
    let firstDapsDiagnostics = null;

    // Create timetable grids for each department
    Object.entries(collegeData.departments).forEach(([deptCode, deptData]) => {
        const clonedYearWise = JSON.parse(JSON.stringify(deptData.yearWiseData));

        // Create dept-qualified division keys
        Object.entries(createEmptyTimetable(clonedYearWise)).forEach(([divKey, grid]) => {
            const deptDivKey = collegeData.isMultiDept ? `${deptCode}:${divKey}` : divKey;
            masterTimetable[deptDivKey] = grid;
        });
    });

    // ── Create shared CollegeOccupancy ────────────────────────────────────
    const collegeOccupancy = new CollegeOccupancy(masterTimetable, collegeResources, facultyAvailability);

    // ── Step 2: Apply Global fixed constraints FIRST (college-wide) ──────
    if (collegeData.globalConstraints && collegeData.globalConstraints.length > 0) {
        _applyGlobalFixedToMaster(masterTimetable, collegeData.globalConstraints, collegeData, collegeOccupancy);
    }

    // ── Step 2b: Apply department-specific fixed constraints ──────────────
    Object.entries(collegeData.departments).forEach(([deptCode, deptData]) => {
        if (deptData.fixedConstraints && deptData.fixedConstraints.length > 0) {
            _applyDeptFixedToMaster(masterTimetable, deptData.fixedConstraints, deptCode, collegeData.isMultiDept, collegeOccupancy);
        }
    });

    // Lock global sessions in occupancy
    collegeOccupancy.lockGlobalSessions(masterTimetable, [
        ...(collegeData.globalConstraints || []),
        ...Object.values(collegeData.departments).flatMap((d) => d.fixedConstraints || []),
    ]);

    // ── Step 3-6: Per-department scheduling pipelines ─────────────────────
    // Each department independently generates sessions, allocates, and repairs.

    Object.entries(collegeData.departments).forEach(([deptCode, deptData]) => {
        const clonedYearWise = JSON.parse(JSON.stringify(deptData.yearWiseData));

        // Deduct fixed constraint counts
        const allConstraints = [
            ...(collegeData.globalConstraints || []),
            ...(deptData.fixedConstraints || []),
        ];
        applyConstraintCounts(clonedYearWise, allConstraints);

        // Generate session pool for this department
        const courseLabRes = deptLabResolutions[deptCode] || {};
        const sessionPool = generateSessionPool(clonedYearWise, deptData.syncRules || [], courseLabRes);

        // Tag sessions with department code and dept-qualified division keys
        sessionPool.forEach((session) => {
            session.department = deptCode;
            session._deptDivKey = collegeData.isMultiDept
                ? `${deptCode}:${session.year}-${session.division}`
                : `${session.year}-${session.division}`;
        });

        // DAPS prioritization
        let dapsDiagnostics = null;
        const dapsResult = prioritizeSessionPool(
            sessionPool, masterTimetable, facultyAvailability, { preserveTypeOrder: true }
        );
        dapsDiagnostics = dapsResult.diagnostics;

        if (trialNumber > 1) {
            // Shuffle within type buckets for diversity
            const typeBuckets = { PRACTICAL: [], TUTORIAL: [], LECTURE: [] };
            sessionPool.forEach((s) => {
                if (!s.allocated && typeBuckets[s.type]) {
                    typeBuckets[s.type].push(s);
                }
            });
            Object.values(typeBuckets).forEach((bucket) => {
                for (let i = bucket.length - 1; i > 0; i--) {
                    const j = Math.floor(Math.random() * (i + 1));
                    [bucket[i], bucket[j]] = [bucket[j], bucket[i]];
                }
            });
        }

        if (!firstDapsDiagnostics) firstDapsDiagnostics = dapsDiagnostics;

        // Allocate sessions using shared college occupancy
        // The session pool uses dept-qualified keys (_deptDivKey) for timetable lookup
        _allocateDeptSessions(masterTimetable, sessionPool, facultyAvailability, deptData.resources, collegeOccupancy, collegeData.isMultiDept, deptCode);

        departmentSessionPools[deptCode] = sessionPool;
        departmentResults[deptCode] = {
            deptCode,
            sessionCount: sessionPool.length,
            allocatedCount: sessionPool.filter((s) => s.allocated).length,
            unallocatedCount: sessionPool.filter((s) => !s.allocated).length,
        };
    });

    // ── Step 6b: College-wide resource allocation ─────────────────────────
    if (collegeData.isMultiDept) {
        allocateResources(masterTimetable, collegeResources);
    } else {
        const firstDept = Object.values(collegeData.departments)[0];
        if (firstDept) {
            allocateResources(masterTimetable, firstDept.resources);
        }
    }

    // ── Step 7: College-wide self-healing repair loop ─────────────────────
    const allSessionPool = Object.values(departmentSessionPools).flat();
    const repairResult = _collegeWideRepairLoop(
        masterTimetable, allSessionPool,
        [...(collegeData.globalConstraints || [])],
        collegeResources, facultyAvailability, collegeData.isMultiDept
    );
    allCascResults.push(...(repairResult?.cascResults || []));

    // Re-run resource allocation post-repair (college-wide for multi-dept)
    if (collegeData.isMultiDept) {
        allocateResources(masterTimetable, collegeResources);
    } else {
        const firstDept = Object.values(collegeData.departments)[0];
        if (firstDept) {
            allocateResources(masterTimetable, firstDept.resources);
        }
    }

    // ── Step 8: Validate ──────────────────────────────────────────────────
    const report = validateTimetable(masterTimetable, allSessionPool, collegeResources);
    const conflictReport = generateConflictReport(masterTimetable, allSessionPool, [
        ...(collegeData.globalConstraints || []),
        ...Object.values(collegeData.departments).flatMap((d) => d.fixedConstraints || []),
    ]);

    // Update per-department results
    Object.entries(departmentSessionPools).forEach(([deptCode, pool]) => {
        departmentResults[deptCode].allocatedCount = pool.filter((s) => s.allocated).length;
        departmentResults[deptCode].unallocatedCount = pool.filter((s) => !s.allocated).length;
    });

    // Calculate penalty
    const facultyClashCount = conflictReport.summary?.FACULTY_CLASH || 0;
    const unallocatedCount =
        (report.missingLectures || []).length +
        (report.missingTutorials || []).length +
        (report.missingPracticals || []).length;
    const resourceClashCount =
        (conflictReport.summary?.ROOM_CLASH || 0) +
        (conflictReport.summary?.LAB_CLASH || 0) +
        (conflictReport.summary?.TUTORIAL_ROOM_CLASH || 0);
    const breakViolations = conflictReport.summary?.PRACTICAL_BREAK_VIOLATION || 0;
    const resourceShortageCount = (report.resourceShortages || []).length;
    const duplicateLectureCount = conflictReport.summary?.SAME_COURSE_DUPLICATE_LECTURE_PER_DAY || 0;
    const batchOverlapCount = conflictReport.summary?.BATCH_SESSION_OVERLAP || 0;

    const penalty =
        unallocatedCount * 100000 +
        batchOverlapCount * 100000 +
        resourceShortageCount * 50000 +
        facultyClashCount * 10000 +
        duplicateLectureCount * 5000 +
        resourceClashCount * 500 +
        breakViolations * 200;

    return {
        masterTimetable,
        departmentSessionPools,
        departmentResults,
        report,
        conflictReport,
        cascResults: allCascResults,
        dapsDiagnostics: firstDapsDiagnostics,
        penalty,
        trialNumber,
    };
}

// ── Internal Helpers ─────────────────────────────────────────────────────────

/**
 * Apply global fixed constraints to the master timetable.
 * Global sessions apply to ALL departments' matching divisions.
 */
function _applyGlobalFixedToMaster(timetable, globalConstraints, collegeData, collegeOccupancy) {
    if (!globalConstraints || globalConstraints.length === 0) return;

    // For each department, apply global constraints to their division grids
    Object.entries(collegeData.departments).forEach(([deptCode]) => {
        // Create a dept-scoped view of the timetable for applyFixedConstraints
        const deptView = {};
        Object.keys(timetable).forEach((key) => {
            if (collegeData.isMultiDept) {
                if (key.startsWith(`${deptCode}:`)) {
                    // Map dept-qualified key back to simple key for applyFixedConstraints
                    const simpleKey = key.slice(deptCode.length + 1);
                    deptView[simpleKey] = timetable[key];
                }
            } else {
                deptView[key] = timetable[key];
            }
        });

        applyFixedConstraints(deptView, globalConstraints, { department: "GLOBAL", isGlobalSheet: true });

        // Write back with dept-qualified keys
        if (collegeData.isMultiDept) {
            Object.entries(deptView).forEach(([simpleKey, grid]) => {
                timetable[`${deptCode}:${simpleKey}`] = grid;
            });
        }
    });
}

/**
 * Apply department-specific fixed constraints.
 */
function _applyDeptFixedToMaster(timetable, fixedConstraints, deptCode, isMultiDept, collegeOccupancy) {
    if (!fixedConstraints || fixedConstraints.length === 0) return;

    const deptView = {};
    Object.keys(timetable).forEach((key) => {
        if (isMultiDept) {
            if (key.startsWith(`${deptCode}:`)) {
                const simpleKey = key.slice(deptCode.length + 1);
                deptView[simpleKey] = timetable[key];
            }
        } else {
            deptView[key] = timetable[key];
        }
    });

    applyFixedConstraints(deptView, fixedConstraints, { department: deptCode, isGlobalSheet: false });

    if (isMultiDept) {
        Object.entries(deptView).forEach(([simpleKey, grid]) => {
            timetable[`${deptCode}:${simpleKey}`] = grid;
        });
    }
}

/**
 * Allocate sessions for a single department using the shared college occupancy.
 * Maps session._deptDivKey to the correct timetable grid.
 */
function _allocateDeptSessions(timetable, sessionPool, facultyAvailability, deptResources, collegeOccupancy, isMultiDept, deptCode = null) {
    if (!isMultiDept) {
        // Single dept — direct pass-through
        allocateSessions(timetable, sessionPool, facultyAvailability, deptResources, collegeOccupancy);
        return;
    }

    if (collegeOccupancy && deptCode) {
        collegeOccupancy.setActiveDepartment(deptCode);
    }

    // Multi-dept: wrap sessionPool so they reference the dept-qualified keys
    // The existing allocateSessions uses `${session.year}-${session.division}` as key.
    // We need to temporarily rename the timetable keys or override session keys.
    // Strategy: create a proxy view.

    // Temporarily patch session year-division lookups to use dept-qualified keys
    const originalKeys = {};
    sessionPool.forEach((session) => {
        const deptDivKey = session._deptDivKey;
        const simpleKey = `${session.year}-${session.division}`;
        if (deptDivKey !== simpleKey && timetable[deptDivKey] && !timetable[simpleKey]) {
            // Create alias
            originalKeys[simpleKey] = true;
            timetable[simpleKey] = timetable[deptDivKey];
        }
    });

    try {
        allocateSessions(timetable, sessionPool, facultyAvailability, deptResources, collegeOccupancy);
    } finally {
        // Clean up aliases (data is shared, so changes are reflected in dept-qualified keys)
        Object.keys(originalKeys).forEach((key) => {
            delete timetable[key];
        });
        if (collegeOccupancy) {
            collegeOccupancy.setActiveDepartment(null);
        }
    }
}

/**
 * Allocate resources for a single department's timetable grids.
 */
function _allocateDeptResources(timetable, deptResources, deptCode, isMultiDept) {
    if (!isMultiDept) {
        allocateResources(timetable, deptResources);
        return;
    }

    // Create a dept-scoped view
    const deptView = {};
    Object.keys(timetable).forEach((key) => {
        if (key.startsWith(`${deptCode}:`)) {
            const simpleKey = key.slice(deptCode.length + 1);
            deptView[simpleKey] = timetable[key];
        }
    });

    allocateResources(deptView, deptResources);

    // Write back
    Object.entries(deptView).forEach(([simpleKey, grid]) => {
        timetable[`${deptCode}:${simpleKey}`] = grid;
    });
}

/**
 * College-wide self-healing repair loop.
 * Same logic as the single-dept repair in generateSmartTimetable.js,
 * but operates on the master timetable across all departments.
 */
function _collegeWideRepairLoop(timetable, sessionPool, globalConstraints, resources, facultyAvailability, isMultiDept) {
    const cascResults = [];

    for (let pass = 0; pass < MAX_REPAIR_PASSES; pass++) {
        let repaired = false;
        const facultySchedule = _buildFacultySchedule(timetable);

        let unallocated = sessionPool.filter((s) => !s.allocated);
        if (unallocated.length === 0) break;

        unallocated = reprioritizeUnallocated(unallocated, timetable, facultyAvailability);

        unallocated.forEach((session) => {
            const timetableKey = session._deptDivKey || `${session.year}-${session.division}`;
            if (!timetable[timetableKey]) return;

            // --- Pass A: Direct placement ---
            for (let d = 0; d < DAYS.length; d++) {
                if (session.allocated) break;
                const day = DAYS[d];
                const daySlots = timetable[timetableKey]?.[day];
                if (!daySlots) continue;

                if (session.type === "PRACTICAL") {
                    const validStarts = [0, 2, 4];
                    for (const slot of validStarts) {
                        if (session.allocated) break;
                        if (slot + 1 >= 6) continue;
                        if (_isBusy(facultySchedule, session.faculty, day, slot, facultyAvailability)) continue;
                        if (_isBusy(facultySchedule, session.faculty, day, slot + 1, facultyAvailability)) continue;

                        const cur = daySlots[slot];
                        const nxt = daySlots[slot + 1];

                        if (cur?.type === "PRACTICAL" && cur.span === 2 && nxt?.type === "PRACTICAL" && nxt.span === 0) {
                            const currentTutorials = cur.tutorialAllocations || [];
                            const existingAllocationCount = (cur.batchAllocations || []).length + currentTutorials.length;
                            if (existingAllocationCount < 4) {
                                const existBatches = new Set([
                                    ...(cur.batchAllocations || []).map((b) => b.batch),
                                    ...currentTutorials.map((t) => t.batch),
                                ]);
                                const existFaculties = new Set([
                                    ...(cur.batchAllocations || []).map((b) => b.faculty),
                                    ...currentTutorials.map((t) => t.faculty),
                                ].filter(Boolean));
                                if (!existBatches.has(session.batch) && (!session.faculty || !existFaculties.has(session.faculty))) {
                                    if (!cur.batchAllocations) cur.batchAllocations = [];
                                    cur.batchAllocations.push(session);
                                    if (nxt) nxt.batchAllocations = cur.batchAllocations;
                                    _markBusy(facultySchedule, session.faculty, day, slot);
                                    _markBusy(facultySchedule, session.faculty, day, slot + 1);
                                    session.allocated = true;
                                    repaired = true;
                                }
                            }
                        } else if (cur === null && nxt === null) {
                            daySlots[slot] = { type: "PRACTICAL", span: 2, fixed: false, batchAllocations: [session] };
                            daySlots[slot + 1] = { type: "PRACTICAL", span: 0, fixed: false, batchAllocations: [session] };
                            _markBusy(facultySchedule, session.faculty, day, slot);
                            _markBusy(facultySchedule, session.faculty, day, slot + 1);
                            session.allocated = true;
                            repaired = true;
                        }
                    }
                    continue;
                }

                // Lectures and tutorials
                for (let slot = 0; slot < 6; slot++) {
                    if (daySlots[slot] !== null) continue;
                    if (_isBusy(facultySchedule, session.faculty, day, slot, facultyAvailability)) continue;
                    if (!checkLectureDistribution({ timetable, divisionKey: timetableKey, day, session })) continue;
                    if (!checkSubjectConstraint({ timetable, divisionKey: timetableKey, day, slot, session })) continue;

                    daySlots[slot] = { ...session, span: 1, fixed: false };
                    _markBusy(facultySchedule, session.faculty, day, slot);
                    session.allocated = true;
                    repaired = true;
                    break;
                }
            }

            // --- Pass B: 1-hop swap ---
            if (!session.allocated && session.type !== "PRACTICAL") {
                for (let d = 0; d < DAYS.length; d++) {
                    const day = DAYS[d];
                    const daySlots = timetable[timetableKey]?.[day];
                    if (!daySlots) continue;

                    for (let slot = 0; slot < 6; slot++) {
                        const occupant = daySlots[slot];
                        if (!occupant || occupant.fixed || occupant.span === 0 || occupant.type !== "LECTURE") continue;
                        if (_isBusy(facultySchedule, session.faculty, day, slot, facultyAvailability)) continue;

                        let swapped = false;
                        for (let d2 = 0; d2 < DAYS.length && !swapped; d2++) {
                            const newDay = DAYS[d2];
                            const newDaySlots = timetable[timetableKey]?.[newDay];
                            if (!newDaySlots) continue;
                            for (let newSlot = 0; newSlot < 6; newSlot++) {
                                if (newDaySlots[newSlot] !== null) continue;
                                if (d2 === d && newSlot === slot) continue;
                                if (_isBusy(facultySchedule, occupant.faculty, newDay, newSlot, facultyAvailability)) continue;

                                newDaySlots[newSlot] = { ...occupant };
                                _markBusy(facultySchedule, occupant.faculty, newDay, newSlot);
                                _unmarkBusy(facultySchedule, occupant.faculty, day, slot);

                                daySlots[slot] = { ...session, span: 1, fixed: false };
                                _markBusy(facultySchedule, session.faculty, day, slot);
                                session.allocated = true;
                                repaired = true;
                                swapped = true;
                                break;
                            }
                        }
                        if (swapped) break;
                    }
                    if (session.allocated) break;
                }
            }

            // --- Pass C: CASC ---
            if (!session.allocated) {
                const cascResult = attemptCascadePlacement({
                    timetable,
                    session: { ...session },
                    facultySchedule,
                    facultyAvailability,
                    config: { MAX_CASCADE_DEPTH: 4 },
                });

                cascResults.push(cascResult);
                if (cascResult.success) {
                    session.allocated = true;
                    repaired = true;
                }
            }
        });

        if (!repaired) break;
    }

    return { cascResults };
}

// ── Faculty schedule helpers ─────────────────────────────────────────────────

function _buildFacultySchedule(timetable) {
    const schedule = {};
    Object.keys(timetable).forEach((key) => {
        DAYS.forEach((day) => {
            (timetable[key]?.[day] || []).forEach((cell, slot) => {
                if (!cell) return;
                if (cell.faculty) _markBusy(schedule, cell.faculty, day, slot);
                if (cell.batchAllocations) {
                    cell.batchAllocations.forEach((b) => _markBusy(schedule, b.faculty, day, slot));
                }
                if (cell.tutorialAllocations) {
                    cell.tutorialAllocations.forEach((t) => {
                        if ((t.labSubSlot ?? slot) === slot) _markBusy(schedule, t.faculty, day, slot);
                    });
                }
            });
        });
    });
    return schedule;
}

const GHOST_FAC_SET = new Set(["TBD", "FIXED", "TBD-FACULTY", "DEPT-FACULTY", ""]);

function _isBusy(schedule, faculty, day, slot, facultyAvailability = {}) {
    if (!faculty || GHOST_FAC_SET.has(String(faculty).trim().toUpperCase())) return false;
    if (isFacultyBlockedByAvailability(facultyAvailability, faculty, day, slot)) return true;
    return !!schedule[faculty]?.[day]?.[slot];
}

function _markBusy(schedule, faculty, day, slot) {
    if (!faculty || GHOST_FAC_SET.has(String(faculty).trim().toUpperCase())) return;
    if (!schedule[faculty]) schedule[faculty] = {};
    if (!schedule[faculty][day]) schedule[faculty][day] = {};
    schedule[faculty][day][slot] = true;
}

function _unmarkBusy(schedule, faculty, day, slot) {
    if (!faculty || !schedule[faculty]?.[day]) return;
    delete schedule[faculty][day][slot];
}
