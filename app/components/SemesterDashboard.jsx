"use client";

import React, { useState, useMemo } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
    Plus, Calendar, BookOpen, BarChart3, Trash2, LogIn,
    Eye, Archive, Sparkles, Clock, Building2,
    CheckCircle2, AlertTriangle, Circle, Layers,
    GraduationCap, Search, ArrowRight, X, MoreVertical,
    FileSpreadsheet, Check
} from "lucide-react";
import {
    getAllSemesters, deleteSemester, archiveSemester, setSemesterStatus,
    getSemesterStats, createSemester
} from "../utils/semesterStore";

import CreateSemesterModal from "./CreateSemesterModal";

const STATUS_CONFIG = {
    active: {
        label: "Active",
        badge: "bg-emerald-50 text-emerald-700 border-emerald-200",
        dot: "bg-emerald-500",
        line: "bg-gradient-to-r from-[#4338ca] to-[#b08d57]",
    },
    draft: {
        label: "Draft",
        badge: "bg-amber-50 text-amber-700 border-amber-200",
        dot: "bg-amber-400",
        line: "bg-gradient-to-r from-amber-400 to-amber-500",
    },
    archived: {
        label: "Archived",
        badge: "bg-slate-100 text-slate-600 border-slate-200",
        dot: "bg-slate-400",
        line: "bg-slate-300",
    },
};

function getWorkspaceTitle(semester) {
    const name = semester.name?.trim();
    const legacySemesterName = /^(?:semester\s+(?:[ivx]+|\d+)|sem\s*\d+|(?:odd|even)\s+sem)(?:\s*\([^)]*\)|\s+\d{4}[-–]\d{2,4})?$/i;
    return !name || legacySemesterName.test(name) ? "Timetable workspace" : name;
}

function formatAcademicYear(year) {
    return year ? String(year).replace(/-/g, "–") : "Academic year not set";
}

