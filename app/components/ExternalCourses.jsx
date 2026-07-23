"use client";

import React, { useState } from "react";
import { Globe, Plus } from "lucide-react";

export default function ExternalCourses({ yearWiseData = {}, setYearWiseData }) {
    const [year, setYear] = useState("");
    const [subject, setSubject] = useState("");
    const [faculty, setFaculty] = useState("");
    const [location, setLocation] = useState("");
    const [lectures, setLectures] = useState(3);
    const [tutorials, setTutorials] = useState(0);
    const [practicals, setPracticals] = useState(0);

    const yearsList = Object.keys(yearWiseData);

    const handleAddExternal = (e) => {
        e.preventDefault();
        if (!year || !subject) return;

        const newCourse = {
            subject,
            faculty: faculty || "External Prof.",
            location: location || "CR-EXT",
            lectures: Number(lectures),
            tutorials: Number(tutorials),
            practicals: Number(practicals),
            type: "LECTURE",
            isExternal: true,
        };

        const updated = { ...yearWiseData };
        if (!updated[year]) updated[year] = [];
        updated[year].push(newCourse);

        setYearWiseData(updated);
        setSubject("");
        setFaculty("");
        setLocation("");
    };

    return (
        <div className="rounded-2xl bg-white border border-[#b8ccc8] shadow-2xs overflow-hidden">
            <div className="px-4 sm:px-6 py-4 bg-[#ebf4f2] border-b border-[#b8ccc8] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-[#ccfbf1] border border-[#99f6e4] flex items-center justify-center text-[#0f766e]">
                        <Globe className="w-4 h-4" />
                    </div>
                    <div>
                        <h3 className="text-sm font-extrabold text-[#0f172a]">
                            Add Inter-Department & External Courses
                        </h3>
                        <p className="text-[11px] text-[#64748b] font-medium">
                            Inject cross-faculty electives and external department load directly
                        </p>
                    </div>
                </div>
            </div>

            <form onSubmit={handleAddExternal} className="p-4 sm:p-6 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div>
                        <label className="block text-[11px] font-bold text-[#64748b] mb-1">
                            Target Academic Year
                        </label>
                        <select
                            value={year}
                            onChange={(e) => setYear(e.target.value)}
                            className="w-full px-3 py-2 rounded-lg bg-white border border-[#b8ccc8] text-xs font-bold text-[#0f172a] focus:outline-none focus:border-[#0d9488]"
                        >
                            <option value="">Select Year...</option>
                            {yearsList.map((y) => (
                                <option key={y} value={y}>{y}</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-[11px] font-bold text-[#64748b] mb-1">
                            Course Title
                        </label>
                        <input
                            type="text"
                            placeholder="e.g. Cyber Law & Ethics"
                            value={subject}
                            onChange={(e) => setSubject(e.target.value)}
                            className="w-full px-3 py-2 rounded-lg bg-white border border-[#b8ccc8] text-xs font-bold text-[#0f172a] placeholder-[#94a3b8] focus:outline-none focus:border-[#0d9488]"
                        />
                    </div>

                    <div>
                        <label className="block text-[11px] font-bold text-[#64748b] mb-1">
                            Assigned Faculty
                        </label>
                        <input
                            type="text"
                            placeholder="e.g. Prof. Mehta"
                            value={faculty}
                            onChange={(e) => setFaculty(e.target.value)}
                            className="w-full px-3 py-2 rounded-lg bg-white border border-[#b8ccc8] text-xs font-bold text-[#0f172a] placeholder-[#94a3b8] focus:outline-none focus:border-[#0d9488]"
                        />
                    </div>

                    <div>
                        <label className="block text-[11px] font-bold text-[#64748b] mb-1">
                            Assigned Location / Room
                        </label>
                        <input
                            type="text"
                            placeholder="e.g. Hall-B"
                            value={location}
                            onChange={(e) => setLocation(e.target.value)}
                            className="w-full px-3 py-2 rounded-lg bg-white border border-[#b8ccc8] text-xs font-bold text-[#0f172a] placeholder-[#94a3b8] focus:outline-none focus:border-[#0d9488]"
                        />
                    </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-md">
                    <div>
                        <label className="block text-[11px] font-bold text-[#64748b] mb-1">Lectures/Wk</label>
                        <input
                            type="number"
                            value={lectures}
                            onChange={(e) => setLectures(e.target.value)}
                            className="w-full px-3 py-2 rounded-lg bg-white border border-[#b8ccc8] text-xs font-bold text-[#0f172a]"
                        />
                    </div>
                    <div>
                        <label className="block text-[11px] font-bold text-[#64748b] mb-1">Tutorials/Wk</label>
                        <input
                            type="number"
                            value={tutorials}
                            onChange={(e) => setTutorials(e.target.value)}
                            className="w-full px-3 py-2 rounded-lg bg-white border border-[#b8ccc8] text-xs font-bold text-[#0f172a]"
                        />
                    </div>
                    <div>
                        <label className="block text-[11px] font-bold text-[#64748b] mb-1">Practicals/Wk</label>
                        <input
                            type="number"
                            value={practicals}
                            onChange={(e) => setPracticals(e.target.value)}
                            className="w-full px-3 py-2 rounded-lg bg-white border border-[#b8ccc8] text-xs font-bold text-[#0f172a]"
                        />
                    </div>
                </div>

                <div className="flex justify-end pt-2">
                    <button
                        type="submit"
                        className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#0d9488] hover:bg-[#0f766e] text-white text-xs font-extrabold transition-all shadow-xs cursor-pointer"
                    >
                        <Plus className="w-4 h-4" />
                        <span>Inject External Course</span>
                    </button>
                </div>
            </form>
        </div>
    );
}
