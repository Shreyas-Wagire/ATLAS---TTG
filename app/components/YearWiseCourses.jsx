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
        <div className="rounded-[22px] bg-white border border-[#e1e9e6] shadow-[0_12px_40px_-32px_rgba(20,57,51,0.3)] overflow-hidden">
            {/* Header */}
            <div className="px-5 sm:px-6 py-5 bg-white border-b border-[#edf1ef] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-[#edf6f3] border border-[#dcebe6] flex items-center justify-center text-[#3730a3]">
                        <BookOpen className="w-4 h-4" />
                    </div>
                    <div>
                        <h3 className="text-sm font-bold tracking-tight text-[#142d2a]">
                            Academic Course & Load Master Review
                        </h3>
                        <p className="text-xs text-[#71817d] mt-0.5">
                            Review parsed course distribution, teaching hours, and lab credit load
                        </p>
                    </div>
                </div>

                {/* Year Selection Pills */}
                <div className="flex flex-wrap items-center gap-1 p-1 rounded-xl bg-[#f5f8f6] border border-[#e4ebe8] w-full sm:w-auto">
                    {years.map((yr) => (
                        <button
                            key={yr}
                            onClick={() => setSelectedYear(yr)}
                            className={`px-3 py-1 rounded-lg text-xs font-extrabold transition-all cursor-pointer ${
                                currentYearKey === yr
                                    ? "bg-white text-[#174a42] shadow-sm border border-[#e4ebe8]"
                                    : "text-[#71817d] hover:text-[#243d39]"
                            }`}
                        >
                            {yr} ({yearWiseData[yr]?.length || 0})
                        </button>
                    ))}
                </div>
            </div>

            {/* Content Table Container with Responsive Horizontal Scroll */}
            <div className="overflow-x-auto overscroll-x-contain touch-pan-x p-4 sm:p-6" tabIndex={0} aria-label="Scrollable course table">
                <table className="w-full border-collapse min-w-[650px] text-xs">
                    <thead>
                        <tr className="bg-[#f7f9f8] text-[#71817d] border-b border-[#e5ece9]">
                            <th className="p-3 font-bold text-left">Course Code</th>
                            <th className="p-3 font-bold text-left">Course Title</th>
                            <th className="p-3 font-bold text-center">Type</th>
                            <th className="p-3 font-bold text-center">Lectures / Wk</th>
                            <th className="p-3 font-bold text-center">Tutorials / Wk</th>
                            <th className="p-3 font-bold text-center">Practicals / Wk</th>
                            <th className="p-3 font-bold text-left">Assigned Faculty</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-[#edf1ef]">
                        {yearCourses.map((course, idx) => (
                            <tr key={idx} className="hover:bg-[#f7faf8] transition-colors">
                                <td className="p-3 font-mono font-extrabold text-[#3730a3]">
                                    {course.courseCode || course.code || `CS-${idx + 101}`}
                                </td>
                                <td className="p-3 font-bold text-[#0f172a]">
                                    {course.courseName || course.subject || course.subjectName || course.name}
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
                                    {course.faculty || Object.values(course.divisions || {}).filter(Boolean).join(", ") || "Prof. Assigned"}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
