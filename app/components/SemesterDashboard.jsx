"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
    Plus, Calendar, BookOpen, BarChart3, Trash2, LogIn,
    Eye, Archive, Sparkles, Clock, Building2, Hash,
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
        line: "bg-gradient-to-r from-[#0d9488] to-[#14b8a6]",
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
        <div className="group relative bg-white rounded-2xl border border-[#b8ccc8]/70 shadow-xs hover:shadow-lg hover:border-[#0d9488]/40 hover:-translate-y-0.5 transition-all duration-200 overflow-hidden flex flex-col justify-between">
            {/* Top accent indicator line */}
            <div className={`h-1.5 w-full ${cfg.line}`} />

            <div className="p-5 flex flex-col gap-4 flex-1">
                {/* Header: Badges & Actions */}
                <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 flex-wrap">
                        <span className="px-2.5 py-0.5 text-[10px] font-extrabold rounded-md bg-[#ccfbf1] text-[#0f766e] border border-[#99f6e4]/80 tracking-wide">
                            SEM {semester.semNumber}
                        </span>
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 text-[10px] font-extrabold rounded-md border ${cfg.badge}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot} ${semester.status === "active" ? "animate-pulse" : ""}`} />
                            {cfg.label}
                        </span>
                    </div>

                    {/* Quick Menu / Actions */}
                    <div className="relative">
                        <button
                            onClick={(e) => { e.stopPropagation(); setShowMenu(!showMenu); }}
                            className="p-1 rounded-lg text-[#94a3b8] hover:text-[#0f172a] hover:bg-[#ebf4f2] transition-colors cursor-pointer"
                            title="Semester Options"
                            aria-label="Semester options"
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

                {/* Semester Title & Meta */}
                <div>
                    <h3 className="text-base font-extrabold text-[#0f172a] leading-tight group-hover:text-[#0d9488] transition-colors truncate">
                        {semester.name}
                    </h3>
                    <p className="text-xs text-[#64748b] font-medium mt-1 flex items-center gap-1.5">
                        <span>{semester.academicYear}</span>
                        {semester.department && (
                            <>
                                <span className="text-[#cbd5e1]">•</span>
                                <span className="truncate">{semester.department}</span>
                            </>
                        )}
                    </p>
                </div>

                {/* Metrics Summary Strip */}
                <div className="grid grid-cols-3 gap-2 bg-[#f8fafb] rounded-xl p-2.5 border border-[#e2e8f0]/80">
                    <div className="text-center">
                        <div className={`text-sm font-extrabold ${stats.allocationRate === 100 ? "text-[#0d9488]" : stats.allocationRate > 0 ? "text-amber-600" : "text-[#94a3b8]"}`}>
                            {stats.hasData ? `${stats.allocationRate}%` : "—"}
                        </div>
                        <div className="text-[9px] font-bold text-[#64748b] uppercase tracking-wider mt-0.5">Allocation</div>
                    </div>
                    <div className="text-center border-x border-[#e2e8f0]">
                        <div className={`text-sm font-extrabold ${!stats.hasData ? "text-[#94a3b8]" : stats.conflictCount === 0 ? "text-[#0d9488]" : "text-red-600"}`}>
                            {stats.hasData ? stats.conflictCount : "—"}
                        </div>
                        <div className="text-[9px] font-bold text-[#64748b] uppercase tracking-wider mt-0.5">Conflicts</div>
                    </div>
                    <div className="text-center">
                        <div className={`text-sm font-extrabold ${!stats.hasData ? "text-[#94a3b8]" : stats.validationScore >= 90 ? "text-[#0d9488]" : stats.validationScore > 70 ? "text-amber-600" : "text-[#64748b]"}`}>
                            {stats.hasData ? stats.validationScore : "—"}
                        </div>
                        <div className="text-[9px] font-bold text-[#64748b] uppercase tracking-wider mt-0.5">Quality</div>
                    </div>
                </div>

                {/* Timestamps */}
                <div className="flex items-center justify-between text-[11px] text-[#94a3b8] font-medium pt-1">
                    <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3 text-[#94a3b8]" />
                        Created {createdDate}
                    </span>
                    {semester.status === "active" && (
                        <span className="flex items-center gap-1 text-[#0f766e] font-semibold">
                            <CheckCircle2 className="w-3 h-3 text-[#0d9488]" />
                            {updatedDate}
                        </span>
                    )}
                </div>
            </div>

            {/* Action Footer */}
            <div className="px-5 pb-5 pt-1">
                <button
                    onClick={() => onEnter(semester)}
                    className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-extrabold transition-all duration-200 cursor-pointer ${
                        semester.status === "archived"
                            ? "bg-[#ebf4f2] text-[#0f766e] hover:bg-[#ccfbf1] border border-[#b8ccc8]/70"
                            : "bg-[#0d9488] hover:bg-[#0f766e] text-white shadow-xs hover:shadow-md hover:scale-[1.01] active:scale-[0.99]"
                    }`}
                >
                    {semester.status === "archived" ? (
                        <>
                            <Eye className="w-3.5 h-3.5" />
                            <span>View Timetable</span>
                        </>
                    ) : (
                        <>
                            <span>Open Studio</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                        </>
                    )}
                </button>
            </div>
        </div>
    );
}

