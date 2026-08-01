"use client";

import React, { useState, useEffect } from "react";
import {
    Plus, Calendar, BookOpen, BarChart3, Trash2, LogIn,
    Eye, Archive, Sparkles, Clock, Building2, Hash,
    CheckCircle2, AlertTriangle, Circle, Layers,
    GraduationCap, Beaker, Edit3
} from "lucide-react";
import {
    getAllSemesters, deleteSemester, archiveSemester, setSemesterStatus,
    getSemesterStats, createSemester
} from "../utils/semesterStore";

import CreateSemesterModal from "./CreateSemesterModal";

const STATUS_CONFIG = {
    active: {
        label: "Active",
        color: "bg-emerald-100 text-emerald-800 border-emerald-300",
        dot: "bg-emerald-500",
        icon: CheckCircle2,
    },
    draft: {
        label: "Draft",
        color: "bg-amber-100 text-amber-800 border-amber-300",
        dot: "bg-amber-400",
        icon: Circle,
    },
    archived: {
        label: "Archived",
        color: "bg-slate-100 text-slate-600 border-slate-300",
        dot: "bg-slate-400",
        icon: Archive,
    },
};

function SemesterCard({ semester, onEnter, onDelete, onStatusChange }) {
    const stats = getSemesterStats(semester);
    const cfg = STATUS_CONFIG[semester.status] || STATUS_CONFIG.draft;
    const createdDate = new Date(semester.createdAt).toLocaleDateString("en-IN", {
        day: "2-digit", month: "short", year: "numeric"
    });
    const updatedDate = new Date(semester.updatedAt).toLocaleDateString("en-IN", {
        day: "2-digit", month: "short", year: "numeric"
    });

    return (
        <div className="group relative bg-white rounded-2xl border border-[#b8ccc8] shadow-xs hover:shadow-md hover:border-[#0d9488] transition-all duration-200 overflow-hidden flex flex-col">
            {/* Top accent strip */}
            <div className={`h-1 w-full ${semester.status === "active" ? "bg-gradient-to-r from-[#0d9488] to-[#14b8a6]" : semester.status === "archived" ? "bg-[#b8ccc8]" : "bg-gradient-to-r from-amber-400 to-amber-500"}`} />

            <div className="p-5 flex flex-col gap-4 flex-1">
                {/* Header */}
                <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                            {/* Sem Number Badge */}
                            <span className="px-2 py-0.5 text-[10px] font-extrabold rounded-md bg-[#ccfbf1] text-[#0f766e] border border-[#99f6e4]">
                                SEM {semester.semNumber}
                            </span>
                            {/* Status Badge */}
                            <span className={`flex items-center gap-1 px-2 py-0.5 text-[10px] font-extrabold rounded-md border ${cfg.color}`}>
                                <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
                                {cfg.label}
                            </span>
                        </div>
                        <h3 className="text-sm font-extrabold text-[#0f172a] leading-tight truncate">{semester.name}</h3>
                        <p className="text-[11px] text-[#64748b] font-medium mt-0.5">{semester.academicYear}{semester.department ? ` · ${semester.department}` : ""}</p>
                    </div>

                    {/* Delete button (available for all semesters) */}
                    <button
                        onClick={(e) => { e.stopPropagation(); onDelete(semester.id); }}
                        className="p-1.5 rounded-lg hover:bg-red-50 text-[#94a3b8] hover:text-red-600 transition-all cursor-pointer shrink-0"
                        title="Delete Semester"
                    >
                        <Trash2 className="w-3.5 h-3.5" />
                    </button>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-3 gap-2">
                    <div className="bg-[#ebf4f2]/60 rounded-xl p-2.5 text-center border border-[#b8ccc8]/50">
                        <div className={`text-base font-extrabold ${stats.allocationRate === 100 ? "text-[#0d9488]" : stats.allocationRate > 80 ? "text-amber-600" : "text-[#64748b]"}`}>
                            {stats.hasData ? `${stats.allocationRate}%` : "—"}
                        </div>
                        <div className="text-[9px] font-bold text-[#64748b] uppercase tracking-wider mt-0.5">Allocated</div>
                    </div>
                    <div className="bg-[#ebf4f2]/60 rounded-xl p-2.5 text-center border border-[#b8ccc8]/50">
                        <div className={`text-base font-extrabold ${stats.conflictCount === 0 ? "text-[#0d9488]" : "text-red-600"}`}>
                            {stats.hasData ? stats.conflictCount : "—"}
                        </div>
                        <div className="text-[9px] font-bold text-[#64748b] uppercase tracking-wider mt-0.5">Conflicts</div>
                    </div>
                    <div className="bg-[#ebf4f2]/60 rounded-xl p-2.5 text-center border border-[#b8ccc8]/50">
                        <div className={`text-base font-extrabold ${stats.validationScore >= 90 ? "text-[#0d9488]" : stats.validationScore > 70 ? "text-amber-600" : "text-[#64748b]"}`}>
                            {stats.hasData ? `${stats.validationScore}` : "—"}
                        </div>
                        <div className="text-[9px] font-bold text-[#64748b] uppercase tracking-wider mt-0.5">Score</div>
                    </div>
                </div>

                {/* Dates */}
                <div className="flex items-center justify-between text-[10px] text-[#94a3b8] font-medium">
                    <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        Created {createdDate}
                    </span>
                    {semester.status === "active" && (
                        <span className="flex items-center gap-1 text-[#0d9488]">
                            <CheckCircle2 className="w-3 h-3" />
                            Updated {updatedDate}
                        </span>
                    )}
                </div>
            </div>

            {/* Action Footer */}
            <div className="px-5 pb-4 flex items-center gap-2">
                <button
                    onClick={() => onEnter(semester)}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
                        semester.status === "archived"
                            ? "bg-[#ebf4f2] text-[#0f766e] border border-[#b8ccc8] hover:bg-[#ccfbf1]"
                            : "bg-[#0d9488] hover:bg-[#0f766e] text-white shadow-xs"
                    }`}
                >
                    {semester.status === "archived" ? (
                        <><Eye className="w-3.5 h-3.5" /> View TT</>
                    ) : (
                        <><LogIn className="w-3.5 h-3.5" /> Enter Studio</>
                    )}
                </button>

                {/* Status Toggle Actions */}
                {semester.status !== "draft" && (
                    <button
                        onClick={(e) => { e.stopPropagation(); onStatusChange(semester.id, "draft"); }}
                        title="Mark as Draft"
                        className="px-2 py-2 rounded-xl bg-[#ebf4f2] hover:bg-amber-100 text-[#64748b] hover:text-amber-800 border border-[#b8ccc8] text-[10px] font-extrabold transition-all cursor-pointer"
                    >
                        Draft
                    </button>
                )}

                {semester.status !== "active" && (
                    <button
                        onClick={(e) => { e.stopPropagation(); onStatusChange(semester.id, "active"); }}
                        title="Activate Semester"
                        className="px-2 py-2 rounded-xl bg-[#ebf4f2] hover:bg-emerald-100 text-[#64748b] hover:text-emerald-800 border border-[#b8ccc8] text-[10px] font-extrabold transition-all cursor-pointer"
                    >
                        Activate
                    </button>
                )}

                {semester.status !== "archived" && (
                    <button
                        onClick={(e) => { e.stopPropagation(); onStatusChange(semester.id, "archived"); }}
                        title="Archive Semester"
                        className="p-2 rounded-xl bg-[#ebf4f2] hover:bg-[#ccfbf1] text-[#64748b] hover:text-[#0f766e] border border-[#b8ccc8] transition-all cursor-pointer"
                    >
                        <Archive className="w-3.5 h-3.5" />
                    </button>
                )}
            </div>
        </div>
    );
}

export default function SemesterDashboard({ onEnterSemester }) {
    const [semesters, setSemesters] = useState([]);
    const [showModal, setShowModal] = useState(false);
    const [filter, setFilter] = useState("all"); // all | active | draft | archived

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

    const filtered = filter === "all" ? semesters : semesters.filter((s) => s.status === filter);

    const counts = {
        all: semesters.length,
        active: semesters.filter((s) => s.status === "active").length,
        draft: semesters.filter((s) => s.status === "draft").length,
        archived: semesters.filter((s) => s.status === "archived").length,
    };

    return (
        <div className="space-y-6 py-2">
            {/* Hero Section */}
            <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-[#ccfbf1] border border-[#99f6e4] flex items-center justify-center shrink-0">
                        <Layers className="w-5 h-5 text-[#0d9488]" />
                    </div>
                    <div>
                        <h1 className="text-xl font-extrabold text-[#0f172a] tracking-tight">Semester Dashboard</h1>
                        <p className="text-xs text-[#64748b] font-medium">Create a semester workspace, generate timetables, and track every iteration</p>
                    </div>
                </div>

                <button
                    onClick={() => setShowModal(true)}
                    className="flex items-center gap-2 px-4 py-2.5 bg-[#0d9488] hover:bg-[#0f766e] text-white text-xs font-extrabold rounded-xl shadow-xs transition-all cursor-pointer self-start sm:self-auto shrink-0"
                >
                    <Plus className="w-4 h-4" />
                    <span>New Semester</span>
                </button>
            </div>

            {/* Summary Pills */}
            <div className="flex flex-wrap items-center gap-2 mt-4">
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-[#b8ccc8] text-xs font-bold text-[#0f172a] shadow-2xs">
                    <Calendar className="w-3.5 h-3.5 text-[#0d9488]" />
                    <span>{counts.all} Total Semesters</span>
                </div>
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 border border-emerald-200 text-xs font-bold text-emerald-800">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span>{counts.active} Active</span>
                </div>
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-50 border border-amber-200 text-xs font-bold text-amber-800">
                    <Edit3 className="w-3.5 h-3.5 text-amber-600" />
                    <span>{counts.draft} Draft</span>
                </div>
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-xs font-bold text-slate-600">
                    <Archive className="w-3.5 h-3.5 text-slate-500" />
                    <span>{counts.archived} Archived</span>
                </div>
            </div>

            {/* Filter Tabs */}
            <div className="flex items-center gap-1 p-1 rounded-xl bg-[#d2dfdc]/60 border border-[#b8ccc8] w-fit mb-6">
                {["all", "active", "draft", "archived"].map((f) => (
                    <button
                        key={f}
                        onClick={() => setFilter(f)}
                        className={`px-3 py-1.5 rounded-lg text-[11px] font-extrabold transition-all cursor-pointer capitalize ${
                            filter === f
                                ? "bg-white text-[#0f766e] shadow-2xs"
                                : "text-[#64748b] hover:text-[#0f172a]"
                        }`}
                    >
                        {f === "all" ? `All (${counts.all})` : `${f.charAt(0).toUpperCase() + f.slice(1)} (${counts[f]})`}
                    </button>
                ))}
            </div>

            {/* Semester Cards Grid */}
            {filtered.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-24 text-center">
                    <div className="w-16 h-16 rounded-2xl bg-[#ccfbf1] border border-[#99f6e4] flex items-center justify-center mb-4">
                        <GraduationCap className="w-8 h-8 text-[#0d9488]" />
                    </div>
                    <h3 className="text-base font-extrabold text-[#0f172a] mb-1">
                        {filter === "all" ? "No Semesters Yet" : `No ${filter} semesters`}
                    </h3>
                    <p className="text-xs text-[#64748b] max-w-xs mb-6">
                        {filter === "all"
                            ? "Create your first semester to start generating timetables. Each semester stores its own full workspace."
                            : `You have no ${filter} semesters. Try switching the filter.`}
                    </p>
                    {filter === "all" && (
                        <button
                            onClick={() => setShowModal(true)}
                            className="flex items-center gap-2 px-6 py-2.5 bg-[#0d9488] hover:bg-[#0f766e] text-white text-xs font-extrabold rounded-xl shadow-xs transition-all cursor-pointer"
                        >
                            <Plus className="w-4 h-4" />
                            Create First Semester
                        </button>
                    )}
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {/* Create New Card */}
                    <button
                        onClick={() => setShowModal(true)}
                        className="group bg-white/60 hover:bg-white rounded-2xl border-2 border-dashed border-[#b8ccc8] hover:border-[#0d9488] transition-all duration-200 flex flex-col items-center justify-center gap-3 p-8 min-h-[240px] cursor-pointer"
                    >
                        <div className="w-12 h-12 rounded-2xl bg-[#ebf4f2] group-hover:bg-[#ccfbf1] border border-[#b8ccc8] group-hover:border-[#99f6e4] flex items-center justify-center transition-all">
                            <Plus className="w-6 h-6 text-[#64748b] group-hover:text-[#0d9488] transition-colors" />
                        </div>
                        <div className="text-center">
                            <div className="text-xs font-extrabold text-[#64748b] group-hover:text-[#0f172a] transition-colors">New Semester</div>
                            <div className="text-[10px] text-[#94a3b8] font-medium mt-0.5">Click to create workspace</div>
                        </div>
                    </button>

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

            {/* Create Modal */}
            {showModal && (
                <CreateSemesterModal
                    onClose={() => setShowModal(false)}
                    onCreate={handleCreate}
                />
            )}
        </div>
    );
}
