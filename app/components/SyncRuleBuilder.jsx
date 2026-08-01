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
        <div className="rounded-2xl bg-white border border-[#b8ccc8] shadow-xs overflow-hidden">
            <div className="px-6 py-4 bg-[#ebf4f2] border-b border-[#b8ccc8] flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-[#ccfbf1] border border-[#99f6e4] flex items-center justify-center text-[#0f766e]">
                        <Link2 className="w-4 h-4" />
                    </div>
                    <div>
                        <h3 className="text-sm font-extrabold text-[#0f172a]">
                            Same-Slot Elective Synchronization Rules
                        </h3>
                        <p className="text-[11px] text-[#64748b] font-medium">
                            Force parallel elective choices to lock into identical time slots automatically
                        </p>
                    </div>
                </div>
                <span className="px-2.5 py-1 text-[11px] font-extrabold rounded-md bg-[#ccfbf1] text-[#0f766e] border border-[#99f6e4]">
                    {syncRules.length} Sync Groups
                </span>
            </div>

            <div className="p-6 space-y-6">
                <form onSubmit={handleAddRule} className="p-4 rounded-xl bg-[#ebf4f2]/60 border border-[#b8ccc8] space-y-4">
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
                            className="w-full max-w-md px-3 py-2 rounded-lg bg-white border border-[#b8ccc8] text-xs font-bold text-[#0f172a] placeholder-[#94a3b8] focus:outline-none focus:border-[#0d9488]"
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
                                                ? "bg-[#0d9488] text-white shadow-2xs"
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
                            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#0d9488] hover:bg-[#0f766e] disabled:opacity-50 text-white text-xs font-bold transition-all shadow-2xs cursor-pointer"
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
                                    <h5 className="text-xs font-extrabold text-[#0f766e] mb-1 flex items-center gap-1">
                                        <Zap className="w-3.5 h-3.5 text-[#0d9488]" />
                                        <span>{rule.groupName}</span>
                                    </h5>
                                    <div className="flex flex-wrap gap-1.5">
                                        {rule.courses.map((c, i) => (
                                            <span
                                                key={i}
                                                className="px-2 py-0.5 rounded bg-[#ccfbf1] text-[#0f766e] border border-[#99f6e4] text-[11px] font-bold"
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
