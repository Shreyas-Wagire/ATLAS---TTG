"use client";

import React, { useEffect, useMemo, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { X, CalendarDays, Building2, Sparkles, AlertCircle, ArrowRight, ChevronDown, FileSpreadsheet } from "lucide-react";

function getStandardAcademicYears() {
    const currentYear = new Date().getFullYear();
    return Array.from({ length: 6 }, (_, index) => {
        const year = currentYear + 2 - index;
        return `${year}-${String((year + 1) % 100).padStart(2, "0")}`;
    });
}

export default function CreateSemesterModal({ onClose, onCreate }) {
    const standardYears = useMemo(() => getStandardAcademicYears(), []);
    const defaultYear = standardYears[2];
    const [academicYear, setAcademicYear] = useState(defaultYear);
    const [customYear, setCustomYear] = useState(false);
    const [customYearText, setCustomYearText] = useState("");
    const [name, setName] = useState("");
    const [department, setDepartment] = useState("");
    const [error, setError] = useState("");
    const reduceMotion = useReducedMotion();

    useEffect(() => {
        const handleKeyDown = (event) => {
            if (event.key === "Escape") onClose?.();
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [onClose]);

    const currentYear = customYear ? customYearText.trim() : academicYear;

    const handleSubmit = (event) => {
        event.preventDefault();
        const effectiveYear = currentYear.trim();
        if (!effectiveYear) {
            setError("Add an academic year to continue.");
            return;
        }
        setError("");
        onCreate({
            name: name.trim() || `Timetable · ${effectiveYear}`,
            academicYear: effectiveYear,
            // Kept only for compatibility with older saved workspace records.
            semNumber: 0,
            department: department.trim(),
        });
    };

    const transition = reduceMotion ? { duration: 0 } : { duration: 0.22, ease: [0.22, 1, 0.36, 1] };

    return (
        <motion.div
            className="fixed inset-0 z-[80] flex items-center justify-center overflow-y-auto bg-[#0d2824]/35 p-4 backdrop-blur-md sm:p-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={transition}
            onMouseDown={(event) => { if (event.target === event.currentTarget) onClose?.(); }}
            role="presentation"
        >
            <motion.section
                role="dialog"
                aria-modal="true"
                aria-labelledby="workspace-dialog-title"
                initial={reduceMotion ? false : { opacity: 0, y: 12, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 8, scale: 0.985 }}
                transition={transition}
                className="my-auto w-full max-w-xl overflow-hidden rounded-[28px] border border-white/80 bg-white shadow-[0_36px_100px_-38px_rgba(8,38,33,0.52)]"
            >
                <header className="flex items-start justify-between gap-4 border-b border-[#edf2ef] px-5 py-5 sm:px-7 sm:py-6">
                    <div className="flex items-start gap-3.5">
                        <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-[#1e1b4b] text-white shadow-[0_8px_18px_-10px_rgba(30,27,75,0.7)]">
                            <Sparkles className="h-5 w-5" />
                        </div>
                        <div>
                            <p className="mb-1 text-[9px] font-extrabold uppercase tracking-[0.18em] text-[#4f46e5]">Workspace setup</p>
                            <h2 id="workspace-dialog-title" className="text-lg font-extrabold tracking-[-0.035em] text-[#1e1b4b] sm:text-xl">Create timetable workspace</h2>
                            <p className="mt-1 max-w-sm text-xs leading-5 text-[#71817d]">One workbook can include every year and department.</p>
                        </div>
                    </div>
                    <motion.button
                        type="button"
                        onClick={onClose}
                        whileHover={{ rotate: 90, backgroundColor: "#f1f6f3" }}
                        whileTap={{ scale: 0.92 }}
                        transition={{ duration: 0.18 }}
                        className="grid h-9 w-9 shrink-0 place-items-center rounded-xl text-[#81918c] transition-colors hover:text-[#294943] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4338ca]/40"
                        aria-label="Close dialog"
                    >
                        <X className="h-4 w-4" />
                    </motion.button>
                </header>

                <form onSubmit={handleSubmit} className="space-y-5 px-5 py-5 sm:px-7 sm:py-6">
                    <div>
                        <label htmlFor="workspace-academic-year" className="mb-2 block text-[10px] font-extrabold uppercase tracking-[0.13em] text-[#60736d]">Academic year <span className="text-[#4338ca]">*</span></label>
                        <div className="relative">
                            <CalendarDays className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#4338ca]" />
                            <select
                                id="workspace-academic-year"
                                value={customYear ? "custom" : academicYear}
                                onChange={(event) => {
                                    const value = event.target.value;
                                    setCustomYear(value === "custom");
                                    if (value !== "custom") setAcademicYear(value);
                                    setError("");
                                }}
                                className="h-12 w-full appearance-none rounded-2xl border border-[#dce7e2] bg-[#fbfcfb] pl-11 pr-11 text-sm font-bold text-[#294943] outline-none transition-all duration-200 hover:border-[#b7d2c8] focus:border-[#4338ca] focus:bg-white focus:ring-4 focus:ring-[#4338ca]/10"
                            >
                                {standardYears.map((year) => <option key={year} value={year}>AY {year}</option>)}
                                <option value="custom">Custom academic year…</option>
                            </select>
                            <ChevronDown className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8a9a95]" />
                        </div>
                        {customYear ? (
                            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} transition={transition} className="overflow-hidden">
                                <input
                                    autoFocus
                                    value={customYearText}
                                    onChange={(event) => { setCustomYearText(event.target.value); setError(""); }}
                                    placeholder="e.g. 2026–27"
                                    aria-label="Custom academic year"
                                    className="mt-2 h-11 w-full rounded-xl border border-[#dce7e2] bg-white px-3.5 text-sm font-semibold text-[#294943] outline-none transition-all placeholder:font-medium placeholder:text-[#a2b0ab] focus:border-[#4338ca] focus:ring-4 focus:ring-[#4338ca]/10"
                                />
                            </motion.div>
                        ) : (
                            <div className="mt-2.5 flex flex-wrap gap-1.5">
                                {standardYears.slice(0, 3).map((year) => (
                                    <motion.button
                                        key={year}
                                        type="button"
                                        onClick={() => { setAcademicYear(year); setError(""); }}
                                        whileTap={{ scale: 0.95 }}
                                        className={`rounded-lg px-2.5 py-1 text-[10px] font-bold transition-all duration-200 ${academicYear === year ? "bg-[#e8f5f0] text-[#3730a3] ring-1 ring-inset ring-[#c9e6db]" : "bg-[#f4f7f5] text-[#81918c] hover:bg-[#eaf2ee] hover:text-[#42635a]"}`}
                                    >{year}</motion.button>
                                ))}
                            </div>
                        )}
                    </div>

                    <div>
                        <div className="mb-2 flex items-center justify-between gap-2">
                            <label htmlFor="workspace-name" className="text-[10px] font-extrabold uppercase tracking-[0.13em] text-[#60736d]">Workspace name <span className="text-[#9aa9a4] normal-case tracking-normal">· optional</span></label>
                            <span className="text-[10px] text-[#9aa9a4]">Defaults to academic year</span>
                        </div>
                        <div className="relative">
                            <FileSpreadsheet className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#4338ca]" />
                            <input
                                id="workspace-name"
                                value={name}
                                onChange={(event) => setName(event.target.value)}
                                placeholder={`Timetable · ${currentYear || "Academic year"}`}
                                className="h-12 w-full rounded-2xl border border-[#dce7e2] bg-[#fbfcfb] pl-11 pr-4 text-sm font-semibold text-[#294943] outline-none transition-all duration-200 placeholder:font-medium placeholder:text-[#a2b0ab] hover:border-[#b7d2c8] focus:border-[#4338ca] focus:bg-white focus:ring-4 focus:ring-[#4338ca]/10"
                            />
                        </div>
                    </div>

                    <div>
                        <label htmlFor="workspace-department" className="mb-2 block text-[10px] font-extrabold uppercase tracking-[0.13em] text-[#60736d]">Department <span className="text-[#9aa9a4] normal-case tracking-normal">· optional</span></label>
                        <div className="relative">
                            <Building2 className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#4338ca]" />
                            <input
                                id="workspace-department"
                                value={department}
                                onChange={(event) => setDepartment(event.target.value)}
                                placeholder="e.g. Computer Science & Engineering"
                                className="h-12 w-full rounded-2xl border border-[#dce7e2] bg-[#fbfcfb] pl-11 pr-4 text-sm font-semibold text-[#294943] outline-none transition-all duration-200 placeholder:font-medium placeholder:text-[#a2b0ab] hover:border-[#b7d2c8] focus:border-[#4338ca] focus:bg-white focus:ring-4 focus:ring-[#4338ca]/10"
                            />
                        </div>
                    </div>

                    {error && (
                        <motion.p initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} role="alert" className="flex items-center gap-2 rounded-xl border border-red-100 bg-red-50 px-3.5 py-2.5 text-xs font-semibold text-red-700">
                            <AlertCircle className="h-4 w-4 shrink-0" />{error}
                        </motion.p>
                    )}

                    <footer className="flex flex-col-reverse gap-2 border-t border-[#edf2ef] pt-5 sm:flex-row sm:justify-end sm:gap-2.5">
                        <motion.button type="button" onClick={onClose} whileHover={{ y: -1 }} whileTap={{ scale: 0.97 }} className="h-11 rounded-xl px-4 text-sm font-bold text-[#71817d] transition-colors hover:bg-[#f3f7f5] hover:text-[#294943] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4338ca]/40">Cancel</motion.button>
                        <motion.button type="submit" whileHover={{ y: -1, boxShadow: "0 12px 22px -12px rgba(55,48,163,0.58)" }} whileTap={{ scale: 0.98 }} className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[#1e1b4b] px-5 text-sm font-bold text-white shadow-[0_6px_14px_-9px_rgba(30,27,75,0.65)] transition-colors hover:bg-[#3730a3] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4338ca]/50 focus-visible:ring-offset-2">
                            Create workspace <ArrowRight className="h-4 w-4" />
                        </motion.button>
                    </footer>
                </form>
            </motion.section>
        </motion.div>
    );
}
