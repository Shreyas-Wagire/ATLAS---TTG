"use client";

import React, { useState, useMemo } from "react";
import { Search, ChevronDown, Coffee, Utensils, Info } from "lucide-react";

export default function TimetableGrid({ timetable, timetableObj }) {
    const activeTimetable = timetable || timetableObj;
    const [selectedClass, setSelectedClass] = useState("ALL");
    const [searchQuery, setSearchQuery] = useState("");
    const [tooltip, setTooltip] = useState(null); // { x, y, content }

    const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
    const slots = [
        "9.15 - 10.15 AM",
        "10.15 - 11.15 AM",
        "11.30 - 12.30 PM",
        "12.30 - 1.30 PM",
        "2.15 - 3.15 PM",
        "3.15 - 4.15 PM",
    ];

    const availableClasses = useMemo(
        () => (activeTimetable ? Object.keys(activeTimetable) : []),
        [activeTimetable]
    );

    const filteredClasses = useMemo(() => {
        if (!searchQuery.trim()) return availableClasses;
        const q = searchQuery.toLowerCase();
        return availableClasses.filter((cls) => cls.toLowerCase().includes(q));
    }, [availableClasses, searchQuery]);

    if (!activeTimetable || Object.keys(activeTimetable).length === 0) {
        return null;
    }

    const displayClasses =
        selectedClass === "ALL"
            ? filteredClasses
            : availableClasses.filter((c) => c === selectedClass);

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

        if (session.type === "TUTORIAL" || session.type === "TUT") {
            return "bg-[#F3E8FF] text-[#5B21B6]";
        }

        return "bg-[#EBF5FF] text-[#1E40AF]";
    };

    // Format the lab display string cleanly without cryptic symbols
    function formatLabDisplay(alloc) {
        const lab     = alloc?.labAssignedInitial || alloc?.location || alloc?.primaryLabInitial || "";
        const status  = alloc?.labAssignedStatus  || "";
        if (status === "UNRESOLVED") return "No Lab";
        if (!lab || lab === "TBD") return "LAB";
        return lab;
    }

    // Get badge colour for lab status
    function getLabStatusBadgeStyle(status) {
        if (status === "FALLBACK")   return "bg-amber-100 text-amber-800 border-amber-300";
        if (status === "MANUAL")     return "bg-purple-100 text-purple-800 border-purple-300";
        if (status === "UNRESOLVED") return "bg-red-100 text-red-700 border-red-300";
        if (status === "UNMAPPED")   return "bg-orange-100 text-orange-700 border-orange-300";
        return ""; // MAPPED: no badge
    }

    // Build tooltip content for a batch allocation
    function buildAllocTooltip(alloc) {
        if (!alloc) return null;
        const status      = alloc.labAssignedStatus  || "MAPPED";
        const primaryLab  = alloc.primaryLabInitial  || alloc.labAssignedInitial || alloc.location || "-";
        const assignedLab = alloc.labAssignedInitial || alloc.location || "-";
        const reason      = alloc.labAssignedReason  || "";
        return {
            course:     alloc.subjectName || alloc.subject || "-",
            faculty:    alloc.faculty || "-",
            primaryLab,
            assignedLab,
            status,
            reason,
        };
    }

    const activeHighlightQuery = searchQuery.trim() || (selectedClass !== "ALL" ? selectedClass : "");

    return (
        <div className="space-y-4" onClick={() => setTooltip(null)}>
            {/* Searchable Dropdown & Color Legend */}
            <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl bg-[#EBF4F2] border border-[#D3E6E2]">
                <div className="flex flex-wrap items-center gap-3">
                    <div className="relative flex items-center min-w-[220px]">
                        <Search className="w-3.5 h-3.5 absolute left-3 text-[#64748B] pointer-events-none" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search Course, Faculty, Room..."
                            className="w-full pl-9 pr-3 py-1.5 bg-white border border-[#D3E6E2] rounded-lg text-xs font-bold text-[#0F172A] focus:outline-none focus:border-[#0D9488] shadow-2xs"
                        />
                    </div>

                    <div className="relative flex items-center">
                        <select
                            value={selectedClass}
                            onChange={(e) => setSelectedClass(e.target.value)}
                            className="pl-3 pr-8 py-1.5 bg-white border border-[#D3E6E2] rounded-lg text-xs font-bold text-[#0F172A] appearance-none cursor-pointer focus:outline-none focus:border-[#0D9488] shadow-2xs"
                        >
                            <option value="ALL">View All Divisions ({availableClasses.length})</option>
                            {filteredClasses.map((clsKey) => (
                                <option key={clsKey} value={clsKey}>
                                    {clsKey}
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
                            Clear Filter
                        </button>
                    )}
                </div>

                {/* Color Legend Bar */}
                <div className="flex flex-wrap items-center gap-2 text-[10px] font-bold">
                    <span className="px-2 py-0.5 rounded bg-[#EBF5FF] text-[#1E40AF] border border-blue-200">
                        Normal
                    </span>
                    <span className="px-2 py-0.5 rounded bg-[#E6F4F1] text-[#0F766E] border border-teal-200">
                        Lab (Merged 2-Slot)
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
                    {/* Lab status legend */}
                    <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-800 border border-amber-300">
                        Fallback Lab
                    </span>
                    <span className="px-2 py-0.5 rounded bg-purple-100 text-purple-800 border border-purple-300">
                        Manual Lab
                    </span>
                    <span className="px-2 py-0.5 rounded bg-red-100 text-red-700 border border-red-300">
                        Unresolved Lab
                    </span>
                </div>
            </div>

            {/* v5.5: Lab status tooltip overlay */}
            {tooltip && (
                <div
                    className="fixed z-50 max-w-xs rounded-xl border border-[#D3E6E2] bg-white shadow-xl p-3 text-xs space-y-1"
                    style={{ top: tooltip.y + 8, left: Math.min(tooltip.x, window.innerWidth - 260) }}
                    onClick={(e) => e.stopPropagation()}
                >
                    <div className="font-extrabold text-[#0f172a] text-[11px] pb-1 border-b border-[#E6EEF0]">
                        Lab Resource Details
                    </div>
                    <div className="space-y-0.5 text-[10.5px]">
                        <div><span className="font-bold text-[#64748b]">Course:</span> {tooltip.content.course}</div>
                        <div><span className="font-bold text-[#64748b]">Faculty:</span> {tooltip.content.faculty}</div>
                        <div><span className="font-bold text-[#64748b]">Primary Lab:</span> <span className="font-bold text-[#0f766e]">{tooltip.content.primaryLab}</span></div>
                        <div><span className="font-bold text-[#64748b]">Assigned Lab:</span> <span className="font-bold text-[#0f766e]">{tooltip.content.assignedLab}</span></div>
                        <div>
                            <span className="font-bold text-[#64748b]">Status:</span>{" "}
                            <span className={`px-1.5 py-0.5 rounded text-[9.5px] font-extrabold border ${
                                tooltip.content.status === "FALLBACK" ? "bg-amber-100 text-amber-800 border-amber-300" :
                                tooltip.content.status === "MANUAL"   ? "bg-purple-100 text-purple-800 border-purple-300" :
                                tooltip.content.status === "UNRESOLVED" ? "bg-red-100 text-red-700 border-red-300" :
                                "bg-teal-100 text-teal-800 border-teal-300"
                            }`}>
                                {tooltip.content.status}
                            </span>
                        </div>
                        {tooltip.content.reason && (
                            <div className="text-[10px] text-[#64748b] pt-0.5 border-t border-[#E6EEF0] mt-1">
                                {tooltip.content.reason}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Direct Cell Colored Table Matrix */}
            {displayClasses.map((divisionKey) => {
                const divisionTable = activeTimetable[divisionKey];
                return (
                    <div
                        key={divisionKey}
                        className="rounded-xl bg-white border border-[#D3E6E2] overflow-hidden shadow-2xs"
                    >
                        <div className="px-4 py-2.5 bg-[#EBF4F2] border-b border-[#D3E6E2] flex items-center justify-between">
                            <h3 className="text-xs font-extrabold text-[#0F172A]">
                                Timetable Matrix | {highlightText(divisionKey, activeHighlightQuery)}
                            </h3>
                            <span className="px-2 py-0.5 text-[9.5px] font-extrabold rounded-full bg-[#CCFBF1] text-[#0F766E] border border-[#99F6E4]">
                                {divisionKey}
                            </span>
                        </div>

                        <div className="overflow-x-auto overscroll-x-contain touch-pan-x" tabIndex={0} aria-label="Scrollable weekly timetable">
                            <table className="w-full border-collapse table-fixed min-w-[850px] text-xs">
                                <thead>
                                    <tr className="bg-[#EBF4F2]/70 text-[#64748B] border-b border-[#D3E6E2]">
                                        <th className="py-2 px-2 font-bold text-left w-24 border-r border-[#D3E6E2]">
                                            Slot
                                        </th>
                                        <th className="py-2 px-2 font-bold text-center border-r border-[#D3E6E2] w-24">
                                            Division
                                        </th>
                                        {days.map((day) => (
                                            <th key={day} className="py-2 px-2 font-bold text-center border-r border-[#D3E6E2] last:border-r-0 w-[16.5%]">
                                                {day}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-[#D3E6E2]">
                                    {slots.map((slotTime, slotIndex) => (
                                        <React.Fragment key={slotIndex}>
                                            <tr>
                                                <td className="py-2 px-2 font-bold text-[#64748B] bg-[#EBF4F2]/30 border-r border-[#D3E6E2] whitespace-nowrap text-[10.5px]">
                                                    {slotTime}
                                                </td>

                                                {slotIndex === 0 && (
                                                    <td
                                                        rowSpan={8}
                                                        className="p-2 border-r border-[#D3E6E2] bg-[#EBF4F2]/40 font-extrabold text-[#0F172A] align-middle text-center text-xs"
                                                    >
                                                        {divisionKey}
                                                    </td>
                                                )}

                                                {days.map((day) => {
                                                    const session = divisionTable[day]?.[slotIndex];

                                                    if (session && session.span === 0) {
                                                        return null;
                                                    }

                                                    const isLab = session?.type === "PRACTICAL" || session?.type === "LAB";
                                                    const rowSpan = isLab || session?.span === 2 ? 2 : 1;
                                                    const cellStyle = getSessionCellStyle(session);

                                                    return (
                                                        <td
                                                            key={day}
                                                            rowSpan={rowSpan}
                                                            className={`p-2.5 border-r border-[#D3E6E2] last:border-r-0 align-middle text-center w-[16.5%] whitespace-normal break-words min-h-[56px] h-auto ${cellStyle}`}
                                                        >
                                                            {session ? (
                                                                isLab && session.batchAllocations && session.batchAllocations.length > 0 ? (
                                                                    <div className="space-y-1.5 text-center font-semibold">
                                                                        {(() => {
                                                                            const groupsMap = {};
                                                                            session.batchAllocations.forEach((alloc) => {
                                                                                const key = `${alloc.subject || session.subject}_${alloc.faculty || session.faculty}_${alloc.labAssignedInitial || alloc.location || ""}`;
                                                                                if (!groupsMap[key]) groupsMap[key] = [];
                                                                                groupsMap[key].push(alloc);
                                                                            });

                                                                            return Object.values(groupsMap).map((allocGroup, idx) => {
                                                                                const batchLabels = allocGroup.map((a) => a.batch).join(",");
                                                                                const first = allocGroup[0];
                                                                                const labDisplay = formatLabDisplay(first);
                                                                                const labStatus  = first?.labAssignedStatus || "MAPPED";
                                                                                const badgeStyle = getLabStatusBadgeStyle(labStatus);
                                                                                const tooltipData = buildAllocTooltip(first);

                                                                                return (
                                                                                    <div
                                                                                        key={idx}
                                                                                        className="text-[10.5px] font-bold leading-snug text-center border-b border-[#D3E6E2]/40 last:border-b-0 pb-1 last:pb-0"
                                                                                    >
                                                                                        <span className="font-extrabold">{highlightText(batchLabels, activeHighlightQuery)}</span>{" "}
                                                                                        {highlightText(first.subject, activeHighlightQuery)}{" "}
                                                                                        {highlightText(first.faculty, activeHighlightQuery)}{" "}
                                                                                        {/* Lab with clean status indicator */}
                                                                                        <span
                                                                                            className={`inline-flex items-center gap-1 cursor-pointer font-bold ${
                                                                                                badgeStyle ? `px-1.5 py-0.5 rounded border text-[9.5px] ${badgeStyle}` : "text-[#0F766E]"
                                                                                            }`}
                                                                                            onClick={(e) => {
                                                                                                e.stopPropagation();
                                                                                                if (tooltipData) {
                                                                                                    setTooltip({ x: e.clientX, y: e.clientY, content: tooltipData });
                                                                                                }
                                                                                            }}
                                                                                            title={labStatus !== "MAPPED" ? `${labStatus}: click for details` : ""}
                                                                                        >
                                                                                            <span>{highlightText(labDisplay, activeHighlightQuery)}</span>
                                                                                            {labStatus === "FALLBACK" && (
                                                                                                <span className="text-[8.5px] px-1 py-0.2 rounded font-semibold bg-amber-200/80 text-amber-900">
                                                                                                    Fallback
                                                                                                </span>
                                                                                            )}
                                                                                            {labStatus === "MANUAL" && (
                                                                                                <span className="text-[8.5px] px-1 py-0.2 rounded font-semibold bg-purple-200/80 text-purple-900">
                                                                                                    Manual
                                                                                                </span>
                                                                                            )}
                                                                                            {labStatus === "UNRESOLVED" && (
                                                                                                <span className="text-[8.5px] px-1 py-0.2 rounded font-semibold bg-red-200/80 text-red-900">
                                                                                                    No Lab
                                                                                                </span>
                                                                                            )}
                                                                                            {(labStatus === "FALLBACK" || labStatus === "MANUAL" || labStatus === "UNRESOLVED") && (
                                                                                                <Info className="w-2.5 h-2.5 inline opacity-60" />
                                                                                            )}
                                                                                        </span>
                                                                                    </div>
                                                                                );
                                                                            });
                                                                        })()}
                                                                        {/* Embedded TY/BTECH Tutorial Allocations (lab-merged) */}
                                                                        {session.tutorialAllocations && session.tutorialAllocations.length > 0 && (() => {
                                                                            const seen = new Set();
                                                                            const uniqueTuts = session.tutorialAllocations.filter((t) => {
                                                                                const k = `${t.batch}_${t.subject}`;
                                                                                if (seen.has(k)) return false;
                                                                                seen.add(k);
                                                                                return true;
                                                                            });
                                                                            return (
                                                                                <div className="mt-1 pt-1 border-t border-teal-300/50 space-y-0.5">
                                                                                    <span className="text-[8px] uppercase tracking-widest font-extrabold text-teal-700 opacity-80">Tutorial</span>
                                                                                    {uniqueTuts.map((tut, ti) => (
                                                                                        <div key={ti} className="text-[9.5px] font-semibold text-teal-900 leading-tight">
                                                                                            <span className="inline-flex items-center gap-0.5 bg-teal-100 border border-teal-300 rounded px-1 py-0.5 text-[8.5px] font-bold text-teal-800">TUT</span>
                                                                                            {" "}{tut.batch} {tut.subject} {tut.faculty}{tut.location ? ` · ${tut.location}` : ""}
                                                                                        </div>
                                                                                    ))}
                                                                                </div>
                                                                            );
                                                                        })()}
                                                                    </div>
                                                                ) : (
                                                                    <div className="text-[10.5px] font-bold leading-snug text-center">
                                                                        {highlightText(session.subject, activeHighlightQuery)}/{highlightText(session.faculty || "Prof", activeHighlightQuery)}/{highlightText(session.location || "CR3", activeHighlightQuery)}
                                                                    </div>
                                                                )
                                                            ) : (
                                                                <div className="h-full flex items-center justify-center text-[#D3E6E2] font-mono text-[10px]">
                                                                    -
                                                                </div>
                                                            )}
                                                        </td>
                                                    );
                                                })}
                                            </tr>

                                            {/* Full Row Merged Short Recess */}
                                            {slotIndex === 1 && (
                                                <tr className="bg-amber-50 text-amber-900 font-bold border-y border-amber-200">
                                                    <td colSpan={7} className="py-1.5 px-4 text-center text-xs tracking-widest uppercase font-extrabold bg-amber-100/70">
                                                        <span className="inline-flex items-center gap-1.5">
                                                            <Coffee className="w-3.5 h-3.5 text-amber-800" />
                                                            <span>SHORT RECESS (11.15 - 11.30 AM)</span>
                                                        </span>
                                                    </td>
                                                </tr>
                                            )}

                                            {/* Full Row Merged Long Recess */}
                                            {slotIndex === 3 && (
                                                <tr className="bg-amber-50 text-amber-900 font-bold border-y border-amber-200">
                                                    <td colSpan={7} className="py-1.5 px-4 text-center text-xs tracking-widest uppercase font-extrabold bg-amber-100/70">
                                                        <span className="inline-flex items-center gap-1.5">
                                                            <Utensils className="w-3.5 h-3.5 text-amber-800" />
                                                            <span>LONG RECESS (1.30 - 2.15 PM)</span>
                                                        </span>
                                                    </td>
                                                </tr>
                                            )}
                                        </React.Fragment>
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
