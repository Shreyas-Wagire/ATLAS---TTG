"use client";

import React, { useState } from "react";
import { Globe, Plus, Check } from "lucide-react";

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
        <div className="rounded-2xl bg-[#111827] border border-slate-800 shadow-xl overflow-hidden">
            <div className="px-6 py-4 bg-[#1a2236] border-b border-slate-800/80 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                        <Globe className="w-4 h-4" />
                    </div>
                    <div>
                        <h3 className="text-sm font-bold text-slate-100">
                            Add Inter-Department & External Courses
                        </h3>
                        <p className="text-[11px] text-slate-400 font-medium">
                            Inject cross-faculty electives and external department load directly
                        </p>
                    </div>
                </div>
            </div>

            <form onSubmit={handleAddExternal} className="p-6 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div>
                        <label className="block text-[11px] font-bold text-slate-400 mb-1">
                            Target Academic Year
                        </label>
                        <select
                            value={year}
                            onChange={(e) => setYear(e.target.value)}
                            className="w-full px-3 py-2 rounded-lg bg-[#202a44] border border-slate-700 text-xs text-slate-100 focus:outline-none focus:border-blue-500"
                        >
                            <option value="">Select Year...</option>
                            {yearsList.map((y) => (
                                <option key={y} value={y}>{y}</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-[11px] font-bold text-slate-400 mb-1">
                            Course Title
                        </label>
                        <input
                            type="text"
                            placeholder="e.g. Cyber Law & Ethics"
                            value={subject}
                            onChange={(e) => setSubject(e.target.value)}
                            className="w-full px-3 py-2 rounded-lg bg-[#202a44] border border-slate-700 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500"
                        />
                    </div>

                    <div>
                        <label className="block text-[11px] font-bold text-slate-400 mb-1">
                            Assigned Faculty
                        </label>
                        <input
                            type="text"
                            placeholder="e.g. Prof. Mehta"
                            value={faculty}
                            onChange={(e) => setFaculty(e.target.value)}
                            className="w-full px-3 py-2 rounded-lg bg-[#202a44] border border-slate-700 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500"
                        />
                    </div>

                    <div>
                        <label className="block text-[11px] font-bold text-slate-400 mb-1">
                            Assigned Location / Room
                        </label>
                        <input
                            type="text"
                            placeholder="e.g. Hall-B"
                            value={location}
                            onChange={(e) => setLocation(e.target.value)}
                            className="w-full px-3 py-2 rounded-lg bg-[#202a44] border border-slate-700 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500"
                        />
                    </div>
                </div>

                <div className="grid grid-cols-3 gap-4 max-w-md">
                    <div>
                        <label className="block text-[11px] font-bold text-slate-400 mb-1">Lectures/Wk</label>
                        <input
                            type="number"
                            value={lectures}
                            onChange={(e) => setLectures(e.target.value)}
                            className="w-full px-3 py-2 rounded-lg bg-[#202a44] border border-slate-700 text-xs text-slate-100"
                        />
                    </div>
                    <div>
                        <label className="block text-[11px] font-bold text-slate-400 mb-1">Tutorials/Wk</label>
                        <input
                            type="number"
                            value={tutorials}
                            onChange={(e) => setTutorials(e.target.value)}
                            className="w-full px-3 py-2 rounded-lg bg-[#202a44] border border-slate-700 text-xs text-slate-100"
                        />
                    </div>
                    <div>
                        <label className="block text-[11px] font-bold text-slate-400 mb-1">Practicals/Wk</label>
                        <input
                            type="number"
                            value={practicals}
                            onChange={(e) => setPracticals(e.target.value)}
                            className="w-full px-3 py-2 rounded-lg bg-[#202a44] border border-slate-700 text-xs text-slate-100"
                        />
                    </div>
                </div>

                <div className="flex justify-end pt-2">
                    <button
                        type="submit"
                        className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all shadow-md shadow-emerald-500/20 cursor-pointer"
                    >
                        <Plus className="w-4 h-4" />
                        <span>Inject External Course</span>
                    </button>
                </div>
            </form>
        </div>
    );
}
