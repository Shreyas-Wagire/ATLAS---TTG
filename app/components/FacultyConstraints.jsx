"use client";

import React, { useState } from "react";
import { UserCheck, Plus, Trash2, Clock, Calendar, ShieldAlert, Sun, Sunset, Sunrise } from "lucide-react";

const DAYS_OPTIONS = [
    { value: "ALL", label: "All Days (Mon–Fri)" },
    { value: "Monday", label: "Monday" },
    { value: "Tuesday", label: "Tuesday" },
    { value: "Wednesday", label: "Wednesday" },
    { value: "Thursday", label: "Thursday" },
    { value: "Friday", label: "Friday" },
];

const SESSION_OPTIONS = [
    {
        value: "morning",
        label: "Morning Session",
        time: "9:15 AM – 11:15 AM",
        slots: "Slots 0–1",
        icon: Sunrise,
        color: "bg-amber-50 text-amber-800 border-amber-200",
        dotColor: "bg-amber-400",
    },
    {
        value: "midday",
        label: "Midday Session",
        time: "11:30 AM – 1:30 PM",
        slots: "Slots 2–3",
        icon: Sun,
        color: "bg-blue-50 text-blue-800 border-blue-200",
        dotColor: "bg-blue-400",
    },
    {
        value: "afternoon",
        label: "Afternoon Session",
        time: "2:15 PM – 4:15 PM",
        slots: "Slots 4–5",
        icon: Sunset,
        color: "bg-teal-50 text-teal-800 border-teal-200",
        dotColor: "bg-teal-400",
    },
];

const SESSION_STYLE = {
    morning:   { badge: "bg-amber-100 text-amber-900 border border-amber-300", icon: Sunrise },
    midday:    { badge: "bg-blue-100 text-blue-900 border border-blue-300", icon: Sun },
    afternoon: { badge: "bg-teal-100 text-teal-900 border border-teal-300", icon: Sunset },
};

