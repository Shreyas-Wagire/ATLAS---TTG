"use client";

import React, { useState } from "react";
import { BookOpen, Layers, Clock, Award } from "lucide-react";

export default function YearWiseCourses({ yearWiseData = {} }) {
    const years = Object.keys(yearWiseData);
    const [selectedYear, setSelectedYear] = useState(years[0] || "");

    if (years.length === 0) return null;

    const currentYearKey = selectedYear || years[0];
    const yearCourses = yearWiseData[currentYearKey] || [];

    return (
        <div className="rounded-2xl bg-[#111827] border border-slate-800 shadow-xl overflow-hidden">
            {/* Header */}
            <div className="px-6 py-4 bg-[#1a2236] border-b border-slate-800/80 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
                        <BookOpen className="w-4 h-4" />
                    </div>
                    <div>
                        <h3 className="text-sm font-bold text-slate-100">
                            Academic Course & Load Master Review
                        </h3>
                        <p className="text-[11px] text-slate-400 font-medium">
                            Review parsed course distribution, teaching hours, and lab credit load
                        </p>
                    </div>
                </div>

                {/* Year Selection Pills */}
                <div className="flex items-center gap-1.5 p-1 rounded-xl bg-[#202a44] border border-slate-800">
                    {years.map((yr) => (
                        <button
                            key={yr}
                            onClick={() => setSelectedYear(yr)}
                            className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                                currentYearKey === yr
                                    ? "bg-blue-600 text-white shadow-sm"
                                    : "text-slate-400 hover:text-slate-200"
                            }`}
                        >
                            {yr} ({yearWiseData[yr]?.length || 0})
                        </button>
                    ))}
                </div>
            </div>

            {/* Content Table */}
            <div className="p-6 overflow-x-auto">
                <table className="w-full border-collapse min-w-[700px] text-xs">
                    <thead>
                        <tr className="bg-[#1a2236] text-slate-400 border-b border-slate-800">
                            <th className="p-3 font-bold text-left">Course Code</th>
                            <th className="p-3 font-bold text-left">Course Title</th>
                            <th className="p-3 font-bold text-center">Type</th>
                            <th className="p-3 font-bold text-center">Lectures / Wk</th>
                            <th className="p-3 font-bold text-center">Tutorials / Wk</th>
                            <th className="p-3 font-bold text-center">Practicals / Wk</th>
                            <th className="p-3 font-bold text-left">Assigned Faculty</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/80">
                        {yearCourses.map((course, idx) => (
                            <tr key={idx} className="hover:bg-[#1a2236]/50 transition-colors">
                                <td className="p-3 font-mono font-bold text-blue-400">
                                    {course.courseCode || course.code || `CS-${idx + 101}`}
                                </td>
                                <td className="p-3 font-bold text-slate-200">
                                    {course.subject || course.subjectName || course.name}
                                </td>
                                <td className="p-3 text-center">
                                    <span className={`px-2 py-0.5 text-[10px] font-extrabold uppercase rounded ${
                                        course.type === "PRACTICAL"
                                            ? "bg-orange-500/20 text-orange-300"
                                            : course.type === "TUTORIAL"
                                            ? "bg-purple-500/20 text-purple-300"
                                            : "bg-blue-500/20 text-blue-300"
                                    }`}>
                                        {course.type || "LECTURE"}
                                    </span>
                                </td>
                                <td className="p-3 text-center font-bold text-slate-300">
                                    {course.lectureCount || course.lectures || 3} hrs
                                </td>
                                <td className="p-3 text-center font-bold text-slate-300">
                                    {course.tutorialCount || course.tutorials || 0} hrs
                                </td>
                                <td className="p-3 text-center font-bold text-slate-300">
                                    {course.practicalCount || course.practicals || 0} hrs
                                </td>
                                <td className="p-3 font-medium text-slate-300">
                                    {course.faculty || "Prof. Assigned"}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}