"use client";

import React, { useState, useRef, useMemo } from "react";
import * as XLSX from "xlsx";
import { motion, AnimatePresence } from "framer-motion";
import {
    Upload, Sliders, PlayCircle, Grid, BarChart3, ChevronRight, ChevronLeft,
    Sparkles, CheckCircle2, FileSpreadsheet, Layers, ShieldCheck, Zap,
    BookOpen, Users, MapPin, Globe, Link2, UserCheck, GraduationCap, Building2, Loader2,
    AlertTriangle, School, ArrowRight
} from "lucide-react";

import { parseGlobalConstraints } from "../utils/parseGlobalConstraints";
import { parseResourcesSheet, buildResourcesFromLocation } from "../utils/parseResourcesSheet";
import { parseLoadSheet } from "../utils/parseLoadSheet";
import { buildYearWiseData } from "../utils/buildYearWiseData";
import { parseSyncConstraints, autoDetectSyncConstraints } from "../utils/parseSyncConstraints";
import { generateFacultyTimetable } from "../utils/generateFacultyTimetable";
import { generateLocationTimetable } from "../utils/generateLocationTimetable";
import { parseLocationSheet } from "../utils/parseLocationSheet";
import { generateResourceResolutionPreview } from "../utils/courseLabResolver";
import { parseMultiDeptWorkbook, isMultiDeptWorkbook } from "../utils/parseMultiDeptWorkbook";
import { validateWorkbook, getBlockingWorkbookIssues } from "../utils/validateWorkbook.js";
import { generateConflictReport } from "../utils/generateConflictReport.js";
import { generateFacultyWorkloadReport } from "../utils/generateFacultyWorkloadReport.js";
import { generateResourceUtilizationReport } from "../utils/generateResourceUtilizationReport.js";
import { computeValidationScore } from "../utils/computeValidationScore.js";
import { createScheduleDigest } from "../utils/scheduleDiff.js";

import HomePage from "./HomePage";
import YearWiseCourses from "./YearWiseCourses";
import GlobalConstraints from "./GlobalConstraints";
import ExternalCourses from "./ExternalCourses";
import SyncRuleBuilder from "./SyncRuleBuilder";
import FacultyConstraints from "./FacultyConstraints";
import TimetableGrid from "./TimetableGrid";
import GenerationReport from "./GenerationReport";
import FacultyTimetableGrid from "./FacultyTimetableGrid";
import LocationTimetableGrid from "./LocationTimetableGrid";
import BatchTimetableGrid from "./BatchTimetableGrid";
import ExportButton from "./ExportButton";

import ShimmerButton from "./ui/ShimmerButton";
import AnimatedTabs from "./ui/AnimatedTabs";
import AppHeader from "./ui/AppHeader";
import AppFooter from "./ui/AppFooter";
import SemesterDashboard from "./SemesterDashboard";
import ScheduleWorkbench from "./ScheduleWorkbench.jsx";
import { saveSemester } from "../utils/semesterStore";

function AtlasLoadingScreen({ onComplete, isBusy }) {
    const [progress, setProgress] = useState(0);
    const [wavePhase, setWavePhase] = useState(0);
    const titleClass = "whitespace-nowrap text-[clamp(4rem,22vw,20rem)] font-black leading-[0.84] tracking-[-0.055em]";
    const onCompleteRef = React.useRef(onComplete);
    React.useEffect(() => {
        onCompleteRef.current = onComplete;
    }, [onComplete]);
    const wavePoints = Array.from({ length: 6 }, (_, index) => {
        const x = index * 20;
        const baseline = 100 - progress;
        const y = progress === 0 ? 100 : Math.max(0, Math.min(100, baseline + Math.sin(wavePhase + index * 1.25) * 3.5));
        return `${x}% ${y}%`;
    }).join(", ");
    const waterClip = `polygon(${wavePoints}, 100% 100%, 0% 100%)`;

    React.useEffect(() => {
        const timer = window.setInterval(() => {
            setWavePhase((phase) => phase + 0.3);
            setProgress((current) => {
                const next = isBusy ? Math.min(current + 1, 92) : Math.min(current + 5, 100);
                if (next === 100) {
                    window.clearInterval(timer);
                    window.setTimeout(() => onCompleteRef.current(), 260);
                }
                return next;
            });
        }, 50);

        return () => window.clearInterval(timer);
    }, [isBusy]);

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1, backgroundColor: progress === 100 ? "#071b19" : "#edf7f3" }}
            exit={{ opacity: 0 }}
            transition={{ opacity: { duration: 0.28 }, backgroundColor: { duration: 0.26 } }}
            className="fixed inset-0 z-[100] flex flex-col justify-center overflow-hidden px-6 sm:px-12"
            role="status"
            aria-live="polite"
            aria-label={`ATLAS is reading your semester workbook, ${progress}% complete`}
        >
            <div className="mx-auto w-fit max-w-full">
                <motion.div animate={{ scale: progress === 100 ? 1.035 : 1 }} transition={{ duration: 0.26, ease: "easeInOut" }} className="relative">
                    <div className={`${titleClass} text-[#c5d8d2]`}>ATLAS</div>
                    <div aria-hidden="true" className={`absolute inset-0 ${titleClass} overflow-hidden text-[#4338ca]`} style={{ clipPath: waterClip }}>ATLAS</div>
                </motion.div>
                <motion.div animate={{ opacity: progress === 100 ? 0 : 1 }} transition={{ duration: 0.2 }} className="mt-4 text-right">
                    <p className="text-sm font-bold text-[#49645e]">Preparing timetable</p>
                    <p className="mt-1 text-sm font-extrabold tabular-nums text-[#3730a3]">{progress}%</p>
                </motion.div>
            </div>
        </motion.div>
    );
}

