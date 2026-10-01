"use client";

import React, { useState, useMemo } from "react";
import { X, BookOpen, Calendar, Hash, Building2, Sparkles, AlertTriangle, ArrowRight, ChevronDown } from "lucide-react";

const SEMESTER_OPTIONS = [
    { num: 1, roman: "I", term: "Odd Sem" },
    { num: 2, roman: "II", term: "Even Sem" },
    { num: 3, roman: "III", term: "Odd Sem" },
    { num: 4, roman: "IV", term: "Even Sem" },
    { num: 5, roman: "V", term: "Odd Sem" },
    { num: 6, roman: "VI", term: "Even Sem" },
    { num: 7, roman: "VII", term: "Odd Sem" },
    { num: 8, roman: "VIII", term: "Even Sem" },
];

// Generate standard academic years centered on current year
function getStandardAcademicYears() {
    const currentYear = new Date().getFullYear();
    const years = [];
    for (let y = currentYear + 2; y >= currentYear - 3; y--) {
        const nextShort = String((y + 1) % 100).padStart(2, "0");
        years.push(`${y}-${nextShort}`);
    }
    return years;
}

export default function CreateSemesterModal({ onClose, onCreate }) {
    const standardYears = useMemo(() => getStandardAcademicYears(), []);
    const [academicYear, setAcademicYear] = useState("2024-25");
    const [isCustomYear, setIsCustomYear] = useState(false);
    const [customYearText, setCustomYearText] = useState("");
    const [semNumber, setSemNumber] = useState(1);
    const [name, setName] = useState("");
    const [department, setDepartment] = useState("");
    const [error, setError] = useState("");

    const currentYearStr = isCustomYear ? customYearText : academicYear;
    const selectedSemInfo = SEMESTER_OPTIONS.find((s) => s.num === semNumber) || SEMESTER_OPTIONS[0];

    const handleYearSelect = (val) => {
        if (val === "custom") {
            setIsCustomYear(true);
        } else {
            setIsCustomYear(false);
            setAcademicYear(val);
            if (!name || name.startsWith("Semester ")) {
                setName(`Semester ${selectedSemInfo.roman} (${val})`);
            }
        }
    };

    const handleCustomYearChange = (val) => {
        setCustomYearText(val);
        if (!name || name.startsWith("Semester ")) {
            setName(`Semester ${selectedSemInfo.roman} (${val || "Year"})`);
        }
    };

    const handleSemChange = (num) => {
        setSemNumber(num);
        const info = SEMESTER_OPTIONS.find((s) => s.num === num) || SEMESTER_OPTIONS[0];
        if (!name || name.startsWith("Semester ")) {
            setName(`Semester ${info.roman} (${currentYearStr})`);
        }
    };

    const handlePresetClick = (suggested) => {
        setName(suggested);
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        const effectiveYear = isCustomYear ? customYearText.trim() : academicYear.trim();
        if (!effectiveYear) {
            setError("Academic year is required.");
            return;
        }
        const trimmedName = name.trim() || `Semester ${selectedSemInfo.roman} (${effectiveYear})`;
        if (!trimmedName) {
            setError("Semester name is required.");
            return;
        }
        setError("");
        onCreate({
            name: trimmedName,
            academicYear: effectiveYear,
            semNumber,
            department: department.trim()
        });
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-150">
            <div className="w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-[#b8ccc8]/80 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                {/* Modal Header */}
                <div className="px-6 py-5 bg-gradient-to-r from-[#f0f6f4] to-white border-b border-[#e2e8f0] flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-[#0d9488] flex items-center justify-center text-white shadow-xs">
                            <Sparkles className="w-5 h-5" />
                        </div>
                        <div>
                            <h2 className="text-base font-extrabold text-[#0f172a]">Create Semester Workspace</h2>
                            <p className="text-xs text-[#64748b] font-medium">Configure academic year, semester, and timetable workspace</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1.5 rounded-xl hover:bg-slate-100 text-[#94a3b8] hover:text-[#0f172a] transition-colors cursor-pointer"
                        aria-label="Close modal"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    {/* ── ROW 1: Academic Year & Semester Number ── */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                        {/* Academic Year Selection */}
                        <div>
                            <label className="block text-[11px] font-bold text-[#64748b] mb-1.5 uppercase tracking-wider">
                                Academic Year *
                            </label>
                            <div className="relative">
                                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#0d9488] pointer-events-none" />
                                <select
                                    value={isCustomYear ? "custom" : academicYear}
                                    onChange={(e) => handleYearSelect(e.target.value)}
                                    className="w-full pl-9 pr-8 py-2.5 rounded-xl bg-white border border-[#b8ccc8] text-xs font-bold text-[#0f172a] focus:outline-none focus:border-[#0d9488] focus:ring-1 focus:ring-[#0d9488]/30 transition-all shadow-2xs cursor-pointer appearance-none"
                                >
                                    {standardYears.map((yr) => (
                                        <option key={yr} value={yr}>
                                            AY {yr}
                                        </option>
                                    ))}
                                    <option value="custom">+ Custom Year Format...</option>
                                </select>
                                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#94a3b8] pointer-events-none" />
                            </div>

                            {/* Quick Year Selection Chips */}
                            {!isCustomYear && (
                                <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                                    {standardYears.slice(0, 3).map((yr) => (
                                        <button
                                            key={yr}
                                            type="button"
                                            onClick={() => handleYearSelect(yr)}
                                            className={`text-[10px] font-bold px-2 py-0.5 rounded-md transition-colors cursor-pointer ${
                                                academicYear === yr
                                                    ? "bg-[#0d9488] text-white"
                                                    : "bg-[#ebf4f2] hover:bg-[#ccfbf1] text-[#0f766e]"
                                            }`}
                                        >
                                            {yr}
                                        </button>
                                    ))}
                                </div>
                            )}

                            {/* Custom Year Text Input (if Custom selected) */}
                            {isCustomYear && (
                                <div className="mt-2">
                                    <input
                                        type="text"
                                        placeholder="e.g. 2024-2025 or Term 1"
                                        value={customYearText}
                                        onChange={(e) => handleCustomYearChange(e.target.value)}
                                        className="w-full px-3 py-1.5 rounded-lg bg-white border border-[#0d9488] text-xs font-bold text-[#0f172a] placeholder-[#94a3b8] focus:outline-none focus:ring-1 focus:ring-[#0d9488]/30 transition-all"
                                        autoFocus
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setIsCustomYear(false)}
                                        className="text-[10px] font-bold text-[#0d9488] hover:underline mt-1"
                                    >
                                        ← Back to standard list
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* Semester Number */}
                        <div>
                            <label className="block text-[11px] font-bold text-[#64748b] mb-1.5 uppercase tracking-wider">
                                Semester No. *
                            </label>
                            <div className="relative">
                                <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#0d9488] pointer-events-none" />
                                <select
                                    value={semNumber}
                                    onChange={(e) => handleSemChange(Number(e.target.value))}
                                    className="w-full pl-9 pr-8 py-2.5 rounded-xl bg-white border border-[#b8ccc8] text-xs font-bold text-[#0f172a] focus:outline-none focus:border-[#0d9488] focus:ring-1 focus:ring-[#0d9488]/30 transition-all shadow-2xs cursor-pointer appearance-none"
                                >
                                    {SEMESTER_OPTIONS.map((s) => (
                                        <option key={s.num} value={s.num}>
                                            Semester {s.num} ({s.roman}) • {s.term}
                                        </option>
                                    ))}
                                </select>
                                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#94a3b8] pointer-events-none" />
                            </div>

                            {/* Semester Tag */}
                            <div className="flex items-center gap-1.5 mt-2">
                                <span className="px-2 py-0.5 rounded-md bg-[#ccfbf1] text-[#0f766e] text-[10px] font-extrabold border border-[#99f6e4]">
                                    Semester {selectedSemInfo.num} ({selectedSemInfo.roman})
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* ── ROW 2: Semester Title & Quick Presets ── */}
                    <div>
                        <div className="flex items-center justify-between mb-1.5">
                            <label className="text-[11px] font-bold text-[#64748b] uppercase tracking-wider">
                                Semester Title *
                            </label>
                            <span className="text-[10px] text-[#94a3b8]">Auto-generated or custom</span>
                        </div>
                        <div className="relative">
                            <BookOpen className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#0d9488]" />
                            <input
                                type="text"
                                placeholder={`e.g. Semester ${selectedSemInfo.roman} (${currentYearStr})`}
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-white border border-[#b8ccc8] text-sm font-bold text-[#0f172a] placeholder-[#94a3b8] focus:outline-none focus:border-[#0d9488] focus:ring-1 focus:ring-[#0d9488]/30 transition-all shadow-2xs"
                            />
                        </div>
                        {/* Quick Presets derived dynamically */}
                        <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                            <span className="text-[10px] font-semibold text-[#94a3b8]">Suggested:</span>
                            {[
                                `Semester ${selectedSemInfo.roman} (${currentYearStr})`,
                                `Sem ${selectedSemInfo.num} (${currentYearStr})`,
                                `${selectedSemInfo.term} ${currentYearStr}`,
                            ].map((preset) => (
                                <button
                                    key={preset}
                                    type="button"
                                    onClick={() => handlePresetClick(preset)}
                                    className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-[#ebf4f2] hover:bg-[#ccfbf1] text-[#0f766e] transition-colors cursor-pointer"
                                >
                                    {preset}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* ── ROW 3: Department ── */}
                    <div>
                        <label className="block text-[11px] font-bold text-[#64748b] mb-1.5 uppercase tracking-wider">
                            Department <span className="text-[#94a3b8] normal-case">(optional)</span>
                        </label>
                        <div className="relative">
                            <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#0d9488]" />
                            <input
                                type="text"
                                placeholder="e.g. Computer Science & Engineering"
                                value={department}
                                onChange={(e) => setDepartment(e.target.value)}
                                className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-white border border-[#b8ccc8] text-sm font-bold text-[#0f172a] placeholder-[#94a3b8] focus:outline-none focus:border-[#0d9488] focus:ring-1 focus:ring-[#0d9488]/30 transition-all shadow-2xs"
                            />
                        </div>
                    </div>

                    {error && (
                        <p className="text-xs font-bold text-red-600 bg-red-50 border border-red-200 rounded-xl px-3 py-2 flex items-center gap-1.5">
                            <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
                            <span>{error}</span>
                        </p>
                    )}

                    {/* Action Buttons */}
                    <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#f1f5f9]">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2.5 text-xs font-bold text-[#64748b] hover:text-[#0f172a] bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="flex items-center gap-2 px-5 py-2.5 text-xs font-extrabold bg-[#0d9488] hover:bg-[#0f766e] text-white rounded-xl shadow-xs hover:shadow-md transition-all cursor-pointer hover:scale-[1.01] active:scale-[0.99]"
                        >
                            <span>Create & Launch Studio</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
