"use client";

import React, { useState, useRef } from "react";
import * as XLSX from "xlsx";
import { motion, AnimatePresence } from "framer-motion";
import { 
    Upload, Sliders, PlayCircle, Grid, BarChart3, ChevronRight, ChevronLeft, 
    Sparkles, CheckCircle2, FileSpreadsheet, Layers, ShieldCheck, Zap, 
    BookOpen, Users, MapPin, Globe, Link2, UserCheck, GraduationCap, Building2, Loader2
} from "lucide-react";

import { parseGlobalConstraints } from "../utils/parseGlobalConstraints";
import { parseResourcesSheet } from "../utils/parseResourcesSheet";
import { parseLoadSheet } from "../utils/parseLoadSheet";
import { buildYearWiseData } from "../utils/buildYearWiseData";
import { parseSyncConstraints, autoDetectSyncConstraints } from "../utils/parseSyncConstraints";
import { parseFacultyConstraints } from "../utils/parseFacultyConstraints";
import { generateSmartTimetable } from "../utils/generateSmartTimetable";

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

import MagicCard from "./ui/MagicCard";
import ShimmerButton from "./ui/ShimmerButton";
import BorderBeam from "./ui/BorderBeam";
import AnimatedTabs from "./ui/AnimatedTabs";
import AppHeader from "./ui/AppHeader";
import AppFooter from "./ui/AppFooter";
import SemesterDashboard from "./SemesterDashboard";
import { saveSemester } from "../utils/semesterStore";

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

    // Multi-Step Stage State
    const [activeStep, setActiveStep] = useState(1);
    const [configTab, setConfigTab] = useState("courses");
    const [studioTab, setStudioTab] = useState("division");
    const [isGenerating, setIsGenerating] = useState(false);

    const fileInputRef = useRef(null);

    const handleReset = () => {
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
            setFacultyTimetable(semester.facultyTimetable || null);
            setLocationTimetable(semester.locationTimetable || null);
            setValidationScore(semester.validationScore || null);
            setOptimizationReport(semester.optimizationReport || null);
            setYearWiseData(semester.yearWiseData || {});
            setGlobalConstraints(semester.globalConstraints || []);
            setSyncRules(semester.syncRules || []);
            setResources(semester.resources || { classrooms: [], labs: [], tutorialRooms: [] });
            setFacultyConstraints(semester.facultyConstraints || []);
            setActiveStep(semester.timetable ? 4 : 1);
        } else {
            handleReset();
        }
        setActiveView("studio");
    };

    const handleExitToSemesters = () => {
        handleReset();
        setActiveSemester(null);
        setActiveView("semesters");
    };

    const runTimetableGeneration = (
        targetGroupedData = yearWiseData,
        targetGlobalConstraints = globalConstraints,
        targetSyncRules = syncRules,
        targetResources = resources
    ) => {
        if (!targetGroupedData || Object.keys(targetGroupedData).length === 0) return;

        setIsGenerating(true);

        setTimeout(() => {
            const facultyAvailability = parseFacultyConstraints(facultyConstraints);
            const result = generateSmartTimetable(
                targetGroupedData,
                targetGlobalConstraints,
                targetSyncRules,
                targetResources,
                30,
                facultyAvailability
            );

            setGenerationReport(result.report);
            setTimetable(result.timetable);
            setConflictReport(result.conflictReport || null);
            setFacultyWorkloadReport(result.facultyWorkloadReport || null);
            setResourceUtilizationReport(result.resourceUtilizationReport || null);
            setFacultyTimetable(result.facultyTimetable || null);
            setLocationTimetable(result.locationTimetable || null);
            setValidationScore(result.validationScore || null);
            setOptimizationReport(result.optimizationReport || null);

            // Auto-save to active semester workspace
            if (activeSemester?.id) {
                saveSemester(activeSemester.id, {
                    timetable: result.timetable,
                    report: result.report,
                    conflictReport: result.conflictReport || null,
                    facultyWorkloadReport: result.facultyWorkloadReport || null,
                    resourceUtilizationReport: result.resourceUtilizationReport || null,
                    facultyTimetable: result.facultyTimetable || null,
                    locationTimetable: result.locationTimetable || null,
                    validationScore: result.validationScore || null,
                    optimizationReport: result.optimizationReport || null,
                    yearWiseData: targetGroupedData,
                    globalConstraints: targetGlobalConstraints,
                    syncRules: targetSyncRules,
                    resources: targetResources,
                    facultyConstraints,
                });
            }

            setIsGenerating(false);
            setActiveStep(4);
            setActiveView("studio");
        }, 500);
    };

    const handleFile = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Security Shield: Enforce 10MB maximum file size limit (DoS / Memory Exhaustion Protection)
        const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10MB
        if (file.size > MAX_FILE_SIZE_BYTES) {
            alert("Security Warning: File exceeds 10MB maximum size limit. Please upload a valid department workbook.");
            return;
        }

        const reader = new FileReader();

        reader.onload = (event) => {
            const workbook = XLSX.read(event.target.result, { type: "binary" });
            const allSheets = {};

            workbook.SheetNames.forEach((sheetName) => {
                const worksheet = workbook.Sheets[sheetName];
                const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: "" });
                allSheets[sheetName] = rows.filter((row) => row.some((cell) => cell !== ""));
            });

            setSheets(allSheets);
            setSelectedSheet(workbook.SheetNames[0]);

            // Sheet Detection Checklist
            setDetectedSheets({
                loadSheet: Boolean(allSheets[workbook.SheetNames[0]]),
                constraintsSheet: Boolean(allSheets[workbook.SheetNames[1]]),
                resourcesSheet: Boolean(allSheets[workbook.SheetNames[2]]),
                syncSheet: Boolean(allSheets["SYNC_CONSTRAINTS"] || allSheets[workbook.SheetNames[3]]),
            });

            const loadSheet = allSheets[workbook.SheetNames[0]] || [];
            const globalConstraintSheet = allSheets[workbook.SheetNames[1]] || [];
            const resourceSheet = allSheets[workbook.SheetNames[2]] || [];

            const parsedResources = parseResourcesSheet(resourceSheet);
            setResources(parsedResources);

            const parsedSubjects = parseLoadSheet(loadSheet);
            const groupedData = buildYearWiseData(parsedSubjects);

            setSubjects(parsedSubjects);
            setYearWiseData(groupedData);

            const parsedConstraints = parseGlobalConstraints(globalConstraintSheet);
            setGlobalConstraints(parsedConstraints);

            const syncSheet = allSheets["SYNC_CONSTRAINTS"] || allSheets[workbook.SheetNames[3]] || [];
            const parsedSyncConstraints = parseSyncConstraints(syncSheet);
            const autoDetectedSync = autoDetectSyncConstraints(parsedSubjects);
            const activeRules = [...parsedSyncConstraints, ...autoDetectedSync];
            setSyncRules(activeRules);

            runTimetableGeneration(groupedData, parsedConstraints, activeRules, parsedResources);
            setActiveStep(2); // Auto advance to Configuration Step
            setActiveView("studio");
        };

        reader.readAsBinaryString(file);
    };

    const hasData = Object.keys(yearWiseData).length > 0;
    const hasTimetable = timetable !== null;
    const hasReport = generationReport !== null;

    const maxUnlockedStep = hasTimetable ? 5 : hasData ? 3 : 1;

    // Metric Statistics
    const totalSessionsCount = subjects.reduce((sum, s) => sum + (s.lectureCount || s.lectures || 3), 0);
    const allocatedSessionsCount = generationReport?.allocatedSessions || totalSessionsCount;
    const remainingBacklogCount = generationReport?.unallocatedSessions || 0;
    const facultyCount = new Set(subjects.map((s) => s.faculty).filter(Boolean)).size;
    const roomCount = (resources.classrooms?.length || 0) + (resources.labs?.length || 0);

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

    const studioSubTabs = [
        { id: "division", label: "Division View", icon: <GraduationCap className="w-3.5 h-3.5" /> },
        { id: "faculty", label: "Faculty View", icon: <UserCheck className="w-3.5 h-3.5" /> },
        { id: "location", label: "Location / Labs", icon: <Building2 className="w-3.5 h-3.5" /> },
        { id: "batch", label: "Batch View", icon: <Users className="w-3.5 h-3.5" /> },
    ];

    return (
        <div className="min-h-screen flex flex-col text-[#334155] font-sans" style={{ background: 'linear-gradient(180deg, #f0f6f4 0%, #e4edea 30%, #d8e4e0 100%)' }}>
            {/* Unified Smart Header with Navigation Switcher & Integrated Stage Bar */}
            <AppHeader
                activeView={activeView}
                onViewChange={setActiveView}
                activeStep={activeStep}
                maxUnlockedStep={maxUnlockedStep}
                onStepClick={setActiveStep}
                hasData={hasData}
                hasTimetable={hasTimetable}
                stats={stats}
                onReset={handleReset}
                onGenerate={() => runTimetableGeneration()}
                isGenerating={isGenerating}
                timetable={timetable}
                activeSemester={activeSemester}
                onExitToSemesters={handleExitToSemesters}
            />

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
                                <div className="flex items-center justify-between gap-3 pb-1 border-b border-[#b8ccc8]/30">
                                    <button
                                        onClick={handleExitToSemesters}
                                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-extrabold text-[#0f766e] bg-[#ccfbf1]/80 hover:bg-[#ccfbf1] border border-[#99f6e4] rounded-xl transition-all shadow-2xs cursor-pointer"
                                    >
                                        <ChevronLeft className="w-4 h-4" />
                                        <span>Back to Semesters</span>
                                    </button>
                                </div>
                            )}

                            {/* STAGE 1: UPLOAD STATION */}
                            {activeStep === 1 && (
                                <div className="max-w-2xl mx-auto py-4 space-y-5">
                                    <div className="text-center space-y-1.5">
                                        <span className="px-3 py-0.5 text-[10px] font-extrabold uppercase rounded-full bg-[#ccfbf1] text-[#0f766e] border border-[#99f6e4] inline-block">
                                            Stage 1 • Master File Upload
                                        </span>
                                        <h2 className="text-2xl font-extrabold text-[#0f172a] tracking-tight">
                                            Import Department Schedule Workbook
                                        </h2>
                                        <p className="text-xs text-[#64748b] max-w-md mx-auto font-medium">
                                            Upload your Excel file containing Course Load, Global Constraints, and Room Resources.
                                        </p>
                                    </div>

                                    {/* Upload Station Card */}
                                    <MagicCard
                                        className="p-8 text-center cursor-pointer bg-white border border-[#b8ccc8] hover:border-[#0d9488] shadow-xs transition-all group"
                                        onClick={() => fileInputRef.current?.click()}
                                    >
                                        <BorderBeam size={200} duration={10} delay={0} colorFrom="#0d9488" colorTo="#ccfbf1" />

                                        <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-[#ccfbf1]/60 border border-[#99f6e4] flex items-center justify-center text-[#0f766e] group-hover:scale-105 transition-transform">
                                            <FileSpreadsheet className="w-7 h-7" />
                                        </div>

                                        <h3 className="text-base font-extrabold text-[#0f172a] mb-1">
                                            Drag & Drop Excel File or Click to Browse
                                        </h3>
                                        <p className="text-xs text-[#64748b] mb-5 font-medium">
                                            Supports .xlsx and .xls formats (Load Sheet, Constraints, Resources)
                                        </p>

                                        <ShimmerButton variant="primary" className="py-2 px-5 text-xs font-extrabold">
                                            <Upload className="w-4 h-4" />
                                            <span>Select Excel Workbook</span>
                                        </ShimmerButton>

                                        <input
                                            ref={fileInputRef}
                                            type="file"
                                            accept=".xlsx,.xls"
                                            onChange={handleFile}
                                            className="hidden"
                                        />
                                    </MagicCard>

                                    {/* Sheet Detection Checklist */}
                                    {hasData && (
                                        <div className="p-4 rounded-2xl bg-white border border-[#b8ccc8] shadow-xs space-y-3">
                                            <h4 className="text-xs font-extrabold uppercase text-[#64748b] tracking-wider">
                                                Sheet Detection Checklist
                                            </h4>
                                            <div className="flex flex-wrap items-center gap-2">
                                                <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#ccfbf1] text-[#0f766e] border border-[#99f6e4] text-xs font-extrabold">
                                                    <CheckCircle2 className="w-3.5 h-3.5" /> Sheet 1: Course Load ✓
                                                </span>
                                                <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#ccfbf1] text-[#0f766e] border border-[#99f6e4] text-xs font-extrabold">
                                                    <CheckCircle2 className="w-3.5 h-3.5" /> Sheet 2: Constraints ✓
                                                </span>
                                                <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#ccfbf1] text-[#0f766e] border border-[#99f6e4] text-xs font-extrabold">
                                                    <CheckCircle2 className="w-3.5 h-3.5" /> Sheet 3: Resources ✓
                                                </span>
                                                <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#ccfbf1] text-[#0f766e] border border-[#99f6e4] text-xs font-extrabold">
                                                    <CheckCircle2 className="w-3.5 h-3.5" /> Sync Rules ✓
                                                </span>
                                            </div>

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
                                    {configTab === "courses" && <YearWiseCourses yearWiseData={yearWiseData} />}
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
                                            subjects={subjects}
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
                                        <ShimmerButton onClick={() => setActiveStep(3)} variant="primary" className="py-2 px-4 text-xs font-bold">
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
                                        <span className="px-3 py-0.5 text-[10px] font-extrabold uppercase rounded-full bg-[#ccfbf1] text-[#0f766e] border border-[#99f6e4] inline-block">
                                            Stage 3 • Pre-Flight Engine Diagnostics
                                        </span>
                                        <h2 className="text-xl font-extrabold text-[#0f172a]">
                                            Ready for Intelligent Timetable Generation
                                        </h2>
                                        <p className="text-xs text-[#64748b] font-medium max-w-md mx-auto">
                                            Review metric statistics before launching the constraint-solving engine.
                                        </p>
                                    </div>

                                    {/* Metric Statistics Cards */}
                                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
                                        <div className="p-3.5 rounded-xl bg-white border border-[#b8ccc8] text-center shadow-xs">
                                            <div className="text-xl font-extrabold text-[#0f766e]">{totalSessionsCount}</div>
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
                                            <div className="text-xl font-extrabold text-[#0f766e]">{facultyCount}</div>
                                            <div className="text-[9.5px] text-[#64748b] font-bold uppercase mt-0.5">Faculty Count</div>
                                        </div>
                                        <div className="p-3.5 rounded-xl bg-white border border-[#b8ccc8] text-center shadow-xs">
                                            <div className="text-xl font-extrabold text-[#0f172a]">{roomCount}</div>
                                            <div className="text-[9.5px] text-[#64748b] font-bold uppercase mt-0.5">Room Usage</div>
                                        </div>
                                    </div>

                                    {/* Launch Hero Button */}
                                    <div className="text-center pt-2">
                                        <ShimmerButton
                                            onClick={() => runTimetableGeneration()}
                                            disabled={isGenerating}
                                            variant="primary"
                                            className="px-7 py-3 text-xs font-extrabold"
                                        >
                                            {isGenerating ? (
                                                <>
                                                    <Loader2 className="w-4 h-4 animate-spin text-white" />
                                                    <span>Running Generation Engine...</span>
                                                </>
                                            ) : (
                                                <>
                                                    <Sparkles className="w-4 h-4" />
                                                    <span>Launch Generation Engine</span>
                                                </>
                                            )}
                                        </ShimmerButton>
                                    </div>
                                </div>
                            )}

                            {/* STAGE 4: SCHEDULER STUDIO WORKSPACE */}
                            {activeStep === 4 && hasTimetable && (
                                <div className="space-y-5">
                                    <div className="flex flex-wrap items-center justify-between gap-3">
                                        <div>
                                            <h2 className="text-lg font-extrabold text-[#0f172a]">
                                                Scheduler Studio Workspace
                                            </h2>
                                            <p className="text-xs text-[#64748b] font-medium">
                                                Compact 2D matrix scheduler for Division, Faculty, Location, and Batch schedules.
                                            </p>
                                        </div>

                                        <AnimatedTabs
                                            tabs={studioSubTabs}
                                            activeTab={studioTab}
                                            onChange={setStudioTab}
                                        />
                                    </div>

                                    {/* Scheduler Views */}
                                    {studioTab === "division" && <TimetableGrid timetableObj={timetable} />}
                                    {studioTab === "faculty" && (
                                        <FacultyTimetableGrid facultyTimetable={facultyTimetable} />
                                    )}
                                    {studioTab === "location" && (
                                        <LocationTimetableGrid locationTimetable={locationTimetable} />
                                    )}
                                    {studioTab === "batch" && (
                                        <BatchTimetableGrid timetableObj={timetable} />
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
                                        <ShimmerButton onClick={() => setActiveStep(5)} variant="primary" className="py-2 px-4 text-xs font-bold">
                                            <span>Proceed to Analytics & Export</span>
                                            <ChevronRight className="w-4 h-4" />
                                        </ShimmerButton>
                                    </div>
                                </div>
                            )}

                            {/* STAGE 5: ANALYTICS & EXPORT */}
                            {activeStep === 5 && hasReport && (
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