"use client";

import React, { useState, useMemo } from "react";
import { Search, ChevronDown } from "lucide-react";

export default function BatchTimetableGrid({ timetable, timetableObj }) {
    const activeTimetable = timetable || timetableObj;
    const [selectedYear, setSelectedYear] = useState("ALL");
    const [selectedBatch, setSelectedBatch] = useState("ALL");
    const [searchQuery, setSearchQuery] = useState("");

    if (!activeTimetable || Object.keys(activeTimetable).length === 0) {
        return null;
    }

    const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
    const slots = [
        "9:15 - 10:15",
        "10:15 - 11:15",
        "11:30 - 12:30",
        "12:30 - 1:30",
        "2:15 - 3:15",
        "3:15 - 4:15",
    ];

    const yearGroupMap = {};
    Object.keys(activeTimetable).forEach((divKey) => {
        const yearPrefix = divKey.split("-")[0] || divKey;
        if (!yearGroupMap[yearPrefix]) yearGroupMap[yearPrefix] = [];

        const divData = activeTimetable[divKey];
        days.forEach((day) => {
            (divData[day] || []).forEach((session) => {
                if (session && session.batchAllocations) {
                    session.batchAllocations.forEach((alloc) => {
                        if (alloc.batch && !yearGroupMap[yearPrefix].includes(alloc.batch)) {
                            yearGroupMap[yearPrefix].push(alloc.batch);
                        }
                    });
                }
            });
        });
    });

    const yearKeys = Object.keys(yearGroupMap);

    const activeBatches = useMemo(() => {
        const rawBatches =
            selectedYear === "ALL"
                ? Object.values(yearGroupMap).flat()
                : yearGroupMap[selectedYear] || [];

        if (!searchQuery.trim()) return rawBatches;
        const q = searchQuery.toLowerCase();
        return rawBatches.filter((b) => b.toLowerCase().includes(q));
    }, [yearGroupMap, selectedYear, searchQuery]);

    const highlightText = (text, query) => {
        if (!query || !text) return text;
        const strText = String(text);
        const q = query.trim();
        if (!q) return strText;

        const regex = new RegExp(`(${q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "gi");
        const parts = strText.split(regex);

        return parts.map((part, i) =>
            part.toLowerCase() === q.toLowerCase() ? (
                <mark key={i} className="bg-amber-300 text-[#0f172a] px-0.5 rounded font-extrabold shadow-2xs">
                    {part}
                </mark>
            ) : (
                part
            )
        );
    };

    const getSessionCellStyle = (session) => {
        if (!session) return "bg-white text-[#64748B]";

        if (session.fixed) {
            return "bg-[#FEF2F2] text-[#991B1B]";
        }

        if (session.syncGroupId || session.isSync || session.isElective) {
            return "bg-[#ECFDF5] text-[#065F46]";
        }

        if (session.type === "PRACTICAL" || session.type === "LAB") {
            return "bg-[#E6F4F1] text-[#0F766E]";
        }

        return "bg-[#F3E8FF] text-[#5B21B6]";
    };

    const activeHighlightQuery = searchQuery.trim() || (selectedBatch !== "ALL" ? selectedBatch : "");

    return (
        <div className="space-y-4">
            {/* Searchable Dropdown & Color Legend */}
            <div className="p-3 rounded-xl bg-[#EBF4F2] border border-[#D3E6E2] space-y-2.5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex flex-wrap items-center gap-3">
                        <div className="relative flex items-center min-w-[200px]">
                            <Search className="w-3.5 h-3.5 absolute left-3 text-[#64748B] pointer-events-none" />
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Search Batch (e.g. S1, T1)..."
                                className="w-full pl-9 pr-3 py-1.5 bg-white border border-[#D3E6E2] rounded-lg text-xs font-bold text-[#0F172A] focus:outline-none focus:border-[#0D9488] shadow-2xs"
                            />
                        </div>

                        <div className="relative flex items-center">
                            <select
                                value={selectedYear}
                                onChange={(e) => {
                                    setSelectedYear(e.target.value);
                                    setSelectedBatch("ALL");
                                }}
                                className="pl-3 pr-8 py-1.5 bg-white border border-[#D3E6E2] rounded-lg text-xs font-bold text-[#0F172A] appearance-none cursor-pointer focus:outline-none focus:border-[#0D9488] shadow-2xs"
                            >
                                <option value="ALL">All Academic Years</option>
                                {yearKeys.map((yKey) => (
                                    <option key={yKey} value={yKey}>
                                        {yKey} ({yearGroupMap[yKey]?.length || 0})
                                    </option>
                                ))}
                            </select>
                            <ChevronDown className="w-3.5 h-3.5 absolute right-2.5 text-[#64748B] pointer-events-none" />
                        </div>

                        <div className="relative flex items-center">
                            <select
                                value={selectedBatch}
                                onChange={(e) => setSelectedBatch(e.target.value)}
                                className="pl-3 pr-8 py-1.5 bg-white border border-[#D3E6E2] rounded-lg text-xs font-bold text-[#0F172A] appearance-none cursor-pointer focus:outline-none focus:border-[#0D9488] shadow-2xs"
                            >
                                <option value="ALL">All Batches ({activeBatches.length})</option>
                                {activeBatches.map((bName) => (
                                    <option key={bName} value={bName}>
                                        {bName}
                                    </option>
                                ))}
                            </select>
                            <ChevronDown className="w-3.5 h-3.5 absolute right-2.5 text-[#64748B] pointer-events-none" />
                        </div>

                        {searchQuery && (
                            <button
                                onClick={() => setSearchQuery("")}
                                className="text-[11px] font-bold text-[#0F766E] hover:underline"
                            >
                                Clear
                            </button>
                        )}
                    </div>

                    <div className="flex flex-wrap items-center gap-2 text-[10px] font-bold">
                        <span className="px-2 py-0.5 rounded bg-[#EBF5FF] text-[#1E40AF] border border-blue-200">
                            Normal
                        </span>
                        <span className="px-2 py-0.5 rounded bg-[#E6F4F1] text-[#0F766E] border border-teal-200">
                            Lab
                        </span>
                        <span className="px-2 py-0.5 rounded bg-[#F3E8FF] text-[#5B21B6] border border-purple-200">
                            Tut
                        </span>
                        <span className="px-2 py-0.5 rounded bg-[#ECFDF5] text-[#065F46] border border-emerald-200">
                            Sync
                        </span>
                        <span className="px-2 py-0.5 rounded bg-[#FEF2F2] text-[#991B1B] border border-red-200">
                            Fix
                        </span>
                    </div>
                </div>
            </div>

            {/* Table Matrix */}
            {activeBatches
                .filter((b) => selectedBatch === "ALL" || b === selectedBatch)
                .map((batchName) => {
                    return (
                        <div
                            key={batchName}
                            className="rounded-xl bg-white border border-[#D3E6E2] overflow-hidden shadow-2xs"
                        >
                            <div className="px-4 py-2.5 bg-[#EBF4F2] border-b border-[#D3E6E2] flex items-center justify-between">
                                <h3 className="text-xs font-extrabold text-[#0F172A]">
                                    Batch Matrix • {highlightText(batchName, activeHighlightQuery)}
                                </h3>
                                <span className="px-2 py-0.5 text-[9.5px] font-extrabold rounded-full bg-[#CCFBF1] text-[#0F766E] border border-[#99F6E4]">
                                    {batchName}
                                </span>
                            </div>

                            <div className="overflow-x-auto">
                                <table className="w-full border-collapse table-fixed min-w-[750px] text-xs">
                                    <thead>
                                        <tr className="bg-[#EBF4F2]/70 text-[#64748B] border-b border-[#D3E6E2]">
                                            <th className="py-2 px-2 font-bold text-left w-24 border-r border-[#D3E6E2]">
                                                Slot
                                            </th>
                                            {days.map((day) => (
                                                <th key={day} className="py-2 px-2 font-bold text-center border-r border-[#D3E6E2] last:border-r-0 w-[18.4%]">
                                                    {day}
                                                </th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-[#D3E6E2]">
                                        {slots.map((slotTime, slotIndex) => (
                                            <tr key={slotIndex}>
                                                <td className="py-1.5 px-2 font-bold text-[#64748B] bg-[#EBF4F2]/30 border-r border-[#D3E6E2] whitespace-nowrap text-[10.5px]">
                                                    {slotTime}
                                                </td>

                                                {days.map((day) => {
                                                    let matchedAlloc = null;
                                                    let matchedSession = null;

                                                    Object.keys(activeTimetable).forEach((divKey) => {
                                                        const s = activeTimetable[divKey]?.[day]?.[slotIndex];
                                                        if (s && s.batchAllocations) {
                                                            const alloc = s.batchAllocations.find((a) => a.batch === batchName);
                                                            if (alloc) {
                                                                matchedAlloc = alloc;
                                                                matchedSession = s;
                                                            }
                                                        }
                                                    });

                                                    const cellStyle = getSessionCellStyle(matchedSession || (matchedAlloc ? { type: "PRACTICAL" } : null));

                                                    return (
                                                        <td
                                                            key={day}
                                                            className={`p-2 border-r border-[#D3E6E2] last:border-r-0 align-middle text-center h-14 w-[18.4%] break-words whitespace-normal ${cellStyle}`}
                                                        >
                                                            {matchedAlloc ? (
                                                                <div className="text-[10.5px] font-bold leading-snug text-center">
                                                                    {highlightText(batchName, activeHighlightQuery)} / {highlightText(matchedAlloc.subject, activeHighlightQuery)} / {highlightText(matchedAlloc.faculty, activeHighlightQuery)} / {highlightText(matchedAlloc.location || "LAB", activeHighlightQuery)}
                                                                </div>
                                                            ) : (
                                                                <div className="h-full flex items-center justify-center text-[#D3E6E2] font-mono text-[10px]">
                                                                    —
                                                                </div>
                                                            )}
                                                        </td>
                                                    );
                                                })}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    );
                })}
        </div>
    );
}
