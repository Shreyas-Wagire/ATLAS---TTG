"use client";

import React from "react";
import { 
    Sparkles, Cpu, ShieldCheck, Zap, Layers, ArrowRight, 
    CheckCircle2, Users, FileSpreadsheet, BarChart3, Database, Code, Award, BookOpen, Beaker, XCircle
} from "lucide-react";
import ShimmerButton from "./ui/ShimmerButton";

export default function HomePage({ onLaunchStudio }) {
    const [showChangelog, setShowChangelog] = React.useState(false);

    return (
        <div className="space-y-16 py-6 max-w-6xl mx-auto relative">
            {/* 1. HERO SECTION */}
            <section className="text-center space-y-6 pt-6">
                <div className="flex flex-wrap items-center justify-center gap-2">
                    <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-amber-100 text-amber-900 border border-amber-300 text-xs font-extrabold shadow-2xs">
                        <Beaker className="w-3.5 h-3.5 text-amber-600" />
                        <span>ATLAS Engine v3.4 • RELEASE BUILD</span>
                    </div>

                    {/* Interactive Version v3.4 Changelog Pill */}
                    <button
                        onClick={() => setShowChangelog(true)}
                        className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#ccfbf1] text-[#0f766e] border border-[#99f6e4] text-xs font-extrabold shadow-2xs hover:scale-105 transition-transform cursor-pointer"
                    >
                        <Sparkles className="w-3.5 h-3.5 text-[#0d9488]" />
                        <span>What's New in v3.4</span>
                        <span className="px-1.5 py-0.2 rounded-md bg-[#0d9488] text-white text-[9px] font-black">CHANGELOG</span>
                    </button>
                </div>

                <div className="flex items-center justify-center pt-2">
                    <img src="/atlas-logo-light.png" alt="ATLAS Logo" className="h-16 sm:h-22 w-auto object-contain mx-auto drop-shadow-sm" />
                </div>

                <h1 className="text-3xl sm:text-5xl font-extrabold text-[#0f172a] tracking-tight leading-tight max-w-4xl mx-auto">
                    Next-Generation Academic Timetable Engine
                </h1>

                <p className="text-sm sm:text-base text-[#64748b] max-w-2xl mx-auto font-medium leading-relaxed">
                    Powered by the proprietary <strong className="text-[#0d9488]">ATLAS Algorithm v3.4</strong> (Adaptive Timetable and Learning Allocation System). Real-time faculty occupancy solver, zero-conflict matrix scheduling, and multi-pass practical optimization.
                </p>

                <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
                    <ShimmerButton
                        onClick={onLaunchStudio}
                        variant="primary"
                        className="py-3 px-7 text-xs sm:text-sm font-extrabold"
                    >
                        <span>Launch Timetable Studio (v3.4)</span>
                        <ArrowRight className="w-4 h-4" />
                    </ShimmerButton>

                    <a
                        href="#atlas-algorithm"
                        className="px-5 py-2.5 rounded-xl text-xs font-bold text-[#0f766e] bg-white border border-[#b8ccc8] hover:bg-[#ebf4f2] transition-colors"
                    >
                        Explore ATLAS Algorithm ↓
                    </a>
                </div>
            </section>

            {/* VERSION v3.4 CHANGELOG MODAL */}
            {showChangelog && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeInUp">
                    <div className="bg-white rounded-2xl border border-[#b8ccc8] shadow-2xl max-w-xl w-full p-6 space-y-5 relative overflow-hidden">
                        <div className="flex items-start justify-between gap-3 border-b border-[#b8ccc8]/40 pb-4">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-2xl bg-[#ccfbf1] border border-[#99f6e4] flex items-center justify-center text-[#0d9488]">
                                    <Sparkles className="w-5 h-5" />
                                </div>
                                <div>
                                    <h3 className="text-base font-extrabold text-[#0f172a]">
                                        ATLAS Engine v3.4 Changelog
                                    </h3>
                                    <p className="text-xs text-[#64748b] font-medium">
                                        Release highlights and system architectural improvements
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={() => setShowChangelog(false)}
                                className="p-1.5 rounded-lg hover:bg-slate-100 text-[#64748b] transition-colors cursor-pointer"
                            >
                                <XCircle className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="space-y-3.5 max-h-[60vh] overflow-y-auto pr-1 no-scrollbar text-xs">
                            {/* Feature 1: Faculty Occupancy & Optimizer Engine */}
                            <div className="p-3.5 rounded-xl bg-[#ebf4f2]/70 border border-[#b8ccc8]/60 space-y-1">
                                <div className="font-extrabold text-[#0f766e] flex items-center gap-1.5">
                                    <Cpu className="w-4 h-4 text-[#0d9488]" />
                                    1. In-Memory Faculty Occupancy & Optimizer Engine
                                </div>
                                <p className="text-[#475569] font-medium leading-relaxed">
                                    Scans all scheduled sessions during generation to create in-memory `facultyOccupancy` maps and `facultyStats`. Automatically resolves double-bookings, dampens consecutive lecture streaks, and executes 1-hop session moves & swaps with full compatibility checks.
                                </p>
                            </div>

                            {/* Feature 2: Faculty Constraints & Time Availability */}
                            <div className="p-3.5 rounded-xl bg-[#ebf4f2]/70 border border-[#b8ccc8]/60 space-y-1">
                                <div className="font-extrabold text-[#0f766e] flex items-center gap-1.5">
                                    <Users className="w-4 h-4 text-[#0d9488]" />
                                    2. Faculty Constraints & Time Availability Management
                                </div>
                                <p className="text-[#475569] font-medium leading-relaxed">
                                    Configurable per-faculty time availability rules, blocked slot preferences, maximum daily teaching load boundaries, and automatic conflict prevention during session allocation.
                                </p>
                            </div>

                            {/* Feature 3: Semester Creation & Workspace Lifecycle */}
                            <div className="p-3.5 rounded-xl bg-[#ebf4f2]/70 border border-[#b8ccc8]/60 space-y-1">
                                <div className="font-extrabold text-[#0f766e] flex items-center gap-1.5">
                                    <BookOpen className="w-4 h-4 text-[#0d9488]" />
                                    3. Semester Workspace Creation & Lifecycle Controls
                                </div>
                                <p className="text-[#475569] font-medium leading-relaxed">
                                    Complete semester workspace creation system with full lifecycle status controls: transition seamlessly between Draft, Active, and Archived states, or permanently delete unwanted semester workspaces.
                                </p>
                            </div>

                            {/* Feature 4: Subject-Group Practical Solver */}
                            <div className="p-3.5 rounded-xl bg-[#ebf4f2]/70 border border-[#b8ccc8]/60 space-y-1">
                                <div className="font-extrabold text-[#0f766e] flex items-center gap-1.5">
                                    <Layers className="w-4 h-4 text-[#0d9488]" />
                                    4. Subject-Group-First Practical Allocation Solver
                                </div>
                                <p className="text-[#475569] font-medium leading-relaxed">
                                    Multi-pass practical solver grouping parallel lab sessions by subject, supporting up to 2 lab blocks per batch per day with 3-pass retry guarantees.
                                </p>
                            </div>
                        </div>


                        <div className="flex justify-end pt-2 border-t border-[#b8ccc8]/40">
                            <button
                                onClick={() => setShowChangelog(false)}
                                className="px-4 py-2 rounded-xl bg-[#0d9488] hover:bg-[#0f766e] text-white font-extrabold text-xs transition-colors cursor-pointer"
                            >
                                Close Changelog
                            </button>
                        </div>
                    </div>
                </div>
            )}


            {/* 2. PROPRIETARY ALGORITHM: ATLAS */}
            <section id="atlas-algorithm" className="space-y-6 scroll-mt-20">
                <div className="text-center space-y-2">
                    <span className="px-3 py-0.5 text-[10px] font-extrabold uppercase rounded-full bg-[#ccfbf1] text-[#0f766e] border border-[#99f6e4] inline-block">
                        Proprietary Algorithm
                    </span>
                    <h2 className="text-2xl sm:text-3xl font-extrabold text-[#0f172a]">
                        The ATLAS Algorithm
                    </h2>
                    <p className="text-xs sm:text-sm text-[#0f766e] font-extrabold max-w-xl mx-auto uppercase tracking-wider">
                        Adaptive Timetable and Learning Allocation System
                    </p>
                </div>

                {/* Research Paper Citation Callout Box */}
                <div className="p-4 rounded-xl bg-white border-l-4 border-l-[#0d9488] border-t border-r border-b border-[#b8ccc8] shadow-2xs font-mono text-xs text-[#334155] space-y-1">
                    <div className="flex items-center gap-2 font-bold text-[#0f766e]">
                        <BookOpen className="w-4 h-4" />
                        <span>Academic Research Citation Paper Specification</span>
                    </div>
                    <p className="italic text-[#64748b]">
                        &quot;We propose <strong>ATLAS</strong>, a 4-layer intelligent scheduling algorithm for conflict-free university timetable generation using topological hard anchor reservation, parallel hyper-graph batch packing, dynamic entropy-guided swapping, and evolutionary fitness minimization.&quot;
                    </p>
                </div>

                {/* 4-Layer Architecture Diagram */}
                <div className="p-6 rounded-2xl bg-white border border-[#b8ccc8] shadow-xs space-y-6">
                    <h3 className="text-sm font-extrabold uppercase tracking-wider text-[#64748b] text-center">
                        4-Layer Constraint Solver Pipeline Architecture
                    </h3>

                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        {/* Layer 1 */}
                        <div className="p-4 rounded-xl bg-[#ebf4f2] border border-[#b8ccc8] space-y-2">
                            <div className="flex items-center justify-between">
                                <span className="px-2 py-0.5 text-[9px] font-extrabold rounded bg-[#0d9488] text-white">
                                    LAYER 1
                                </span>
                                <span className="text-[10px] font-bold text-[#0f766e]">THARM</span>
                            </div>
                            <h4 className="text-xs font-extrabold text-[#0f172a]">Topological Hard Anchor Reservation</h4>
                            <p className="text-[11px] text-[#64748b] leading-tight">
                                Immutably locks global fixed courses (MILFL, Aptitude) into a 3D matrix ($Class \times Day \times Slot$) with break-aware slot masking.
                            </p>
                        </div>

                        {/* Layer 2 */}
                        <div className="p-4 rounded-xl bg-[#ebf4f2] border border-[#b8ccc8] space-y-2">
                            <div className="flex items-center justify-between">
                                <span className="px-2 py-0.5 text-[9px] font-extrabold rounded bg-[#0d9488] text-white">
                                    LAYER 2
                                </span>
                                <span className="text-[10px] font-bold text-[#0f766e]">PHGBP</span>
                            </div>
                            <h4 className="text-xs font-extrabold text-[#0f172a]">Parallel Hyper-Graph Batch Packing</h4>
                            <p className="text-[11px] text-[#64748b] leading-tight">
                                Treats tutorial/lab batches (S1-S12) as nodes in a Conflict Hyper-Graph, splitting colors to maximize room efficiency.
                            </p>
                        </div>

                        {/* Layer 3 */}
                        <div className="p-4 rounded-xl bg-[#ebf4f2] border border-[#b8ccc8] space-y-2">
                            <div className="flex items-center justify-between">
                                <span className="px-2 py-0.5 text-[9px] font-extrabold rounded bg-[#0d9488] text-white">
                                    LAYER 3
                                </span>
                                <span className="text-[10px] font-bold text-[#0f766e]">DEGES</span>
                            </div>
                            <h4 className="text-xs font-extrabold text-[#0f172a]">Dynamic Entropy-Guided Swapping</h4>
                            <p className="text-[11px] text-[#64748b] leading-tight">
                                Mimics human-brain backtracking. Calculates slot tightness (entropy) and executes directed swapping to heal unallocated sessions.
                            </p>
                        </div>

                        {/* Layer 4 */}
                        <div className="p-4 rounded-xl bg-[#ebf4f2] border border-[#b8ccc8] space-y-2">
                            <div className="flex items-center justify-between">
                                <span className="px-2 py-0.5 text-[9px] font-extrabold rounded bg-[#0d9488] text-white">
                                    LAYER 4
                                </span>
                                <span className="text-[10px] font-bold text-[#0f766e]">MTEFM</span>
                            </div>
                            <h4 className="text-xs font-extrabold text-[#0f172a]">Evolutionary Fitness Minimizer</h4>
                            <p className="text-[11px] text-[#64748b] leading-tight">
                                Evaluates fitness penalty across trials until Penalty reaches 0 (100% Conflict-Free Guarantee).
                            </p>
                        </div>
                    </div>

                    {/* Mathematical Penalty Formula Box */}
                    <div className="p-4 rounded-xl bg-[#0f172a] text-white space-y-2 text-center">
                        <span className="text-[10px] font-extrabold uppercase text-[#99f6e4] tracking-widest">
                            Mathematical Fitness Penalty Minimizer Formula
                        </span>
                        <div className="font-mono text-xs sm:text-sm text-[#ccfbf1] font-bold overflow-x-auto py-1">
                            Penalty = (10000 × FacultyClashes) + (1000 × MissingSessions) + (500 × RoomClashes) + (200 × BreakViolations) → 0
                        </div>
                        <p className="text-[11px] text-[#94a3b8]">
                            Target: Penalty Score = 0 (Guarantees zero faculty double-bookings and zero room overlaps).
                        </p>
                    </div>
                </div>

                {/* ATLAS vs Traditional Comparison */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Traditional Systems Card */}
                    <div className="p-6 rounded-2xl bg-white border border-red-200 shadow-2xs space-y-4">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-red-50 border border-red-200 flex items-center justify-center text-red-600 font-bold">
                                <XCircle className="w-5 h-5 text-red-600" />
                            </div>
                            <div>
                                <h3 className="text-base font-extrabold text-[#0f172a]">
                                    Traditional Schedulers
                                </h3>
                                <p className="text-xs text-red-700 font-semibold">
                                    Brute Force & Basic Genetic Algorithms
                                </p>
                            </div>
                        </div>

                        <ul className="space-y-2.5 text-xs text-[#475569]">
                            <li className="flex items-start gap-2">
                                <span className="text-red-500 font-bold">•</span>
                                <span><strong>Combinatorial Explosion:</strong> Explodes exponentially ($O(N!)$), resulting in build timeouts on large academic loads.</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <span className="text-red-500 font-bold">•</span>
                                <span><strong>Non-Deterministic Output:</strong> Genetic algorithms leave hidden faculty double-bookings or unallocated slots.</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <span className="text-red-500 font-bold">•</span>
                                <span><strong>No Elective Sync Support:</strong> Fails to synchronize same-slot elective courses across different divisions.</span>
                            </li>
                        </ul>
                    </div>

                    {/* ATLAS Engine Card */}
                    <div className="p-6 rounded-2xl bg-white border border-[#0d9488] shadow-xs space-y-4 relative overflow-hidden">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-[#ccfbf1] border border-[#99f6e4] flex items-center justify-center text-[#0f766e] font-bold">
                                <Cpu className="w-5 h-5" />
                            </div>
                            <div>
                                <h3 className="text-base font-extrabold text-[#0f172a]">
                                    ATLAS Algorithm
                                </h3>
                                <p className="text-xs text-[#0f766e] font-semibold">
                                    Adaptive Timetable & Learning Allocation System
                                </p>
                            </div>
                        </div>

                        <ul className="space-y-2.5 text-xs text-[#334155]">
                            <li className="flex items-start gap-2">
                                <CheckCircle2 className="w-4 h-4 text-[#0d9488] shrink-0 mt-0.5" />
                                <span><strong>Zero Hallucination / Zero Duplication:</strong> Eliminates duplicate subject entries like ARP-I vs Aptitude and Reasoning - Part III.</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <CheckCircle2 className="w-4 h-4 text-[#0d9488] shrink-0 mt-0.5" />
                                <span><strong>Self-Healing Backtracking:</strong> Automatically repairs isolated clashes without requiring manual user intervention.</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <CheckCircle2 className="w-4 h-4 text-[#0d9488] shrink-0 mt-0.5" />
                                <span><strong>Multi-Level Single Pass:</strong> Instantly generates Division, Faculty, Location, and Batch timetables in a single pass.</span>
                            </li>
                        </ul>
                    </div>
                </div>
            </section>

            {/* 3. UNIQUENESS & CORE FEATURES */}
            <section className="space-y-6">
                <div className="text-center space-y-2">
                    <span className="px-3 py-0.5 text-[10px] font-extrabold uppercase rounded-full bg-[#ccfbf1] text-[#0f766e] border border-[#99f6e4] inline-block">
                        Platform Uniqueness
                    </span>
                    <h2 className="text-2xl sm:text-3xl font-extrabold text-[#0f172a]">
                        Built Specifically for Academic Excellence
                    </h2>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="p-5 rounded-2xl bg-white border border-[#b8ccc8] shadow-2xs space-y-2">
                        <div className="w-9 h-9 rounded-lg bg-[#ccfbf1] text-[#0f766e] flex items-center justify-center mb-3 font-bold">
                            <Layers className="w-4 h-4" />
                        </div>
                        <h4 className="text-sm font-extrabold text-[#0f172a]">4 Multi-Dimensional Views</h4>
                        <p className="text-xs text-[#64748b] leading-relaxed">
                            Simultaneous matrix generation for Division schedules, Faculty workloads, Room occupancy, and Batch groups.
                        </p>
                    </div>

                    <div className="p-5 rounded-2xl bg-white border border-[#b8ccc8] shadow-2xs space-y-2">
                        <div className="w-9 h-9 rounded-lg bg-[#ccfbf1] text-[#0f766e] flex items-center justify-center mb-3 font-bold">
                            <Zap className="w-4 h-4" />
                        </div>
                        <h4 className="text-sm font-extrabold text-[#0f172a]">Elective Sync Rules</h4>
                        <p className="text-xs text-[#64748b] leading-relaxed">
                            Auto-detects and enforces same-slot synchronization for elective courses across multiple year divisions.
                        </p>
                    </div>

                    <div className="p-5 rounded-2xl bg-white border border-[#b8ccc8] shadow-2xs space-y-2">
                        <div className="w-9 h-9 rounded-lg bg-[#ccfbf1] text-[#0f766e] flex items-center justify-center mb-3 font-bold">
                            <BarChart3 className="w-4 h-4" />
                        </div>
                        <h4 className="text-sm font-extrabold text-[#0f172a]">Static 2D Scheduler</h4>
                        <p className="text-xs text-[#64748b] leading-relaxed">
                            Clean, uncluttered 2D table representation with distinct color coding for Normal, Lab, Tut, Sync, and Fixed slots.
                        </p>
                    </div>

                    <div className="p-5 rounded-2xl bg-white border border-[#b8ccc8] shadow-2xs space-y-2">
                        <div className="w-9 h-9 rounded-lg bg-[#ccfbf1] text-[#0f766e] flex items-center justify-center mb-3 font-bold">
                            <FileSpreadsheet className="w-4 h-4" />
                        </div>
                        <h4 className="text-sm font-extrabold text-[#0f172a]">Multi-Sheet Excel Export</h4>
                        <p className="text-xs text-[#64748b] leading-relaxed">
                            Exports complete master workbooks with individual sheets for Division, Faculty, Location, and Workload analytics.
                        </p>
                    </div>
                </div>
            </section>

            {/* 4. OUR TEAM SECTION */}
            <section className="space-y-6">
                <div className="text-center space-y-2">
                    <span className="px-3 py-0.5 text-[10px] font-extrabold uppercase rounded-full bg-[#ccfbf1] text-[#0f766e] border border-[#99f6e4] inline-block">
                        Engineering Team
                    </span>
                    <h2 className="text-2xl sm:text-3xl font-extrabold text-[#0f172a]">
                        Architects of ATLAS
                    </h2>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                    <div className="p-6 rounded-2xl bg-white border border-[#b8ccc8] text-center shadow-2xs space-y-3">
                        <div className="w-14 h-14 mx-auto rounded-full bg-[#ccfbf1] border border-[#99f6e4] flex items-center justify-center text-[#0f766e] font-extrabold text-lg">
                            <Code className="w-6 h-6" />
                        </div>
                        <div>
                            <h4 className="text-base font-extrabold text-[#0f172a]">Algorithm Architect</h4>
                            <span className="text-[11px] font-bold text-[#0f766e] px-2.5 py-0.5 rounded-full bg-[#ccfbf1] border border-[#99f6e4] inline-block mt-1">
                                ATLAS Engine Solver
                            </span>
                        </div>
                        <p className="text-xs text-[#64748b]">
                            Designed THARM, PHGBP, DEGES self-healing backtracking, and MTEFM fitness penalty minimizer.
                        </p>
                    </div>

                    <div className="p-6 rounded-2xl bg-white border border-[#b8ccc8] text-center shadow-2xs space-y-3">
                        <div className="w-14 h-14 mx-auto rounded-full bg-[#ccfbf1] border border-[#99f6e4] flex items-center justify-center text-[#0f766e] font-extrabold text-lg">
                            <Layers className="w-6 h-6" />
                        </div>
                        <div>
                            <h4 className="text-base font-extrabold text-[#0f172a]">Senior Systems Engineer</h4>
                            <span className="text-[11px] font-bold text-[#0f766e] px-2.5 py-0.5 rounded-full bg-[#ccfbf1] border border-[#99f6e4] inline-block mt-1">
                                Data Models & Parser
                            </span>
                        </div>
                        <p className="text-xs text-[#64748b]">
                            Engineered the Excel sheet auto-detection parser, resource mapping, and multi-sheet XLSX export engine.
                        </p>
                    </div>

                    <div className="p-6 rounded-2xl bg-white border border-[#b8ccc8] text-center shadow-2xs space-y-3">
                        <div className="w-14 h-14 mx-auto rounded-full bg-[#ccfbf1] border border-[#99f6e4] flex items-center justify-center text-[#0f766e] font-extrabold text-lg">
                            <Award className="w-6 h-6" />
                        </div>
                        <div>
                            <h4 className="text-base font-extrabold text-[#0f172a]">Lead UI/UX Architect</h4>
                            <span className="text-[11px] font-bold text-[#0f766e] px-2.5 py-0.5 rounded-full bg-[#ccfbf1] border border-[#99f6e4] inline-block mt-1">
                                Minimal Cool Mint SaaS Interface
                            </span>
                        </div>
                        <p className="text-xs text-[#64748b]">
                            Created the 3-tier contrast layout, clean static 2D matrix visualization, and integrated stage pipeline.
                        </p>
                    </div>
                </div>
            </section>

            {/* 5. BOTTOM CTA BANNER */}
            <section className="p-8 sm:p-10 rounded-3xl bg-white border border-[#0d9488] text-center space-y-4 shadow-sm relative overflow-hidden">
                <h3 className="text-xl sm:text-2xl font-extrabold text-[#0f172a]">
                    Ready to Generate Your Department Timetable with ATLAS?
                </h3>
                <p className="text-xs sm:text-sm text-[#64748b] max-w-md mx-auto font-medium">
                    Upload your course load workbook and let the ATLAS engine solve constraints in seconds during this Beta Testing phase.
                </p>

                <div className="pt-2">
                    <ShimmerButton
                        onClick={onLaunchStudio}
                        variant="primary"
                        className="py-3 px-8 text-xs sm:text-sm font-extrabold"
                    >
                        <span>Launch Timetable Studio Now (Beta)</span>
                        <ArrowRight className="w-4 h-4" />
                    </ShimmerButton>
                </div>
            </section>
        </div>
    );
}
