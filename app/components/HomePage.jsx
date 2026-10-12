"use client";

import React, { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { motion, useReducedMotion } from "framer-motion";
import { 
    Sparkles, Cpu, ShieldCheck, Zap, Layers, ArrowRight, Download,
    CheckCircle2, Users, FileSpreadsheet, BarChart3, Database, Code, Calendar, Building2, Search,
    BookOpen, Beaker, X, ChevronRight,
    Activity, Clock, Sliders, Check
} from "lucide-react";
import ShimmerButton from "./ui/ShimmerButton";

const V67_RELEASE_NOTES = [
    { icon: Layers, title: "Workspace navigation and department context", detail: "Added clear view switching, semester context, stage navigation, and department tabs so users can move through college-wide workflows without losing their place." },
    { icon: FileSpreadsheet, title: "Workbook setup and department progress", detail: "Added department overview cards, configuration and review progress, and clearer workbook validation and generation feedback." },
    { icon: Activity, title: "Schedule review workbench", detail: "Added conflict and unallocated-session review, schedule comparisons, resource balance, and validated manual session moves." },
    { icon: Download, title: "Flexible exports", detail: "Added department-wise XLSX downloads, worksheet selection, custom filenames, and print-ready PDF output through the browser print dialog." },
    { icon: Cpu, title: "Responsive layouts and custom 404", detail: "Improved narrow-screen editing controls and touch scrolling for wide tables, and added a branded not-found page with a route back to ATLAS." },
    { icon: Search, title: "Workspace dashboard refinements", detail: "Improved workspace search, status filters, lifecycle actions, and responsive cards for semester management." },
];

const V65_RELEASE_NOTES = [
    { icon: Database, title: "Multi-department workbook parser", detail: "Recognizes department-scoped workbook sheets, parses their course loads and scheduling inputs, and validates workbook structure before generation." },
    { icon: Cpu, title: "Unified college-wide generation", detail: "Coordinates department schedules through shared college occupancy so faculty, rooms, labs, and tutorial spaces are considered across the institution." },
    { icon: Users, title: "Canonical faculty registry", detail: "Resolves shared faculty identities across departments and disambiguates duplicate initials for consistent scheduling and reports." },
    { icon: Building2, title: "Department-aware resource tracking", detail: "Tracks department ownership and current scheduling context while maintaining college-wide availability for shared resources." },
    { icon: BarChart3, title: "Master and department reports", detail: "Produces combined timetables with per-department allocation results, diagnostics, workload and resource summaries, and validation results." },
    { icon: Clock, title: "Persistent college workspaces", detail: "Stores department configuration, generation results, review status, schedule comparison snapshots, and audit events in semester workspaces." },
];

/* ── Scroll-reveal hook for subtle micro-transitions ──────────────── */
function useRevealOnScroll() {
    const ref = useRef(null);
    useEffect(() => {
        const el = ref.current;
        if (!el) return;
        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    el.classList.add("visible");
                    observer.unobserve(el);
                }
            },
            { threshold: 0.1, rootMargin: "0px 0px -40px 0px" }
        );
        observer.observe(el);
        return () => observer.disconnect();
    }, []);
    return ref;
}

/* ── Reveal Wrapper Component ─────────────────────────────────────── */
function RevealSection({ children, className = "", delay = 0, id }) {
    const ref = useRevealOnScroll();
    return (
        <section
            id={id}
            ref={ref}
            className={`section-reveal ${className}`}
            style={{ transitionDelay: `${delay}ms` }}
        >
            {children}
        </section>
    );
}

