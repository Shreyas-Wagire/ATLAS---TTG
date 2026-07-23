"use client";

import React, { useState } from "react";
import { Sliders, Plus, Trash2, Calendar, Clock, BookOpen } from "lucide-react";

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
        <div className="rounded-2xl bg-white border border-[#b8ccc8] shadow-2xs overflow-hidden">
            {/* Header */}
            <div className="px-4 sm:px-6 py-4 bg-[#ebf4f2] border-b border-[#b8ccc8] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-[#ccfbf1] border border-[#99f6e4] flex items-center justify-center text-[#0f766e]">
                        <Sliders className="w-4 h-4" />
                    </div>
                    <div>
                        <h3 className="text-sm font-extrabold text-[#0f172a]">
                            Global Synchronized Constraints
                        </h3>
                        <p className="text-[11px] text-[#64748b] font-medium">
                            Enforce multi-division synchronized elective slots across departments
                        </p>
                    </div>
                </div>
                <span className="px-2.5 py-1 text-[11px] font-extrabold rounded-md bg-[#ccfbf1] text-[#0f766e] border border-[#99f6e4]">
                    {globalConstraints.length} Active Constraints
                </span>
            </div>

            <div className="p-4 sm:p-6 space-y-6">
                {/* Form Inputs */}
                <form onSubmit={handleAddConstraint} className="p-4 rounded-xl bg-[#ebf4f2]/60 border border-[#b8ccc8] space-y-4">
                    <h4 className="text-xs font-extrabold uppercase text-[#0f766e] tracking-wider">
                        Add New Synchronized Constraint
                    </h4>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                        <div>
                            <label className="block text-[11px] font-bold text-[#64748b] mb-1">
                                Constraint Group
                            </label>
                            <input
                                type="text"
                                placeholder="e.g. MINOR-II"
                                value={groupName}
                                onChange={(e) => setGroupName(e.target.value)}
                                className="w-full px-3 py-2 rounded-lg bg-white border border-[#b8ccc8] text-xs font-bold text-[#0f172a] placeholder-[#94a3b8] focus:outline-none focus:border-[#0d9488]"
                            />
                        </div>
                        <div>
                            <label className="block text-[11px] font-bold text-[#64748b] mb-1">
                                Target Days (Comma Separated)
                            </label>
                            <input
                                type="text"
                                placeholder="e.g. Monday, Wednesday"
                                value={days}
                                onChange={(e) => setDays(e.target.value)}
                                className="w-full px-3 py-2 rounded-lg bg-white border border-[#b8ccc8] text-xs font-bold text-[#0f172a] placeholder-[#94a3b8] focus:outline-none focus:border-[#0d9488]"
                            />
                        </div>
                        <div>
                            <label className="block text-[11px] font-bold text-[#64748b] mb-1">
                                Time Slot
                            </label>
                            <input
                                type="text"
                                placeholder="e.g. 11:30 - 12:30"
                                value={slotTime}
                                onChange={(e) => setSlotTime(e.target.value)}
                                className="w-full px-3 py-2 rounded-lg bg-white border border-[#b8ccc8] text-xs font-bold text-[#0f172a] placeholder-[#94a3b8] focus:outline-none focus:border-[#0d9488]"
                            />
                        </div>
                        <div>
                            <label className="block text-[11px] font-bold text-[#64748b] mb-1">
                                Course Name
                            </label>
                            <input
                                type="text"
                                placeholder="e.g. Advanced AI"
                                value={courseName}
                                onChange={(e) => setCourseName(e.target.value)}
                                className="w-full px-3 py-2 rounded-lg bg-white border border-[#b8ccc8] text-xs font-bold text-[#0f172a] placeholder-[#94a3b8] focus:outline-none focus:border-[#0d9488]"
                            />
                        </div>
                    </div>

                    <div className="flex justify-end">
                        <button
                            type="submit"
                            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#0d9488] hover:bg-[#0f766e] text-white text-xs font-extrabold transition-all shadow-xs cursor-pointer"
                        >
                            <Plus className="w-4 h-4" />
                            <span>Add Constraint Badge</span>
                        </button>
                    </div>
                </form>

                {/* Constraint Chip System */}
                <div>
                    <h4 className="text-xs font-extrabold uppercase text-[#0f766e] tracking-wider mb-3">
                        Active Constraint Badges
                    </h4>

                    {globalConstraints.length === 0 ? (
                        <div className="p-6 rounded-xl bg-[#ebf4f2]/40 border border-[#b8ccc8] text-center text-[#64748b] text-xs font-medium">
                            No active constraints configured yet. Add one above.
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {globalConstraints.map((item, index) => {
                                const daysText = Array.isArray(item.days) ? item.days.join(", ") : item.days;
                                return (
                                    <div
                                        key={index}
                                        className="p-3.5 rounded-xl bg-white border border-[#b8ccc8] flex flex-wrap items-center justify-between gap-3 hover:border-[#0d9488] transition-all shadow-2xs"
                                    >
                                        <div className="flex flex-wrap items-center gap-2">
                                            {/* Group Badge */}
                                            <span className="px-2.5 py-1 rounded-md bg-[#ccfbf1] text-[#0f766e] border border-[#99f6e4] font-extrabold text-xs">
                                                {item.groupName}
                                            </span>

                                            {/* Days Badge */}
                                            <span className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-[#ebf4f2] text-[#334155] text-xs font-bold">
                                                <Calendar className="w-3 h-3 text-[#0f766e]" />
                                                {daysText}
                                            </span>

                                            {/* Time Slot Badge */}
                                            <span className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-[#ebf4f2] text-[#334155] text-xs font-bold">
                                                <Clock className="w-3 h-3 text-[#0f766e]" />
                                                {item.slotTime}
                                            </span>

                                            {/* Course Badge */}
                                            <span className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-[#ebf4f2] text-[#0f172a] text-xs font-bold">
                                                <BookOpen className="w-3 h-3 text-[#0d9488]" />
                                                {item.courseName}
                                            </span>
                                        </div>

                                        {/* Action */}
                                        <button
                                            onClick={() => handleDeleteConstraint(index)}
                                            className="p-1.5 rounded-md hover:bg-red-50 text-[#64748b] hover:text-red-600 transition-colors cursor-pointer"
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
