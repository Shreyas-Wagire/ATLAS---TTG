"use client";

import React, { useState } from "react";
import { Link2, Plus, Trash2, Check, Zap } from "lucide-react";

export default function SyncRuleBuilder({ subjects = [], syncRules = [], setSyncRules }) {
    const [groupName, setGroupName] = useState("");
    const [selectedCourses, setSelectedCourses] = useState([]);

    const uniqueCourseNames = Array.from(
        new Set(subjects.map((s) => s.subject || s.subjectName || s.name).filter(Boolean))
    );

    const toggleCourse = (cName) => {
        if (selectedCourses.includes(cName)) {
            setSelectedCourses(selectedCourses.filter((c) => c !== cName));
        } else {
            setSelectedCourses([...selectedCourses, cName]);
        }
    };

    const handleAddRule = (e) => {
        e.preventDefault();
        if (!groupName || selectedCourses.length < 2) return;

        const newRule = {
            groupName,
            courses: selectedCourses,
        };

        setSyncRules([...syncRules, newRule]);
        setGroupName("");
        setSelectedCourses([]);
    };

    const handleDeleteRule = (idx) => {
        setSyncRules(syncRules.filter((_, i) => i !== idx));
    };

    return (
        <div className="atlas-settings-card rounded-[22px] bg-white border border-[#e1e9e6] shadow-[0_12px_40px_-32px_rgba(20,57,51,0.3)] overflow-hidden">
            <div className="px-5 sm:px-6 py-5 bg-white border-b border-[#edf1ef] flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-[#edf6f3] border border-[#dcebe6] flex items-center justify-center text-[#3730a3]">
                        <Link2 className="w-4 h-4" />
                    </div>
                    <div>
                        <h3 className="text-sm font-bold tracking-tight text-[#142d2a]">
                            Same-Slot Elective Synchronization Rules
                        </h3>
                        <p className="text-xs text-[#71817d] mt-0.5">
                            Force parallel elective choices to lock into identical time slots automatically
                        </p>
                    </div>
                </div>
                <span className="px-2.5 py-1.5 text-xs font-semibold rounded-lg bg-[#f1f7f4] text-[#3e6c5e] border border-[#dcebe3]">
                    {syncRules.length} Sync Groups
                </span>
            </div>

            <div className="p-6 space-y-6">
                <form onSubmit={handleAddRule} className="p-5 rounded-2xl bg-[#f7f9f8] border border-[#e7eeeb] space-y-4">
                    <h4 className="text-xs font-bold uppercase text-[#64748b] tracking-wider">
                        Configure Elective Parallel Group
                    </h4>

                    <div>
                        <label className="block text-[11px] font-bold text-[#475569] mb-1">
                            Elective Group Identifier
                        </label>
                        <input
                            type="text"
                            placeholder="e.g. Open Elective III Group"
                            value={groupName}
                            onChange={(e) => setGroupName(e.target.value)}
                            className="w-full max-w-md px-3 py-2 rounded-lg bg-white border border-[#b8ccc8] text-xs font-bold text-[#0f172a] placeholder-[#94a3b8] focus:outline-none focus:border-[#4338ca]"
                        />
                    </div>

                    <div>
                        <label className="block text-[11px] font-bold text-[#475569] mb-2">
                            Select Parallel Courses (Must Select 2 or More)
                        </label>
                        <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto p-2 rounded-lg bg-white border border-[#b8ccc8]">
                            {uniqueCourseNames.map((cName) => {
                                const isSelected = selectedCourses.includes(cName);
                                return (
                                    <button
                                        type="button"
                                        key={cName}
                                        onClick={() => toggleCourse(cName)}
                                        className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
                                            isSelected
                                                ? "bg-[#4338ca] text-white shadow-2xs"
                                                : "bg-[#ebf4f2] text-[#475569] hover:bg-[#d6e2df] border border-[#b8ccc8]"
                                        }`}
                                    >
                                        {isSelected && <Check className="w-3 h-3" />}
                                        <span>{cName}</span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    <div className="flex justify-end">
                        <button
                            type="submit"
                            disabled={!groupName || selectedCourses.length < 2}
                            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#4338ca] hover:bg-[#3730a3] disabled:opacity-50 text-white text-xs font-bold transition-all shadow-2xs cursor-pointer"
                        >
                            <Plus className="w-4 h-4" />
                            <span>Create Parallel Sync Rule</span>
                        </button>
                    </div>
                </form>

                {/* Active Rules List */}
                <div className="space-y-3">
                    <h4 className="text-xs font-bold uppercase text-[#64748b] tracking-wider">
                        Active Synchronization Groups
                    </h4>
                    {syncRules.length === 0 ? (
                        <div className="p-6 rounded-xl bg-[#ebf4f2]/50 border border-[#b8ccc8] text-center text-[#64748b] text-xs font-medium">
                            No synchronization groups created. Select 2+ courses above to link them.
                        </div>
                    ) : (
                        syncRules.map((rule, idx) => (
                            <div
                                key={idx}
                                className="p-4 rounded-xl bg-white border border-[#b8ccc8] flex items-center justify-between gap-4 shadow-2xs"
                            >
                                <div>
                                    <h5 className="text-xs font-extrabold text-[#3730a3] mb-1 flex items-center gap-1">
                                        <Zap className="w-3.5 h-3.5 text-[#4338ca]" />
                                        <span>{rule.groupName}</span>
                                    </h5>
                                    <div className="flex flex-wrap gap-1.5">
                                        {rule.courses.map((c, i) => (
                                            <span
                                                key={i}
                                                className="px-2 py-0.5 rounded bg-[#eef2ff] text-[#3730a3] border border-[#c7d2fe] text-[11px] font-bold"
                                            >
                                                {c}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                                <button
                                    onClick={() => handleDeleteRule(idx)}
                                    className="p-1.5 rounded-md hover:bg-red-50 text-[#64748b] hover:text-red-600 transition-colors"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}