export default function HomePage({ onLaunchStudio }) {
    const [showChangelog, setShowChangelog] = useState(false);
    const [changelogVersion, setChangelogVersion] = useState("all"); // release filter
    const [previewTab, setPreviewTab] = useState("division"); // 'division' | 'faculty' | 'lab'
    const reduceMotion = useReducedMotion();
    const mounted = useSyncExternalStore(
        () => () => {},
        () => true,
        () => false
    );

    useEffect(() => {
        if (!showChangelog) return;
        const handleKeyDown = (e) => {
            if (e.key === "Escape") setShowChangelog(false);
        };
        window.addEventListener("keydown", handleKeyDown);
        const originalOverflow = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        return () => {
            window.removeEventListener("keydown", handleKeyDown);
            document.body.style.overflow = originalOverflow;
        };
    }, [showChangelog]);

    return (
        <div className="relative overflow-hidden">
            <div className="pointer-events-none absolute right-[-14rem] top-8 h-[34rem] w-[34rem] rounded-full border border-[#dce9e3]/70" aria-hidden="true" />
            <div className="pointer-events-none absolute right-[-10rem] top-24 h-[26rem] w-[26rem] rounded-full border border-[#e3ece7]/80" aria-hidden="true" />

            <div className="relative z-10 mx-auto max-w-6xl space-y-20 px-4 pb-16 sm:space-y-24 sm:px-6 lg:px-8">

                {/* ═══════════════════════════════════════════════════════
                    1. HERO SECTION — Modern, Minimal & High-End
                ═══════════════════════════════════════════════════════ */}
                <section className="grid items-center gap-10 pb-2 pt-10 sm:pt-14 lg:grid-cols-[0.92fr_1.08fr] lg:gap-14">
                    <div className="max-w-xl">
                        <div className="mb-6 flex flex-wrap items-center gap-2">
                            <span className="inline-flex items-center gap-2 border-l-2 border-[#4338ca] pl-2.5 text-[10px] font-extrabold uppercase tracking-[0.16em] text-[#55736a]">Academic scheduling, made workable</span>
                            <button type="button" onClick={() => setShowChangelog(true)} className="inline-flex items-center gap-1.5 rounded-full border border-[#dce8e2] bg-white/80 px-2.5 py-1 text-[10px] font-bold text-[#55736a] transition-all hover:border-[#9cc5b6] hover:text-[#3730a3] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4338ca]/40">
                                <Sparkles className="h-3 w-3" /> What&apos;s new <span className="text-[#3730a3]">v6.7</span>
                            </button>
                        </div>
                        <h1 className="max-w-[650px] text-[2.8rem] font-extrabold leading-[1.02] tracking-[0.01em] text-[#1e1b4b] sm:text-6xl lg:text-[4.25rem]">
                            One timetable for <span className="text-[#4338ca]">every year.</span>
                        </h1>
                        <p className="mt-6 max-w-lg text-sm leading-7 text-[#61736d] sm:text-base">
                            Bring departments, courses, faculty, and rooms together in one academic-year workspace. ATLAS builds coordinated schedules across all year levels.
                        </p>

                        <div className="mt-8 flex flex-wrap items-center gap-3">
                            <ShimmerButton onClick={onLaunchStudio} variant="primary" className="h-12 rounded-xl px-5 text-sm font-bold shadow-[0_8px_22px_-14px_rgba(30,27,75,0.7)] transition-transform hover:-translate-y-0.5">
                                <span>Open timetable workspaces</span><ArrowRight className="h-4 w-4" />
                            </ShimmerButton>
                            <a href="#studio-preview" className="inline-flex h-12 items-center gap-2 rounded-xl px-4 text-xs font-bold text-[#55736a] transition-colors hover:bg-white hover:text-[#3730a3] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4338ca]/40">
                                See the workflow <ChevronRight className="h-3.5 w-3.5" />
                            </a>
                        </div>

                        <div className="mt-9 flex flex-wrap gap-x-6 gap-y-2 border-t border-[#dfe9e4] pt-4 text-[10px] font-semibold text-[#71817d]">
                            <span className="inline-flex items-center gap-1.5"><CheckCircle2 className="h-3.5 w-3.5 text-[#4338ca]" /> All year levels in one run</span>
                            <span className="inline-flex items-center gap-1.5"><CheckCircle2 className="h-3.5 w-3.5 text-[#4338ca]" /> Department workspaces</span>
                            <span className="inline-flex items-center gap-1.5"><CheckCircle2 className="h-3.5 w-3.5 text-[#4338ca]" /> Export-ready schedules</span>
                        </div>
                    </div>

                    <motion.div initial={reduceMotion ? false : { opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: reduceMotion ? 0 : 0.45, ease: "easeOut" }} className="relative mx-auto w-full max-w-[620px]">
                        <div className="absolute -inset-4 -z-10 rounded-[34px] border border-[#dfe9e4]" />
                        <div className="overflow-hidden rounded-[24px] border border-[#dce7e2] bg-white shadow-[0_28px_70px_-48px_rgba(20,57,51,0.45)]">
                            <div className="flex items-center justify-between border-b border-[#e9efec] bg-[#fbfcfb] px-4 py-3 sm:px-5">
                                <div className="flex items-center gap-2.5">
                                    <div className="grid h-8 w-8 place-items-center rounded-lg bg-[#eaf5f0] text-[#3730a3]"><Calendar className="h-4 w-4" /></div>
                                    <div><p className="text-[10px] font-bold text-[#294943]">Academic timetable</p><p className="mt-0.5 text-[9px] text-[#8a9994]">AY 2026–27 · All years</p></div>
                                </div>
                                <span className="inline-flex items-center gap-1.5 rounded-full bg-[#f0f8f4] px-2.5 py-1 text-[9px] font-bold text-[#477568]"><span className="h-1.5 w-1.5 rounded-full bg-[#4338ca]" /> Ready to review</span>
                            </div>
                            <div className="p-4 sm:p-5">
                                <div className="mb-4 flex items-center justify-between">
                                    <div><p className="text-xs font-extrabold text-[#294943]">Computer Science</p><p className="mt-0.5 text-[9px] text-[#8a9994]">Division · Year 3</p></div>
                                    <span className="rounded-md border border-[#e6eeea] px-2 py-1 text-[9px] font-semibold text-[#71817d]">Week view</span>
                                </div>
                                <div className="overflow-hidden rounded-xl border border-[#e6ece9]">
                                    <div className="grid grid-cols-[54px_repeat(5,minmax(0,1fr))] border-b border-[#e6ece9] bg-[#f7f9f8] text-center text-[8px] font-bold text-[#84938e]">
                                        <span className="py-2 text-left pl-2">TIME</span>{["MON", "TUE", "WED", "THU", "FRI"].map((day) => <span key={day} className="py-2">{day}</span>)}
                                    </div>
                                    {[
                                        { time: "09:00", cells: ["DSA", "OS", "DBMS", "CN", "DSA"] },
                                        { time: "10:00", cells: ["DBMS", "CN", "OS", "DSA", "—"] },
                                        { time: "11:15", cells: ["LAB", "—", "TUT", "LAB", "OS"] },
                                        { time: "12:15", cells: ["—", "DSA", "CN", "—", "DBMS"] },
                                    ].map((row, rowIndex) => (
                                        <div key={row.time} className="grid grid-cols-[54px_repeat(5,minmax(0,1fr))] border-b border-[#edf1ef] last:border-0">
                                            <span className="flex items-center px-2 text-[8px] font-semibold text-[#94a29d]">{row.time}</span>
                                            {row.cells.map((course, columnIndex) => (
                                                <div key={`${row.time}-${columnIndex}`} className="border-l border-[#edf1ef] p-1">
                                                    <div className={`flex h-8 items-center justify-center rounded-md text-[8px] font-bold ${course === "—" ? "text-[#c0cbc6]" : course === "LAB" ? "bg-[#e3f2eb] text-[#3730a3]" : course === "TUT" ? "bg-[#f1ecf8] text-[#715c91]" : rowIndex % 2 === 0 ? "bg-[#edf4f7] text-[#476476]" : "bg-[#f4f2ea] text-[#76684d]"}`}>{course}</div>
                                                </div>
                                            ))}
                                        </div>
                                    ))}
                                </div>
                                <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-[#edf1ef] pt-3">
                                    <div className="flex items-center gap-1.5 text-[9px] font-semibold text-[#6e8079]"><span className="h-1.5 w-1.5 rounded-full bg-[#4338ca]" /> Department schedule</div>
                                    <div className="flex -space-x-1.5" aria-label="Includes multiple departments">
                                        {["CS", "EL", "+"].map((dept, index) => <span key={dept} className={`grid h-6 w-6 place-items-center rounded-full border-2 border-white text-[7px] font-extrabold ${index === 0 ? "bg-[#dcefe5] text-[#386b55]" : index === 1 ? "bg-[#e9e4f2] text-[#655686]" : "bg-[#f0f3f1] text-[#66756f]"}`}>{dept}</span>)}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                </section>

                {/* ═══════════════════════════════════════════════════════
                    2. PRODUCT PREVIEW — Interactive Studio Showcase
                ═══════════════════════════════════════════════════════ */}
                <RevealSection id="studio-preview" className="scroll-mt-28 px-1">
                    <div className="mb-7 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                        <div><p className="mb-2 text-[9px] font-extrabold uppercase tracking-[0.16em] text-[#0d8b7e]">A closer look</p><h2 className="text-2xl font-extrabold tracking-[-0.045em] text-[#1e1b4b] sm:text-3xl">One schedule, from every angle.</h2></div>
                        <p className="max-w-md text-xs leading-5 text-[#71817d]">Review department timetables alongside faculty loads and room use, then export the complete workbook.</p>
                    </div>
                    <div className="relative overflow-hidden rounded-[26px] border border-[#dce7e2] bg-white shadow-[0_24px_64px_-48px_rgba(20,57,51,0.45)] transition-all duration-300">
                        {/* Preview context */}
                        <div className="flex items-center justify-between gap-3 border-b border-[#e8efeb] bg-[#fbfcfb] px-4 py-3 sm:px-6">
                            <div className="flex items-center gap-3">
                                <div className="grid h-9 w-9 place-items-center rounded-xl border border-[#dcebe4] bg-[#eef7f2] text-[#3730a3]"><Calendar className="h-4 w-4" /></div>
                                <div><p className="text-xs font-extrabold text-[#294943]">Timetable studio</p><p className="mt-0.5 text-[10px] text-[#899791]">Example schedule · Computer Science</p></div>
                            </div>
                            <span className="inline-flex items-center gap-1.5 rounded-full border border-[#e0e9e4] bg-white px-2.5 py-1.5 text-[9px] font-semibold text-[#667a72]"><span className="h-1.5 w-1.5 rounded-full bg-[#4338ca]" /> Sample data</span>
                        </div>

                        {/* Interactive Tab Switcher inside the preview */}
                        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#edf1ef] px-4 pb-3 pt-4 sm:px-6">
                            <div className="flex items-center gap-1 overflow-x-auto rounded-xl border border-[#e5ece9] bg-[#f5f8f6] p-1">
                                {[
                                    { id: "division", label: "Division" },
                                    { id: "faculty", label: "Faculty" },
                                    { id: "lab", label: "Rooms & labs" },
                                ].map((tab) => (
                                    <motion.button
                                        key={tab.id}
                                        type="button"
                                        onClick={() => setPreviewTab(tab.id)}
                                        whileTap={{ scale: 0.97 }}
                                        className={`relative shrink-0 rounded-lg px-3 py-1.5 text-[11px] font-bold transition-colors ${
                                            previewTab === tab.id ? "text-[#3730a3]" : "text-[#71817d] hover:text-[#294943]"
                                        }`}
                                    >
                                        {previewTab === tab.id && <motion.span layoutId="home-preview-tab" className="absolute inset-0 rounded-lg border border-white bg-white shadow-[0_2px_6px_rgba(28,66,57,0.08)]" transition={{ type: "spring", stiffness: 420, damping: 34 }} />}
                                        <span className="relative">{tab.label}</span>
                                    </motion.button>
                                ))}
                            </div>

                            <div className="flex items-center gap-2 text-[10px] font-semibold text-[#73847d]">
                                <span className="hidden sm:inline">Coordinated with</span>
                                <span className="rounded-lg bg-[#eef7f2] px-2 py-1 text-[#4e7865]">Faculty availability</span>
                                <span className="rounded-lg bg-[#f2f0f7] px-2 py-1 text-[#756b92]">Room capacity</span>
                            </div>
                        </div>

                        {/* Interactive Timetable Grid Display */}
                        <div className="space-y-4 p-4 sm:p-6">
                            <div className="overflow-x-auto rounded-2xl border border-[#e2e8f0]">
                                <table className="w-full text-xs">
                                    <thead>
                                        <tr className="bg-[#f8fafb] text-[#64748b] font-bold border-b border-[#e2e8f0]">
                                            <th className="text-left px-4 py-3 border-r border-[#e2e8f0] font-extrabold text-[#0f172a] w-28">
                                                Day / Time
                                            </th>
                                            <th className="px-3 py-3 border-r border-[#e2e8f0] text-center">09:00 - 10:00</th>
                                            <th className="px-3 py-3 border-r border-[#e2e8f0] text-center">10:00 - 11:00</th>
                                            <th className="px-3 py-3 border-r border-[#e2e8f0] text-center">11:15 - 12:15</th>
                                            <th className="px-3 py-3 border-r border-[#e2e8f0] text-center">12:15 - 01:15</th>
                                            <th className="px-3 py-3 text-center hidden sm:table-cell">02:00 - 04:00 (Practical)</th>
                                        </tr>
                                    </thead>
                                    <tbody className="font-medium text-[#334155] divide-y divide-[#e2e8f0]">
                                        {/* VIEW: DIVISION CS-A */}
                                        {previewTab === "division" && (
                                            <>
                                                <tr className="hover:bg-[#f8fafb]/60 transition-colors">
                                                    <td className="px-4 py-3 font-extrabold text-[#0f172a] border-r border-[#e2e8f0] bg-[#fafafa]">
                                                        Monday
                                                    </td>
                                                    <td className="p-2 border-r border-[#e2e8f0]">
                                                        <div className="px-2.5 py-1.5 rounded-lg bg-[#eff6ff] border border-[#3b82f6]/20 text-[#1e40af] text-center">
                                                            <span className="font-bold">DSA</span> <span className="text-[10px] text-[#64748b]">• Prof. Sharma</span>
                                                        </div>
                                                    </td>
                                                    <td className="p-2 border-r border-[#e2e8f0]">
                                                        <div className="px-2.5 py-1.5 rounded-lg bg-[#f5f3ff] border border-[#8b5cf6]/20 text-[#5b21b6] text-center">
                                                            <span className="font-bold">DBMS</span> <span className="text-[10px] text-[#64748b]">• Prof. Kulkarni</span>
                                                        </div>
                                                    </td>
                                                    <td className="p-2 border-r border-[#e2e8f0]">
                                                        <div className="px-2.5 py-1.5 rounded-lg bg-[#eff6ff] border border-[#3b82f6]/20 text-[#1e40af] text-center">
                                                            <span className="font-bold">OS</span> <span className="text-[10px] text-[#64748b]">• Prof. Mane</span>
                                                        </div>
                                                    </td>
                                                    <td className="p-2 border-r border-[#e2e8f0]">
                                                        <div className="px-2.5 py-1.5 rounded-lg bg-[#fef2f2] border border-[#ef4444]/20 text-[#991b1b] text-center">
                                                            <span className="font-bold">Aptitude III</span> <span className="text-[10px] text-red-500">• Fixed Slot</span>
                                                        </div>
                                                    </td>
                                                    <td className="p-2 hidden sm:table-cell">
                                                        <div className="px-2.5 py-1.5 rounded-lg bg-[#e6f4f1] border border-[#4338ca]/20 text-[#3730a3] text-center">
                                                            <span className="font-bold">Parallel Labs</span> <span className="text-[10px] text-[#4338ca]">• S1: DSA | S2: COA</span>
                                                        </div>
                                                    </td>
                                                </tr>
                                                <tr className="hover:bg-[#f8fafb]/60 transition-colors">
                                                    <td className="px-4 py-3 font-extrabold text-[#0f172a] border-r border-[#e2e8f0] bg-[#fafafa]">
                                                        Tuesday
                                                    </td>
                                                    <td className="p-2 border-r border-[#e2e8f0]">
                                                        <div className="px-2.5 py-1.5 rounded-lg bg-[#f5f3ff] border border-[#8b5cf6]/20 text-[#5b21b6] text-center">
                                                            <span className="font-bold">CN</span> <span className="text-[10px] text-[#64748b]">• Prof. Rao</span>
                                                        </div>
                                                    </td>
                                                    <td className="p-2 border-r border-[#e2e8f0]">
                                                        <div className="px-2.5 py-1.5 rounded-lg bg-[#eff6ff] border border-[#3b82f6]/20 text-[#1e40af] text-center">
                                                            <span className="font-bold">DSA</span> <span className="text-[10px] text-[#64748b]">• Prof. Sharma</span>
                                                        </div>
                                                    </td>
                                                    <td className="p-2 border-r border-[#e2e8f0]">
                                                        <div className="px-2.5 py-1.5 rounded-lg bg-[#eff6ff] border border-[#3b82f6]/20 text-[#1e40af] text-center">
                                                            <span className="font-bold">DBMS</span> <span className="text-[10px] text-[#64748b]">• Prof. Kulkarni</span>
                                                        </div>
                                                    </td>
                                                    <td className="p-2 border-r border-[#e2e8f0]">
                                                        <div className="px-2.5 py-1.5 rounded-lg bg-[#fef2f2] border border-[#ef4444]/20 text-[#991b1b] text-center">
                                                            <span className="font-bold">MILFL</span> <span className="text-[10px] text-red-500">• Anchor</span>
                                                        </div>
                                                    </td>
                                                    <td className="p-2 hidden sm:table-cell">
                                                        <div className="px-2.5 py-1.5 rounded-lg bg-[#e6f4f1] border border-[#4338ca]/20 text-[#3730a3] text-center">
                                                            <span className="font-bold">Parallel Labs</span> <span className="text-[10px] text-[#4338ca]">• S3: DBMS | S4: OS</span>
                                                        </div>
                                                    </td>
                                                </tr>
                                            </>
                                        )}

                                        {/* VIEW: FACULTY LOAD */}
                                        {previewTab === "faculty" && (
                                            <>
                                                <tr className="hover:bg-[#f8fafb]/60 transition-colors">
                                                    <td className="px-4 py-3 font-extrabold text-[#0f172a] border-r border-[#e2e8f0] bg-[#fafafa]">
                                                        Monday
                                                    </td>
                                                    <td className="p-2 border-r border-[#e2e8f0]">
                                                        <div className="px-2.5 py-1.5 rounded-lg bg-[#eff6ff] border border-[#3b82f6]/20 text-[#1e40af] text-center">
                                                            <span className="font-bold">CS-A Lecture</span> <span className="text-[10px] text-[#64748b]">• Room 204</span>
                                                        </div>
                                                    </td>
                                                    <td className="p-2 border-r border-[#e2e8f0] text-center text-[#94a3b8] text-[11px] font-medium">
                                                        Research Slot
                                                    </td>
                                                    <td className="p-2 border-r border-[#e2e8f0]">
                                                        <div className="px-2.5 py-1.5 rounded-lg bg-[#eff6ff] border border-[#3b82f6]/20 text-[#1e40af] text-center">
                                                            <span className="font-bold">CS-B Lecture</span> <span className="text-[10px] text-[#64748b]">• Room 205</span>
                                                        </div>
                                                    </td>
                                                    <td className="p-2 border-r border-[#e2e8f0] text-center text-[#94a3b8] text-[11px] font-medium">
                                                        Faculty Office Hours
                                                    </td>
                                                    <td className="p-2 hidden sm:table-cell">
                                                        <div className="px-2.5 py-1.5 rounded-lg bg-[#e6f4f1] border border-[#4338ca]/20 text-[#3730a3] text-center">
                                                            <span className="font-bold">DSA Lab Batch S1</span> <span className="text-[10px] text-[#4338ca]">• Lab-104</span>
                                                        </div>
                                                    </td>
                                                </tr>
                                                <tr className="hover:bg-[#f8fafb]/60 transition-colors">
                                                    <td className="px-4 py-3 font-extrabold text-[#0f172a] border-r border-[#e2e8f0] bg-[#fafafa]">
                                                        Tuesday
                                                    </td>
                                                    <td className="p-2 border-r border-[#e2e8f0] text-center text-[#94a3b8] text-[11px] font-medium">
                                                        Prep Window
                                                    </td>
                                                    <td className="p-2 border-r border-[#e2e8f0]">
                                                        <div className="px-2.5 py-1.5 rounded-lg bg-[#eff6ff] border border-[#3b82f6]/20 text-[#1e40af] text-center">
                                                            <span className="font-bold">CS-A Lecture</span> <span className="text-[10px] text-[#64748b]">• Room 204</span>
                                                        </div>
                                                    </td>
                                                    <td className="p-2 border-r border-[#e2e8f0] text-center text-[#94a3b8] text-[11px] font-medium">
                                                        Departmental Review
                                                    </td>
                                                    <td className="p-2 border-r border-[#e2e8f0]">
                                                        <div className="px-2.5 py-1.5 rounded-lg bg-[#f5f3ff] border border-[#8b5cf6]/20 text-[#5b21b6] text-center">
                                                            <span className="font-bold">Tutorial S2</span> <span className="text-[10px] text-[#64748b]">• Tut-301</span>
                                                        </div>
                                                    </td>
                                                    <td className="p-2 hidden sm:table-cell text-center text-[#94a3b8] text-[11px] font-medium">
                                                        Available / Project Guidance
                                                    </td>
                                                </tr>
                                            </>
                                        )}

                                        {/* VIEW: LAB ALLOCATION */}
                                        {previewTab === "lab" && (
                                            <>
                                                <tr className="hover:bg-[#f8fafb]/60 transition-colors">
                                                    <td className="px-4 py-3 font-extrabold text-[#0f172a] border-r border-[#e2e8f0] bg-[#fafafa]">
                                                        Monday
                                                    </td>
                                                    <td className="p-2 border-r border-[#e2e8f0] text-center text-[#94a3b8] text-[11px] font-medium">
                                                        Available
                                                    </td>
                                                    <td className="p-2 border-r border-[#e2e8f0] text-center text-[#94a3b8] text-[11px] font-medium">
                                                        Available
                                                    </td>
                                                    <td className="p-2 border-r border-[#e2e8f0] text-center text-[#94a3b8] text-[11px] font-medium">
                                                        Maintenance Window
                                                    </td>
                                                    <td className="p-2 border-r border-[#e2e8f0] text-center text-[#94a3b8] text-[11px] font-medium">
                                                        Lab Prep
                                                    </td>
                                                    <td className="p-2 hidden sm:table-cell">
                                                        <div className="px-2.5 py-1.5 rounded-lg bg-[#e6f4f1] border border-[#4338ca]/20 text-[#3730a3] text-center">
                                                            <span className="font-bold">CS-A DSA Lab (S1)</span> <span className="text-[10px] text-[#4338ca]">• Prof. Sharma • 28/30 Seats</span>
                                                        </div>
                                                    </td>
                                                </tr>
                                                <tr className="hover:bg-[#f8fafb]/60 transition-colors">
                                                    <td className="px-4 py-3 font-extrabold text-[#0f172a] border-r border-[#e2e8f0] bg-[#fafafa]">
                                                        Tuesday
                                                    </td>
                                                    <td className="p-2 border-r border-[#e2e8f0] text-center text-[#94a3b8] text-[11px] font-medium">
                                                        Available
                                                    </td>
                                                    <td className="p-2 border-r border-[#e2e8f0] text-center text-[#94a3b8] text-[11px] font-medium">
                                                        Available
                                                    </td>
                                                    <td className="p-2 border-r border-[#e2e8f0] text-center text-[#94a3b8] text-[11px] font-medium">
                                                        Available
                                                    </td>
                                                    <td className="p-2 border-r border-[#e2e8f0] text-center text-[#94a3b8] text-[11px] font-medium">
                                                        Lunch Break
                                                    </td>
                                                    <td className="p-2 hidden sm:table-cell">
                                                        <div className="px-2.5 py-1.5 rounded-lg bg-[#e6f4f1] border border-[#4338ca]/20 text-[#3730a3] text-center">
                                                            <span className="font-bold">CS-B DSA Lab (S3)</span> <span className="text-[10px] text-[#4338ca]">• Prof. Mane • 30/30 Seats</span>
                                                        </div>
                                                    </td>
                                                </tr>
                                            </>
                                        )}
                                    </tbody>
                                </table>
                            </div>

                            {/* Legend and live telemetry */}
                            <div className="flex flex-wrap items-center justify-between gap-3 pt-2 text-[11px]">
                                <div className="flex items-center gap-3 text-[#64748b] font-medium">
                                    <span className="flex items-center gap-1.5">
                                        <span className="w-2.5 h-2.5 rounded-sm bg-[#3b82f6]" />
                                        <span>Lecture</span>
                                    </span>
                                    <span className="flex items-center gap-1.5">
                                        <span className="w-2.5 h-2.5 rounded-sm bg-[#8b5cf6]" />
                                        <span>Tutorial</span>
                                    </span>
                                    <span className="flex items-center gap-1.5">
                                        <span className="w-2.5 h-2.5 rounded-sm bg-[#4338ca]" />
                                        <span>Practical Lab</span>
                                    </span>
                                    <span className="flex items-center gap-1.5">
                                        <span className="w-2.5 h-2.5 rounded-sm bg-[#ef4444]" />
                                        <span>Fixed Anchor</span>
                                    </span>
                                </div>
                                <div className="flex items-center gap-2 font-mono text-[10px] text-[#94a3b8]">
                                    <span>Solve Time: 1.18s</span>
                                    <span>•</span>
                                    <span>Penalty: 0.00</span>
                                    <span>•</span>
                                    <span className="text-emerald-600 font-bold">100% Validated</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </RevealSection>

                {/* ═══════════════════════════════════════════════════════
                    3. PROPRIETARY ALGORITHM: 4-LAYER SOLVER PIPELINE
                ═══════════════════════════════════════════════════════ */}
                <RevealSection id="atlas-algorithm" className="space-y-8 scroll-mt-24">
                    <div className="mx-auto max-w-2xl space-y-2.5 text-center">
                        <span className="inline-block border-l-2 border-[#4338ca] pl-2.5 text-[9px] font-extrabold uppercase tracking-[0.16em] text-[#55736a]">How scheduling works</span>
                        <h2 className="text-2xl font-extrabold tracking-[-0.045em] text-[#1e1b4b] sm:text-3xl">Rules first. A workable schedule next.</h2>
                        <p className="text-xs leading-6 text-[#71817d] sm:text-sm">ATLAS builds around fixed sessions, course requirements, faculty availability, and campus resources.</p>
                    </div>

                    <div className="flex flex-col gap-3 rounded-2xl border border-[#dfe9e4] bg-white px-5 py-4 sm:flex-row sm:items-center sm:gap-4">
                        <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[#eef7f2] text-[#3730a3]"><BookOpen className="h-4 w-4" /></div>
                        <p className="text-xs leading-6 text-[#61736d]">Fixed classes and breaks are placed first. Practical batches are grouped, remaining sessions are assigned around conflicts, and the result is checked before you review it.</p>
                    </div>

                    {/* 4-Layer Connected Pipeline Architecture */}
                    <div className="p-6 sm:p-8 rounded-3xl bg-white border border-[#b8ccc8]/60 shadow-sm space-y-7">
                        <div className="flex items-center justify-between border-b border-[#e8efeb] pb-3">
                            <h3 className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-[#71817d]">Scheduling stages</h3>
                            <span className="text-[10px] font-semibold text-[#8a9994]">01 — 04</span>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            {/* Layer 1: THARM */}
                            <div className="p-5 rounded-2xl bg-[#fbfcfb] border border-[#e3ebe7] space-y-3 hover-lift">
                                <div className="flex items-center justify-between">
                                    <span className="text-[9px] font-extrabold uppercase tracking-[0.12em] text-[#0d766e]">01 · Foundations</span>
                                </div>
                                <h4 className="text-sm font-extrabold text-[#0f172a] leading-snug">
                                    Fixed sessions first
                                </h4>
                                <p className="text-[11px] text-[#64748b] leading-relaxed">
                                    Required classes, fixed sessions, and break periods are held in place before the rest of the schedule is built.
                                </p>
                            </div>

                            {/* Layer 2: PHGBP */}
                            <div className="p-5 rounded-2xl bg-[#fbfcfb] border border-[#e3ebe7] space-y-3 hover-lift">
                                <div className="flex items-center justify-between">
                                    <span className="text-[9px] font-extrabold uppercase tracking-[0.12em] text-[#0d766e]">02 · Practicals</span>
                                </div>
                                <h4 className="text-sm font-extrabold text-[#0f172a] leading-snug">
                                    Group practical sessions
                                </h4>
                                <p className="text-[11px] text-[#64748b] leading-relaxed">
                                    Related course batches can share a practical window, helping make better use of available labs and instructors.
                                </p>
                            </div>

                            {/* Layer 3: DEGES */}
                            <div className="p-5 rounded-2xl bg-[#fbfcfb] border border-[#e3ebe7] space-y-3 hover-lift">
                                <div className="flex items-center justify-between">
                                    <span className="text-[9px] font-extrabold uppercase tracking-[0.12em] text-[#0d766e]">03 · Coordination</span>
                                </div>
                                <h4 className="text-sm font-extrabold text-[#0f172a] leading-snug">
                                    Work around conflicts
                                </h4>
                                <p className="text-[11px] text-[#64748b] leading-relaxed">
                                    The solver checks course, faculty, and room availability to find a place for sessions that compete for the same time.
                                </p>
                            </div>

                            {/* Layer 4: MTEFM */}
                            <div className="p-5 rounded-2xl bg-[#fbfcfb] border border-[#e3ebe7] space-y-3 hover-lift">
                                <div className="flex items-center justify-between">
                                    <span className="text-[9px] font-extrabold uppercase tracking-[0.12em] text-[#0d766e]">04 · Review</span>
                                </div>
                                <h4 className="text-sm font-extrabold text-[#0f172a] leading-snug">
                                    Validate the result
                                </h4>
                                <p className="text-[11px] text-[#64748b] leading-relaxed">
                                    ATLAS checks the generated timetable for clashes and unassigned sessions, then provides reports for review and export.
                                </p>
                            </div>
                        </div>

                        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#e3ebe7] bg-[#f8faf9] px-4 py-3">
                            <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#71817d]">Every pass respects the same constraints</span>
                            <span className="flex flex-wrap gap-2 text-[9px] font-semibold text-[#58716a]"><span>Course load</span><span>·</span><span>Faculty</span><span>·</span><span>Rooms</span><span>·</span><span>Fixed sessions</span></span>
                        </div>
                    </div>

                    <div className="grid gap-px overflow-hidden rounded-2xl border border-[#e1e9e5] bg-[#e1e9e5] sm:grid-cols-3">
                        {[
                            { title: "Keep campus rules", body: "Fixed classes, faculty, and room limits stay part of the schedule." },
                            { title: "Coordinate departments", body: "Generate department schedules within one academic-year workspace." },
                            { title: "Review before export", body: "Check divisions, instructors, rooms, and batches in dedicated views." },
                        ].map((item) => <div key={item.title} className="bg-white p-4 sm:p-5"><p className="text-xs font-extrabold text-[#315d50]">{item.title}</p><p className="mt-1.5 text-[10px] leading-5 text-[#71817d]">{item.body}</p></div>)}
                    </div>
                </RevealSection>

                {/* ═══════════════════════════════════════════════════════
                    4. PLATFORM CAPABILITIES — Minimalist Feature Grid
                ═══════════════════════════════════════════════════════ */}
                <RevealSection className="space-y-6">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                        <div><span className="text-[9px] font-extrabold uppercase tracking-[0.16em] text-[#55736a]">The everyday details</span><h2 className="mt-2 text-2xl font-extrabold tracking-[-0.045em] text-[#1e1b4b] sm:text-3xl">Made for real campus constraints.</h2></div>
                        <p className="max-w-md text-xs leading-5 text-[#71817d]">A single workflow for the information schedulers need to balance across a college.</p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {[
                            {
                                icon: Layers,
                                title: "4 Multi-Dimensional Views",
                                desc: "Real-time synchronized matrices for Division timetables, Faculty workloads, Classroom/Lab occupancy, and Batch groups."
                            },
                            {
                                icon: Zap,
                                title: "Cross-Division Elective Sync",
                                desc: "Locks elective subjects across multiple academic divisions to the exact same day and time slot with zero clash."
                            },
                            {
                                icon: BarChart3,
                                title: "Multi-Course Practical Stacking",
                                desc: "Stacks practicals from different courses in the same 2-hour window using priority stacking (4 → 3 → 2 → 1)."
                            },
                            {
                                icon: Sliders,
                                title: "Dynamic Faculty Constraints",
                                desc: "Configurable per-faculty time availability blackout rules, maximum daily load limits, and preferred periods."
                            },
                            {
                                icon: FileSpreadsheet,
                                title: "Multi-Sheet Master XLSX Export",
                                desc: "Generates formatted Excel workbooks containing individual sheets for all divisions, faculties, labs, and analytics."
                            },
                            {
                                icon: ShieldCheck,
                                title: "Empirical Quality Scoring",
                                desc: "Dynamic validation score verifying zero clashes, constraint satisfaction, and balanced daily workload distributions."
                            }
                        ].map((feature, i) => (
                            <div 
                                key={i} 
                                className="group flex flex-col space-y-3 rounded-2xl border border-[#e1e9e5] bg-white p-5 shadow-[0_8px_28px_-24px_rgba(20,57,51,0.32)] transition-all duration-200 hover:-translate-y-0.5 hover:border-[#c6d9d0] hover:shadow-[0_18px_38px_-28px_rgba(20,57,51,0.35)]"
                            >
                                <div className="grid h-9 w-9 place-items-center rounded-xl border border-[#e0ebe5] bg-[#f4f8f5] text-[#3730a3] transition-colors group-hover:bg-[#e9f4ee]">
                                    <feature.icon className="w-4 h-4" />
                                </div>
                                <h4 className="text-sm font-extrabold text-[#0f172a] leading-snug">
                                    {feature.title}
                                </h4>
                                <p className="text-xs text-[#64748b] leading-relaxed flex-1">
                                    {feature.desc}
                                </p>
                            </div>
                        ))}
                    </div>
                </RevealSection>

                {/* ═══════════════════════════════════════════════════════
                    5. BOTTOM CTA BANNER — Minimal & Modern
                ═══════════════════════════════════════════════════════ */}
                <RevealSection>
                    <div className="flex flex-col gap-6 rounded-[26px] bg-[#1e1b4b] p-6 shadow-[0_22px_52px_-36px_rgba(20,57,51,0.55)] sm:flex-row sm:items-center sm:justify-between sm:p-9">
                        <div className="max-w-xl">
                            <p className="mb-2 text-[9px] font-extrabold uppercase tracking-[0.16em] text-[#a9d5c2]">Start with your workbook</p>
                            <h3 className="text-2xl font-extrabold tracking-[-0.045em] text-white sm:text-3xl">Plan the whole academic year.</h3>
                            <p className="mt-2 text-xs leading-6 text-white/70 sm:text-sm">Create one workspace, add your course data, and build timetables across every year level.</p>
                        </div>
                        <ShimmerButton onClick={onLaunchStudio} variant="secondary" className="h-12 shrink-0 px-5 text-sm font-bold">
                            <span>Open workspaces</span><ArrowRight className="h-4 w-4" />
                        </ShimmerButton>
                    </div>
                </RevealSection>
            </div>

            {/* ═══════════════════════════════════════════════════════
                    RELEASE HISTORY MODAL (PORTALED TO BODY)
            ═══════════════════════════════════════════════════════ */}
            {showChangelog && mounted && createPortal(
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: reduceMotion ? 0 : 0.2 }}
                    className="fixed inset-0 z-[9999] flex items-center justify-center overflow-y-auto bg-[#0c2723]/40 p-3 backdrop-blur-md sm:p-6"
                    onMouseDown={(event) => { if (event.target === event.currentTarget) setShowChangelog(false); }}
                    role="presentation"
                >
                    <motion.section
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="changelog-dialog-title"
                        initial={reduceMotion ? false : { opacity: 0, y: 12, scale: 0.985 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 8, scale: 0.99 }}
                        transition={{ duration: reduceMotion ? 0 : 0.22, ease: [0.22, 1, 0.36, 1] }}
                        className="relative my-auto flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-[28px] border border-white/80 bg-[#fbfcfb] shadow-[0_36px_100px_-38px_rgba(8,38,33,0.55)]"
                    >
                        {/* Modal Header */}
                        <div className="relative flex shrink-0 items-start justify-between gap-4 border-b border-[#e6eeea] bg-white px-5 py-5 sm:px-7 sm:py-6">
                            <div className="pointer-events-none absolute -right-10 -top-20 h-48 w-48 rounded-full bg-[#e8f5f0] blur-3xl" />
                            <div className="relative flex min-w-0 items-start gap-3.5">
                                <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl border border-[#d4eae0] bg-[#eaf6f1] text-[#3730a3]">
                                    <Sparkles className="h-5 w-5" />
                                </div>
                                <div className="min-w-0">
                                    <div className="mb-1 flex flex-wrap items-center gap-2">
                                        <span className="text-[9px] font-extrabold uppercase tracking-[0.18em] text-[#0d8b7e]">Release notes</span>
                                        <span className="rounded-full border border-[#d5ebe1] bg-[#f0f8f4] px-2 py-0.5 text-[9px] font-extrabold text-[#3730a3]">Latest · v6.7</span>
                                    </div>
                                    <h3 id="changelog-dialog-title" className="text-lg font-extrabold tracking-[-0.035em] text-[#1e1b4b]">What&apos;s new in ATLAS</h3>
                                    <p className="mt-1 max-w-2xl text-xs leading-5 text-[#71817d]">Browse engine, workflow, and interface updates by release.</p>
                                </div>
                            </div>
                            <motion.button
                                type="button"
                                onClick={() => setShowChangelog(false)}
                                whileHover={{ rotate: 90, backgroundColor: "#f1f6f3" }}
                                whileTap={{ scale: 0.92 }}
                                transition={{ duration: 0.18 }}
                                className="relative grid h-9 w-9 shrink-0 place-items-center rounded-xl text-[#81918c] transition-colors hover:text-[#294943] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4338ca]/40"
                                aria-label="Close changelog"
                            >
                                <X className="h-4 w-4" />
                            </motion.button>
                        </div>

                        {/* Version Filter Tabs */}
                        <div className="mx-5 mt-4 flex shrink-0 items-center gap-1 overflow-x-auto rounded-2xl border border-[#e5ece9] bg-[#f5f8f6] p-1.5 sm:mx-7">
                            {[
                                { id: "all", label: "All Updates" },
                                { id: "v6.7", label: "v6.7 • UI & UX" },
                                { id: "v6.5", label: "v6.5 • College Engine" },
                                { id: "v5.5", label: "v5.5 • Course Labs" },
                                { id: "v4.5", label: "v4.5 • UI & Workflows" },
                                { id: "v4.4", label: "v4.4 • Core Solver" },
                            ].map((tab) => (
                                <motion.button
                                    key={tab.id}
                                    type="button"
                                    onClick={() => setChangelogVersion(tab.id)}
                                    whileTap={{ scale: 0.97 }}
                                    className={`relative shrink-0 rounded-xl px-3.5 py-2 text-[11px] font-bold transition-colors duration-200 ${
                                        changelogVersion === tab.id ? "text-[#3730a3]" : "text-[#7b8b86] hover:text-[#294943]"
                                    }`}
                                >
                                    {changelogVersion === tab.id && <motion.span layoutId="changelog-version-active" className="absolute inset-0 rounded-xl border border-white bg-white shadow-[0_2px_8px_rgba(28,66,57,0.08)]" transition={{ type: "spring", stiffness: 420, damping: 34 }} />}
                                    <span className="relative">{tab.label}</span>
                                </motion.button>
                            ))}
                        </div>

                        {/* Scrollable Changelog Content */}
                        <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4 text-xs sm:px-7 sm:py-5">
                            {(changelogVersion === "all" || changelogVersion === "v6.7") && (
                                <div className="space-y-3">
                                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#e2e8f0] pb-2">
                                        <div className="flex items-center gap-2">
                                            <span className="h-2.5 w-2.5 rounded-full bg-indigo-500" />
                                            <h4 className="text-sm font-extrabold text-[#0f172a]">Version 6.7 — Interface & Workflow Experience</h4>
                                        </div>
                                        <span className="rounded-md border border-indigo-200 bg-indigo-50 px-2 py-0.5 text-[10px] font-bold text-indigo-800">Oct 2026</span>
                                    </div>
                                    {V67_RELEASE_NOTES.map(({ icon: Icon, title, detail }, index) => (
                                        <div key={title} className="space-y-1 rounded-2xl border border-indigo-200/70 bg-indigo-50/40 p-3.5">
                                            <div className="flex items-center gap-1.5 font-extrabold text-indigo-950"><Icon className="h-4 w-4 shrink-0 text-indigo-600" />{index + 1}. {title}</div>
                                            <p className="font-medium leading-relaxed text-[#334155]">{detail}</p>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {(changelogVersion === "all" || changelogVersion === "v6.5") && (
                                <div className="space-y-3 pt-2">
                                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#e2e8f0] pb-2">
                                        <div className="flex items-center gap-2">
                                            <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                                            <h4 className="text-sm font-extrabold text-[#0f172a]">Version 6.5 — College-Wide Scheduling Engine</h4>
                                        </div>
                                        <span className="rounded-md border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-800">Core release</span>
                                    </div>
                                    {V65_RELEASE_NOTES.map(({ icon: Icon, title, detail }, index) => (
                                        <div key={title} className="space-y-1 rounded-2xl border border-emerald-200/70 bg-emerald-50/50 p-3.5">
                                            <div className="flex items-center gap-1.5 font-extrabold text-emerald-950"><Icon className="h-4 w-4 shrink-0 text-emerald-600" />{index + 1}. {title}</div>
                                            <p className="font-medium leading-relaxed text-[#334155]">{detail}</p>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* ── SECTION: v5.5 RELEASES (NEW) ── */}
                            {(changelogVersion === "all" || changelogVersion === "v5.5") && (
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between pb-1 border-b border-[#e2e8f0]">
                                        <div className="flex items-center gap-2">
                                            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                                            <h4 className="font-extrabold text-sm text-[#0f172a]">
                                                Version 5.5 — Course-Aware Lab Allocation & Physical Location Architecture
                                            </h4>
                                        </div>
                                        <span className="text-[10px] font-black text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-md border border-emerald-300">
                                            v5.5 NEW
                                        </span>
                                    </div>

                                    {/* 5.5 Items */}
                                    <div className="p-3.5 rounded-2xl bg-emerald-50/70 border border-emerald-300/80 space-y-1 shadow-2xs">
                                        <div className="font-extrabold text-emerald-950 flex items-center gap-1.5">
                                            <Database className="w-4 h-4 text-emerald-600" />
                                            1. Physical Campus Infrastructure Ingestion (The 3rd Sheet Parser)
                                        </div>
                                        <p className="text-[#334155] font-medium leading-relaxed">
                                            Ingests physical college campus infrastructure from the 3rd sheet (<code>Location</code>): Classrooms, Tutorial Rooms, and Specialized Laboratories with full names, canonical initials, equipment features, and mapped course catalogs. Robust normalization handles multiline strings, dashes, slashes, and Roman numerals to eliminate string mismatches.
                                        </p>
                                    </div>

                                    <div className="p-3.5 rounded-2xl bg-emerald-50/70 border border-emerald-300/80 space-y-1 shadow-2xs">
                                        <div className="font-extrabold text-emerald-950 flex items-center gap-1.5">
                                            <Beaker className="w-4 h-4 text-emerald-600" />
                                            2. Pre-Scheduling Course-to-Lab Resolver & Scored Fallbacks
                                        </div>
                                        <p className="text-[#334155] font-medium leading-relaxed">
                                            Replaced unconstrained lab matching with deterministic course-to-lab binding. Evaluates primary mapped laboratories and scores compatible domain fallbacks based on shared physical equipment. Standardized designations (<code>PRIMARY</code>, <code>FALLBACK</code>, <code>MANUAL</code>, <code>UNRESOLVED</code>) eliminate arbitrary cross-department lab allocations and phantom courses.
                                        </p>
                                    </div>

                                    <div className="p-3.5 rounded-2xl bg-emerald-50/70 border border-emerald-300/80 space-y-1 shadow-2xs">
                                        <div className="font-extrabold text-emerald-950 flex items-center gap-1.5">
                                            <Activity className="w-4 h-4 text-emerald-600" />
                                            3. Lab Resource Pressure Integration in DAPS
                                        </div>
                                        <p className="text-[#334155] font-medium leading-relaxed">
                                            Dynamic Adaptive Priority Scheduling boosts sessions requiring scarce, highly contended laboratories (+100 to +150 score). Laboratories with zero fallback alternatives are prioritized and locked in before general rooms or slots are depleted.
                                        </p>
                                    </div>

                                    <div className="p-3.5 rounded-2xl bg-emerald-50/70 border border-emerald-300/80 space-y-1 shadow-2xs">
                                        <div className="font-extrabold text-emerald-950 flex items-center gap-1.5">
                                            <Users className="w-4 h-4 text-emerald-600" />
                                            4. Pass 0 Division Cohort Packing & 1-Batch-Per-Faculty Invariant
                                        </div>
                                        <p className="text-[#334155] font-medium leading-relaxed">
                                            Introduced Pass 0 Cohort Packing for division-wide practicals without individual batch instructors (<code>!hasBatchCols</code>): all batches attend the lab together in one 2-hour window with their division faculty, saving 3 practical slots and eliminating TY-B CM schedule saturation. Rotation electives (<code>hasBatchCols</code>) strictly enforce the 1-batch-per-faculty invariant across distinct days.
                                        </p>
                                    </div>

                                    <div className="p-3.5 rounded-2xl bg-emerald-50/70 border border-emerald-300/80 space-y-1 shadow-2xs">
                                        <div className="font-extrabold text-emerald-950 flex items-center gap-1.5">
                                            <Layers className="w-4 h-4 text-emerald-600" />
                                            5. Multi-Pass Practical Stacking (Pass 0 to Pass 5: 4 → 3 → 2 → 1)
                                        </div>
                                        <p className="text-[#334155] font-medium leading-relaxed">
                                            Unified parallel execution hierarchy: Pass 0 (Cohorts) → Pass 1 (4-batch stacks) → Pass 2 (3-batch stacks) → Pass 3 (2-batch paired stacks) → Pass 4 (2-batch afternoon blocks) → Pass 5 (Single batches). Prioritizes high cross-course diversity to rotate students across different laboratories.
                                        </p>
                                    </div>

                                    <div className="p-3.5 rounded-2xl bg-emerald-50/70 border border-emerald-300/80 space-y-1 shadow-2xs">
                                        <div className="font-extrabold text-emerald-950 flex items-center gap-1.5">
                                            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                                            6. Tutorial Room Allocation & Faculty Harmonization
                                        </div>
                                        <p className="text-[#334155] font-medium leading-relaxed">
                                            Batches sharing the same tutorial session and faculty member now co-occupy the assigned tutorial room simultaneously, completely eliminating tutorial room double-booking clashes.
                                        </p>
                                    </div>

                                    <div className="p-3.5 rounded-2xl bg-emerald-50/70 border border-emerald-300/80 space-y-1 shadow-2xs">
                                        <div className="font-extrabold text-emerald-950 flex items-center gap-1.5">
                                            <Sliders className="w-4 h-4 text-emerald-600" />
                                            7. Interactive UI Badges, Controlled Overrides & Diagnostic Explanations
                                        </div>
                                        <p className="text-[#334155] font-medium leading-relaxed">
                                            Eliminated UTF-8 mojibake characters in favor of clean color-coded badges (PRIMARY, FALLBACK, MANUAL, UNRESOLVED). Added Controlled Manual Override Modal preventing invalid assignments or slot collisions, plus slot-by-slot diagnostic root-cause reporting for unallocated sessions.
                                        </p>
                                    </div>

                                    <div className="p-3.5 rounded-2xl bg-emerald-50/70 border border-emerald-300/80 space-y-1 shadow-2xs">
                                        <div className="font-extrabold text-emerald-950 flex items-center gap-1.5">
                                            <ShieldCheck className="w-4 h-4 text-emerald-600" />
                                            8. Empirical Benchmarks: 0 Total Clashes & 0 Unallocated Practicals
                                        </div>
                                        <p className="text-[#334155] font-medium leading-relaxed">
                                            Validated with 0 Faculty Clashes, 0 Room Clashes, 0 Lab Clashes, 0 Tutorial Room Clashes, 0 Batch Clashes, 0 Division Clashes, 0 Break Violations, and 0 Fixed Constraint Violations. Next.js 16 (Turbopack) production build compiles cleanly.
                                        </p>
                                    </div>
                                </div>
                            )}

                            {/* ── SECTION: v4.5 RELEASES ── */}
                            {(changelogVersion === "all" || changelogVersion === "v4.5") && (
                                <div className="space-y-3 pt-2">
                                    <div className="flex items-center justify-between pb-1 border-b border-[#e2e8f0]">
                                        <div className="flex items-center gap-2">
                                            <span className="w-2.5 h-2.5 rounded-full bg-indigo-500" />
                                            <h4 className="font-extrabold text-sm text-[#0f172a]">Version 4.5 — Modern Minimal UI/UX Architecture</h4>
                                        </div>
                                        <span className="text-[10px] font-bold text-[#4338ca] bg-[#eef2ff] px-2 py-0.5 rounded-md">Oct 2026</span>
                                    </div>

                                    {/* 4.5 Items */}
                                    <div className="p-3.5 rounded-2xl bg-emerald-50/50 border border-emerald-200/60 space-y-1">
                                        <div className="font-extrabold text-emerald-900 flex items-center gap-1.5">
                                            <Layers className="w-4 h-4 text-emerald-600" />
                                            1. Mathematically Centered Global Header Navigation
                                        </div>
                                        <p className="text-[#475569] font-medium leading-relaxed">
                                            Centered the main View Navigation switcher (Home / Semesters) using absolute screen-midpoint alignment, ensuring perfectly balanced aesthetics regardless of left branding or right action widths.
                                        </p>
                                    </div>

                                    <div className="p-3.5 rounded-2xl bg-emerald-50/50 border border-emerald-200/60 space-y-1">
                                        <div className="font-extrabold text-emerald-900 flex items-center gap-1.5">
                                            <Sparkles className="w-4 h-4 text-emerald-600" />
                                            2. Modern & Minimal Home Page Redesign with Interactive Studio Preview
                                        </div>
                                        <p className="text-[#475569] font-medium leading-relaxed">
                                            Redesigned the entire landing experience with minimal luxury styling, subtle ambient mint glow, micro-hover transitions, and an interactive 3-view studio simulation (Division, Faculty Load, and Lab Allocation).
                                        </p>
                                    </div>

                                    <div className="p-3.5 rounded-2xl bg-emerald-50/50 border border-emerald-200/60 space-y-1">
                                        <div className="font-extrabold text-emerald-900 flex items-center gap-1.5">
                                            <BookOpen className="w-4 h-4 text-emerald-600" />
                                            3. Structured Academic Year Selection & Simplified Semester Creation
                                        </div>
                                        <p className="text-[#475569] font-medium leading-relaxed">
                                            Upgraded free-form year text into a standard Academic Year selector (AY 2024-25, AY 2025-26, etc.) with quick chips and custom format options. Removed student year of study (FE/SE/TE/BE) clutter for a clean, streamlined semester setup.
                                        </p>
                                    </div>

                                    <div className="p-3.5 rounded-2xl bg-emerald-50/50 border border-emerald-200/60 space-y-1">
                                        <div className="font-extrabold text-emerald-900 flex items-center gap-1.5">
                                            <BarChart3 className="w-4 h-4 text-emerald-600" />
                                            4. Accurate Metric Engine & Resilient Quality Scoring
                                        </div>
                                        <p className="text-[#475569] font-medium leading-relaxed">
                                            Resolved property discrepancies between validation metrics, allocation percentages, and quality scores. Cards now dynamically compute and display real values (e.g. 100% Allocation, 0 Conflicts, 100 Quality Score) with fallback timetable inspection for legacy saved workspaces.
                                        </p>
                                    </div>

                                    <div className="p-3.5 rounded-2xl bg-emerald-50/50 border border-emerald-200/60 space-y-1">
                                        <div className="font-extrabold text-emerald-900 flex items-center gap-1.5">
                                            <Users className="w-4 h-4 text-emerald-600" />
                                            5. Dedicated Team Showcase Modal & Credits
                                        </div>
                                        <p className="text-[#475569] font-medium leading-relaxed">
                                            Added an interactive Development Team showcase modal honoring the project lead, algorithm architects, systems engineers, and academic domain advisors.
                                        </p>
                                    </div>
                                </div>
                            )}

                            {/* ── SECTION: v4.4 RELEASES ── */}
                            {(changelogVersion === "all" || changelogVersion === "v4.4") && (
                                <div className="space-y-3 pt-2">
                                    <div className="flex items-center justify-between pb-1 border-b border-[#e2e8f0]">
                                        <div className="flex items-center gap-2">
                                            <span className="w-2.5 h-2.5 rounded-full bg-[#4338ca]" />
                                            <h4 className="font-extrabold text-sm text-[#0f172a]">Version 4.4 — Core Multi-Course Parallel Algorithm</h4>
                                        </div>
                                        <span className="text-[10px] font-bold text-[#64748b] bg-slate-100 px-2 py-0.5 rounded-md">Architecture</span>
                                    </div>

                                    <div className="p-3.5 rounded-2xl bg-[#ebf4f2]/70 border border-[#b8ccc8]/60 space-y-1">
                                        <div className="font-extrabold text-[#3730a3] flex items-center gap-1.5">
                                            <Layers className="w-4 h-4 text-[#4338ca]" />
                                            1. Multi-Course Parallel Practical Stacking (4 → 3 → 2 → 1)
                                        </div>
                                        <p className="text-[#475569] font-medium leading-relaxed">
                                            Practicals from <strong>different courses</strong> (e.g. COA-S2, CP-S3, DSA-S4, OS-S1) are stacked in the same 2-hour window. Absolute priority hierarchy (4 → 3 → 2 → 1) commits the maximum possible stack first. Includes cross-course preference to favor diverse course sets and deterministic tie-breaking.
                                        </p>
                                    </div>

                                    <div className="p-3.5 rounded-2xl bg-[#ebf4f2]/70 border border-[#b8ccc8]/60 space-y-1">
                                        <div className="font-extrabold text-[#3730a3] flex items-center gap-1.5">
                                            <Cpu className="w-4 h-4 text-[#4338ca]" />
                                            2. College-Wide Master Scheduling Priority & CollegeOccupancy
                                        </div>
                                        <p className="text-[#475569] font-medium leading-relaxed">
                                            Replaced independent department runs with a unified institutional pipeline: 1. Global Sessions → 2. Practical Stacking → 3. Synchronized Common-Time → 4. Tutorials → 5. Lectures → 6. CASC Cascade Repair → 7. Optimization. Global reservations remain 100% immutable.
                                        </p>
                                    </div>

                                    <div className="p-3.5 rounded-2xl bg-[#ebf4f2]/70 border border-[#b8ccc8]/60 space-y-1">
                                        <div className="font-extrabold text-[#3730a3] flex items-center gap-1.5">
                                            <Sparkles className="w-4 h-4 text-[#4338ca]" />
                                            3. Course-Preserving Global Cascade Repair (CASC)
                                        </div>
                                        <p className="text-[#475569] font-medium leading-relaxed">
                                            Automated multi-hop slot relocation for stuck sessions. Preserves 100% invariant course-faculty bindings without hallucinated reassignments. Relocates 2-hour practicals atomically without crossing break boundaries or displacing global sessions.
                                        </p>
                                    </div>

                                    <div className="p-3.5 rounded-2xl bg-[#ebf4f2]/70 border border-[#b8ccc8]/60 space-y-1">
                                        <div className="font-extrabold text-[#3730a3] flex items-center gap-1.5">
                                            <BookOpen className="w-4 h-4 text-[#4338ca]" />
                                            4. Dynamic Priority Scheduling (DAPS) & Resource Contention (RCAA)
                                        </div>
                                        <p className="text-[#475569] font-medium leading-relaxed">
                                            Replaced static ordering with multi-factor scarcity ranking: constrained faculty availability, lab shortages, tutorial room demands, and division slot flexibility are dynamically prioritized before placing sessions.
                                        </p>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Modal Footer */}
                        <div className="flex shrink-0 flex-col gap-3 border-t border-[#e7eeeb] bg-white/80 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-7">
                            <span className="text-[11px] font-medium text-[#879791]">
                                Showing <strong className="text-[#3730a3]">{changelogVersion === "all" ? "all releases · v6.7, v6.5, v5.5, v4.5 & v4.4" : changelogVersion}</strong>
                            </span>
                            <motion.button
                                type="button"
                                onClick={() => setShowChangelog(false)}
                                whileHover={{ y: -1 }}
                                whileTap={{ scale: 0.98 }}
                                className="inline-flex h-10 items-center justify-center rounded-xl bg-[#1e1b4b] px-4 text-xs font-bold text-white shadow-sm transition-colors hover:bg-[#3730a3] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4338ca]/50 focus-visible:ring-offset-2"
                            >
                                Done
                            </motion.button>
                        </div>
                    </motion.section>
                </motion.div>,
                document.body
            )}

        </div>
    );
}