function SemesterCard({ semester, onEnter, onDelete, onStatusChange }) {
    const stats = getSemesterStats(semester);
    const cfg = STATUS_CONFIG[semester.status] || STATUS_CONFIG.draft;
    const [showMenu, setShowMenu] = useState(false);

    const createdDate = new Date(semester.createdAt).toLocaleDateString("en-IN", {
        day: "2-digit", month: "short", year: "numeric"
    });
    const updatedDate = new Date(semester.updatedAt).toLocaleDateString("en-IN", {
        day: "2-digit", month: "short", year: "numeric"
    });

    return (
        <motion.article
            layout
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6, scale: 0.985 }}
            whileHover={{ y: -3, boxShadow: "0 22px 48px -32px rgba(20,57,51,0.38)" }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="group relative flex flex-col justify-between overflow-visible rounded-[24px] border border-[#e3ebe7] bg-white shadow-[0_10px_32px_-27px_rgba(20,57,51,0.3)]"
        >
            {/* Top accent indicator line */}
            <div className={`absolute inset-x-5 top-0 h-[3px] rounded-b-full ${cfg.line}`} />

            <div className="flex flex-1 flex-col gap-4 p-5 sm:p-5.5">
                {/* Header: Badges & Actions */}
                <div className="flex items-start justify-between gap-2">
                    <div className="flex min-w-0 items-center gap-2">
                        <span className="inline-flex items-center gap-1.5 rounded-full border border-[#e3ebe7] bg-[#f7faf8] px-2.5 py-1 text-[10px] font-bold tracking-wide text-[#58716a]">
                            <Calendar className="h-3 w-3 text-[#4338ca]" />
                            AY {semester.academicYear ? formatAcademicYear(semester.academicYear) : "—"}
                        </span>
                        <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-bold ${cfg.badge}`}>
                            <span className={`h-1.5 w-1.5 rounded-full ${cfg.dot}`} />
                            {cfg.label}
                        </span>
                    </div>

                    {/* Quick Menu / Actions */}
                    <div className="relative">
                        <button
                            onClick={(e) => { e.stopPropagation(); setShowMenu(!showMenu); }}
                            className="grid h-8 w-8 shrink-0 place-items-center rounded-xl text-[#879791] transition-colors hover:bg-[#f1f6f3] hover:text-[#294943] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4338ca]/40"
                            title="Workspace options"
                            aria-label="Workspace options"
                        >
                            <MoreVertical className="w-4 h-4" />
                        </button>

                        {showMenu && (
                            <>
                                <div
                                    className="fixed inset-0 z-30"
                                    onClick={(e) => { e.stopPropagation(); setShowMenu(false); }}
                                />
                                <div className="absolute right-0 top-7 z-40 w-40 bg-white rounded-xl shadow-xl border border-[#b8ccc8]/60 py-1 text-xs font-semibold animate-in fade-in zoom-in-95 duration-150">
                                    <div className="px-3 py-1 text-[10px] font-bold text-[#94a3b8] uppercase tracking-wider border-b border-[#f1f5f9]">
                                        Status
                                    </div>
                                    {semester.status !== "active" && (
                                        <button
                                            onClick={(e) => { e.stopPropagation(); onStatusChange(semester.id, "active"); setShowMenu(false); }}
                                            className="w-full text-left px-3 py-1.5 hover:bg-emerald-50 text-emerald-700 flex items-center gap-2 cursor-pointer"
                                        >
                                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                            Set as Active
                                        </button>
                                    )}
                                    {semester.status !== "draft" && (
                                        <button
                                            onClick={(e) => { e.stopPropagation(); onStatusChange(semester.id, "draft"); setShowMenu(false); }}
                                            className="w-full text-left px-3 py-1.5 hover:bg-amber-50 text-amber-700 flex items-center gap-2 cursor-pointer"
                                        >
                                            <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                                            Set as Draft
                                        </button>
                                    )}
                                    {semester.status !== "archived" && (
                                        <button
                                            onClick={(e) => { e.stopPropagation(); onStatusChange(semester.id, "archived"); setShowMenu(false); }}
                                            className="w-full text-left px-3 py-1.5 hover:bg-slate-50 text-slate-600 flex items-center gap-2 cursor-pointer"
                                        >
                                            <Archive className="w-3.5 h-3.5 text-slate-400" />
                                            Archive
                                        </button>
                                    )}
                                    <div className="border-t border-[#f1f5f9] my-1" />
                                    <button
                                        onClick={(e) => { e.stopPropagation(); setShowMenu(false); onDelete(semester.id); }}
                                        className="w-full text-left px-3 py-1.5 hover:bg-red-50 text-red-600 flex items-center gap-2 cursor-pointer"
                                    >
                                        <Trash2 className="w-3.5 h-3.5" />
                                        Delete
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                </div>

                {/* Workspace Title & Meta */}
                <div className="min-w-0">
                    <h3 className="truncate text-[17px] font-extrabold leading-tight tracking-[-0.035em] text-[#1e1b4b] transition-colors duration-200 group-hover:text-[#3730a3]">
                        {getWorkspaceTitle(semester)}
                    </h3>
                    <p className="mt-1.5 flex min-w-0 items-center gap-1.5 text-[11px] font-medium text-[#7d8e88]">
                        {semester.department && (
                            <>
                                <span className="truncate">{semester.department}</span>
                                <span className="text-[#cbd5e1]">·</span>
                                <span className="truncate">All year levels</span>
                            </>
                        )}
                        {!semester.department && (
                            <span className="truncate">All year levels</span>
                        )}
                    </p>
                </div>

                {stats.hasData ? (
                    <div className="grid grid-cols-3 divide-x divide-[#e8eeeb] rounded-2xl border border-[#e8eeeb] bg-[#f8faf9] px-2 py-3">
                        <div className="text-center">
                            <div className={`text-sm font-extrabold ${stats.allocationRate === 100 ? "text-[#4338ca]" : stats.allocationRate > 0 ? "text-amber-600" : "text-[#94a3b8]"}`}>{stats.allocationRate}%</div>
                            <div className="mt-1 text-[9px] font-bold uppercase tracking-[0.08em] text-[#83928d]">Allocated</div>
                        </div>
                        <div className="text-center">
                            <div className={`text-sm font-extrabold ${stats.conflictCount === 0 ? "text-[#4338ca]" : "text-red-600"}`}>{stats.conflictCount}</div>
                            <div className="mt-1 text-[9px] font-bold uppercase tracking-[0.08em] text-[#83928d]">Conflicts</div>
                        </div>
                        <div className="text-center">
                            <div className={`text-sm font-extrabold ${stats.validationScore >= 90 ? "text-[#4338ca]" : stats.validationScore > 70 ? "text-amber-600" : "text-[#64748b]"}`}>{stats.validationScore}</div>
                            <div className="mt-1 text-[9px] font-bold uppercase tracking-[0.08em] text-[#83928d]">Quality</div>
                        </div>
                    </div>
                ) : (
                    <div className="flex items-center gap-3 rounded-2xl border border-dashed border-[#dce8e2] bg-[#f9fbfa] px-3.5 py-3">
                        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-white text-[#4338ca] shadow-[0_2px_8px_rgba(20,57,51,0.06)]"><FileSpreadsheet className="h-4 w-4" /></span>
                        <span className="min-w-0"><span className="block text-xs font-bold text-[#49645e]">Ready for workbook</span><span className="mt-0.5 block text-[10px] text-[#91a09b]">Course loads for all year levels</span></span>
                    </div>
                )}

                {/* Timestamps */}
                <div className="flex items-center justify-between gap-2 pt-0.5 text-[10px] font-medium text-[#93a19c]">
                    <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3 text-[#a0aea9]" />
                        Created {createdDate}
                    </span>
                    {semester.status === "active" && (
                        <span className="flex items-center gap-1 text-[#3730a3] font-semibold">
                            <CheckCircle2 className="h-3 w-3 text-[#4338ca]" />
                            {updatedDate}
                        </span>
                    )}
                </div>
            </div>

            {/* Action Footer */}
            <div className="px-5 pb-5 pt-1 sm:px-5">
                <motion.button
                    onClick={() => onEnter(semester)}
                    whileHover={{ y: -1 }}
                    whileTap={{ scale: 0.985 }}
                    className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-extrabold transition-all duration-200 cursor-pointer ${
                        semester.status === "archived"
                            ? "bg-[#eef5f2] text-[#3730a3] hover:bg-[#e3f0eb] border border-[#dce8e2]"
                            : "bg-[#1e1b4b] hover:bg-[#3730a3] text-white shadow-[0_6px_16px_-11px_rgba(30,27,75,0.75)] hover:shadow-md"
                    }`}
                >
                    {semester.status === "archived" ? (
                        <>
                            <Eye className="w-3.5 h-3.5" />
                            <span>View Timetable</span>
                        </>
                    ) : (
                        <>
                            <span>Open workspace</span>
                            <ArrowRight className="h-3.5 w-3.5 transition-transform duration-200 group-hover:translate-x-0.5" />
                        </>
                    )}
                </motion.button>
            </div>
        </motion.article>
    );
}

