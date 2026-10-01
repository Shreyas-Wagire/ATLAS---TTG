"use client";

import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { 
    Sparkles, Cpu, ShieldCheck, Zap, Layers, ArrowRight, 
    CheckCircle2, Users, FileSpreadsheet, BarChart3, Database, Code, 
    Award, BookOpen, Beaker, XCircle, X, ChevronRight, Terminal, 
    Activity, Clock, Sliders, Check
} from "lucide-react";
import ShimmerButton from "./ui/ShimmerButton";

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
    const [changelogVersion, setChangelogVersion] = useState("all"); // 'all' | 'v4.5' | 'v4.4'
    const [previewTab, setPreviewTab] = useState("division"); // 'division' | 'faculty' | 'lab'
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
            {/* Subtle academic grid pattern */}
            <div className="atlas-grid-bg fixed inset-0 pointer-events-none z-0" aria-hidden="true" />

            {/* Ambient soft glow at top center */}
            <div 
                className="fixed top-0 left-1/2 -translate-x-1/2 w-full max-w-4xl h-96 pointer-events-none z-0"
                style={{
                    background: "radial-gradient(ellipse 60% 40% at 50% 0%, rgba(45, 212, 191, 0.12), transparent 70%)"
                }}
                aria-hidden="true"
            />

            <div className="relative z-10 space-y-24 sm:space-y-32 pb-16 max-w-5xl mx-auto px-2 sm:px-4">

                {/* ═══════════════════════════════════════════════════════
                    1. HERO SECTION — Modern, Minimal & High-End
                ═══════════════════════════════════════════════════════ */}
                <section className="text-center pt-10 sm:pt-16 pb-4">
                    {/* Announcement & Version Pills */}
                    <div className="flex flex-wrap items-center justify-center gap-2.5 mb-7">
                        <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-white/90 border border-teal-200/80 text-[#0f766e] text-xs font-bold shadow-2xs backdrop-blur-xs">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                            <span>ATLAS Engine v4.5</span>
                            <span className="text-[#94a3b8] font-normal">|</span>
                            <span className="text-[11px] font-semibold text-[#0d9488]">Production Build</span>
                        </div>

                        {/* Interactive Changelog Trigger Pill */}
                        <button
                            type="button"
                            onClick={() => setShowChangelog(true)}
                            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#ccfbf1]/80 hover:bg-[#ccfbf1] text-[#0f766e] border border-[#99f6e4] text-xs font-bold shadow-2xs hover:shadow-xs transition-all duration-200 cursor-pointer group hover:scale-[1.02] active:scale-[0.98]"
                        >
                            <Sparkles className="w-3.5 h-3.5 text-[#0d9488] group-hover:rotate-12 transition-transform duration-200" />
                            <span>What's New in v4.5 & v4.4</span>
                            <span className="px-1.5 py-0.5 rounded-md bg-[#0d9488] text-white text-[9px] font-extrabold tracking-wide">
                                NOTES
                            </span>
                        </button>
                    </div>

                    {/* Prominent Logo Emblem */}
                    <div className="flex items-center justify-center mb-6">
                        <div className="relative inline-flex items-center justify-center p-2 sm:p-3 rounded-3xl bg-white/90 border border-teal-100 shadow-sm backdrop-blur-sm transition-transform duration-300 hover:scale-[1.02]">
                            <img 
                                src="/logo.png" 
                                alt="ATLAS Timetable Generator" 
                                className="h-16 sm:h-20 w-auto object-contain mx-auto drop-shadow-xs" 
                            />
                        </div>
                    </div>

                    {/* Refined Modern Headline */}
                    <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-[#0f172a] tracking-tight leading-[1.12] max-w-3xl mx-auto mb-5">
                        Next-Generation Academic{" "}
                        <span className="bg-gradient-to-r from-[#0d9488] via-[#0f766e] to-[#047857] bg-clip-text text-transparent">
                            Timetable Engine
                        </span>
                    </h1>

                    {/* Subtext — concise, readable, high contrast */}
                    <p className="text-sm sm:text-base text-[#475569] max-w-2xl mx-auto font-normal leading-relaxed mb-8">
                        Powered by <strong className="font-bold text-[#0d9488]">ATLAS Algorithm v4.5</strong> — an adaptive scheduling engine designed for college-wide timetable generation, parallel practical allocation, dynamic constraint optimization, and conflict repair.
                    </p>

                    {/* Action Group */}
                    <div className="flex flex-wrap items-center justify-center gap-3.5">
                        <ShimmerButton
                            onClick={onLaunchStudio}
                            variant="primary"
                            className="py-3 px-7 text-sm font-extrabold shadow-sm hover:shadow-md transition-all group"
                        >
                            <span>Start Timetable Generation (v4.5)</span>
                            <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                        </ShimmerButton>

                        <a
                            href="#atlas-algorithm"
                            className="inline-flex items-center gap-1.5 px-5 py-3 rounded-full text-xs font-bold text-[#0f766e] bg-white/90 hover:bg-[#ebf4f2] border border-[#b8ccc8]/80 hover:border-[#99f6e4] transition-all duration-200 shadow-2xs"
                        >
                            <span>Explore Solver Architecture</span>
                            <span className="text-[11px] text-[#0d9488]">↓</span>
                        </a>
                    </div>

                    {/* Key Technical Proof Points Ribbon */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-12 max-w-4xl mx-auto text-left">
                        {[
                            {
                                label: "100% Conflict-Free",
                                sub: "Guaranteed zero faculty & room clashes",
                                icon: ShieldCheck,
                            },
                            {
                                label: "4-Way Practical Stacking",
                                sub: "Multi-course parallel lab allocation",
                                icon: Layers,
                            },
                            {
                                label: "4 Synchronized Views",
                                sub: "Division, Faculty, Location & Batch",
                                icon: BarChart3,
                            },
                            {
                                label: "Zero Hallucination",
                                sub: "Strict course invariant preservation",
                                icon: CheckCircle2,
                            }
                        ].map((stat, i) => (
                            <div 
                                key={i} 
                                className="p-3.5 rounded-2xl bg-white/80 border border-[#b8ccc8]/60 shadow-2xs hover:border-[#99f6e4] transition-colors"
                            >
                                <div className="flex items-center gap-2 mb-1">
                                    <stat.icon className="w-4 h-4 text-[#0d9488] shrink-0" />
                                    <span className="text-xs font-bold text-[#0f172a] leading-tight">
                                        {stat.label}
                                    </span>
                                </div>
                                <p className="text-[11px] text-[#64748b] leading-snug pl-6">
                                    {stat.sub}
                                </p>
                            </div>
                        ))}
                    </div>
                </section>

                {/* ═══════════════════════════════════════════════════════
                    2. PRODUCT PREVIEW — Interactive Studio Showcase
                ═══════════════════════════════════════════════════════ */}
                <RevealSection className="px-1">
                    <div className="relative rounded-3xl border border-[#b8ccc8]/80 bg-white shadow-xl shadow-teal-950/5 overflow-hidden transition-all duration-300">
                        {/* Chrome Header Bar */}
                        <div className="flex items-center justify-between px-5 py-3 bg-[#f8fafb] border-b border-[#e2e8f0]">
                            <div className="flex items-center gap-2">
                                <div className="flex items-center gap-1.5">
                                    <div className="w-3 h-3 rounded-full bg-[#fca5a5]" />
                                    <div className="w-3 h-3 rounded-full bg-[#fde68a]" />
                                    <div className="w-3 h-3 rounded-full bg-[#86efac]" />
                                </div>
                                <span className="text-[11px] font-semibold text-[#94a3b8] ml-2 hidden sm:inline">
                                    ATLAS Scheduler Studio Workspace
                                </span>
                            </div>

                            {/* Center URL capsule */}
                            <div className="flex items-center gap-1.5 px-4 py-1 rounded-xl bg-white border border-[#e2e8f0] text-[11px] font-mono text-[#64748b] shadow-2xs max-w-xs truncate">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                <span>atlas-engine.app/studio/AY-2025-26</span>
                            </div>

                            {/* Status badge */}
                            <div className="flex items-center gap-1.5">
                                <span className="px-2 py-0.5 rounded-md bg-emerald-50 border border-emerald-200 text-[10px] font-bold text-emerald-700 flex items-center gap-1">
                                    <CheckCircle2 className="w-3 h-3" />
                                    <span>Optimal Solution (Penalty: 0)</span>
                                </span>
                            </div>
                        </div>

                        {/* Interactive Tab Switcher inside the preview */}
                        <div className="px-6 pt-4 pb-2 border-b border-[#f1f5f9] flex flex-wrap items-center justify-between gap-3">
                            <div className="flex items-center gap-1 p-1 rounded-xl bg-[#f0f4f3] border border-[#e2e8f0]">
                                {[
                                    { id: "division", label: "Division View (CS-A)" },
                                    { id: "faculty", label: "Faculty Load (Prof. Sharma)" },
                                    { id: "lab", label: "Lab Allocation (Lab-104)" },
                                ].map((tab) => (
                                    <button
                                        key={tab.id}
                                        type="button"
                                        onClick={() => setPreviewTab(tab.id)}
                                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                            previewTab === tab.id
                                                ? "bg-white text-[#0f766e] shadow-2xs border border-[#e2e8f0]"
                                                : "text-[#64748b] hover:text-[#0f172a]"
                                        }`}
                                    >
                                        {tab.label}
                                    </button>
                                ))}
                            </div>

                            <div className="flex items-center gap-2 text-[11px] text-[#64748b]">
                                <span className="font-semibold text-[#0f172a]">Active Constraints:</span>
                                <span className="px-2 py-0.5 rounded-md bg-[#ccfbf1] text-[#0f766e] font-extrabold text-[10px]">
                                    CASC Auto-Repair
                                </span>
                                <span className="px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 font-extrabold text-[10px] border border-purple-200">
                                    Elective Sync
                                </span>
                            </div>
                        </div>

                        {/* Interactive Timetable Grid Display */}
                        <div className="p-6 space-y-4">
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
                                                        <div className="px-2.5 py-1.5 rounded-lg bg-[#e6f4f1] border border-[#0d9488]/20 text-[#0f766e] text-center">
                                                            <span className="font-bold">Parallel Labs</span> <span className="text-[10px] text-[#0d9488]">• S1: DSA | S2: COA</span>
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
                                                        <div className="px-2.5 py-1.5 rounded-lg bg-[#e6f4f1] border border-[#0d9488]/20 text-[#0f766e] text-center">
                                                            <span className="font-bold">Parallel Labs</span> <span className="text-[10px] text-[#0d9488]">• S3: DBMS | S4: OS</span>
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
                                                        <div className="px-2.5 py-1.5 rounded-lg bg-[#e6f4f1] border border-[#0d9488]/20 text-[#0f766e] text-center">
                                                            <span className="font-bold">DSA Lab Batch S1</span> <span className="text-[10px] text-[#0d9488]">• Lab-104</span>
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
                                                        <div className="px-2.5 py-1.5 rounded-lg bg-[#e6f4f1] border border-[#0d9488]/20 text-[#0f766e] text-center">
                                                            <span className="font-bold">CS-A DSA Lab (S1)</span> <span className="text-[10px] text-[#0d9488]">• Prof. Sharma • 28/30 Seats</span>
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
                                                        <div className="px-2.5 py-1.5 rounded-lg bg-[#e6f4f1] border border-[#0d9488]/20 text-[#0f766e] text-center">
                                                            <span className="font-bold">CS-B DSA Lab (S3)</span> <span className="text-[10px] text-[#0d9488]">• Prof. Mane • 30/30 Seats</span>
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
                                        <span className="w-2.5 h-2.5 rounded-sm bg-[#0d9488]" />
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
                    <div className="text-center space-y-2.5">
                        <span className="px-3.5 py-1 text-[10px] font-extrabold uppercase rounded-full bg-[#ccfbf1] text-[#0f766e] border border-[#99f6e4] inline-block tracking-wider">
                            Constraint Solver Architecture
                        </span>
                        <h2 className="text-2xl sm:text-3xl font-extrabold text-[#0f172a] tracking-tight">
                            The ATLAS Algorithm Core
                        </h2>
                        <p className="text-xs sm:text-sm text-[#64748b] font-medium max-w-xl mx-auto">
                            Adaptive Timetable and Learning Allocation System with Multi-Phase Optimization
                        </p>
                    </div>

                    {/* Academic Research Paper Specification Box */}
                    <div className="p-5 rounded-2xl bg-white border border-[#b8ccc8]/70 shadow-2xs text-xs space-y-2">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 font-bold text-[#0f766e]">
                                <BookOpen className="w-4 h-4 text-[#0d9488]" />
                                <span>Academic Research Specification & Solver Formulation</span>
                            </div>
                            <span className="text-[10px] font-mono text-[#94a3b8] hidden sm:inline">
                                Ref: ATLAS-V45-ALGO
                            </span>
                        </div>
                        <p className="italic text-[#475569] leading-relaxed">
                            &ldquo;We formulate university scheduling as a 4-layer multi-constraint optimization problem. By combining topological hard anchor reservation, parallel hyper-graph batch packing, dynamic entropy-guided swapping, and evolutionary fitness minimization, ATLAS deterministically converges to a zero-penalty schedule without combinatorial explosion.&rdquo;
                        </p>
                    </div>

                    {/* 4-Layer Connected Pipeline Architecture */}
                    <div className="p-6 sm:p-8 rounded-3xl bg-white border border-[#b8ccc8]/60 shadow-sm space-y-7">
                        <div className="flex items-center justify-between border-b border-[#e2e8f0] pb-3">
                            <h3 className="text-xs font-bold uppercase tracking-wider text-[#94a3b8]">
                                Sequential Constraint Pipeline
                            </h3>
                            <span className="text-[11px] font-extrabold text-[#0d9488]">
                                4 Deterministic Passes
                            </span>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            {/* Layer 1: THARM */}
                            <div className="p-5 rounded-2xl bg-[#f8fdfb] border border-[#d2e8e4] space-y-3 hover-lift">
                                <div className="flex items-center justify-between">
                                    <span className="px-2 py-0.5 text-[9px] font-extrabold rounded-md bg-[#0d9488] text-white">
                                        LAYER 01
                                    </span>
                                    <span className="text-[10px] font-bold text-[#0d9488] bg-[#ccfbf1] px-2 py-0.5 rounded-md border border-[#99f6e4]">
                                        THARM
                                    </span>
                                </div>
                                <h4 className="text-sm font-extrabold text-[#0f172a] leading-snug">
                                    Topological Hard Anchor Reservation
                                </h4>
                                <p className="text-[11px] text-[#64748b] leading-relaxed">
                                    Locks immutable institutional courses (MILFL, Aptitude) into a 3D matrix (<span className="font-mono text-[10px]">Class × Day × Slot</span>) with break-aware slot masking.
                                </p>
                            </div>

                            {/* Layer 2: PHGBP */}
                            <div className="p-5 rounded-2xl bg-[#f8fdfb] border border-[#d2e8e4] space-y-3 hover-lift">
                                <div className="flex items-center justify-between">
                                    <span className="px-2 py-0.5 text-[9px] font-extrabold rounded-md bg-[#0d9488] text-white">
                                        LAYER 02
                                    </span>
                                    <span className="text-[10px] font-bold text-[#0d9488] bg-[#ccfbf1] px-2 py-0.5 rounded-md border border-[#99f6e4]">
                                        PHGBP
                                    </span>
                                </div>
                                <h4 className="text-sm font-extrabold text-[#0f172a] leading-snug">
                                    Parallel Hyper-Graph Batch Packing
                                </h4>
                                <p className="text-[11px] text-[#64748b] leading-relaxed">
                                    Stacks lab batches (S1-S8) across different courses in the same 2-hour window using priority stacking (4 → 3 → 2 → 1) to maximize lab utilization.
                                </p>
                            </div>

                            {/* Layer 3: DEGES */}
                            <div className="p-5 rounded-2xl bg-[#f8fdfb] border border-[#d2e8e4] space-y-3 hover-lift">
                                <div className="flex items-center justify-between">
                                    <span className="px-2 py-0.5 text-[9px] font-extrabold rounded-md bg-[#0d9488] text-white">
                                        LAYER 03
                                    </span>
                                    <span className="text-[10px] font-bold text-[#0d9488] bg-[#ccfbf1] px-2 py-0.5 rounded-md border border-[#99f6e4]">
                                        DEGES
                                    </span>
                                </div>
                                <h4 className="text-sm font-extrabold text-[#0f172a] leading-snug">
                                    Dynamic Entropy-Guided Swapping
                                </h4>
                                <p className="text-[11px] text-[#64748b] leading-relaxed">
                                    Heals bottlenecked sessions by evaluating slot tightness entropy and executing directed multi-hop swaps without breaking invariant bindings.
                                </p>
                            </div>

                            {/* Layer 4: MTEFM */}
                            <div className="p-5 rounded-2xl bg-[#f8fdfb] border border-[#d2e8e4] space-y-3 hover-lift">
                                <div className="flex items-center justify-between">
                                    <span className="px-2 py-0.5 text-[9px] font-extrabold rounded-md bg-[#0d9488] text-white">
                                        LAYER 04
                                    </span>
                                    <span className="text-[10px] font-bold text-[#0d9488] bg-[#ccfbf1] px-2 py-0.5 rounded-md border border-[#99f6e4]">
                                        MTEFM
                                    </span>
                                </div>
                                <h4 className="text-sm font-extrabold text-[#0f172a] leading-snug">
                                    Evolutionary Fitness Minimizer
                                </h4>
                                <p className="text-[11px] text-[#64748b] leading-relaxed">
                                    Iterates through fine-grained schedule variations until penalty reaches 0, mathematically ensuring zero faculty clashes and zero room double-bookings.
                                </p>
                            </div>
                        </div>

                        {/* Mathematical Penalty Terminal */}
                        <div className="p-5 rounded-2xl bg-[#0f172a] text-white space-y-2.5 text-center shadow-md">
                            <div className="flex items-center justify-center gap-2">
                                <Terminal className="w-3.5 h-3.5 text-[#2dd4bf]" />
                                <span className="text-[10px] font-mono uppercase tracking-widest text-[#99f6e4]">
                                    Fitness Objective Function
                                </span>
                            </div>
                            <div className="font-mono text-xs sm:text-sm text-[#ccfbf1] font-bold overflow-x-auto py-1 tracking-tight">
                                Penalty = (10,000 × FacultyClashes) + (1,000 × MissingSessions) + (500 × RoomClashes) + (200 × BreakViolations) → 0
                            </div>
                            <p className="text-[11px] text-[#94a3b8] max-w-xl mx-auto font-normal">
                                Target: Penalty = 0. Convergence guarantees 100% conflict-free allocation without relaxing hard institutional constraints.
                            </p>
                        </div>
                    </div>

                    {/* Comparative Analysis: Traditional vs ATLAS */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        {/* Traditional Schedulers */}
                        <div className="p-6 rounded-3xl bg-white border border-rose-200/80 shadow-2xs space-y-4 hover-lift">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-2xl bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600">
                                    <XCircle className="w-5 h-5" />
                                </div>
                                <div>
                                    <h3 className="text-sm font-extrabold text-[#0f172a]">
                                        Traditional Schedulers
                                    </h3>
                                    <p className="text-xs text-rose-600/80 font-medium">
                                        Brute Force & Unconstrained Genetic Heuristics
                                    </p>
                                </div>
                            </div>

                            <ul className="space-y-2.5 text-xs text-[#475569]">
                                <li className="flex items-start gap-2">
                                    <span className="text-rose-400 font-bold mt-0.5">•</span>
                                    <span><strong>Combinatorial Explosion:</strong> Exponential complexity O(N!) causes build freezes or timeouts on full college loads.</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <span className="text-rose-400 font-bold mt-0.5">•</span>
                                    <span><strong>Non-Deterministic Failures:</strong> Genetic algorithms frequently leave invisible faculty overlaps and missing slots.</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <span className="text-rose-400 font-bold mt-0.5">•</span>
                                    <span><strong>No Elective Synchronization:</strong> Inability to synchronize common elective lecture slots across distinct divisions.</span>
                                </li>
                            </ul>
                        </div>

                        {/* ATLAS Engine */}
                        <div className="p-6 rounded-3xl bg-white border border-[#0d9488]/40 shadow-sm space-y-4 hover-lift relative overflow-hidden">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-2xl bg-[#ccfbf1] border border-[#99f6e4] flex items-center justify-center text-[#0f766e]">
                                    <Cpu className="w-5 h-5 text-[#0d9488]" />
                                </div>
                                <div>
                                    <h3 className="text-sm font-extrabold text-[#0f172a]">
                                        ATLAS Algorithm Engine
                                    </h3>
                                    <p className="text-xs text-[#0d9488] font-semibold">
                                        Deterministic Multi-Phase Constraint Solver
                                    </p>
                                </div>
                            </div>

                            <ul className="space-y-2.5 text-xs text-[#334155]">
                                <li className="flex items-start gap-2">
                                    <CheckCircle2 className="w-4 h-4 text-[#0d9488] shrink-0 mt-0.5" />
                                    <span><strong>Zero Course Hallucination:</strong> Preserves 100% invariant course-faculty mappings without fabricated names.</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <CheckCircle2 className="w-4 h-4 text-[#0d9488] shrink-0 mt-0.5" />
                                    <span><strong>Self-Healing CASC Cascade:</strong> Automatically relocates stuck sessions via multi-hop slot relocation.</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <CheckCircle2 className="w-4 h-4 text-[#0d9488] shrink-0 mt-0.5" />
                                    <span><strong>Unified Single-Pass Pipeline:</strong> Generates Division, Faculty, Location, and Batch schedules simultaneously.</span>
                                </li>
                            </ul>
                        </div>
                    </div>
                </RevealSection>

                {/* ═══════════════════════════════════════════════════════
                    4. PLATFORM CAPABILITIES — Minimalist Feature Grid
                ═══════════════════════════════════════════════════════ */}
                <RevealSection className="space-y-8">
                    <div className="text-center space-y-2">
                        <span className="px-3.5 py-1 text-[10px] font-extrabold uppercase rounded-full bg-[#ccfbf1] text-[#0f766e] border border-[#99f6e4] inline-block tracking-wider">
                            Engine Capabilities
                        </span>
                        <h2 className="text-2xl sm:text-3xl font-extrabold text-[#0f172a] tracking-tight">
                            Engineered for Academic Workloads
                        </h2>
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
                                className="p-5 rounded-2xl bg-white border border-[#b8ccc8]/60 shadow-2xs hover-lift flex flex-col space-y-2.5"
                            >
                                <div className="w-9 h-9 rounded-xl bg-[#f0fdf9] border border-[#d2e8e4] text-[#0d9488] flex items-center justify-center">
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
                    <div className="p-8 sm:p-12 rounded-3xl bg-white border border-[#0d9488]/30 text-center space-y-4 shadow-sm relative overflow-hidden">
                        {/* Soft background radial glow */}
                        <div 
                            className="absolute inset-0 pointer-events-none" 
                            style={{
                                background: "radial-gradient(ellipse at center, rgba(13,148,136,0.06) 0%, transparent 75%)"
                            }} 
                            aria-hidden="true" 
                        />
                        <div className="relative z-10 space-y-3">
                            <h3 className="text-2xl sm:text-3xl font-extrabold text-[#0f172a] tracking-tight">
                                Ready to Generate Academic Timetables with ATLAS?
                            </h3>
                            <p className="text-xs sm:text-sm text-[#64748b] max-w-lg mx-auto font-normal leading-relaxed">
                                Create a semester workspace, load your departmental course data, and let the ATLAS solver resolve all constraints automatically.
                            </p>

                            <div className="pt-4 flex flex-wrap items-center justify-center gap-3">
                                <ShimmerButton
                                    onClick={onLaunchStudio}
                                    variant="primary"
                                    className="py-3 px-8 text-sm font-extrabold"
                                >
                                    <span>Launch Timetable Studio (v4.5)</span>
                                    <ArrowRight className="w-4 h-4" />
                                </ShimmerButton>
                            </div>
                        </div>
                    </div>
                </RevealSection>
            </div>

            {/* ═══════════════════════════════════════════════════════
                VERSION v4.5 & v4.4 CHANGELOG MODAL (PORTALED TO BODY)
            ═══════════════════════════════════════════════════════ */}
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
                                <div className="w-10 h-10 rounded-2xl bg-[#ccfbf1] border border-[#99f6e4] flex items-center justify-center text-[#0d9488] shadow-2xs">
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
                                type="button"
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
                                            ? "bg-white text-[#0f766e] shadow-2xs border border-[#e2e8f0]"
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
                                            <h4 className="font-extrabold text-sm text-[#0f172a]">Version 4.5 — Modern Minimal UI/UX Architecture</h4>
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
                                </div>
                            )}
                        </div>

                        {/* Modal Footer */}
                        <div className="flex items-center justify-between pt-3 border-t border-[#b8ccc8]/40 shrink-0">
                            <span className="text-[11px] text-[#94a3b8] font-medium">
                                Showing: <strong className="text-[#0f766e]">{changelogVersion === "all" ? "v4.5 & v4.4" : changelogVersion}</strong>
                            </span>
                            <button
                                type="button"
                                onClick={() => setShowChangelog(false)}
                                className="px-5 py-2.5 rounded-xl bg-[#0d9488] hover:bg-[#0f766e] text-white font-extrabold text-xs transition-colors cursor-pointer shadow-2xs"
                            >
                                Close Changelog
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}

        </div>
    );
}
