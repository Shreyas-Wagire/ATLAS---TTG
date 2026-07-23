"use client";

import React, { useState } from "react";
import { Sliders, Plus, Trash2, Calendar, Clock, BookOpen, Layers } from "lucide-react";

export default function GlobalConstraints({ globalConstraints = [], setGlobalConstraints }) {
    const [groupName, setGroupName] = useState("");
    const [days, setDays] = useState("");
    const [slotTime, setSlotTime] = useState("");
    const [courseName, setCourseName] = useState("");

    const handleAddConstraint = (e) => {
        e.preventDefault();
        if (!groupName || !days || !slotTime || !courseName) return;

        const daysArr = days.split(",").map((d) => d.trim());
        const newConstraint = {
            groupName,
            days: daysArr,
            slotTime,
            courseName,
        };

        setGlobalConstraints([...globalConstraints, newConstraint]);
        setGroupName("");
        setDays("");
        setSlotTime("");
        setCourseName("");
    };

    const handleDeleteConstraint = (index) => {
        const updated = globalConstraints.filter((_, i) => i !== index);
        setGlobalConstraints(updated);
    };

    return (
        <div className="rounded-2xl bg-[#111827] border border-slate-800 shadow-xl overflow-hidden">
            {/* Header */}
            <div className="px-6 py-4 bg-[#1a2236] border-b border-slate-800/80 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
                        <Sliders className="w-4 h-4" />
                    </div>
                    <div>
                        <h3 className="text-sm font-bold text-slate-100">
                            Global Synchronized Constraints
                        </h3>
                        <p className="text-[11px] text-slate-400 font-medium">
                            Enforce multi-division synchronized elective slots across departments
                        </p>
                    </div>
                </div>
                <span className="px-2.5 py-1 text-[11px] font-bold rounded-md bg-blue-500/10 text-blue-400 border border-blue-500/20">
                    {globalConstraints.length} Active Constraints
                </span>
            </div>

            <div className="p-6 space-y-6">
                {/* Form Inputs */}
                <form onSubmit={handleAddConstraint} className="p-4 rounded-xl bg-[#1a2236] border border-slate-800/80 space-y-4">
                    <h4 className="text-xs font-bold uppercase text-slate-400 tracking-wider">
                        Add New Synchronized Constraint
                    </h4>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                        <div>
                            <label className="block text-[11px] font-bold text-slate-400 mb-1">
                                Constraint Group
                            </label>
                            <input
                                type="text"
                                placeholder="e.g. MINOR-II"
                                value={groupName}
                                onChange={(e) => setGroupName(e.target.value)}
                                className="w-full px-3 py-2 rounded-lg bg-[#202a44] border border-slate-700 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500"
                            />
                        </div>
                        <div>
                            <label className="block text-[11px] font-bold text-slate-400 mb-1">
                                Target Days (Comma Separated)
                            </label>
                            <input
                                type="text"
                                placeholder="e.g. Monday, Wednesday"
                                value={days}
                                onChange={(e) => setDays(e.target.value)}
                                className="w-full px-3 py-2 rounded-lg bg-[#202a44] border border-slate-700 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500"
                            />
                        </div>
                        <div>
                            <label className="block text-[11px] font-bold text-slate-400 mb-1">
                                Time Slot
                            </label>
                            <input
                                type="text"
                                placeholder="e.g. 11:30 - 12:30"
                                value={slotTime}
                                onChange={(e) => setSlotTime(e.target.value)}
                                className="w-full px-3 py-2 rounded-lg bg-[#202a44] border border-slate-700 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500"
                            />
                        </div>
                        <div>
                            <label className="block text-[11px] font-bold text-slate-400 mb-1">
                                Course Name
                            </label>
                            <input
                                type="text"
                                placeholder="e.g. Advanced AI"
                                value={courseName}
                                onChange={(e) => setCourseName(e.target.value)}
                                className="w-full px-3 py-2 rounded-lg bg-[#202a44] border border-slate-700 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500"
                            />
                        </div>
                    </div>

                    <div className="flex justify-end">
                        <button
                            type="submit"
                            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-all shadow-md shadow-blue-500/20 cursor-pointer"
                        >
                            <Plus className="w-4 h-4" />
                            <span>Add Constraint Badge</span>
                        </button>
                    </div>
                </form>

                {/* Constraint Chip System */}
                <div>
                    <h4 className="text-xs font-bold uppercase text-slate-400 tracking-wider mb-3">
                        Active Constraint Badges
                    </h4>

                    {globalConstraints.length === 0 ? (
                        <div className="p-6 rounded-xl bg-[#1a2236] border border-slate-800/80 text-center text-slate-500 text-xs">
                            No active constraints configured yet. Add one above.
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {globalConstraints.map((item, index) => {
                                const daysText = Array.isArray(item.days) ? item.days.join(", ") : item.days;
                                return (
                                    <div
                                        key={index}
                                        className="p-3.5 rounded-xl bg-[#1a2236] border border-slate-800/80 flex flex-wrap items-center justify-between gap-3 hover:border-slate-700 transition-all"
                                    >
                                        <div className="flex flex-wrap items-center gap-2">
                                            {/* Group Badge */}
                                            <span className="px-2.5 py-1 rounded-md bg-blue-500/10 text-blue-400 border border-blue-500/30 font-extrabold text-xs">
                                                {item.groupName}
                                            </span>

                                            {/* Days Badge */}
                                            <span className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-[#202a44] text-slate-300 text-xs font-semibold">
                                                <Calendar className="w-3 h-3 text-slate-400" />
                                                {daysText}
                                            </span>

                                            {/* Time Slot Badge */}
                                            <span className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-[#202a44] text-slate-300 text-xs font-semibold">
                                                <Clock className="w-3 h-3 text-slate-400" />
                                                {item.slotTime}
                                            </span>

                                            {/* Course Badge */}
                                            <span className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-[#202a44] text-slate-200 text-xs font-semibold">
                                                <BookOpen className="w-3 h-3 text-amber-400" />
                                                {item.courseName}
                                            </span>
                                        </div>

                                        {/* Action */}
                                        <button
                                            onClick={() => handleDeleteConstraint(index)}
                                            className="p-1.5 rounded-md hover:bg-red-500/10 text-slate-500 hover:text-red-400 transition-colors"
                                            title="Delete Constraint"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
