"use client";

import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { 
    Sparkles, Cpu, ShieldCheck, Zap, Layers, ArrowRight, 
    CheckCircle2, Users, FileSpreadsheet, BarChart3, Database, Code, Award, BookOpen, Beaker, XCircle, X
} from "lucide-react";
import ShimmerButton from "./ui/ShimmerButton";

/* ── Scroll-reveal hook ─────────────────────────────────────────── */
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
            { threshold: 0.12, rootMargin: "0px 0px -40px 0px" }
        );
        observer.observe(el);
        return () => observer.disconnect();
    }, []);
    return ref;
}

/* ── Reusable reveal wrapper ────────────────────────────────────── */
function RevealSection({ children, className = "", delay = 0 }) {
    const ref = useRevealOnScroll();
    return (
        <section
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
    const [changelogVersion, setChangelogVersion] = useState("all"); // 'all' | 'v4.5' | 'v4.4'
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

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
        <div className="relative">
            {/* Subtle academic grid texture background */}
            <div className="atlas-grid-bg fixed inset-0 pointer-events-none z-0" aria-hidden="true" />

            <div className="relative z-10 space-y-24 sm:space-y-32 pb-12 max-w-5xl mx-auto">

                {/* ═══════════════════════════════════════════════════════
                    1. HERO SECTION — More prominent, better hierarchy
                ═══════════════════════════════════════════════════════ */}
                <section className="text-center pt-12 sm:pt-20 pb-4">
                    {/* Top pills */}
                    <div className="flex flex-wrap items-center justify-center gap-2.5 mb-8">
                        <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-amber-100 text-amber-900 border border-amber-300 text-xs font-extrabold shadow-2xs">
                            <Beaker className="w-3.5 h-3.5 text-amber-600" />
                            <span>ATLAS Engine v4.5 • RELEASE BUILD</span>
                        </div>

                        {/* Interactive Version v4.5 Changelog Pill */}
                        <button
                            onClick={() => setShowChangelog(true)}
                            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#ccfbf1] text-[#0f766e] border border-[#99f6e4] text-xs font-extrabold shadow-2xs hover:scale-105 transition-transform cursor-pointer"
                        >
                            <Sparkles className="w-3.5 h-3.5 text-[#0d9488]" />
                            <span>What's New in v4.5 & v4.4</span>
                            <span className="px-1.5 py-0.2 rounded-md bg-[#0d9488] text-white text-[9px] font-black">CHANGELOG</span>
                        </button>
                    </div>

                    {/* Logo — larger, more prominent */}
                    <div className="flex items-center justify-center mb-6">
                        <img src="/logo.png" alt="ATLAS Logo" className="h-20 sm:h-28 w-auto object-contain mx-auto drop-shadow-md" />
                    </div>

                    {/* Headline — stronger H1 */}
                    <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-[#0f172a] tracking-tight leading-[1.1] max-w-4xl mx-auto mb-5">
                        Next-Generation Academic{" "}
                        <span className="bg-gradient-to-r from-[#0d9488] to-[#0f766e] bg-clip-text text-transparent">Timetable Engine</span>
                    </h1>

                    {/* Subtext — muted, medium weight */}
                    <p className="text-sm sm:text-base text-[#64748b] max-w-2xl mx-auto font-medium leading-relaxed mb-8">
                        Powered by <strong className="text-[#0d9488]">ATLAS Algorithm v4.5</strong> — an adaptive scheduling engine designed for college-wide timetable generation, parallel practical allocation, dynamic constraint optimization, and conflict repair.
                    </p>

                    {/* CTAs — visually stronger primary */}
                    <div className="flex flex-wrap items-center justify-center gap-4">
                        <ShimmerButton
                            onClick={onLaunchStudio}
                            variant="primary"
                            className="py-3.5 px-8 text-sm font-extrabold"
                        >
                            <span>Start Timetable Generation (v4.5)</span>
                            <ArrowRight className="w-4 h-4" />
                        </ShimmerButton>

                        <a
                            href="#atlas-algorithm"
                            className="px-6 py-3 rounded-full text-xs font-bold text-[#0f766e] bg-white border border-[#b8ccc8] hover:bg-[#ebf4f2] hover:border-[#99f6e4] transition-all duration-200"
                        >
                            Explore ATLAS Algorithm ↓
                        </a>
                    </div>
                </section>

                {/* ═══════════════════════════════════════════════════════
                    PRODUCT PREVIEW — Visual centerpiece with dashboard feel
                ═══════════════════════════════════════════════════════ */}
                <RevealSection className="px-1">
                    <div className="relative rounded-2xl border border-[#b8ccc8]/80 bg-white shadow-lg overflow-hidden">
                        {/* Faux browser chrome bar */}
                        <div className="flex items-center gap-2 px-5 py-3 bg-[#f8fafb] border-b border-[#e2e8f0]">
                            <div className="flex items-center gap-1.5">
                                <div className="w-3 h-3 rounded-full bg-[#fca5a5]" />
                                <div className="w-3 h-3 rounded-full bg-[#fde68a]" />
                                <div className="w-3 h-3 rounded-full bg-[#86efac]" />
                            </div>
                            <div className="flex-1 flex items-center justify-center">
                                <div className="px-4 py-1 rounded-lg bg-[#f0f4f3] border border-[#e2e8f0] text-[11px] font-medium text-[#94a3b8] max-w-xs w-full text-center">
                                    atlas-engine.app/scheduler-studio
                                </div>
                            </div>
                        </div>

                        {/* Dashboard preview content */}
                        <div className="p-6 sm:p-8 space-y-5">
                            {/* Header row */}
                            <div className="flex flex-wrap items-center justify-between gap-3">
                                <div>
                                    <h3 className="text-base font-extrabold text-[#0f172a]">Scheduler Studio Workspace</h3>
                                    <p className="text-xs text-[#64748b] font-medium">Compact 2D matrix — Division, Faculty, Location & Batch views</p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="px-2.5 py-1 rounded-lg bg-[#ccfbf1] border border-[#99f6e4] text-[10px] font-extrabold text-[#0f766e]">Sem 1 • 2024-25</span>
                                    <span className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 border border-emerald-200 text-[10px] font-bold text-emerald-700">
                                        <CheckCircle2 className="w-3 h-3" /> 100% Placed
                                    </span>
                                </div>
                            </div>

                            {/* Mini timetable grid */}
                            <div className="overflow-x-auto rounded-xl border border-[#e2e8f0]">
                                <table className="w-full text-[10px] sm:text-[11px]">
                                    <thead>
                                        <tr className="bg-[#f8fafb] text-[#64748b] font-bold">
                                            <th className="text-left px-3 py-2.5 border-b border-r border-[#e2e8f0] font-extrabold text-[#0f172a] w-24">Day / Slot</th>
                                            <th className="px-3 py-2.5 border-b border-r border-[#e2e8f0] text-center">9:00–10:00</th>
                                            <th className="px-3 py-2.5 border-b border-r border-[#e2e8f0] text-center">10:00–11:00</th>
                                            <th className="px-3 py-2.5 border-b border-r border-[#e2e8f0] text-center">11:15–12:15</th>
                                            <th className="px-3 py-2.5 border-b border-r border-[#e2e8f0] text-center">12:15–1:15</th>
                                            <th className="px-3 py-2.5 border-b border-[#e2e8f0] text-center hidden sm:table-cell">2:00–4:00</th>
                                        </tr>
                                    </thead>
                                    <tbody className="font-medium">
                                        <tr>
                                            <td className="px-3 py-2.5 border-b border-r border-[#e2e8f0] font-extrabold text-[#0f172a]">Monday</td>
                                            <td className="px-2 py-2 border-b border-r border-[#e2e8f0]">
                                                <div className="px-2 py-1.5 rounded-md bg-[#eff6ff] border border-[#3b82f6]/20 text-[#1e40af] text-center">DSA <span className="text-[#64748b]">• Prof.S</span></div>
                                            </td>
                                            <td className="px-2 py-2 border-b border-r border-[#e2e8f0]">
                                                <div className="px-2 py-1.5 rounded-md bg-[#f5f3ff] border border-[#8b5cf6]/20 text-[#5b21b6] text-center">DBMS <span className="text-[#64748b]">• Prof.K</span></div>
                                            </td>
                                            <td className="px-2 py-2 border-b border-r border-[#e2e8f0]">
                                                <div className="px-2 py-1.5 rounded-md bg-[#eff6ff] border border-[#3b82f6]/20 text-[#1e40af] text-center">OS <span className="text-[#64748b]">• Prof.M</span></div>
                                            </td>
                                            <td className="px-2 py-2 border-b border-r border-[#e2e8f0]">
                                                <div className="px-2 py-1.5 rounded-md bg-[#fef2f2] border border-[#ef4444]/20 text-[#991b1b] text-center">MILFL</div>
                                            </td>
                                            <td className="px-2 py-2 border-b border-[#e2e8f0] hidden sm:table-cell">
                                                <div className="px-2 py-1.5 rounded-md bg-[#e6f4f1] border border-[#0d9488]/20 text-[#0f766e] text-center">COA Lab <span className="text-[#64748b]">S1-S4</span></div>
                                            </td>
                                        </tr>
                                        <tr>
                                            <td className="px-3 py-2.5 border-b border-r border-[#e2e8f0] font-extrabold text-[#0f172a]">Tuesday</td>
                                            <td className="px-2 py-2 border-b border-r border-[#e2e8f0]">
                                                <div className="px-2 py-1.5 rounded-md bg-[#f5f3ff] border border-[#8b5cf6]/20 text-[#5b21b6] text-center">CN <span className="text-[#64748b]">• Prof.R</span></div>
                                            </td>
                                            <td className="px-2 py-2 border-b border-r border-[#e2e8f0]">
                                                <div className="px-2 py-1.5 rounded-md bg-[#eff6ff] border border-[#3b82f6]/20 text-[#1e40af] text-center">DSA <span className="text-[#64748b]">• Prof.S</span></div>
                                            </td>
                                            <td className="px-2 py-2 border-b border-r border-[#e2e8f0]">
                                                <div className="px-2 py-1.5 rounded-md bg-[#eff6ff] border border-[#3b82f6]/20 text-[#1e40af] text-center">DBMS <span className="text-[#64748b]">• Prof.K</span></div>
                                            </td>
                                            <td className="px-2 py-2 border-b border-r border-[#e2e8f0]">
                                                <div className="px-2 py-1.5 rounded-md bg-[#fef2f2] border border-[#ef4444]/20 text-[#991b1b] text-center">Aptitude</div>
                                            </td>
                                            <td className="px-2 py-2 border-b border-[#e2e8f0] hidden sm:table-cell">
                                                <div className="px-2 py-1.5 rounded-md bg-[#e6f4f1] border border-[#0d9488]/20 text-[#0f766e] text-center">DSA Lab <span className="text-[#64748b]">S5-S8</span></div>
                                            </td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>

                            {/* Bottom stats bar */}
                            <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-[#e2e8f0]">
                                <div className="flex items-center gap-4 text-[11px] text-[#64748b] font-medium">
                                    <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-[#3b82f6]" /> Lecture</span>
                                    <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-[#8b5cf6]" /> Tutorial</span>
                                    <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-[#0d9488]" /> Practical</span>
                                    <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-[#ef4444]" /> Fixed</span>
                                </div>
                                <span className="text-[10px] font-bold text-[#94a3b8]">ATLAS Engine v4.4 • Zero Conflict Output</span>
                            </div>
                        </div>
                    </div>
                </RevealSection>

                {/* VERSION v4.5 & v4.4 CHANGELOG MODAL (PORTALED TO BODY TO PREVENT PARENT TRANSFORM CLIPPING) */}
                {showChangelog && mounted && createPortal(
                    <div 
                        className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-150"
                        onClick={() => setShowChangelog(false)}
                    >
                        <div 
                            className="bg-white rounded-3xl border border-[#b8ccc8] shadow-2xl max-w-2xl w-full p-6 sm:p-7 space-y-5 relative overflow-hidden animate-in fade-in zoom-in-95 duration-200 max-h-[88vh] flex flex-col"
                            onClick={(e) => e.stopPropagation()}
                        >
                            {/* Modal Header */}
                            <div className="flex items-start justify-between gap-3 border-b border-[#b8ccc8]/40 pb-4 shrink-0">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-2xl bg-[#ccfbf1] border border-[#99f6e4] flex items-center justify-center text-[#0d9488] shadow-xs">
                                        <Sparkles className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <h3 className="text-base font-extrabold text-[#0f172a]">
                                                ATLAS Engine Release Notes
                                            </h3>
                                            <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800 border border-emerald-300">
                                                v4.5 LATEST
                                            </span>
                                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
                                                v4.4 SOLVER
                                            </span>
                                        </div>
                                        <p className="text-xs text-[#64748b] font-medium">
                                            Comprehensive changelog for v4.5 (UI/UX & Workflow) and v4.4 (Core Engine Solver)
                                        </p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setShowChangelog(false)}
                                    className="p-1.5 rounded-xl hover:bg-slate-100 text-[#64748b] hover:text-[#0f172a] transition-colors cursor-pointer"
                                    aria-label="Close changelog"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            {/* Version Filter Tabs */}
                            <div className="flex items-center gap-1.5 p-1 rounded-xl bg-[#f0f4f3] border border-[#e2e8f0] shrink-0">
                                {[
                                    { id: "all", label: "All Updates (v4.5 & v4.4)" },
                                    { id: "v4.5", label: "v4.5 • UI & Workflows" },
                                    { id: "v4.4", label: "v4.4 • Core Engine Solver" },
                                ].map((tab) => (
                                    <button
                                        key={tab.id}
                                        type="button"
                                        onClick={() => setChangelogVersion(tab.id)}
                                        className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-extrabold transition-all cursor-pointer text-center ${
                                            changelogVersion === tab.id
                                                ? "bg-white text-[#0f766e] shadow-xs border border-[#e2e8f0]"
                                                : "text-[#64748b] hover:text-[#0f172a]"
                                        }`}
                                    >
                                        {tab.label}
                                    </button>
                                ))}
                            </div>

                            {/* Scrollable Changelog Content */}
                            <div className="space-y-4 overflow-y-auto pr-1.5 text-xs flex-1">
                                {/* ── SECTION: v4.5 RELEASES ── */}
                                {(changelogVersion === "all" || changelogVersion === "v4.5") && (
                                    <div className="space-y-3">
                                        <div className="flex items-center justify-between pb-1 border-b border-[#e2e8f0]">
                                          <div className="flex items-center gap-2">
                                              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                                              <h4 className="font-extrabold text-sm text-[#0f172a]">Version 4.5 — UI/UX & Workflow Architecture</h4>
                                          </div>
                                          <span className="text-[10px] font-bold text-[#0d9488] bg-[#ccfbf1] px-2 py-0.5 rounded-md">Oct 2026</span>
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
                                                2. Streamlined Semester Workspace Lobby (Zero Redundant Cards)
                                            </div>
                                            <p className="text-[#475569] font-medium leading-relaxed">
                                                Eliminated the redundant first-slot dashed card in the semester grid, dedicating card slots exclusively to real workspaces. Unified duplicate summary count pills and filter buttons into a single interactive segmented toolbar with instant search.
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
                                                5. Interactive Development Team Credits in Footer
                                            </div>
                                            <p className="text-[#475569] font-medium leading-relaxed">
                                                Replaced static keyboard shortcut labels with an interactive Development Team showcase modal, recognizing the project lead, algorithm architects, systems engineers, and academic domain advisors.
                                            </p>
                                        </div>

                                        <div className="p-3.5 rounded-2xl bg-emerald-50/50 border border-emerald-200/60 space-y-1">
                                            <div className="font-extrabold text-emerald-900 flex items-center gap-1.5">
                                                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                                                6. Viewport-Safe Portaled Dialogs
                                            </div>
                                            <p className="text-[#475569] font-medium leading-relaxed">
                                                Attached all modals to <code>document.body</code> via React Portals, completely eliminating CSS transform clipping from Framer Motion containers. Added click-outside backdrop dismissal and Escape key shortcuts.
                                            </p>
                                        </div>
                                    </div>
                                )}

                                {/* ── SECTION: v4.4 RELEASES ── */}
                                {(changelogVersion === "all" || changelogVersion === "v4.4") && (
                                    <div className="space-y-3 pt-2">
                                        <div className="flex items-center justify-between pb-1 border-b border-[#e2e8f0]">
                                            <div className="flex items-center gap-2">
                                                <span className="w-2.5 h-2.5 rounded-full bg-[#0d9488]" />
                                                <h4 className="font-extrabold text-sm text-[#0f172a]">Version 4.4 — Core Multi-Course Parallel Algorithm</h4>
                                            </div>
                                            <span className="text-[10px] font-bold text-[#64748b] bg-slate-100 px-2 py-0.5 rounded-md">Architecture</span>
                                        </div>

                                        <div className="p-3.5 rounded-2xl bg-[#ebf4f2]/70 border border-[#b8ccc8]/60 space-y-1">
                                            <div className="font-extrabold text-[#0f766e] flex items-center gap-1.5">
                                                <Layers className="w-4 h-4 text-[#0d9488]" />
                                                1. Multi-Course Parallel Practical Stacking (4 → 3 → 2 → 1)
                                            </div>
                                            <p className="text-[#475569] font-medium leading-relaxed">
                                                Practicals from <strong>different courses</strong> (e.g. COA-S2, CP-S3, DSA-S4, OS-S1) are stacked in the same 2-hour window. Absolute priority hierarchy (4 → 3 → 2 → 1) commits the maximum possible stack first. Includes cross-course preference to favor diverse course sets and deterministic tie-breaking.
                                            </p>
                                        </div>

                                        <div className="p-3.5 rounded-2xl bg-[#ebf4f2]/70 border border-[#b8ccc8]/60 space-y-1">
                                            <div className="font-extrabold text-[#0f766e] flex items-center gap-1.5">
                                                <Cpu className="w-4 h-4 text-[#0d9488]" />
                                                2. College-Wide Master Scheduling Priority & CollegeOccupancy
                                            </div>
                                            <p className="text-[#475569] font-medium leading-relaxed">
                                                Replaced independent department runs with a unified institutional pipeline: 1. Global Sessions → 2. Practical Stacking → 3. Synchronized Common-Time → 4. Tutorials → 5. Lectures → 6. CASC Cascade Repair → 7. Optimization. Global reservations remain 100% immutable.
                                            </p>
                                        </div>

                                        <div className="p-3.5 rounded-2xl bg-[#ebf4f2]/70 border border-[#b8ccc8]/60 space-y-1">
                                            <div className="font-extrabold text-[#0f766e] flex items-center gap-1.5">
                                                <Sparkles className="w-4 h-4 text-[#0d9488]" />
                                                3. Course-Preserving Global Cascade Repair (CASC)
                                            </div>
                                            <p className="text-[#475569] font-medium leading-relaxed">
                                                Automated multi-hop slot relocation for stuck sessions. Preserves 100% invariant course-faculty bindings without hallucinated reassignments. Relocates 2-hour practicals atomically without crossing break boundaries or displacing global sessions.
                                            </p>
                                        </div>

                                        <div className="p-3.5 rounded-2xl bg-[#ebf4f2]/70 border border-[#b8ccc8]/60 space-y-1">
                                            <div className="font-extrabold text-[#0f766e] flex items-center gap-1.5">
                                                <BookOpen className="w-4 h-4 text-[#0d9488]" />
                                                4. Dynamic Priority Scheduling (DAPS) & Resource Contention (RCAA)
                                            </div>
                                            <p className="text-[#475569] font-medium leading-relaxed">
                                                Replaced static ordering with multi-factor scarcity ranking: constrained faculty availability, lab shortages, tutorial room demands, and division slot flexibility are dynamically prioritized before placing sessions.
                                            </p>
                                        </div>

                                        <div className="p-3.5 rounded-2xl bg-[#ebf4f2]/70 border border-[#b8ccc8]/60 space-y-1">
                                            <div className="font-extrabold text-[#0f766e] flex items-center gap-1.5">
                                                <Users className="w-4 h-4 text-[#0d9488]" />
                                                5. Faculty Constraints, Time Availability & Workspace Lifecycle
                                            </div>
                                            <p className="text-[#475569] font-medium leading-relaxed">
                                                Configurable per-faculty time availability blackout rules, maximum daily teaching load boundaries, and full semester workspace lifecycle controls (Draft, Active, Archived).
                                            </p>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Modal Footer */}
                            <div className="flex items-center justify-between pt-3 border-t border-[#b8ccc8]/40 shrink-0">
                                <span className="text-[11px] text-[#94a3b8] font-medium">
                                    Showing: <strong className="text-[#0f766e]">{changelogVersion === "all" ? "v4.5 & v4.4" : changelogVersion}</strong>
                                </span>
                                <button
                                    onClick={() => setShowChangelog(false)}
                                    className="px-5 py-2.5 rounded-xl bg-[#0d9488] hover:bg-[#0f766e] text-white font-extrabold text-xs transition-colors cursor-pointer shadow-xs"
                                >
                                    Close Changelog
                                </button>
                            </div>
                        </div>
                    </div>,
                    document.body
                )}


                {/* ═══════════════════════════════════════════════════════
                    2. PROPRIETARY ALGORITHM: ATLAS
                ═══════════════════════════════════════════════════════ */}
                <RevealSection id="atlas-algorithm" className="space-y-8 scroll-mt-24">
                    <div className="text-center space-y-3">
                        <span className="px-3.5 py-1 text-[10px] font-extrabold uppercase rounded-full bg-[#ccfbf1] text-[#0f766e] border border-[#99f6e4] inline-block tracking-wider">
                            Proprietary Algorithm
                        </span>
                        <h2 className="text-2xl sm:text-3xl font-extrabold text-[#0f172a] tracking-tight">
                            The ATLAS Algorithm
                        </h2>
                        <p className="text-xs sm:text-sm text-[#64748b] font-semibold max-w-xl mx-auto uppercase tracking-wider">
                            Adaptive Timetable and Learning Allocation System
                        </p>
                    </div>

                    {/* Research Paper Citation Callout Box */}
                    <div className="p-5 rounded-xl bg-white border-l-4 border-l-[#0d9488] border-t border-r border-b border-[#b8ccc8]/60 shadow-xs font-mono text-xs text-[#334155] space-y-1.5">
                        <div className="flex items-center gap-2 font-bold text-[#0f766e]">
                            <BookOpen className="w-4 h-4" />
                            <span>Academic Research Citation Paper Specification</span>
                        </div>
                        <p className="italic text-[#64748b] leading-relaxed">
                            &quot;We propose <strong>ATLAS</strong>, a 4-layer intelligent scheduling algorithm for conflict-free university timetable generation using topological hard anchor reservation, parallel hyper-graph batch packing, dynamic entropy-guided swapping, and evolutionary fitness minimization.&quot;
                        </p>
                    </div>

                    {/* 4-Layer Architecture — Connected Pipeline */}
                    <div className="p-6 sm:p-8 rounded-2xl bg-white border border-[#b8ccc8]/60 shadow-sm space-y-8">
                        <h3 className="text-xs font-bold uppercase tracking-widest text-[#94a3b8] text-center">
                            4-Layer Constraint Solver Pipeline Architecture
                        </h3>

                        <div className="grid grid-cols-1 md:grid-cols-4 gap-0">
                            {/* Layer 1 */}
                            <div className="pipeline-connector p-5 rounded-xl bg-[#f8fdfb] border border-[#d2e8e4] space-y-3 premium-card md:rounded-r-none md:border-r-0">
                                <div className="flex items-center justify-between">
                                    <span className="px-2 py-0.5 text-[9px] font-extrabold rounded-md bg-[#0d9488] text-white shadow-sm">
                                        LAYER 1
                                    </span>
                                    <span className="text-[10px] font-bold text-[#0d9488] bg-[#ccfbf1] px-2 py-0.5 rounded-md border border-[#99f6e4]">THARM</span>
                                </div>
                                <h4 className="text-sm font-extrabold text-[#0f172a] leading-snug">Topological Hard Anchor Reservation</h4>
                                <p className="text-[11px] text-[#64748b] leading-relaxed">
                                    Immutably locks global fixed courses (MILFL, Aptitude) into a 3D matrix ($Class \times Day \times Slot$) with break-aware slot masking.
                                </p>
                            </div>

                            {/* Layer 2 */}
                            <div className="pipeline-connector p-5 rounded-xl bg-[#f8fdfb] border border-[#d2e8e4] space-y-3 premium-card md:rounded-none md:border-r-0">
                                <div className="flex items-center justify-between">
                                    <span className="px-2 py-0.5 text-[9px] font-extrabold rounded-md bg-[#0d9488] text-white shadow-sm">
                                        LAYER 2
                                    </span>
                                    <span className="text-[10px] font-bold text-[#0d9488] bg-[#ccfbf1] px-2 py-0.5 rounded-md border border-[#99f6e4]">PHGBP</span>
                                </div>
                                <h4 className="text-sm font-extrabold text-[#0f172a] leading-snug">Parallel Hyper-Graph Batch Packing</h4>
                                <p className="text-[11px] text-[#64748b] leading-relaxed">
                                    Treats tutorial/lab batches (S1-S12) as nodes in a Conflict Hyper-Graph, splitting colors to maximize room efficiency.
                                </p>
                            </div>

                            {/* Layer 3 */}
                            <div className="pipeline-connector p-5 rounded-xl bg-[#f8fdfb] border border-[#d2e8e4] space-y-3 premium-card md:rounded-none md:border-r-0">
                                <div className="flex items-center justify-between">
                                    <span className="px-2 py-0.5 text-[9px] font-extrabold rounded-md bg-[#0d9488] text-white shadow-sm">
                                        LAYER 3
                                    </span>
                                    <span className="text-[10px] font-bold text-[#0d9488] bg-[#ccfbf1] px-2 py-0.5 rounded-md border border-[#99f6e4]">DEGES</span>
                                </div>
                                <h4 className="text-sm font-extrabold text-[#0f172a] leading-snug">Dynamic Entropy-Guided Swapping</h4>
                                <p className="text-[11px] text-[#64748b] leading-relaxed">
                                    Mimics human-brain backtracking. Calculates slot tightness (entropy) and executes directed swapping to heal unallocated sessions.
                                </p>
                            </div>

                            {/* Layer 4 */}
                            <div className="p-5 rounded-xl bg-[#f8fdfb] border border-[#d2e8e4] space-y-3 premium-card md:rounded-l-none">
                                <div className="flex items-center justify-between">
                                    <span className="px-2 py-0.5 text-[9px] font-extrabold rounded-md bg-[#0d9488] text-white shadow-sm">
                                        LAYER 4
                                    </span>
                                    <span className="text-[10px] font-bold text-[#0d9488] bg-[#ccfbf1] px-2 py-0.5 rounded-md border border-[#99f6e4]">MTEFM</span>
                                </div>
                                <h4 className="text-sm font-extrabold text-[#0f172a] leading-snug">Evolutionary Fitness Minimizer</h4>
                                <p className="text-[11px] text-[#64748b] leading-relaxed">
                                    Evaluates fitness penalty across trials until Penalty reaches 0 (100% Conflict-Free Guarantee).
                                </p>
                            </div>
                        </div>

                        {/* Flow arrows between layers on mobile */}
                        <div className="flex items-center justify-center gap-3 md:hidden">
                            <span className="text-[10px] font-extrabold text-[#0d9488] bg-[#ccfbf1] px-2 py-0.5 rounded-md border border-[#99f6e4]">THARM</span>
                            <ArrowRight className="w-3 h-3 text-[#0d9488]" />
                            <span className="text-[10px] font-extrabold text-[#0d9488] bg-[#ccfbf1] px-2 py-0.5 rounded-md border border-[#99f6e4]">PHGBP</span>
                            <ArrowRight className="w-3 h-3 text-[#0d9488]" />
                            <span className="text-[10px] font-extrabold text-[#0d9488] bg-[#ccfbf1] px-2 py-0.5 rounded-md border border-[#99f6e4]">DEGES</span>
                            <ArrowRight className="w-3 h-3 text-[#0d9488]" />
                            <span className="text-[10px] font-extrabold text-[#0d9488] bg-[#ccfbf1] px-2 py-0.5 rounded-md border border-[#99f6e4]">MTEFM</span>
                        </div>

                        {/* Mathematical Penalty Formula Box */}
                        <div className="p-5 rounded-xl bg-[#0f172a] text-white space-y-2.5 text-center">
                            <span className="text-[10px] font-bold uppercase text-[#99f6e4] tracking-widest">
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
                        <div className="p-6 rounded-2xl bg-white border border-red-200/60 shadow-xs space-y-4 premium-card">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-red-50 border border-red-200 flex items-center justify-center text-red-600 font-bold">
                                    <XCircle className="w-5 h-5 text-red-600" />
                                </div>
                                <div>
                                    <h3 className="text-base font-extrabold text-[#0f172a]">
                                        Traditional Schedulers
                                    </h3>
                                    <p className="text-xs text-red-600/70 font-medium">
                                        Brute Force & Basic Genetic Algorithms
                                    </p>
                                </div>
                            </div>

                            <ul className="space-y-2.5 text-xs text-[#475569]">
                                <li className="flex items-start gap-2">
                                    <span className="text-red-400 font-bold mt-0.5">•</span>
                                    <span><strong className="text-[#0f172a]">Combinatorial Explosion:</strong> Explodes exponentially ($O(N!)$), resulting in build timeouts on large academic loads.</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <span className="text-red-400 font-bold mt-0.5">•</span>
                                    <span><strong className="text-[#0f172a]">Non-Deterministic Output:</strong> Genetic algorithms leave hidden faculty double-bookings or unallocated slots.</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <span className="text-red-400 font-bold mt-0.5">•</span>
                                    <span><strong className="text-[#0f172a]">No Elective Sync Support:</strong> Fails to synchronize same-slot elective courses across different divisions.</span>
                                </li>
                            </ul>
                        </div>

                        {/* ATLAS Engine Card */}
                        <div className="p-6 rounded-2xl bg-white border border-[#0d9488]/30 shadow-sm space-y-4 relative overflow-hidden premium-card">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-[#ccfbf1] border border-[#99f6e4] flex items-center justify-center text-[#0f766e] font-bold">
                                    <Cpu className="w-5 h-5" />
                                </div>
                                <div>
                                    <h3 className="text-base font-extrabold text-[#0f172a]">
                                        ATLAS Algorithm
                                    </h3>
                                    <p className="text-xs text-[#0d9488] font-medium">
                                        Adaptive Timetable & Learning Allocation System
                                    </p>
                                </div>
                            </div>

                            <ul className="space-y-2.5 text-xs text-[#334155]">
                                <li className="flex items-start gap-2">
                                    <CheckCircle2 className="w-4 h-4 text-[#0d9488] shrink-0 mt-0.5" />
                                    <span><strong className="text-[#0f172a]">Zero Hallucination / Zero Duplication:</strong> Eliminates duplicate subject entries like ARP-I vs Aptitude and Reasoning - Part III.</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <CheckCircle2 className="w-4 h-4 text-[#0d9488] shrink-0 mt-0.5" />
                                    <span><strong className="text-[#0f172a]">Self-Healing Backtracking:</strong> Automatically repairs isolated clashes without requiring manual user intervention.</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <CheckCircle2 className="w-4 h-4 text-[#0d9488] shrink-0 mt-0.5" />
                                    <span><strong className="text-[#0f172a]">Multi-Level Single Pass:</strong> Instantly generates Division, Faculty, Location, and Batch timetables in a single pass.</span>
                                </li>
                            </ul>
                        </div>
                    </div>
                </RevealSection>

                {/* ═══════════════════════════════════════════════════════
                    3. UNIQUENESS & CORE FEATURES
                ═══════════════════════════════════════════════════════ */}
                <RevealSection className="space-y-8">
                    <div className="text-center space-y-3">
                        <span className="px-3.5 py-1 text-[10px] font-extrabold uppercase rounded-full bg-[#ccfbf1] text-[#0f766e] border border-[#99f6e4] inline-block tracking-wider">
                            Platform Uniqueness
                        </span>
                        <h2 className="text-2xl sm:text-3xl font-extrabold text-[#0f172a] tracking-tight">
                            Built Specifically for Academic Excellence
                        </h2>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                        {[
                            {
                                icon: Layers,
                                title: "4 Multi-Dimensional Views",
                                desc: "Simultaneous matrix generation for Division schedules, Faculty workloads, Room occupancy, and Batch groups."
                            },
                            {
                                icon: Zap,
                                title: "Elective Sync Rules",
                                desc: "Auto-detects and enforces same-slot synchronization for elective courses across multiple year divisions."
                            },
                            {
                                icon: BarChart3,
                                title: "Static 2D Scheduler",
                                desc: "Clean, uncluttered 2D table representation with distinct color coding for Normal, Lab, Tut, Sync, and Fixed slots."
                            },
                            {
                                icon: FileSpreadsheet,
                                title: "Multi-Sheet Excel Export",
                                desc: "Exports complete master workbooks with individual sheets for Division, Faculty, Location, and Workload analytics."
                            }
                        ].map((feature, i) => (
                            <div key={i} className="p-6 rounded-2xl bg-white border border-[#b8ccc8]/60 shadow-xs space-y-3 premium-card flex flex-col">
                                <div className="w-10 h-10 rounded-xl bg-[#f0fdf9] border border-[#d2e8e4] text-[#0d9488] flex items-center justify-center">
                                    <feature.icon className="w-5 h-5" />
                                </div>
                                <h4 className="text-sm font-extrabold text-[#0f172a] leading-snug">{feature.title}</h4>
                                <p className="text-xs text-[#64748b] leading-relaxed flex-1">
                                    {feature.desc}
                                </p>
                            </div>
                        ))}
                    </div>
                </RevealSection>

                {/* ═══════════════════════════════════════════════════════
                    4. OUR TEAM SECTION
                ═══════════════════════════════════════════════════════ */}
                <RevealSection className="space-y-8">
                    <div className="text-center space-y-3">
                        <span className="px-3.5 py-1 text-[10px] font-extrabold uppercase rounded-full bg-[#ccfbf1] text-[#0f766e] border border-[#99f6e4] inline-block tracking-wider">
                            Engineering Team
                        </span>
                        <h2 className="text-2xl sm:text-3xl font-extrabold text-[#0f172a] tracking-tight">
                            Architects of ATLAS
                        </h2>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                        {[
                            {
                                icon: Code,
                                title: "Algorithm Architect",
                                badge: "ATLAS Engine Solver",
                                desc: "Designed THARM, PHGBP, DEGES self-healing backtracking, and MTEFM fitness penalty minimizer."
                            },
                            {
                                icon: Layers,
                                title: "Senior Systems Engineer",
                                badge: "Data Models & Parser",
                                desc: "Engineered the Excel sheet auto-detection parser, resource mapping, and multi-sheet XLSX export engine."
                            },
                            {
                                icon: Award,
                                title: "Lead UI/UX Architect",
                                badge: "Minimal Cool Mint SaaS Interface",
                                desc: "Created the 3-tier contrast layout, clean static 2D matrix visualization, and integrated stage pipeline."
                            }
                        ].map((member, i) => (
                            <div key={i} className="p-6 rounded-2xl bg-white border border-[#b8ccc8]/60 text-center shadow-xs space-y-3 premium-card">
                                <div className="w-14 h-14 mx-auto rounded-2xl bg-[#f0fdf9] border border-[#d2e8e4] flex items-center justify-center text-[#0d9488]">
                                    <member.icon className="w-6 h-6" />
                                </div>
                                <div>
                                    <h4 className="text-base font-extrabold text-[#0f172a]">{member.title}</h4>
                                    <span className="text-[11px] font-bold text-[#0f766e] px-2.5 py-0.5 rounded-full bg-[#ccfbf1] border border-[#99f6e4] inline-block mt-1.5">
                                        {member.badge}
                                    </span>
                                </div>
                                <p className="text-xs text-[#64748b] leading-relaxed">
                                    {member.desc}
                                </p>
                            </div>
                        ))}
                    </div>
                </RevealSection>

                {/* ═══════════════════════════════════════════════════════
                    5. BOTTOM CTA BANNER
                ═══════════════════════════════════════════════════════ */}
                <RevealSection>
                    <div className="p-10 sm:p-14 rounded-3xl bg-white border border-[#0d9488]/20 text-center space-y-5 shadow-sm relative overflow-hidden">
                        {/* Subtle radial glow */}
                        <div className="absolute inset-0 pointer-events-none" aria-hidden="true" style={{
                            background: 'radial-gradient(ellipse at center, rgba(13,148,136,0.04) 0%, transparent 70%)'
                        }} />
                        <div className="relative z-10">
                            <h3 className="text-xl sm:text-2xl font-extrabold text-[#0f172a] tracking-tight">
                                Ready to Generate Your Department Timetable with ATLAS?
                            </h3>
                            <p className="text-xs sm:text-sm text-[#64748b] max-w-md mx-auto font-medium leading-relaxed mt-3">
                                Upload your course load workbook and let the ATLAS engine solve constraints in seconds during this Beta Testing phase.
                            </p>

                            <div className="pt-5">
                                <ShimmerButton
                                    onClick={onLaunchStudio}
                                    variant="primary"
                                    className="py-3.5 px-9 text-sm font-extrabold"
                                >
                                    <span>Launch Timetable Studio Now (Beta)</span>
                                    <ArrowRight className="w-4 h-4" />
                                </ShimmerButton>
                            </div>
                        </div>
                    </div>
                </RevealSection>
            </div>
        </div>
    );
}