export default function FileUpload() {
    const [activeView, setActiveView] = useState("home"); // 'semesters' | 'home' | 'studio'
    const [activeSemester, setActiveSemester] = useState(null); // current semester object
    const [sheets, setSheets] = useState({});
    const [selectedSheet, setSelectedSheet] = useState("");
    const [detectedSheets, setDetectedSheets] = useState({
        loadSheet: false,
        constraintsSheet: false,
        resourcesSheet: false,
        syncSheet: false,
    });

    const [subjects, setSubjects] = useState([]);
    const [yearWiseData, setYearWiseData] = useState({});
    const [syncRules, setSyncRules] = useState([]);

    const [resources, setResources] = useState({
        classrooms: [],
        labs: [],
        tutorialRooms: [],
    });

    const [globalConstraints, setGlobalConstraints] = useState([]);
    const [timetable, setTimetable] = useState(null);
    const [generationReport, setGenerationReport] = useState(null);
    const [conflictReport, setConflictReport] = useState(null);
    const [facultyWorkloadReport, setFacultyWorkloadReport] = useState(null);
    const [resourceUtilizationReport, setResourceUtilizationReport] = useState(null);
    const [facultyTimetable, setFacultyTimetable] = useState(null);
    const [locationTimetable, setLocationTimetable] = useState(null);
    const [validationScore, setValidationScore] = useState(null);
    const [optimizationReport, setOptimizationReport] = useState(null);
    const [facultyConstraints, setFacultyConstraints] = useState([]);
    // v5.5: Resource resolution preview (course → lab mapping table)
    const [resourceResolutionPreview, setResourceResolutionPreview] = useState([]);
    const [locationData, setLocationData] = useState(null);

    // v6.5: Multi-department college-wide state
    const [collegeData, setCollegeData] = useState(null);
    const [isMultiDept, setIsMultiDept] = useState(false);
    const [departmentOrder, setDepartmentOrder] = useState([]);
    const [departmentResults, setDepartmentResults] = useState({});
    const [generationProgress, setGenerationProgress] = useState("");
    const [generationPercent, setGenerationPercent] = useState(0);
    const [generationError, setGenerationError] = useState("");
    const [uploadValidation, setUploadValidation] = useState([]);
    const [scheduleVersions, setScheduleVersions] = useState([]);
    const [auditTrail, setAuditTrail] = useState([]);
    const [configuredDepartments, setConfiguredDepartments] = useState([]);
    const [reviewedDepartments, setReviewedDepartments] = useState([]);
    const [collegeResources, setCollegeResources] = useState(null);
    const [selectedDeptFilter, setSelectedDeptFilter] = useState("ALL");
    const [facultyRegistryReport, setFacultyRegistryReport] = useState(null);

    // Multi-Step Stage State
    const [activeStep, setActiveStep] = useState(1);
    const [configTab, setConfigTab] = useState("courses");
    const [studioTab, setStudioTab] = useState("division");
    const [isGenerating, setIsGenerating] = useState(false);
    const [isImporting, setIsImporting] = useState(false);
    const [isDraggingFile, setIsDraggingFile] = useState(false);
    const [uploadedFileName, setUploadedFileName] = useState("");

    const fileInputRef = useRef(null);
    const generationWorkerRef = useRef(null);
    const generationRejectRef = useRef(null);
    const generationCancelledRef = useRef(false);

    const requestGeneration = (kind, payload) => new Promise((resolve, reject) => {
        const worker = new Worker(new URL("../workers/timetableGeneration.worker.js", import.meta.url), { type: "module" });
        generationWorkerRef.current = worker;
        generationRejectRef.current = reject;
        worker.onmessage = (event) => {
            const message = event.data || {};
            if (message.type === "progress") {
                setGenerationProgress(message.message || "Generating timetable…");
                setGenerationPercent(message.percent || 0);
            } else if (message.type === "complete") {
                worker.terminate();
                generationWorkerRef.current = null;
                generationRejectRef.current = null;
                resolve(message.result);
            } else if (message.type === "error") {
                worker.terminate();
                generationWorkerRef.current = null;
                generationRejectRef.current = null;
                reject(new Error(message.message || "Generation failed."));
            }
        };
        worker.onerror = (error) => {
            worker.terminate();
            generationWorkerRef.current = null;
            generationRejectRef.current = null;
            reject(error);
        };
        worker.postMessage({ id: `${Date.now()}`, kind, payload });
    });

    const cancelGeneration = () => {
        generationWorkerRef.current?.terminate();
        generationWorkerRef.current = null;
        const cancelError = new Error("Generation cancelled.");
        cancelError.name = "GenerationCancelled";
        generationRejectRef.current?.(cancelError);
        generationRejectRef.current = null;
        setIsGenerating(false);
        setGenerationProgress("Generation cancelled. Your workspace is saved.");
        generationCancelledRef.current = true;
        setGenerationPercent(0);
    };

    const makeVersionSnapshot = (currentTimetable, currentReport, currentConflicts, currentScore) => ({
        id: `version_${Date.now()}`,
        createdAt: new Date().toISOString(),
        digest: createScheduleDigest(currentTimetable),
        validationScore: currentScore?.totalScore ?? currentScore?.overallScore ?? null,
        conflictCount: currentConflicts?.conflicts?.length || 0,
        unallocatedCount: currentReport?.unallocatedSessions || 0,
    });

    const recordAuditEvent = (event) => {
        const entry = { id: `audit_${Date.now()}`, createdAt: new Date().toISOString(), ...event };
        const next = [...auditTrail, entry].slice(-30);
        setAuditTrail(next);
        if (activeSemester?.id) saveSemester(activeSemester.id, { auditTrail: next });
        return next;
    };

    const handleReset = () => {
        generationWorkerRef.current?.terminate();
        generationWorkerRef.current = null;
        generationRejectRef.current?.(new Error("Generation cancelled."));
        generationRejectRef.current = null;
        setSheets({});
        setSelectedSheet("");
        setDetectedSheets({
            loadSheet: false,
            constraintsSheet: false,
            resourcesSheet: false,
            syncSheet: false,
        });
        setSubjects([]);
        setYearWiseData({});
        setSyncRules([]);
        setResources({ classrooms: [], labs: [], tutorialRooms: [] });
        setGlobalConstraints([]);
        setTimetable(null);
        setGenerationReport(null);
        setConflictReport(null);
        setFacultyWorkloadReport(null);
        setResourceUtilizationReport(null);
        setFacultyTimetable(null);
        setLocationTimetable(null);
        setValidationScore(null);
        setOptimizationReport(null);
        setFacultyConstraints([]);
        setResourceResolutionPreview([]);
        setLocationData(null);
        setUploadedFileName("");
        setIsDraggingFile(false);
        // v6.5: Reset multi-dept state
        setCollegeData(null);
        setIsMultiDept(false);
        setDepartmentOrder([]);
        setDepartmentResults({});
        setConfiguredDepartments([]);
        setReviewedDepartments([]);
        setGenerationProgress("");
        setGenerationPercent(0);
        setGenerationError("");
        setUploadValidation([]);
        setScheduleVersions([]);
        setAuditTrail([]);
        setCollegeResources(null);
        setSelectedDeptFilter("ALL");
        setFacultyRegistryReport(null);
        setActiveStep(1);
    };

    // -----------------------------------------------
    // SEMESTER MANAGEMENT HANDLERS
    // -----------------------------------------------
    const handleEnterSemester = (semester) => {
        setActiveSemester(semester);
        // If semester has existing timetable, restore it
        if (semester.timetable) {
            setTimetable(semester.timetable);
            setGenerationReport(semester.report || null);
            setConflictReport(semester.conflictReport || null);
            setFacultyWorkloadReport(semester.facultyWorkloadReport || null);
            setResourceUtilizationReport(semester.resourceUtilizationReport || null);
            setFacultyTimetable(
                semester.facultyTimetable || (semester.timetable ? generateFacultyTimetable(semester.timetable) : null)
            );
            setLocationTimetable(
                semester.locationTimetable || (semester.timetable ? generateLocationTimetable(semester.timetable) : null)
            );
            setValidationScore(semester.validationScore || null);
            setOptimizationReport(semester.optimizationReport || null);
            setYearWiseData(semester.yearWiseData || {});
            setSubjects(semester.subjects || Object.values(semester.yearWiseData || {}).flat());
            setCollegeData(semester.collegeData || null);
            setIsMultiDept(Boolean(semester.isMultiDept || semester.collegeData));
            setDepartmentOrder(semester.departmentOrder || semester.collegeData?.departmentOrder || []);
            setDepartmentResults(semester.departmentResults || {});
            setScheduleVersions(semester.scheduleVersions || []);
            setAuditTrail(semester.auditTrail || []);
            setConfiguredDepartments(semester.configuredDepartments || []);
            setReviewedDepartments(semester.reviewedDepartments || []);
            setUploadValidation(semester.uploadValidation || []);
            setGlobalConstraints(semester.globalConstraints || []);
            setSyncRules(semester.syncRules || []);
            setResources(semester.resources || { classrooms: [], labs: [], tutorialRooms: [] });
            setFacultyConstraints(semester.facultyConstraints || []);
            setActiveStep(semester.timetable ? 4 : 1);
        } else {
            handleReset();
            setActiveSemester(semester);
            setYearWiseData(semester.yearWiseData || {});
            setSubjects(semester.subjects || Object.values(semester.yearWiseData || {}).flat());
            setCollegeData(semester.collegeData || null);
            setIsMultiDept(Boolean(semester.isMultiDept || semester.collegeData));
            setDepartmentOrder(semester.departmentOrder || semester.collegeData?.departmentOrder || []);
            setDepartmentResults(semester.departmentResults || {});
            setScheduleVersions(semester.scheduleVersions || []);
            setAuditTrail(semester.auditTrail || []);
            setConfiguredDepartments(semester.configuredDepartments || []);
            setReviewedDepartments(semester.reviewedDepartments || []);
            setUploadValidation(semester.uploadValidation || []);
            setGlobalConstraints(semester.globalConstraints || []);
            setSyncRules(semester.syncRules || []);
            setResources(semester.resources || { classrooms: [], labs: [], tutorialRooms: [] });
            setFacultyConstraints(semester.facultyConstraints || []);
        }
        setActiveView("studio");
    };

    const handleExitToSemesters = () => {
        handleReset();
        setActiveSemester(null);
        setActiveView("semesters");
    };

    const runTimetableGeneration = async (
        targetGroupedData = yearWiseData,
        targetGlobalConstraints = globalConstraints,
        targetSyncRules = syncRules,
        targetResources = resources,
        targetSubjects = subjects,
        returnToDepartmentChooser = false
    ) => {
        if (!targetGroupedData || Object.keys(targetGroupedData).length === 0) return;

        setIsGenerating(true);
        setGenerationError("");
        generationCancelledRef.current = false;
        setGenerationPercent(1);
        setGenerationProgress("Starting timetable engine…");
        try {
            const result = await requestGeneration("single", {
                groupedData: targetGroupedData,
                globalConstraints: targetGlobalConstraints,
                syncRules: targetSyncRules,
                resources: targetResources,
                subjects: targetSubjects,
                facultyConstraints,
            });
            const nextVersions = timetable
                ? [...scheduleVersions, makeVersionSnapshot(timetable, generationReport, conflictReport, validationScore)].slice(-3)
                : scheduleVersions;
            setGenerationReport(result.report);
            setTimetable(result.timetable);
            setConflictReport(result.conflictReport || null);
            setFacultyWorkloadReport(result.facultyWorkloadReport || null);
            setResourceUtilizationReport(result.resourceUtilizationReport || null);
            setFacultyTimetable(result.facultyTimetable || null);
            setLocationTimetable(result.locationTimetable || null);
            setValidationScore(result.validationScore || null);
            setOptimizationReport(result.optimizationReport || null);
            // v5.5: Store resource resolution preview for display
            if (result.resourceResolutionPreview) {
                setResourceResolutionPreview(result.resourceResolutionPreview);
            }
            setScheduleVersions(nextVersions);
            recordAuditEvent({
                type: "generation",
                title: "Timetable generated and validated",
                detail: `${result.conflictReport?.conflicts?.length || 0} conflicts · ${result.report?.unallocatedSessions || 0} unallocated sessions · score ${result.validationScore?.totalScore ?? result.validationScore?.overallScore ?? "—"}.`,
            });

            // Auto-save to active semester workspace (compacted payload)
            if (activeSemester?.id) {
                saveSemester(activeSemester.id, {
                    timetable: result.timetable,
                    report: result.report,
                    conflictReport: result.conflictReport || null,
                    facultyWorkloadReport: result.facultyWorkloadReport || null,
                    resourceUtilizationReport: result.resourceUtilizationReport || null,
                    validationScore: result.validationScore || null,
                    optimizationReport: result.optimizationReport || null,
                    yearWiseData: targetGroupedData,
                    subjects: targetSubjects,
                    globalConstraints: targetGlobalConstraints,
                    syncRules: targetSyncRules,
                    resources: targetResources,
                    facultyConstraints,
                    scheduleVersions: nextVersions,
                    configuredDepartments,
                });
            }
            setActiveStep(returnToDepartmentChooser ? 1 : 4);
            setActiveView("studio");
        } catch (error) {
            if (error?.name !== "GenerationCancelled") setGenerationError(error?.message || "Generation failed. Check the workbook and try again.");
        } finally {
            setIsGenerating(false);
            generationWorkerRef.current = null;
            setGenerationProgress(generationCancelledRef.current ? "Generation cancelled. Your workspace is saved." : "");
            generationCancelledRef.current = false;
        }
    };

    // v6.5: College-wide multi-department generation
    const runCollegeTimetableGeneration = async (targetCollegeData = collegeData, returnToDepartmentChooser = false) => {
        if (!targetCollegeData || !targetCollegeData.departments) return;
        if (Object.keys(targetCollegeData.departments).length === 0) return;

        setIsGenerating(true);
        setGenerationError("");
        generationCancelledRef.current = false;
        setGenerationPercent(1);
        setGenerationProgress("Starting college-wide generation…");
        try {
                const result = await requestGeneration("college", { collegeData: targetCollegeData, facultyConstraints });
                const nextVersions = timetable
                    ? [...scheduleVersions, makeVersionSnapshot(timetable, generationReport, conflictReport, validationScore)].slice(-3)
                    : scheduleVersions;
                setGenerationReport(result.report);
                setTimetable(result.timetable);
                setConflictReport(result.conflictReport || null);
                setFacultyWorkloadReport(result.facultyWorkloadReport || null);
                setResourceUtilizationReport(result.resourceUtilizationReport || null);
                setFacultyTimetable(result.facultyTimetable || null);
                setLocationTimetable(result.locationTimetable || null);
                setValidationScore(result.validationScore || null);
                setOptimizationReport(result.optimizationReport || null);
                setDepartmentResults(result.departmentResults || {});
                setScheduleVersions(nextVersions);
                recordAuditEvent({
                    type: "generation",
                    title: "College timetable generated and validated",
                    detail: `${result.departmentOrder?.length || 0} departments · ${result.conflictReport?.conflicts?.length || 0} conflicts · ${result.report?.unallocatedSessions || 0} unallocated sessions · score ${result.validationScore?.totalScore ?? result.validationScore?.overallScore ?? "—"}.`,
                });
                setCollegeResources(result.collegeResources || null);
                setFacultyRegistryReport(result.facultyRegistryReport || null);
                if (result.departmentOrder) setDepartmentOrder(result.departmentOrder);

                // Auto-save to active semester
                if (activeSemester?.id) {
                    saveSemester(activeSemester.id, {
                        timetable: result.timetable,
                        report: result.report,
                        conflictReport: result.conflictReport || null,
                        facultyWorkloadReport: result.facultyWorkloadReport || null,
                        resourceUtilizationReport: result.resourceUtilizationReport || null,
                        validationScore: result.validationScore || null,
                        optimizationReport: result.optimizationReport || null,
                        facultyConstraints,
                        scheduleVersions: nextVersions,
                        collegeData: targetCollegeData,
                        isMultiDept: true,
                        departmentOrder: result.departmentOrder || departmentOrder,
                        departmentResults: result.departmentResults || {},
                        subjects,
                        yearWiseData,
                        globalConstraints,
                        configuredDepartments,
                    });
                }
                setActiveStep(returnToDepartmentChooser ? 1 : 4);
                setActiveView("studio");
        } catch (error) {
            if (error?.name !== "GenerationCancelled") setGenerationError(error?.message || "College generation failed. Review the workbook diagnostics and try again.");
        } finally {
            setIsGenerating(false);
            generationWorkerRef.current = null;
            setGenerationProgress(generationCancelledRef.current ? "Generation cancelled. Your workspace is saved." : "");
            generationCancelledRef.current = false;
        }
    };

    const handleFile = (e) => {
        const file = e.target.files?.[0] || e.dataTransfer?.files?.[0];
        if (!file) return;
        setIsImporting(true);
        setUploadValidation([]);
        setGenerationError("");
        setConfiguredDepartments([]);
        setDepartmentResults({});
        setTimetable(null);
        setGenerationReport(null);
        setConflictReport(null);
        setScheduleVersions([]);
        setYearWiseData({});
        setSubjects([]);
        setGlobalConstraints([]);
        setSyncRules([]);
        setResources({ classrooms: [], labs: [], tutorialRooms: [] });
        setFacultyConstraints([]);
        setFacultyWorkloadReport(null);
        setResourceUtilizationReport(null);
        setFacultyTimetable(null);
        setLocationTimetable(null);
        setCollegeData(null);
        setIsMultiDept(false);
        setDepartmentOrder([]);

        // Security Shield: Enforce 10MB maximum file size limit (DoS / Memory Exhaustion Protection)
        const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10MB
        if (file.size > MAX_FILE_SIZE_BYTES) {
            setUploadedFileName(file.name);
            setUploadValidation([{ level: "error", title: "File exceeds the 10 MB limit", detail: "Choose a smaller workbook and upload it again." }]);
            setIsImporting(false);
            if (e.target?.value) e.target.value = "";
            return;
        }
        setUploadedFileName(file.name);

        const reader = new FileReader();

        reader.onload = (event) => {
          try {
            const workbook = XLSX.read(event.target.result, { type: "binary" });
            const allSheets = {};
            const normalizedSheetNames = workbook.SheetNames.map((name) => String(name).trim().toUpperCase());

            workbook.SheetNames.forEach((originalName, index) => {
                const sheetName = normalizedSheetNames[index];
                if (Object.hasOwn(allSheets, sheetName)) {
                    throw new Error(`Multiple worksheet names normalize to "${sheetName}". Rename the duplicate sheets and upload again.`);
                }
                const worksheet = workbook.Sheets[originalName];
                const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: "" })
                    .map((row) => row.map((cell) => typeof cell === "string" ? cell.toUpperCase() : cell));
                allSheets[sheetName] = rows.filter((row) => row.some((cell) => cell !== ""));
            });

            setSheets(allSheets);
            setSelectedSheet(normalizedSheetNames[0]);

            // ── v6.5: Detect multi-department workbook ──────────────────────
            const multiDeptDetected = isMultiDeptWorkbook(normalizedSheetNames);
            setIsMultiDept(multiDeptDetected);

            if (multiDeptDetected) {
                // ── MULTI-DEPARTMENT PATH ────────────────────────────────────
                console.log("ATLAS v6.5: Multi-department workbook detected.", normalizedSheetNames);
                const parsedCollege = parseMultiDeptWorkbook(allSheets, normalizedSheetNames);
                setCollegeData(parsedCollege);
                setDepartmentOrder(parsedCollege.departmentOrder);
                setGlobalConstraints(parsedCollege.globalConstraints || []);

                // Aggregate subjects and yearWiseData for display purposes
                setSubjects(parsedCollege.allSubjects);
                const aggregatedYWD = {};
                Object.values(parsedCollege.departments).forEach((dept) => {
                    Object.entries(dept.yearWiseData || {}).forEach(([year, courses]) => {
                        if (!aggregatedYWD[year]) aggregatedYWD[year] = [];
                        aggregatedYWD[year].push(...courses);
                    });
                });
                setYearWiseData(aggregatedYWD);

                // Sheet detection
                setDetectedSheets({
                    loadSheet: parsedCollege.departmentOrder.some(
                        (d) => (parsedCollege.departments[d]?.subjects?.length || 0) > 0
                    ),
                    constraintsSheet: (parsedCollege.globalConstraints || []).length > 0 ||
                        parsedCollege.departmentOrder.some(
                            (d) => (parsedCollege.departments[d]?.fixedConstraints?.length || 0) > 0
                        ),
                    resourcesSheet: parsedCollege.departmentOrder.some(
                        (d) => (parsedCollege.departments[d]?.resources?.labs?.length || 0) > 0
                    ),
                    syncSheet: false,
                });
                const validation = validateWorkbook({
                    fileName: file.name,
                    fileSize: file.size,
                    sheetNames: normalizedSheetNames,
                    sheets: allSheets,
                    isMultiDepartment: true,
                    collegeData: parsedCollege,
                    subjects: parsedCollege.allSubjects,
                });
                setUploadValidation(validation);
                setDepartmentResults({});
                setScheduleVersions([]);
                if (activeSemester?.id) saveSemester(activeSemester.id, {
                    timetable: null,
                    report: null,
                    conflictReport: null,
                    facultyWorkloadReport: null,
                    resourceUtilizationReport: null,
                    validationScore: null,
                    optimizationReport: null,
                    collegeData: parsedCollege,
                    isMultiDept: true,
                    departmentOrder: parsedCollege.departmentOrder,
                    departmentResults: {},
                    subjects: parsedCollege.allSubjects,
                    yearWiseData: aggregatedYWD,
                    globalConstraints: parsedCollege.globalConstraints || [],
                    uploadValidation: validation,
                    uploadedFileName: file.name,
                });
                recordAuditEvent({ type: "import", title: "Workbook imported", detail: `${file.name} · ${parsedCollege.allSubjects.length} courses · ${parsedCollege.departmentOrder.length} departments · ${validation.filter((item) => item.level === "error").length} blocking issues.` });
                setActiveStep(1);
                setActiveView("studio");
            } else {
                // ── LEGACY SINGLE-DEPARTMENT PATH ────────────────────────────
                // Resolve sheets by standard name or position
                const loadSheetKey = normalizedSheetNames.find((n) => /^load|^sheet1/i.test(n)) || normalizedSheetNames[0];
                const fixSheetKey = normalizedSheetNames.find((n) => /^fix|^global/i.test(n)) || normalizedSheetNames[1];
                const locationSheetKey = normalizedSheetNames.find((n) => /^location|^resource|^sheet2/i.test(n)) || normalizedSheetNames[2];

                const loadSheet = allSheets[loadSheetKey] || allSheets[normalizedSheetNames[0]] || [];
                const globalConstraintSheet = allSheets[fixSheetKey] || allSheets[normalizedSheetNames[1]] || [];
                const locationSheet = allSheets[locationSheetKey] || allSheets[normalizedSheetNames[2]] || [];

                // Sheet Detection Checklist
                setDetectedSheets({
                    loadSheet: Boolean(loadSheet && loadSheet.length > 0),
                    constraintsSheet: Boolean(globalConstraintSheet && globalConstraintSheet.length > 0),
                    resourcesSheet: Boolean(locationSheet && locationSheet.length > 0),
                    syncSheet: Boolean(allSheets["SYNC_CONSTRAINTS"] || allSheets[normalizedSheetNames[3]]),
                });

                // v5.5: Parse Location sheet for course-aware lab mapping
                const parsedLocationData = parseLocationSheet(locationSheet);
                setLocationData(parsedLocationData);

                const legacyResources = parseResourcesSheet(locationSheet);
                const parsedResources = buildResourcesFromLocation(legacyResources, parsedLocationData);
                setResources(parsedResources);

                const parsedSubjects = parseLoadSheet(loadSheet);
                const groupedData = buildYearWiseData(parsedSubjects);

                setSubjects(parsedSubjects);
                setYearWiseData(groupedData);

                const parsedConstraints = parseGlobalConstraints(globalConstraintSheet);
                setGlobalConstraints(parsedConstraints);

                const syncSheet = allSheets["SYNC_CONSTRAINTS"] || allSheets[normalizedSheetNames[3]] || [];
                const parsedSyncConstraints = parseSyncConstraints(syncSheet);
                const autoDetectedSync = autoDetectSyncConstraints(parsedSubjects);
                const activeRules = [...parsedSyncConstraints, ...autoDetectedSync];
                setSyncRules(activeRules);

                const validation = validateWorkbook({
                    fileName: file.name,
                    fileSize: file.size,
                    sheetNames: normalizedSheetNames,
                    sheets: allSheets,
                    isMultiDepartment: false,
                    subjects: parsedSubjects,
                });
                setUploadValidation(validation);
                setDepartmentResults({});
                setScheduleVersions([]);
                if (activeSemester?.id) saveSemester(activeSemester.id, {
                    timetable: null,
                    report: null,
                    conflictReport: null,
                    facultyWorkloadReport: null,
                    resourceUtilizationReport: null,
                    validationScore: null,
                    optimizationReport: null,
                    collegeData: null,
                    isMultiDept: false,
                    departmentOrder: [],
                    departmentResults: {},
                    subjects: parsedSubjects,
                    yearWiseData: groupedData,
                    globalConstraints: parsedConstraints,
                    syncRules: activeRules,
                    resources: parsedResources,
                    uploadValidation: validation,
                    uploadedFileName: file.name,
                });
                recordAuditEvent({ type: "import", title: "Workbook imported", detail: `${file.name} · ${parsedSubjects.length} courses · ${validation.filter((item) => item.level === "error").length} blocking issues.` });
                setActiveStep(1);
                setActiveView("studio");
            }
          } catch (error) {
            console.error("Workbook import failed:", error);
            const issues = [{ level: "error", title: "Workbook could not be processed", detail: error?.message || "Check the file and upload it again." }];
            setUploadValidation(issues);
            recordAuditEvent({ type: "validation", title: "Workbook validation failed", detail: issues[0].detail });
          } finally {
            setIsImporting(false);
            if (e.target?.value) e.target.value = "";
          }
        };

        reader.onerror = () => {
            setUploadValidation([{ level: "error", title: "Workbook could not be read", detail: "The browser could not read this file. Try saving it as a new .xlsx workbook and upload again." }]);
            setIsImporting(false);
        };

        reader.readAsBinaryString(file);
    };

    const hasData = Object.keys(yearWiseData).length > 0;
    const hasTimetable = timetable !== null;
    const hasReport = generationReport !== null;

    const maxUnlockedStep = hasReport ? 6 : hasTimetable ? 5 : hasData ? 3 : 1;

    // Metric Statistics
    const totalSessionsCount = subjects.reduce((sum, subject) => sum + (Number(subject.L ?? subject.lectures ?? subject.lectureCount) || 0) + (Number(subject.T ?? subject.tutorials ?? subject.tutorialCount) || 0) + (Number(subject.P ?? subject.practicals ?? subject.practicalCount) || 0), 0);
    const allocatedSessionsCount = hasReport ? (generationReport?.allocatedSessions || 0) : 0;
    const remainingBacklogCount = hasReport ? (generationReport?.unallocatedSessions || 0) : totalSessionsCount;
    const facultyCount = new Set(subjects.flatMap((subject) => [
        ...Object.values(subject.divisions || {}),
        ...Object.values(subject.batches || {}),
    ]).filter(Boolean)).size;
    const roomCount = isMultiDept
        ? new Set(Object.values(collegeData?.departments || {}).flatMap((department) => [
            ...(department.resources?.classrooms || []),
            ...(department.resources?.labs || []),
            ...(department.resources?.tutorialRooms || []),
        ]).map((resource) => String(resource?.name || resource || "").trim()).filter(Boolean)).size
        : (resources.classrooms?.length || 0) + (resources.labs?.length || 0) + (resources.tutorialRooms?.length || 0);

    const stats = {
        totalCourses: subjects.length,
        facultyCount,
        roomCount,
        syncRuleCount: syncRules.length,
    };

    const configSubTabs = [
        { id: "courses", label: "Course Load", icon: <BookOpen className="w-3.5 h-3.5" />, badge: stats.totalCourses },
        { id: "constraints", label: "Global Constraints", icon: <Zap className="w-3.5 h-3.5" />, badge: globalConstraints.length },
        { id: "external", label: "External Courses", icon: <Globe className="w-3.5 h-3.5" /> },
        { id: "sync", label: "Sync Rules", icon: <Link2 className="w-3.5 h-3.5" />, badge: stats.syncRuleCount },
        { id: "faculty_avail", label: "Faculty Availability", icon: <UserCheck className="w-3.5 h-3.5" />, badge: facultyConstraints.length },
    ];

    const workspaceDepartments = isMultiDept
        ? departmentOrder
        : hasData
            ? [activeSemester?.department || "Department"]
            : [];
    const activeDepartment = workspaceDepartments.includes(selectedDeptFilter)
        ? selectedDeptFilter
        : workspaceDepartments[0] || "";
    const activeDepartmentData = isMultiDept && activeDepartment
        ? collegeData?.departments?.[activeDepartment]
        : null;
    const activeDepartmentYearWiseData = activeDepartmentData?.yearWiseData || yearWiseData;
    const activeDepartmentSubjects = activeDepartmentData?.subjects || subjects;
    const studioDepartment = isMultiDept
        ? (selectedDeptFilter === "ALL" ? activeDepartment : selectedDeptFilter)
        : "";
    const studioTimetable = useMemo(() => {
        if (!isMultiDept || !studioDepartment) return timetable;
        return Object.fromEntries(
            Object.entries(timetable || {}).filter(([key]) => key.startsWith(`${studioDepartment}:`))
        );
    }, [isMultiDept, studioDepartment, timetable]);
    const studioFacultyTimetable = useMemo(
        () => isMultiDept && studioDepartment ? generateFacultyTimetable(studioTimetable) : facultyTimetable,
        [facultyTimetable, isMultiDept, studioDepartment, studioTimetable]
    );
    const studioLocationTimetable = useMemo(
        () => isMultiDept && studioDepartment ? generateLocationTimetable(studioTimetable) : locationTimetable,
        [isMultiDept, locationTimetable, studioDepartment, studioTimetable]
    );

    const blockingUploadIssues = useMemo(() => getBlockingWorkbookIssues(uploadValidation), [uploadValidation]);
    const missingFacultyCourses = subjects.filter((subject) => !Object.values(subject.divisions || {}).some(Boolean)).length;
    const coordinationItems = useMemo(() => {
        if (!isMultiDept || !collegeData?.departments) return [];
        const facultyDepartments = new Map();
        Object.entries(collegeData.departments).forEach(([department, data]) => {
            (data?.subjects || []).forEach((subject) => {
                Object.values(subject.divisions || {}).filter(Boolean).forEach((faculty) => {
                    const normalized = String(faculty).trim().toUpperCase();
                    if (!normalized || normalized === "TBD") return;
                    if (!facultyDepartments.has(normalized)) facultyDepartments.set(normalized, new Set());
                    facultyDepartments.get(normalized).add(department);
                });
            });
        });
        return [...facultyDepartments.entries()]
            .filter(([, departments]) => departments.size > 1)
            .map(([faculty, departments]) => ({
                title: `Shared faculty ${faculty}`,
                detail: `Assigned in ${[...departments].join(" and ")}; review cross-department time clashes after generation.`,
            }));
    }, [collegeData, isMultiDept]);

    const mergeDepartmentSchedule = (departmentTimetable) => isMultiDept
        ? {
            ...Object.fromEntries(Object.entries(timetable || {}).filter(([key]) => !key.startsWith(`${studioDepartment}:`))),
            ...departmentTimetable,
        }
        : departmentTimetable;

    const validateScheduleEdit = (departmentTimetable) => {
        const proposedTimetable = mergeDepartmentSchedule(departmentTimetable);
        const proposedConflicts = generateConflictReport(proposedTimetable, [], globalConstraints).conflicts || [];
        const signature = (conflict) => `${conflict.type}|${conflict.divisionKey || (conflict.affectedClasses || []).map((item) => item.divisionKey).join(",")}|${conflict.day}|${conflict.slot}|${conflict.faculty || conflict.room || conflict.subject || ""}`;
        const currentSignatures = new Set((conflictReport?.conflicts || []).map(signature));
        const introduced = proposedConflicts.filter((conflict) => !currentSignatures.has(signature(conflict)));
        return introduced.length
            ? { allowed: false, message: `Move blocked: it would introduce ${introduced.length} new ${introduced.length === 1 ? "conflict" : "conflicts"}. Try another day or time.` }
            : { allowed: true };
    };

    const handleApplyScheduleEdit = (departmentTimetable) => {
        const nextTimetable = mergeDepartmentSchedule(departmentTimetable);
        const nextConflicts = generateConflictReport(nextTimetable, [], globalConstraints);
        const nextFacultyTimetable = generateFacultyTimetable(nextTimetable);
        const nextLocationTimetable = generateLocationTimetable(nextTimetable);
        const nextFacultyWorkload = generateFacultyWorkloadReport(nextTimetable, []);
        const nextResourceUtilization = generateResourceUtilizationReport(nextTimetable, isMultiDept ? (collegeResources || {}) : resources);
        const nextScore = computeValidationScore(generationReport, nextConflicts);
        setTimetable(nextTimetable);
        setConflictReport(nextConflicts);
        setFacultyTimetable(nextFacultyTimetable);
        setLocationTimetable(nextLocationTimetable);
        setFacultyWorkloadReport(nextFacultyWorkload);
        setResourceUtilizationReport(nextResourceUtilization);
        setValidationScore(nextScore);
        if (activeSemester?.id) saveSemester(activeSemester.id, {
            timetable: nextTimetable,
            conflictReport: nextConflicts,
            facultyTimetable: nextFacultyTimetable,
            locationTimetable: nextLocationTimetable,
            facultyWorkloadReport: nextFacultyWorkload,
            resourceUtilizationReport: nextResourceUtilization,
            validationScore: nextScore,
            scheduleVersions,
        });
        recordAuditEvent({
            type: "edit",
            title: "Timetable session moved and revalidated",
            detail: `${nextConflicts.conflicts?.length || 0} conflicts remain after the manual change.`,
        });
    };

    const studioSubTabs = [
        { id: "division", label: "Division View", icon: <GraduationCap className="w-3.5 h-3.5" /> },
        { id: "faculty", label: "Faculty View", icon: <UserCheck className="w-3.5 h-3.5" /> },
        { id: "location", label: "Location / Labs", icon: <Building2 className="w-3.5 h-3.5" /> },
        { id: "batch", label: "Batch View", icon: <Users className="w-3.5 h-3.5" /> },
    ];

    return (
        <div className="min-h-screen flex flex-col text-[#344945]" style={{ background: 'linear-gradient(180deg, #f7f9f8 0%, #f3f6f5 52%, #eef3f1 100%)' }}>
            {/* Unified Smart Header with Navigation Switcher & Integrated Stage Bar */}
            <AppHeader
                activeView={activeView}
                onViewChange={setActiveView}
                activeStep={activeStep}
                maxUnlockedStep={maxUnlockedStep}
                onStepClick={setActiveStep}
                hasData={hasData}
                canGenerate={activeStep === 3 && blockingUploadIssues.length === 0}
                hasTimetable={hasTimetable}
                stats={stats}
                onReset={handleReset}
                onGenerate={() => isMultiDept ? runCollegeTimetableGeneration() : runTimetableGeneration()}
                isGenerating={isGenerating}
                timetable={timetable}
                activeSemester={activeSemester}
                onExitToSemesters={handleExitToSemesters}
                departments={activeStep > 1 ? workspaceDepartments : []}
                selectedDepartment={activeDepartment}
                onDepartmentChange={setSelectedDeptFilter}
            />

            <input ref={fileInputRef} type="file" accept=".xlsx,.xls" onChange={handleFile} className="hidden" aria-label="Replace semester workbook" />

            <AnimatePresence>
                {isImporting && (
                    <AtlasLoadingScreen onComplete={() => setIsImporting(false)} isBusy={isGenerating} />
                )}
            </AnimatePresence>

            {/* Main Content Area */}
            <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-6">
                <AnimatePresence mode="wait">
                    {/* VIEW 1: HOME SHOWCASE PAGE */}
                    {activeView === "home" && (
                        <motion.div
                            key="homeView"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            transition={{ duration: 0.2 }}
                        >
                            <HomePage onLaunchStudio={() => setActiveView("semesters")} />
                        </motion.div>
                    )}

                    {/* VIEW 2: SEMESTER DASHBOARD (LOBBY) */}
                    {activeView === "semesters" && (
                        <motion.div
                            key="semestersView"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            transition={{ duration: 0.2 }}
                        >
                            <SemesterDashboard onEnterSemester={handleEnterSemester} />
                        </motion.div>
                    )}

                    {/* VIEW 2: TIMETABLE STUDIO PAGE */}
                    {activeView === "studio" && (
                        <motion.div
                            key="studioView"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            transition={{ duration: 0.2 }}
                            className="space-y-6"
                        >
                            {/* Screen-level Back to Semesters Action */}
                            {activeSemester && (
                            <div className="flex items-center justify-between gap-3 pb-3 border-b border-[#dce6e2]/75">
                                    <button
                                        onClick={handleExitToSemesters}
                                        className="flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-[#47645d] bg-white hover:bg-[#f6f9f7] border border-[#e1e9e6] rounded-xl transition-all cursor-pointer"
                                    >
                                        <ChevronLeft className="w-4 h-4" />
                                        <span>Back to Semesters</span>
                                    </button>
                                </div>
                            )}

                            {/* STAGE 1: UPLOAD STATION */}
                            {activeStep === 1 && !hasData && (
                                <div className="mx-auto max-w-4xl space-y-8 py-3 sm:py-8">
                                    <div className="flex flex-col gap-5 border-b border-[#b8ccc8]/45 pb-6 sm:flex-row sm:items-end sm:justify-between">
                                        <div className="max-w-2xl">
                                            <div className="mb-3 flex items-center gap-2">
                                                <span className="inline-flex h-7 items-center gap-2 rounded-full border border-[#b8ccc8]/70 bg-white/75 px-3 text-[10px] font-extrabold uppercase tracking-[0.14em] text-[#3730a3] shadow-xs">
                                                    <span className="h-1.5 w-1.5 rounded-full bg-[#4338ca]" /> Semester setup
                                                </span>
                                                <span className="text-[10px] font-bold tracking-[0.12em] text-[#94a3b8]">01 / 02</span>
                                            </div>
                                            <h2 className="text-3xl font-extrabold leading-tight tracking-[-0.04em] text-[#102b2a] sm:text-4xl">
                                                Start with your timetable file.
                                            </h2>
                                            <p className="mt-2 max-w-xl text-sm leading-6 text-[#607573]">
                                                Add the semester workbook and ATLAS will map its course, constraint, and resource data for you.
                                            </p>
                                        </div>
                                        <div className="flex shrink-0 items-center gap-2 text-[11px] font-semibold text-[#607573] sm:pb-1">
                                            <span className="rounded-lg border border-[#b8ccc8]/60 bg-white/70 px-2.5 py-1.5">XLSX</span>
                                            <span className="rounded-lg border border-[#b8ccc8]/60 bg-white/70 px-2.5 py-1.5">XLS</span>
                                            <span className="text-[#94a3b8]">Up to 10 MB</span>
                                        </div>
                                    </div>

                                    <div
                                        onDragOver={(event) => { event.preventDefault(); setIsDraggingFile(true); }}
                                        onDragLeave={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setIsDraggingFile(false); }}
                                        onDrop={(event) => { event.preventDefault(); setIsDraggingFile(false); handleFile(event); }}
                                        className={`relative overflow-hidden rounded-[28px] border bg-white/90 p-1.5 shadow-[0_24px_70px_-42px_rgba(15,70,65,0.35)] transition-all duration-300 ${isDraggingFile ? "border-[#4338ca] bg-[#effbf8] shadow-[0_24px_70px_-32px_rgba(13,148,136,0.32)]" : "border-[#d2e0dc] hover:border-[#9cc7bd]"}`}
                                    >
                                        <button
                                            type="button"
                                            onClick={() => fileInputRef.current?.click()}
                                            className="group grid w-full cursor-pointer grid-cols-1 items-center gap-6 rounded-[22px] border border-dashed border-[#c5d8d2] px-6 py-8 text-left transition-colors hover:border-[#4338ca]/60 sm:grid-cols-[1fr_auto] sm:px-10 sm:py-10"
                                        >
                                            <span className="flex items-start gap-5">
                                                <span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-[#e7f5f1] text-[#3730a3] ring-1 ring-inset ring-[#cce6de] transition-transform duration-300 group-hover:scale-105">
                                                    <FileSpreadsheet className="h-6 w-6" />
                                                </span>
                                                <span className="min-w-0 pt-0.5">
                                                    <span className="block text-base font-bold tracking-tight text-[#142f2d]">
                                                        {uploadedFileName || "Drop your workbook here"}
                                                    </span>
                                                    <span className="mt-1.5 block text-sm leading-5 text-[#718581]">
                                                        {uploadedFileName ? "Choose another file or drop it here to replace." : "Drag and drop your Excel file, or browse from your device."}
                                                    </span>
                                                </span>
                                            </span>
                                            <span className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[#102f2d] px-5 text-sm font-bold text-white shadow-sm transition-all group-hover:bg-[#0d766e] group-hover:shadow-md sm:ml-auto">
                                                <Upload className="h-4 w-4" />
                                                Browse files
                                            </span>
                                        </button>
                                    </div>

                                    {uploadValidation.length > 0 && (
                                        <section aria-label="Workbook validation results" className="space-y-2">
                                            {uploadValidation.map((item, index) => {
                                                const style = item.level === "error"
                                                    ? "border-rose-200 bg-rose-50 text-rose-900"
                                                    : item.level === "warning"
                                                        ? "border-amber-200 bg-amber-50 text-amber-900"
                                                        : "border-indigo-200 bg-indigo-50 text-indigo-900";
                                                return <article key={`${item.title}-${index}`} className={`rounded-xl border px-4 py-3 ${style}`}>
                                                    <div className="flex items-start gap-2.5"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" /><div><p className="text-xs font-extrabold">{item.sheet ? `${item.sheet} · ` : ""}{item.title}</p><p className="mt-1 text-[11px] leading-5 opacity-80">{item.detail}</p></div></div>
                                                </article>;
                                            })}
                                        </section>
                                    )}

                                    <div className="flex flex-col justify-between gap-3 px-1 text-xs text-[#81938f] sm:flex-row sm:items-center">
                                        <span>Includes course load, constraints, and room resources.</span>
                                        <span className="inline-flex items-center gap-2 font-semibold text-[#607573]"><ShieldCheck className="h-4 w-4 text-[#4338ca]" /> Files are checked before processing</span>
                                    </div>

                                    {/* Sheet Detection Checklist */}
                                    {false && hasData && (
                                        <div className="p-4 rounded-2xl bg-white border border-[#b8ccc8] shadow-xs space-y-3">
                                            <h4 className="text-xs font-extrabold uppercase text-[#64748b] tracking-wider">
                                                {isMultiDept ? "Multi-Department Detection" : "Sheet Detection Checklist"}
                                            </h4>

                                            {isMultiDept && (
                                                <div className="flex items-center gap-2 mb-2">
                                                    <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#fef3c7] text-[#92400e] border border-[#fcd34d] text-xs font-extrabold">
                                                        <School className="w-3.5 h-3.5" /> College-Wide Mode
                                                    </span>
                                                    <span className="text-xs text-[#64748b] font-medium">
                                                        {departmentOrder.length} departments detected: {departmentOrder.join(", ")}
                                                    </span>
                                                </div>
                                            )}

                                            {isMultiDept ? (
                                                <div className="flex flex-wrap items-center gap-2">
                                                    {departmentOrder.map((dept) => (
                                                        <span key={dept} className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#eef2ff] text-[#3730a3] border border-[#c7d2fe] text-xs font-extrabold">
                                                            <CheckCircle2 className="w-3.5 h-3.5" /> {dept}
                                                        </span>
                                                    ))}
                                                    {(collegeData?.globalConstraints || []).length > 0 && (
                                                        <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#fef3c7] text-[#92400e] border border-[#fcd34d] text-xs font-extrabold">
                                                            <Globe className="w-3.5 h-3.5" /> Global ({(collegeData?.globalConstraints || []).length})
                                                        </span>
                                                    )}
                                                </div>
                                            ) : (
                                                <div className="flex flex-wrap items-center gap-2">
                                                    <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#eef2ff] text-[#3730a3] border border-[#c7d2fe] text-xs font-extrabold">
                                                        <CheckCircle2 className="w-3.5 h-3.5" /> Sheet 1: Course Load ✓
                                                    </span>
                                                    <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#eef2ff] text-[#3730a3] border border-[#c7d2fe] text-xs font-extrabold">
                                                        <CheckCircle2 className="w-3.5 h-3.5" /> Sheet 2: Constraints ✓
                                                    </span>
                                                    <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#eef2ff] text-[#3730a3] border border-[#c7d2fe] text-xs font-extrabold">
                                                        <CheckCircle2 className="w-3.5 h-3.5" /> Sheet 3: Resources ✓
                                                    </span>
                                                    <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#eef2ff] text-[#3730a3] border border-[#c7d2fe] text-xs font-extrabold">
                                                        <CheckCircle2 className="w-3.5 h-3.5" /> Sync Rules ✓
                                                    </span>
                                                </div>
                                            )}

                                            {/* v6.5: Show department diagnostics */}
                                            {isMultiDept && collegeData?.globalDiagnostics?.length > 0 && (
                                                <div className="mt-2 p-2 rounded-lg bg-[#fef2f2] border border-[#fecaca]">
                                                    <div className="flex items-center gap-1.5 text-xs font-extrabold text-[#b91c1c] mb-1">
                                                        <AlertTriangle className="w-3.5 h-3.5" /> Diagnostics
                                                    </div>
                                                    {collegeData.globalDiagnostics.slice(0, 5).map((d, i) => (
                                                        <div key={i} className="text-[10px] text-[#b91c1c] font-medium">
                                                            [{d.level}] {d.message}
                                                        </div>
                                                    ))}
                                                </div>
                                            )}

                                            <div className="flex justify-end pt-2">
                                                <ShimmerButton onClick={() => setActiveStep(2)} variant="primary" className="py-2 px-4 text-xs font-bold">
                                                    <span>Proceed to Configuration</span>
                                                    <ChevronRight className="w-4 h-4" />
                                                </ShimmerButton>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            {hasData && !isImporting && activeStep === 1 && (
                                <motion.section initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} className="mx-auto max-w-4xl space-y-4 border-t border-[#b8ccc8]/45 pt-7">
                                    <div className="flex items-end justify-between gap-3 px-1">
                                        <div>
                                            <p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-[#4338ca]">Your workspaces</p>
                                            <h3 className="mt-1 text-xl font-bold tracking-tight text-[#142f2d]">Choose a department</h3>
                                        </div>
                                        <div className="flex items-center gap-3 pb-1"><span className="text-xs font-medium text-[#81938f]">{isMultiDept ? `${departmentOrder.length} available` : "1 available"}</span><button type="button" onClick={() => fileInputRef.current?.click()} className="text-[11px] font-bold text-indigo-700 transition-colors hover:text-indigo-900">Replace workbook</button></div>
                                    </div>
                                    {uploadValidation.filter((item) => item.level === "error" || item.level === "warning").length > 0 && <div className="space-y-2">{uploadValidation.filter((item) => item.level === "error" || item.level === "warning").map((item, index) => <div key={`${item.title}-${index}`} className={`rounded-xl border px-3 py-2 text-[11px] ${item.level === "error" ? "border-rose-200 bg-rose-50 text-rose-900" : "border-amber-200 bg-amber-50 text-amber-900"}`}><span className="font-extrabold">{item.sheet ? `${item.sheet} · ` : ""}{item.title}:</span> {item.detail}</div>)}</div>}
                                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                                        {(isMultiDept ? departmentOrder : [activeSemester?.department || "Department"]).map((dept) => {
                                            const courseCount = isMultiDept ? (collegeData?.departments?.[dept]?.subjects?.length || 0) : subjects.length;
                                            const generated = Boolean(departmentResults[dept] || (!isMultiDept && hasTimetable));
                                            const configured = configuredDepartments.includes(dept);
                                            const reviewed = reviewedDepartments.includes(dept);
                                            const stageLabel = reviewed ? "Reviewed" : generated ? "Ready for review" : configured ? "Rules reviewed" : "Ready to configure";
                                            return (
                                            <button key={dept} onClick={() => { setSelectedDeptFilter(dept); setActiveStep(2); }} className="group relative flex min-h-[112px] items-center gap-4 overflow-hidden rounded-2xl border border-[#d2e0dc] bg-white/85 p-4 text-left shadow-[0_8px_24px_-20px_rgba(15,70,65,0.5)] transition-all duration-200 hover:-translate-y-0.5 hover:border-[#83b8ab] hover:bg-white hover:shadow-[0_18px_38px_-24px_rgba(15,70,65,0.32)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4338ca]">
                                                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-[#edf6f3] text-[#3730a3] ring-1 ring-inset ring-[#dcebe6] transition-colors group-hover:bg-[#dff2ec]"><School className="h-5 w-5" /></span>
                                                <span className="min-w-0 flex-1"><span className="block truncate text-sm font-bold tracking-tight text-[#142f2d]">{dept}</span><span className="mt-1 block text-xs font-medium text-[#81938f]">{courseCount} courses · {stageLabel}</span><span className="mt-2 flex gap-1" aria-label={`${dept} workflow progress`}>{["Import", "Rules", "Generate", "Review"].map((stage, index) => { const done = index === 0 || (index === 1 && configured) || (index === 2 && generated) || (index === 3 && reviewed); return <span key={stage} title={stage} className={`h-1 flex-1 rounded-full ${done ? "bg-indigo-500" : "bg-slate-200"}`} />; })}</span></span>
                                                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-[#4338ca] transition-all group-hover:bg-[#102f2d] group-hover:text-white"><ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" /></span>
                                            </button>
                                            );
                                        })}
                                    </div>
                                </motion.section>
                            )}

                            {/* STAGE 2: CONFIGURATION WORKSTATION */}
                            {activeStep === 2 && (
                                <div className="space-y-5">
                                    <div className="flex flex-wrap items-center justify-between gap-3">
                                        <div>
                                            <h2 className="text-lg font-extrabold text-[#0f172a]">
                                                Configuration Workstation
                                            </h2>
                                            <p className="text-xs text-[#64748b] font-medium">
                                                Review course load, set global constraint badges, and configure sync rules.
                                            </p>
                                        </div>

                                        <AnimatedTabs
                                            tabs={configSubTabs}
                                            activeTab={configTab}
                                            onChange={setConfigTab}
                                        />
                                    </div>

                                    {/* Sub-Tab Views */}
                                    {configTab === "courses" && <YearWiseCourses key={activeDepartment} yearWiseData={activeDepartmentYearWiseData} />}
                                    {configTab === "constraints" && (
                                        <GlobalConstraints
                                            globalConstraints={globalConstraints}
                                            setGlobalConstraints={setGlobalConstraints}
                                        />
                                    )}
                                    {configTab === "external" && (
                                        <ExternalCourses
                                            yearWiseData={yearWiseData}
                                            setYearWiseData={setYearWiseData}
                                        />
                                    )}
                                    {configTab === "sync" && (
                                        <SyncRuleBuilder
                                            subjects={activeDepartmentSubjects}
                                            syncRules={syncRules}
                                            setSyncRules={setSyncRules}
                                        />
                                    )}
                                    {configTab === "faculty_avail" && (
                                        <FacultyConstraints
                                            facultyConstraints={facultyConstraints}
                                            setFacultyConstraints={setFacultyConstraints}
                                        />
                                    )}

                                    {/* Bottom Navigation Bar */}
                                    <div className="flex items-center justify-between border-t border-[#b8ccc8] pt-3.5">
                                        <button
                                            onClick={() => setActiveStep(1)}
                                            className="flex items-center gap-1 text-xs font-extrabold text-[#64748b] hover:text-[#0f172a]"
                                        >
                                            <ChevronLeft className="w-4 h-4" />
                                            <span>Back to Import</span>
                                        </button>
                                        <ShimmerButton onClick={() => {
                                            const nextConfigured = [...new Set([...configuredDepartments, activeDepartment])];
                                            setConfiguredDepartments(nextConfigured);
                                            if (activeSemester?.id) saveSemester(activeSemester.id, { configuredDepartments: nextConfigured, yearWiseData, globalConstraints, syncRules, resources, facultyConstraints });
                                            setActiveStep(3);
                                        }} variant="primary" className="py-2 px-4 text-xs font-bold">
                                            <span>Proceed to Engine Diagnostics</span>
                                            <ChevronRight className="w-4 h-4" />
                                        </ShimmerButton>
                                    </div>
                                </div>
                            )}

                            {/* STAGE 3: ENGINE DIAGNOSTICS & GENERATION */}
                            {activeStep === 3 && (
                                <div className="max-w-2xl mx-auto py-4 space-y-5">
                                    <div className="text-center space-y-1.5">
                                        <span className="px-3 py-0.5 text-[10px] font-extrabold uppercase rounded-full bg-[#eef2ff] text-[#3730a3] border border-[#c7d2fe] inline-block">
                                            Stage 3 • Pre-Flight Engine Diagnostics
                                        </span>
                                        <h2 className="text-xl font-extrabold text-[#0f172a]">
                                            {isMultiDept ? "Ready for College-Wide Timetable Generation" : "Ready for Intelligent Timetable Generation"}
                                        </h2>
                                        <p className="text-xs text-[#64748b] font-medium max-w-md mx-auto">
                                            {isMultiDept
                                                ? `${departmentOrder.length} departments will be independently processed with shared constraint enforcement.`
                                                : "Review metric statistics before launching the constraint-solving engine."
                                            }
                                        </p>
                                    </div>

                                    <section className="rounded-2xl border border-indigo-100 bg-indigo-50/40 p-4" aria-label="Pre-generation checklist">
                                        <div className="flex flex-wrap items-center justify-between gap-3">
                                            <div><p className="text-xs font-extrabold text-slate-900">Pre-generation checklist</p><p className="mt-1 text-[11px] text-slate-500">Resolve workbook errors before starting; warnings can be reviewed after generation.</p></div>
                                            <span className={`rounded-full px-2.5 py-1 text-[10px] font-extrabold ${blockingUploadIssues.length ? "bg-rose-100 text-rose-800" : "bg-indigo-100 text-indigo-800"}`}>{blockingUploadIssues.length ? `${blockingUploadIssues.length} blocking` : "Ready to run"}</span>
                                        </div>
                                        <div className="mt-3 grid gap-2 sm:grid-cols-2">
                                            {[
                                                { label: "Course rows", detail: `${subjects.length} parsed`, complete: subjects.length > 0 },
                                                { label: "Department workspaces", detail: `${workspaceDepartments.length} found`, complete: workspaceDepartments.length > 0 },
                                                { label: "Faculty assignments", detail: missingFacultyCourses ? `${missingFacultyCourses} courses need faculty` : "Assignments present", complete: missingFacultyCourses === 0 },
                                                { label: "Fixed sessions", detail: `${globalConstraints.length} imported`, complete: globalConstraints.length > 0 },
                                                { label: "Rooms and labs", detail: `${roomCount} resources`, complete: roomCount > 0 },
                                                { label: "Shared faculty", detail: coordinationItems.length ? `${coordinationItems.length} cross-department assignments` : "No shared faculty detected", complete: true },
                                            ].map((item) => <div key={item.label} className="flex items-center gap-2 rounded-xl border border-white bg-white/80 px-3 py-2"><span className={`grid h-5 w-5 shrink-0 place-items-center rounded-full ${item.complete ? "bg-indigo-100 text-indigo-700" : "bg-amber-100 text-amber-700"}`}>{item.complete ? <CheckCircle2 className="h-3.5 w-3.5" /> : <AlertTriangle className="h-3.5 w-3.5" />}</span><span className="min-w-0 flex-1"><span className="block text-[10px] font-bold text-slate-700">{item.label}</span><span className="block text-[10px] text-slate-500">{item.detail}</span></span></div>)}
                                        </div>
                                        {blockingUploadIssues.length > 0 && <div className="mt-3 space-y-1">{blockingUploadIssues.map((item, index) => <p key={`${item.title}-${index}`} className="text-[11px] font-semibold text-rose-800">{item.sheet ? `${item.sheet}: ` : ""}{item.title} — {item.detail}</p>)}</div>}
                                        {coordinationItems.length > 0 && <div className="mt-3 border-t border-indigo-100 pt-3">{coordinationItems.slice(0, 3).map((item) => <p key={item.title} className="text-[10px] leading-5 text-indigo-900"><span className="font-extrabold">{item.title}:</span> {item.detail}</p>)}</div>}
                                    </section>

                                    {/* v6.5: Department overview cards for multi-dept */}
                                    {isMultiDept && (
                                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                                            {departmentOrder.map((dept) => {
                                                const deptInfo = collegeData?.departments?.[dept];
                                                const deptResult = departmentResults[dept];
                                                return (
                                                    <div key={dept} className="p-3 rounded-xl bg-white border border-[#b8ccc8] shadow-xs">
                                                        <div className="text-sm font-extrabold text-[#3730a3]">{dept}</div>
                                                        <div className="text-[10px] text-[#64748b] font-medium mt-1">
                                                            {deptInfo?.subjects?.length || 0} courses •{" "}
                                                            {Object.keys(deptInfo?.yearWiseData || {}).length} years
                                                        </div>
                                                        {deptResult && (
                                                            <div className="text-[10px] mt-1">
                                                                <span className="text-[#10b981] font-bold">{deptResult.allocatedCount} allocated</span>
                                                                {deptResult.unallocatedCount > 0 && (
                                                                    <span className="text-[#f59e0b] font-bold ml-2">{deptResult.unallocatedCount} pending</span>
                                                                )}
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}

                                    {/* Metric Statistics Cards */}
                                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
                                        <div className="p-3.5 rounded-xl bg-white border border-[#b8ccc8] text-center shadow-xs">
                                            <div className="text-xl font-extrabold text-[#3730a3]">{totalSessionsCount}</div>
                                            <div className="text-[9.5px] text-[#64748b] font-bold uppercase mt-0.5">Total Sessions</div>
                                        </div>
                                        <div className="p-3.5 rounded-xl bg-white border border-[#b8ccc8] text-center shadow-xs">
                                            <div className="text-xl font-extrabold text-[#10b981]">{allocatedSessionsCount}</div>
                                            <div className="text-[9.5px] text-[#64748b] font-bold uppercase mt-0.5">Allocated</div>
                                        </div>
                                        <div className="p-3.5 rounded-xl bg-white border border-[#b8ccc8] text-center shadow-xs">
                                            <div className="text-xl font-extrabold text-[#f59e0b]">{remainingBacklogCount}</div>
                                            <div className="text-[9.5px] text-[#64748b] font-bold uppercase mt-0.5">Remaining</div>
                                        </div>
                                        <div className="p-3.5 rounded-xl bg-white border border-[#b8ccc8] text-center shadow-xs">
                                            <div className="text-xl font-extrabold text-[#3730a3]">{facultyCount}</div>
                                            <div className="text-[9.5px] text-[#64748b] font-bold uppercase mt-0.5">Faculty Count</div>
                                        </div>
                                        <div className="p-3.5 rounded-xl bg-white border border-[#b8ccc8] text-center shadow-xs">
                                            <div className="text-xl font-extrabold text-[#0f172a]">{roomCount}</div>
                                            <div className="text-[9.5px] text-[#64748b] font-bold uppercase mt-0.5">Room Usage</div>
                                        </div>
                                    </div>

                                    {/* Launch Hero Button */}
                                    <div className="text-center pt-2">
                                        {generationError && <div role="alert" className="mx-auto mb-3 max-w-xl rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-left text-xs font-semibold text-rose-900"><p className="font-extrabold">Generation stopped</p><p className="mt-1">{generationError}</p></div>}
                                        {generationProgress.includes("cancelled") && <p role="status" className="mx-auto mb-3 max-w-xl rounded-xl bg-slate-100 px-4 py-2 text-xs font-semibold text-slate-600">{generationProgress}</p>}
                                        {isGenerating ? (
                                            <div className="mx-auto max-w-xl rounded-2xl border border-indigo-100 bg-white p-4 text-left shadow-sm">
                                                <div className="flex items-center justify-between gap-3"><div className="flex min-w-0 items-center gap-2 text-xs font-bold text-slate-800"><Loader2 className="h-4 w-4 shrink-0 animate-spin text-indigo-700" /><span className="truncate">{generationProgress || "Running generation engine…"}</span></div><span className="text-xs font-extrabold tabular-nums text-indigo-800">{generationPercent}%</span></div>
                                                <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-gradient-to-r from-indigo-700 to-indigo-400 transition-[width] duration-300" style={{ width: `${generationPercent}%` }} /></div>
                                                <button type="button" onClick={cancelGeneration} className="mt-3 rounded-lg px-3 py-1.5 text-xs font-bold text-slate-500 transition-colors hover:bg-rose-50 hover:text-rose-700">Cancel generation</button>
                                            </div>
                                        ) : (
                                            <ShimmerButton
                                                onClick={() => isMultiDept ? runCollegeTimetableGeneration() : runTimetableGeneration()}
                                                disabled={blockingUploadIssues.length > 0 || !hasData}
                                                variant="primary"
                                                className="px-7 py-3 text-xs font-extrabold"
                                            >
                                                <Sparkles className="w-4 h-4" />
                                                <span>{isMultiDept ? "Generate College Timetable" : hasTimetable ? "Generate New Version" : "Launch Generation Engine"}</span>
                                            </ShimmerButton>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* STAGE 4: SCHEDULER STUDIO WORKSPACE */}
                            {activeStep === 4 && hasTimetable && (
                                <div className="space-y-5">
                                    <div className="flex flex-wrap items-center justify-between gap-3">
                                        <div>
                                            <h2 className="text-lg font-extrabold text-[#0f172a]">
                                                {isMultiDept ? `${studioDepartment} Scheduler Studio` : "Scheduler Studio Workspace"}
                                            </h2>
                                            <p className="text-xs text-[#64748b] font-medium">
                                                {isMultiDept
                                                    ? `Timetable views are scoped to ${studioDepartment}. Switch departments from the workspace bar above.`
                                                    : "Compact 2D matrix scheduler for Division, Faculty, Location, and Batch schedules."
                                                }
                                            </p>
                                        </div>

                                        <AnimatedTabs
                                            tabs={studioSubTabs}
                                            activeTab={studioTab}
                                            onChange={setStudioTab}
                                        />
                                    </div>

                                    {/* Each scheduler view is derived from the active department's divisions. */}
                                    {studioTab === "division" && (
                                        <TimetableGrid timetableObj={studioTimetable} />
                                    )}
                                    {studioTab === "faculty" && (
                                        <FacultyTimetableGrid facultyTimetable={studioFacultyTimetable} />
                                    )}
                                    {studioTab === "location" && (
                                        <LocationTimetableGrid locationTimetable={studioLocationTimetable} />
                                    )}
                                    {studioTab === "batch" && (
                                        <BatchTimetableGrid timetableObj={studioTimetable} />
                                    )}

                                    {/* Bottom Navigation */}
                                    <div className="flex items-center justify-between border-t border-[#b8ccc8] pt-3.5">
                                        <button
                                            onClick={() => setActiveStep(3)}
                                            className="flex items-center gap-1 text-xs font-extrabold text-[#64748b] hover:text-[#0f172a]"
                                        >
                                            <ChevronLeft className="w-4 h-4" />
                                            <span>Back to Engine Diagnostics</span>
                                        </button>
                                        <ShimmerButton onClick={() => {
                                            setActiveStep(5);
                                        }} variant="primary" className="py-2 px-4 text-xs font-bold">
                                            <span>Continue to Review & Refine</span>
                                            <ChevronRight className="w-4 h-4" />
                                        </ShimmerButton>
                                    </div>
                                </div>
                            )}

                            {/* STAGE 5: REVIEW AND REFINE */}
                            {activeStep === 5 && hasTimetable && (
                                <div className="space-y-5">
                                    <div className="flex flex-wrap items-end justify-between gap-3">
                                        <div>
                                            <p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-[#4338ca]">Stage 5 · Schedule quality</p>
                                            <h2 className="mt-1 text-lg font-extrabold text-[#0f172a]">Review & Refine</h2>
                                            <p className="mt-1 text-xs font-medium text-[#64748b]">Resolve conflicts, adjust sessions, compare versions, and check department coordination.</p>
                                        </div>
                                        {isMultiDept && <span className="rounded-full border border-[#d5eae2] bg-white px-3 py-1.5 text-[11px] font-bold text-[#294943]">{studioDepartment} workspace</span>}
                                    </div>

                                    <ScheduleWorkbench
                                        timetable={studioTimetable}
                                        generationReport={generationReport}
                                        department={isMultiDept ? studioDepartment : ""}
                                        comparisonTimetable={timetable}
                                        conflictReport={conflictReport}
                                        onApplyTimetable={handleApplyScheduleEdit}
                                        onValidateTimetable={validateScheduleEdit}
                                        scheduleVersions={scheduleVersions}
                                        auditTrail={auditTrail}
                                        facultyWorkloadReport={isMultiDept ? generateFacultyWorkloadReport(studioTimetable, []) : facultyWorkloadReport}
                                        resourceUtilizationReport={resourceUtilizationReport}
                                        coordinationItems={coordinationItems}
                                    />

                                    <div className="flex items-center justify-between border-t border-[#b8ccc8] pt-3.5">
                                        <button onClick={() => setActiveStep(4)} className="flex items-center gap-1 text-xs font-extrabold text-[#64748b] hover:text-[#0f172a]">
                                            <ChevronLeft className="w-4 h-4" />
                                            <span>Back to Scheduler Studio</span>
                                        </button>
                                        <ShimmerButton onClick={() => {
                                            const nextReviewed = [...new Set([...reviewedDepartments, activeDepartment])];
                                            setReviewedDepartments(nextReviewed);
                                            if (activeSemester?.id) saveSemester(activeSemester.id, { reviewedDepartments: nextReviewed });
                                            recordAuditEvent({ type: "review", title: `${activeDepartment || "Department"} schedule reviewed`, detail: `${conflictReport?.conflicts?.length || 0} detected conflicts in the current workspace.` });
                                            setActiveStep(6);
                                        }} variant="primary" className="py-2 px-4 text-xs font-bold">
                                            <span>Proceed to Analytics & Export</span>
                                            <ChevronRight className="w-4 h-4" />
                                        </ShimmerButton>
                                    </div>
                                </div>
                            )}

                            {/* STAGE 6: ANALYTICS & EXPORT */}
                            {activeStep === 6 && hasReport && (
                                <div className="space-y-5">
                                    <div className="flex flex-wrap items-center justify-between gap-3">
                                        <div>
                                            <h2 className="text-lg font-extrabold text-[#0f172a]">
                                                Analytics & Excel Export Station
                                            </h2>
                                            <p className="text-xs text-[#64748b] font-medium">
                                                System validation score, faculty workload breakdown, conflict matrix & Excel export.
                                            </p>
                                        </div>

                                        <ExportButton
                                            timetable={timetable}
                                            report={generationReport}
                                            conflictReport={conflictReport}
                                            facultyWorkloadReport={facultyWorkloadReport}
                                            resourceUtilizationReport={resourceUtilizationReport}
                                            facultyTimetable={facultyTimetable}
                                            locationTimetable={locationTimetable}
                                            validationScore={validationScore}
                                            isMultiDept={isMultiDept}
                                            departmentOrder={departmentOrder}
                                            departmentResults={departmentResults}
                                            facultyRegistryReport={facultyRegistryReport}
                                        />
                                    </div>

                                    <GenerationReport
                                        report={generationReport}
                                        conflictReport={conflictReport}
                                        facultyWorkloadReport={facultyWorkloadReport}
                                        resourceUtilizationReport={resourceUtilizationReport}
                                        validationScore={validationScore}
                                        optimizationReport={optimizationReport}
                                    />
                                </div>
                            )}
                        </motion.div>
                    )}
                </AnimatePresence>
            </main>

            {/* Enterprise App Footer */}
            <AppFooter />
        </div>
    );
}
