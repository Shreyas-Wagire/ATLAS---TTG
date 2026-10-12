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
        <div className="atlas-settings-card rounded-[22px] bg-white border border-[#e1e9e6] shadow-[0_12px_40px_-32px_rgba(20,57,51,0.3)] overflow-hidden">
            {/* Header */}
            <div className="px-5 sm:px-6 py-5 bg-white border-b border-[#edf1ef] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-[#edf6f3] border border-[#dcebe6] flex items-center justify-center text-[#3730a3]">
                        <Sliders className="w-4 h-4" />
                    </div>
                    <div>
                        <h3 className="text-sm font-bold tracking-tight text-[#142d2a]">
                            Global Synchronized Constraints
                        </h3>
                        <p className="text-xs text-[#71817d] mt-0.5">
                            Enforce multi-division synchronized elective slots across departments
                        </p>
                    </div>
                </div>
                <span className="px-2.5 py-1.5 text-xs font-semibold rounded-lg bg-[#f1f7f4] text-[#3e6c5e] border border-[#dcebe3]">
                    {globalConstraints.length} Active Constraints
                </span>
            </div>

            <div className="p-4 sm:p-6 space-y-6">
                {/* Form Inputs */}
                <form onSubmit={handleAddConstraint} className="p-5 rounded-2xl bg-[#f7f9f8] border border-[#e7eeeb] space-y-4">
                    <h4 className="text-xs font-extrabold uppercase text-[#3730a3] tracking-wider">
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
                                className="w-full px-3 py-2 rounded-lg bg-white border border-[#b8ccc8] text-xs font-bold text-[#0f172a] placeholder-[#94a3b8] focus:outline-none focus:border-[#4338ca]"
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
                                className="w-full px-3 py-2 rounded-lg bg-white border border-[#b8ccc8] text-xs font-bold text-[#0f172a] placeholder-[#94a3b8] focus:outline-none focus:border-[#4338ca]"
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
                                className="w-full px-3 py-2 rounded-lg bg-white border border-[#b8ccc8] text-xs font-bold text-[#0f172a] placeholder-[#94a3b8] focus:outline-none focus:border-[#4338ca]"
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
                                className="w-full px-3 py-2 rounded-lg bg-white border border-[#b8ccc8] text-xs font-bold text-[#0f172a] placeholder-[#94a3b8] focus:outline-none focus:border-[#4338ca]"
                            />
                        </div>
                    </div>

                    <div className="flex justify-end">
                        <button
                            type="submit"
                            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#4338ca] hover:bg-[#3730a3] text-white text-xs font-extrabold transition-all shadow-xs cursor-pointer"
                        >
                            <Plus className="w-4 h-4" />
                            <span>Add Constraint Badge</span>
                        </button>
                    </div>
                </form>

                {/* Constraint Chip System */}
                <div>
                    <h4 className="text-xs font-extrabold uppercase text-[#3730a3] tracking-wider mb-3">
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
                                        className="p-3.5 rounded-xl bg-white border border-[#b8ccc8] flex flex-wrap items-center justify-between gap-3 hover:border-[#4338ca] transition-all shadow-2xs"
                                    >
                                        <div className="flex flex-wrap items-center gap-2">
                                            {/* Group Badge */}
                                            <span className="px-2.5 py-1 rounded-md bg-[#eef2ff] text-[#3730a3] border border-[#c7d2fe] font-extrabold text-xs">
                                                {item.groupName}
                                            </span>

                                            {/* Days Badge */}
                                            <span className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-[#ebf4f2] text-[#334155] text-xs font-bold">
                                                <Calendar className="w-3 h-3 text-[#3730a3]" />
                                                {daysText}
                                            </span>

                                            {/* Time Slot Badge */}
                                            <span className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-[#ebf4f2] text-[#334155] text-xs font-bold">
                                                <Clock className="w-3 h-3 text-[#3730a3]" />
                                                {item.slotTime}
                                            </span>

                                            {/* Course Badge */}
                                            <span className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-[#ebf4f2] text-[#0f172a] text-xs font-bold">
                                                <BookOpen className="w-3 h-3 text-[#4338ca]" />
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