export default function SemesterDashboard({ onEnterSemester }) {
    const [semesters, setSemesters] = useState([]);
    const [showModal, setShowModal] = useState(false);
    const [filter, setFilter] = useState("all"); // 'all' | 'active' | 'draft' | 'archived'
    const [searchQuery, setSearchQuery] = useState("");

    useEffect(() => {
        setSemesters(getAllSemesters());
    }, []);

    const refresh = () => setSemesters(getAllSemesters());

    const handleCreate = (data) => {
        const newSem = createSemester(data);
        setShowModal(false);
        refresh();
        onEnterSemester(newSem);
    };

    const handleDelete = (id) => {
        if (confirm("Permanently delete this semester? This action cannot be undone.")) {
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
                (s.department && s.department.toLowerCase().includes(q)) ||
                `sem ${s.semNumber}`.includes(q)
            );
        });
    }, [semesters, filter, searchQuery]);

    return (
        <div className="space-y-6 py-2">
            {/* ── Section Header & Single Primary Action (No Redundancy!) ── */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-[#ccfbf1] border border-[#99f6e4] flex items-center justify-center text-[#0d9488] shadow-xs shrink-0">
                        <Layers className="w-5 h-5" />
                    </div>
                    <div>
                        <h1 className="text-xl font-extrabold text-[#0f172a] tracking-tight">
                            Semester Workspaces
                        </h1>
                        <p className="text-xs text-[#64748b] font-medium">
                            Select an active semester workspace or launch a new one to generate and manage timetables
                        </p>
                    </div>
                </div>

                {/* Primary CTA: Only 1 clean, high-priority button */}
                <button
                    onClick={() => setShowModal(true)}
                    className="flex items-center gap-2 px-4 py-2.5 bg-[#0d9488] hover:bg-[#0f766e] text-white text-xs font-extrabold rounded-full shadow-xs hover:shadow-md transition-all cursor-pointer self-start sm:self-auto shrink-0 hover:scale-[1.02] active:scale-[0.98]"
                >
                    <Plus className="w-4 h-4" />
                    <span>New Semester</span>
                </button>
            </div>

            {/* ── Consolidated Filter Tabs & Search Bar (Merged from duplicate rows) ── */}
            <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 pt-1">
                {/* Unified Segmented Filter Pills */}
                <div className="flex items-center gap-1 p-1 rounded-xl bg-white/70 border border-[#b8ccc8]/80 shadow-2xs backdrop-blur-xs overflow-x-auto no-scrollbar">
                    {[
                        { key: "all", label: "All" },
                        { key: "active", label: "Active" },
                        { key: "draft", label: "Draft" },
                        { key: "archived", label: "Archived" },
                    ].map(({ key, label }) => {
                        const count = counts[key];
                        const isSelected = filter === key;
                        return (
                            <button
                                key={key}
                                onClick={() => setFilter(key)}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-extrabold transition-all duration-150 cursor-pointer shrink-0 ${
                                    isSelected
                                        ? "bg-[#0d9488] text-white shadow-xs"
                                        : "text-[#64748b] hover:text-[#0f172a] hover:bg-[#ebf4f2]/70"
                                }`}
                            >
                                <span>{label}</span>
                                <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                                    isSelected ? "bg-white/20 text-white" : "bg-[#ebf4f2] text-[#64748b]"
                                }`}>
                                    {count}
                                </span>
                            </button>
                        );
                    })}
                </div>

                {/* Search Bar */}
                <div className="relative min-w-[240px] max-w-sm">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#94a3b8]" />
                    <input
                        type="text"
                        placeholder="Search semesters, years..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-9 pr-8 py-1.5 bg-white rounded-xl border border-[#b8ccc8]/80 text-xs font-semibold text-[#0f172a] placeholder-[#94a3b8] focus:outline-none focus:border-[#0d9488] focus:ring-1 focus:ring-[#0d9488]/30 shadow-2xs transition-all"
                    />
                    {searchQuery && (
                        <button
                            onClick={() => setSearchQuery("")}
                            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#94a3b8] hover:text-[#0f172a] p-0.5 cursor-pointer"
                        >
                            <X className="w-3.5 h-3.5" />
                        </button>
                    )}
                </div>
            </div>

            {/* ── Semester Cards Grid (Clean, real workspaces only) ── */}
            {semesters.length === 0 ? (
                /* Empty state when NO semesters exist yet */
                <div className="bg-white/80 border border-[#b8ccc8]/70 rounded-3xl p-10 sm:p-14 text-center max-w-xl mx-auto shadow-sm backdrop-blur-xs flex flex-col items-center">
                    <div className="w-16 h-16 rounded-2xl bg-[#ccfbf1] border border-[#99f6e4] flex items-center justify-center mb-5 text-[#0d9488]">
                        <GraduationCap className="w-8 h-8" />
                    </div>
                    <h3 className="text-lg font-extrabold text-[#0f172a] mb-2">
                        No Semesters Configured
                    </h3>
                    <p className="text-xs text-[#64748b] leading-relaxed max-w-md mb-6">
                        ATLAS isolates each semester into a dedicated workspace containing its course allocations, teacher schedules, room assignments, and generated timetables.
                    </p>
                    <button
                        onClick={() => setShowModal(true)}
                        className="flex items-center gap-2 px-6 py-2.5 bg-[#0d9488] hover:bg-[#0f766e] text-white text-xs font-extrabold rounded-full shadow-xs hover:shadow-md transition-all cursor-pointer hover:scale-[1.02]"
                    >
                        <Plus className="w-4 h-4" />
                        <span>Create Your First Semester</span>
                    </button>
                </div>
            ) : filtered.length === 0 ? (
                /* Filter or search yielded no results */
                <div className="bg-white/60 border border-[#b8ccc8]/60 rounded-2xl p-12 text-center max-w-md mx-auto">
                    <div className="w-12 h-12 rounded-xl bg-[#ebf4f2] border border-[#b8ccc8]/60 flex items-center justify-center mx-auto mb-3 text-[#64748b]">
                        <Search className="w-5 h-5" />
                    </div>
                    <h4 className="text-sm font-extrabold text-[#0f172a] mb-1">
                        No Matching Semesters
                    </h4>
                    <p className="text-xs text-[#64748b] mb-4">
                        {searchQuery ? `No results for "${searchQuery}".` : `No ${filter} semesters available.`}
                    </p>
                    <button
                        onClick={() => { setFilter("all"); setSearchQuery(""); }}
                        className="px-4 py-2 bg-white border border-[#b8ccc8] text-xs font-bold text-[#0f766e] hover:bg-[#ebf4f2] rounded-xl transition-all cursor-pointer"
                    >
                        Clear Filters
                    </button>
                </div>
            ) : (
                /* Clean Grid of Actual Semesters */
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                    {filtered.map((sem) => (
                        <SemesterCard
                            key={sem.id}
                            semester={sem}
                            onEnter={onEnterSemester}
                            onDelete={handleDelete}
                            onStatusChange={handleStatusChange}
                        />
                    ))}
                </div>
            )}

            {/* Create Semester Modal */}
            {showModal && (
                <CreateSemesterModal
                    onClose={() => setShowModal(false)}
                    onCreate={handleCreate}
                />
            )}
        </div>
    );
}
