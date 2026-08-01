"use client";

import React, { useState } from "react";
import { X, BookOpen, Calendar, Hash, Building2, Sparkles, AlertTriangle } from "lucide-react";

const SEM_NUMBERS = [1, 2, 3, 4, 5, 6, 7, 8];

export default function CreateSemesterModal({ onClose, onCreate }) {
    const [name, setName] = useState("");
    const [academicYear, setAcademicYear] = useState("2024-25");
    const [semNumber, setSemNumber] = useState(1);
    const [department, setDepartment] = useState("");
    const [error, setError] = useState("");

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!name.trim()) { setError("Semester name is required."); return; }
        if (!academicYear.trim()) { setError("Academic year is required."); return; }
        setError("");
        onCreate({ name: name.trim(), academicYear: academicYear.trim(), semNumber, department: department.trim() });
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-[#b8ccc8] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                {/* Modal Header */}
                <div className="px-6 py-4 bg-[#ebf4f2] border-b border-[#b8ccc8] flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-[#0d9488] flex items-center justify-center text-white shadow-xs">
                            <Sparkles className="w-4 h-4" />
                        </div>
                        <div>
                            <h2 className="text-sm font-extrabold text-[#0f172a]">Create New Semester</h2>
                            <p className="text-[11px] text-[#64748b] font-medium">Set up a new timetable workspace</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1.5 rounded-lg hover:bg-red-50 text-[#64748b] hover:text-red-600 transition-colors cursor-pointer"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    {/* Semester Name */}
                    <div>
                        <label className="block text-[11px] font-bold text-[#64748b] mb-1.5 uppercase tracking-wider">
                            Semester Name *
                        </label>
                        <div className="relative">
                            <BookOpen className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#0d9488]" />
                            <input
                                type="text"
                                placeholder="e.g. Semester I 2024-25"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                className="w-full pl-9 pr-3 py-2.5 rounded-lg bg-white border border-[#b8ccc8] text-sm font-bold text-[#0f172a] placeholder-[#94a3b8] focus:outline-none focus:border-[#0d9488] transition-colors"
                                autoFocus
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        {/* Academic Year */}
                        <div>
                            <label className="block text-[11px] font-bold text-[#64748b] mb-1.5 uppercase tracking-wider">
                                Academic Year *
                            </label>
                            <div className="relative">
                                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#0d9488]" />
                                <input
                                    type="text"
                                    placeholder="e.g. 2024-25"
                                    value={academicYear}
                                    onChange={(e) => setAcademicYear(e.target.value)}
                                    className="w-full pl-9 pr-3 py-2.5 rounded-lg bg-white border border-[#b8ccc8] text-sm font-bold text-[#0f172a] placeholder-[#94a3b8] focus:outline-none focus:border-[#0d9488] transition-colors"
                                />
                            </div>
                        </div>

                        {/* Semester Number */}
                        <div>
                            <label className="block text-[11px] font-bold text-[#64748b] mb-1.5 uppercase tracking-wider">
                                Semester No.
                            </label>
                            <div className="relative">
                                <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#0d9488]" />
                                <select
                                    value={semNumber}
                                    onChange={(e) => setSemNumber(Number(e.target.value))}
                                    className="w-full pl-9 pr-3 py-2.5 rounded-lg bg-white border border-[#b8ccc8] text-sm font-bold text-[#0f172a] focus:outline-none focus:border-[#0d9488] transition-colors cursor-pointer appearance-none"
                                >
                                    {SEM_NUMBERS.map((n) => (
                                        <option key={n} value={n}>Semester {n}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* Department */}
                    <div>
                        <label className="block text-[11px] font-bold text-[#64748b] mb-1.5 uppercase tracking-wider">
                            Department <span className="text-[#94a3b8] normal-case">(optional)</span>
                        </label>
                        <div className="relative">
                            <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#0d9488]" />
                            <input
                                type="text"
                                placeholder="e.g. Computer Engineering"
                                value={department}
                                onChange={(e) => setDepartment(e.target.value)}
                                className="w-full pl-9 pr-3 py-2.5 rounded-lg bg-white border border-[#b8ccc8] text-sm font-bold text-[#0f172a] placeholder-[#94a3b8] focus:outline-none focus:border-[#0d9488] transition-colors"
                            />
                        </div>
                    </div>

                    {error && (
                        <p className="text-xs font-bold text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2 flex items-center gap-1.5">
                            <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
                            <span>{error}</span>
                        </p>
                    )}

                    <div className="flex items-center justify-end gap-3 pt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-xs font-bold text-[#64748b] hover:text-[#0f172a] bg-white border border-[#b8ccc8] rounded-lg transition-colors cursor-pointer"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="flex items-center gap-2 px-5 py-2 text-xs font-extrabold bg-[#0d9488] hover:bg-[#0f766e] text-white rounded-lg transition-colors shadow-xs cursor-pointer"
                        >
                            <Sparkles className="w-3.5 h-3.5" />
                            Create & Enter Studio
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
