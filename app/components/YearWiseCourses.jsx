"use client";

import React, { useState } from "react";
import { BookOpen } from "lucide-react";

export default function YearWiseCourses({ yearWiseData = {} }) {
    const years = Object.keys(yearWiseData);
    const [selectedYear, setSelectedYear] = useState(years[0] || "");

    if (years.length === 0) return null;

    const currentYearKey = selectedYear || years[0];
    const yearCourses = yearWiseData[currentYearKey] || [];

    return (
        <div className="rounded-2xl bg-white border border-[#b8ccc8] shadow-2xs overflow-hidden">
            {/* Header */}
            <div className="px-4 sm:px-6 py-4 bg-[#ebf4f2] border-b border-[#b8ccc8] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-[#ccfbf1] border border-[#99f6e4] flex items-center justify-center text-[#0f766e]">
                        <BookOpen className="w-4 h-4" />
                    </div>
                    <div>
                        <h3 className="text-sm font-extrabold text-[#0f172a]">
                            Academic Course & Load Master Review
                        </h3>
                        <p className="text-[11px] text-[#64748b] font-medium">
                            Review parsed course distribution, teaching hours, and lab credit load
                        </p>
                    </div>
                </div>

                {/* Year Selection Pills */}
                <div className="flex flex-wrap items-center gap-1.5 p-1 rounded-xl bg-white border border-[#b8ccc8] w-full sm:w-auto">
                    {years.map((yr) => (
                        <button
                            key={yr}
                            onClick={() => setSelectedYear(yr)}
                            className={`px-3 py-1 rounded-lg text-xs font-extrabold transition-all cursor-pointer ${
                                currentYearKey === yr
                                    ? "bg-[#0d9488] text-white shadow-2xs"
                                    : "text-[#64748b] hover:text-[#0f172a]"
                            }`}
                        >
                            {yr} ({yearWiseData[yr]?.length || 0})
                        </button>
                    ))}
                </div>
            </div>

            {/* Content Table Container with Responsive Horizontal Scroll */}
            <div className="p-4 sm:p-6 overflow-x-auto">
                <table className="w-full border-collapse min-w-[650px] text-xs">
                    <thead>
                        <tr className="bg-[#ebf4f2]/70 text-[#64748b] border-b border-[#b8ccc8]">
                            <th className="p-3 font-bold text-left">Course Code</th>
                            <th className="p-3 font-bold text-left">Course Title</th>
                            <th className="p-3 font-bold text-center">Type</th>
                            <th className="p-3 font-bold text-center">Lectures / Wk</th>
                            <th className="p-3 font-bold text-center">Tutorials / Wk</th>
                            <th className="p-3 font-bold text-center">Practicals / Wk</th>
                            <th className="p-3 font-bold text-left">Assigned Faculty</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-[#b8ccc8]/50">
                        {yearCourses.map((course, idx) => (
                            <tr key={idx} className="hover:bg-[#ebf4f2]/40 transition-colors">
                                <td className="p-3 font-mono font-extrabold text-[#0f766e]">
                                    {course.courseCode || course.code || `CS-${idx + 101}`}
                                </td>
                                <td className="p-3 font-bold text-[#0f172a]">
                                    {course.subject || course.subjectName || course.name}
                                </td>
                                <td className="p-3 text-center">
                                    <span className={`px-2 py-0.5 text-[10px] font-extrabold uppercase rounded ${
                                        course.type === "PRACTICAL"
                                            ? "bg-teal-100 text-teal-800 border border-teal-200"
                                            : course.type === "TUTORIAL"
                                            ? "bg-purple-100 text-purple-800 border border-purple-200"
                                            : "bg-blue-100 text-blue-800 border border-blue-200"
                                    }`}>
                                        {course.type || "LECTURE"}
                                    </span>
                                </td>
                                <td className="p-3 text-center font-extrabold text-[#334155]">
                                    {course.lectureCount || course.lectures || course.L || 3} hrs
                                </td>
                                <td className="p-3 text-center font-extrabold text-[#334155]">
                                    {course.tutorialCount || course.tutorials || course.T || 0} hrs
                                </td>
                                <td className="p-3 text-center font-extrabold text-[#334155]">
                                    {course.practicalCount || course.practicals || course.P || 0} hrs
                                </td>
                                <td className="p-3 font-bold text-[#475569]">
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