export default function SemesterDashboard({ onEnterSemester }) {
    const [semesters, setSemesters] = useState(() => getAllSemesters());
    const [showModal, setShowModal] = useState(false);
    const [filter, setFilter] = useState("all"); // 'all' | 'active' | 'draft' | 'archived'
    const [searchQuery, setSearchQuery] = useState("");

    const refresh = () => setSemesters(getAllSemesters());

    const handleCreate = (data) => {
        const newSem = createSemester(data);
        setShowModal(false);
        refresh();
        onEnterSemester(newSem);
    };

    const handleDelete = (id) => {
        if (confirm("Permanently delete this workspace? This action cannot be undone.")) {
            deleteSemester(id);
            refresh();
        }
    };

    const handleStatusChange = (id, newStatus) => {
        setSemesterStatus(id, newStatus);
        refresh();
    };

    const counts = useMemo(() => ({
        all: semesters.length,
        active: semesters.filter((s) => s.status === "active").length,
        draft: semesters.filter((s) => s.status === "draft").length,
        archived: semesters.filter((s) => s.status === "archived").length,
    }), [semesters]);

    const filtered = useMemo(() => {
        return semesters.filter((s) => {
            const matchesFilter = filter === "all" || s.status === filter;
            if (!matchesFilter) return false;
            if (!searchQuery.trim()) return true;
            const q = searchQuery.toLowerCase();
            return (
                (s.name && s.name.toLowerCase().includes(q)) ||
                (s.academicYear && s.academicYear.toLowerCase().includes(q)) ||
                (s.department && s.department.toLowerCase().includes(q))
            );
        });
    }, [semesters, filter, searchQuery]);

    return (
        <div className="space-y-8 py-3">
            {/* ── Section Header & Single Primary Action (No Redundancy!) ── */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-2xl bg-white border border-[#e1e9e6] flex items-center justify-center text-[#3730a3] shadow-[0_6px_18px_-12px_rgba(20,57,51,0.3)] shrink-0">
                        <Layers className="w-5 h-5" />
                    </div>
                    <div>
                        <h1 className="text-2xl sm:text-[28px] font-bold text-[#142d2a] tracking-[-0.035em]">
                            Timetable Workspaces
                        </h1>
                        <p className="text-sm text-[#71817d] mt-1">
                            Organize each academic year’s workbook, setup, and generated timetable in one place.
                        </p>
                    </div>
                </div>

                {/* Primary CTA: Only 1 clean, high-priority button */}
                <motion.button
                    onClick={() => setShowModal(true)}
                    whileHover={{ y: -1 }}
                    whileTap={{ scale: 0.98 }}
                    className="flex shrink-0 cursor-pointer items-center gap-2 self-start rounded-xl bg-[#1e1b4b] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors duration-200 hover:bg-[#0d766b] hover:shadow-md sm:self-auto"
                >
                    <Plus className="w-4 h-4" />
                    <span>New Workspace</span>
                </motion.button>
            </div>

            {/* ── Consolidated Filter Tabs & Search Bar (Merged from duplicate rows) ── */}
            <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
                {/* Unified Segmented Filter Pills */}
                <div className="flex items-center gap-1 p-1 rounded-xl bg-white border border-[#e1e9e6] overflow-x-auto no-scrollbar">
                    {[
                        { key: "all", label: "All" },
                        { key: "active", label: "Active" },
                        { key: "draft", label: "Draft" },
                        { key: "archived", label: "Archived" },
                    ].map(({ key, label }) => {
                        const count = counts[key];
                        const isSelected = filter === key;
                        return (
                    <motion.button
                        key={key}
                        type="button"
                        onClick={() => setFilter(key)}
                        whileTap={{ scale: 0.96 }}
                        className={`relative flex shrink-0 cursor-pointer items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-extrabold transition-colors duration-200 ${
                            isSelected ? "text-white" : "text-[#71817d] hover:bg-[#f1f6f4] hover:text-[#243d39]"
                        }`}
                    >
                        {isSelected && <motion.span layoutId="workspace-filter-active" className="absolute inset-0 rounded-lg bg-[#1e1b4b] shadow-sm" transition={{ type: "spring", stiffness: 420, damping: 34 }} />}
                        <span className="relative">{label}</span>
                        <span className={`relative rounded-full px-1.5 py-0.2 text-[10px] font-bold ${
                            isSelected ? "bg-white/20 text-white" : "bg-[#ebf4f2] text-[#64748b]"
                        }`}>
                            {count}
                        </span>
                    </motion.button>
                        );
                    })}
                </div>

                {/* Search Bar */}
                <div className="relative min-w-[240px] max-w-sm">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#94a3b8]" />
                    <input
                        type="text"
                    placeholder="Search workspaces or academic years…"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-8 py-2.5 bg-white rounded-xl border border-[#e1e9e6] text-sm font-medium text-[#243d39] placeholder-[#98a6a2] focus:outline-none focus:border-[#75b5a4] focus:ring-4 focus:ring-[#4338ca]/[0.08] shadow-xs transition-all"
                    />
                    {searchQuery && (
                        <motion.button
                            type="button"
                            onClick={() => setSearchQuery("")}
                            whileHover={{ scale: 1.08 }}
                            whileTap={{ scale: 0.92 }}
                            aria-label="Clear search"
                            className="absolute right-2.5 top-1/2 -translate-y-1/2 cursor-pointer p-0.5 text-[#94a3b8] transition-colors hover:text-[#0f172a]"
                        >
                            <X className="w-3.5 h-3.5" />
                        </motion.button>
                    )}
                </div>
            </div>

            {/* ── Timetable Workspaces ── */}
            {semesters.length === 0 ? (
                /* Empty state when no timetable workspaces exist yet */
                <div className="mx-auto flex max-w-xl flex-col items-center rounded-[28px] border border-[#e1e9e6] bg-white/85 p-10 text-center shadow-[0_20px_60px_-46px_rgba(20,57,51,0.4)] backdrop-blur-sm sm:p-14">
                    <div className="mb-5 grid h-16 w-16 place-items-center rounded-2xl border border-[#d8e9de] bg-[#eef7f2] text-[#4338ca]">
                        <Layers className="h-7 w-7" />
                    </div>
                    <h3 className="mb-2 text-lg font-extrabold text-[#1e1b4b]">
                        No timetable workspaces yet
                    </h3>
                    <p className="mb-6 max-w-md text-xs leading-relaxed text-[#71817d]">
                        Create a workspace for an academic year, then add one workbook with the courses and schedules for every year level.
                    </p>
                    <motion.button
                        onClick={() => setShowModal(true)}
                        whileHover={{ y: -1 }}
                        whileTap={{ scale: 0.98 }}
                        className="flex cursor-pointer items-center gap-2 rounded-xl bg-[#1e1b4b] px-5 py-2.5 text-xs font-extrabold text-white shadow-sm transition-colors hover:bg-[#3730a3] hover:shadow-md"
                    >
                        <Plus className="w-4 h-4" />
                        <span>Create first workspace</span>
                    </motion.button>
                </div>
            ) : filtered.length === 0 ? (
                /* Filter or search yielded no results */
                <div className="bg-white/60 border border-[#b8ccc8]/60 rounded-2xl p-12 text-center max-w-md mx-auto">
                    <div className="w-12 h-12 rounded-xl bg-[#ebf4f2] border border-[#b8ccc8]/60 flex items-center justify-center mx-auto mb-3 text-[#64748b]">
                        <Search className="w-5 h-5" />
                    </div>
                    <h4 className="text-sm font-extrabold text-[#0f172a] mb-1">
                        No matching workspaces
                    </h4>
                    <p className="text-xs text-[#64748b] mb-4">
                        {searchQuery ? `No results for "${searchQuery}".` : `No ${filter} workspaces available.`}
                    </p>
                    <motion.button
                        onClick={() => { setFilter("all"); setSearchQuery(""); }}
                        whileHover={{ y: -1 }}
                        whileTap={{ scale: 0.97 }}
                        className="px-4 py-2 bg-white border border-[#b8ccc8] text-xs font-bold text-[#3730a3] hover:bg-[#ebf4f2] rounded-xl transition-all cursor-pointer"
                    >
                        Clear Filters
                    </motion.button>
                </div>
            ) : (
                /* Timetable workspace cards */
                <motion.div layout className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3">
                    <AnimatePresence mode="popLayout">
                    {filtered.map((sem) => (
                        <SemesterCard
                            key={sem.id}
                            semester={sem}
                            onEnter={onEnterSemester}
                            onDelete={handleDelete}
                            onStatusChange={handleStatusChange}
                        />
                    ))}
                    </AnimatePresence>
                </motion.div>
            )}

            {/* Create Workspace Modal */}
            {showModal && (
                <CreateSemesterModal
                    onClose={() => setShowModal(false)}
                    onCreate={handleCreate}
                />
            )}
        </div>
    );
}