export default function FacultyConstraints({ facultyConstraints = [], setFacultyConstraints }) {
    const [facultyName, setFacultyName] = useState("");
    const [day, setDay] = useState("ALL");
    const [session, setSession] = useState("morning");
    const [type, setType] = useState("not_available");

    const handleAdd = (e) => {
        e.preventDefault();
        if (!facultyName.trim() || !session) return;

        // Prevent duplicate exact constraint
        const isDuplicate = facultyConstraints.some(
            (c) =>
                c.facultyName.trim().toLowerCase() === facultyName.trim().toLowerCase() &&
                c.day === day &&
                c.session === session &&
                c.type === type
        );
        if (isDuplicate) return;

        setFacultyConstraints([
            ...facultyConstraints,
            { facultyName: facultyName.trim(), day, session, type },
        ]);
        setFacultyName("");
        setDay("ALL");
        setSession("morning");
        setType("not_available");
    };

    const handleDelete = (index) => {
        setFacultyConstraints(facultyConstraints.filter((_, i) => i !== index));
    };

    const groupedByFaculty = facultyConstraints.reduce((acc, c, idx) => {
        const key = c.facultyName;
        if (!acc[key]) acc[key] = [];
        acc[key].push({ ...c, _idx: idx });
        return acc;
    }, {});

    return (
        <div className="rounded-2xl bg-white border border-[#b8ccc8] shadow-2xs overflow-hidden">
            {/* Header */}
            <div className="px-4 sm:px-6 py-4 bg-[#ebf4f2] border-b border-[#b8ccc8] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-[#ccfbf1] border border-[#99f6e4] flex items-center justify-center text-[#0f766e]">
                        <UserCheck className="w-4 h-4" />
                    </div>
                    <div>
                        <h3 className="text-sm font-extrabold text-[#0f172a]">
                            Faculty Availability Constraints
                        </h3>
                        <p className="text-[11px] text-[#64748b] font-medium">
                            Block morning / midday / afternoon sessions for specific faculty — enforced during generation
                        </p>
                    </div>
                </div>
                <span className="px-2.5 py-1 text-[11px] font-extrabold rounded-md bg-[#ccfbf1] text-[#0f766e] border border-[#99f6e4]">
                    {facultyConstraints.length} Constraint{facultyConstraints.length !== 1 ? "s" : ""}
                </span>
            </div>

            <div className="p-4 sm:p-6 space-y-6">
                {/* Session Reference Guide */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {SESSION_OPTIONS.map((s) => {
                        const Icon = s.icon;
                        return (
                            <div key={s.value} className={`p-3 rounded-xl border text-xs font-bold flex items-center gap-3 ${s.color}`}>
                                <Icon className="w-5 h-5 shrink-0" />
                                <div>
                                    <div className="font-extrabold">{s.label}</div>
                                    <div className="font-medium opacity-75">{s.time}</div>
                                    <div className="font-medium opacity-60 text-[10px]">{s.slots}</div>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Add Constraint Form */}
                <form onSubmit={handleAdd} className="p-4 rounded-xl bg-[#ebf4f2]/60 border border-[#b8ccc8] space-y-4">
                    <h4 className="text-xs font-extrabold uppercase text-[#0f766e] tracking-wider">
                        Add Faculty Availability Rule
                    </h4>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                        {/* Faculty Name */}
                        <div className="lg:col-span-1">
                            <label className="block text-[11px] font-bold text-[#64748b] mb-1">
                                Faculty Name
                            </label>
                            <input
                                type="text"
                                placeholder="e.g. Prof. Sharma, HOD"
                                value={facultyName}
                                onChange={(e) => setFacultyName(e.target.value)}
                                className="w-full px-3 py-2 rounded-lg bg-white border border-[#b8ccc8] text-xs font-bold text-[#0f172a] placeholder-[#94a3b8] focus:outline-none focus:border-[#0d9488] transition-colors"
                                required
                            />
                        </div>

                        {/* Day */}
                        <div>
                            <label className="block text-[11px] font-bold text-[#64748b] mb-1">
                                Day
                            </label>
                            <select
                                value={day}
                                onChange={(e) => setDay(e.target.value)}
                                className="w-full px-3 py-2 rounded-lg bg-white border border-[#b8ccc8] text-xs font-bold text-[#0f172a] focus:outline-none focus:border-[#0d9488] transition-colors cursor-pointer"
                            >
                                {DAYS_OPTIONS.map((d) => (
                                    <option key={d.value} value={d.value}>{d.label}</option>
                                ))}
                            </select>
                        </div>

                        {/* Session */}
                        <div>
                            <label className="block text-[11px] font-bold text-[#64748b] mb-1">
                                Unavailable Session
                            </label>
                            <select
                                value={session}
                                onChange={(e) => setSession(e.target.value)}
                                className="w-full px-3 py-2 rounded-lg bg-white border border-[#b8ccc8] text-xs font-bold text-[#0f172a] focus:outline-none focus:border-[#0d9488] transition-colors cursor-pointer"
                            >
                                {SESSION_OPTIONS.map((s) => (
                                    <option key={s.value} value={s.value}>
                                        {s.label} ({s.time})
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Type */}
                        <div>
                            <label className="block text-[11px] font-bold text-[#64748b] mb-1">
                                Constraint Type
                            </label>
                            <select
                                value={type}
                                onChange={(e) => setType(e.target.value)}
                                className="w-full px-3 py-2 rounded-lg bg-white border border-[#b8ccc8] text-xs font-bold text-[#0f172a] focus:outline-none focus:border-[#0d9488] transition-colors cursor-pointer"
                            >
                                <option value="not_available">Not Available (Hard Block)</option>
                                <option value="preferred">Prefer to Avoid (Soft Hint)</option>
                            </select>
                        </div>
                    </div>

                    <div className="flex justify-end">
                        <button
                            type="submit"
                            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#0d9488] hover:bg-[#0f766e] text-white text-xs font-extrabold transition-all shadow-xs cursor-pointer"
                        >
                            <Plus className="w-4 h-4" />
                            <span>Add Availability Rule</span>
                        </button>
                    </div>
                </form>

                {/* Active Constraints Grouped by Faculty */}
                <div>
                    <h4 className="text-xs font-extrabold uppercase text-[#0f766e] tracking-wider mb-3">
                        Active Faculty Availability Rules
                    </h4>

                    {facultyConstraints.length === 0 ? (
                        <div className="p-6 rounded-xl bg-[#ebf4f2]/40 border border-[#b8ccc8] text-center text-[#64748b] text-xs font-medium">
                            No faculty availability rules configured yet. Add one above to block specific sessions for HOD, part-time, or late-arriving faculty.
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {Object.entries(groupedByFaculty).map(([name, rules]) => (
                                <div
                                    key={name}
                                    className="rounded-xl bg-white border border-[#b8ccc8] shadow-2xs overflow-hidden"
                                >
                                    {/* Faculty Name Header */}
                                    <div className="px-4 py-2.5 bg-[#ebf4f2] border-b border-[#b8ccc8] flex items-center gap-2">
                                        <div className="w-5 h-5 rounded-full bg-[#0d9488] flex items-center justify-center text-white text-[9px] font-extrabold">
                                            {name.charAt(0).toUpperCase()}
                                        </div>
                                        <span className="text-xs font-extrabold text-[#0f172a]">{name}</span>
                                        <span className="ml-auto px-2 py-0.5 text-[10px] font-extrabold rounded bg-[#ccfbf1] text-[#0f766e] border border-[#99f6e4]">
                                            {rules.length} rule{rules.length !== 1 ? "s" : ""}
                                        </span>
                                    </div>

                                    {/* Rules List */}
                                    <div className="divide-y divide-[#ebf4f2]">
                                        {rules.map((rule) => {
                                            const sessStyle = SESSION_STYLE[rule.session] || SESSION_STYLE.morning;
                                            const SessIcon = sessStyle.icon;
                                            const dayLabel = rule.day === "ALL" ? "All Days (Mon–Fri)" : rule.day;
                                            return (
                                                <div
                                                    key={rule._idx}
                                                    className="px-4 py-3 flex flex-wrap items-center justify-between gap-2"
                                                >
                                                    <div className="flex flex-wrap items-center gap-2">
                                                        {/* Session Badge */}
                                                        <span className={`flex items-center gap-1 px-2.5 py-1 text-[10px] font-extrabold rounded-md ${sessStyle.badge}`}>
                                                            <SessIcon className="w-3 h-3" />
                                                            <span>{rule.session.charAt(0).toUpperCase() + rule.session.slice(1)} Session</span>
                                                        </span>
                                                        {/* Day Badge */}
                                                        <span className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-[#ebf4f2] text-[#334155] text-[10px] font-bold">
                                                            <Calendar className="w-3 h-3 text-[#0f766e]" />
                                                            {dayLabel}
                                                        </span>
                                                        {/* Type Badge */}
                                                        <span className={`flex items-center gap-1 px-2.5 py-1 text-[10px] font-extrabold rounded-md ${
                                                            rule.type === "not_available"
                                                                ? "bg-red-50 text-red-800 border border-red-200"
                                                                : "bg-yellow-50 text-yellow-800 border border-yellow-200"
                                                        }`}>
                                                            {rule.type === "not_available" ? (
                                                                <><ShieldAlert className="w-3 h-3 text-red-600" /> Hard Block</>
                                                            ) : (
                                                                <><ShieldAlert className="w-3 h-3 text-yellow-600" /> Soft Hint</>
                                                            )}
                                                        </span>
                                                    </div>
                                                    <button
                                                        onClick={() => handleDelete(rule._idx)}
                                                        className="p-1.5 rounded-md hover:bg-red-50 text-[#64748b] hover:text-red-600 transition-colors cursor-pointer"
                                                        title="Remove Rule"
                                                    >
                                                        <Trash2 className="w-3.5 h-3.5" />
                                                    </button>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
