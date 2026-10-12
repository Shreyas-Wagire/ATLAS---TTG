"use client";

import React, { useMemo, useState } from "react";
import { Activity, ArrowDownRight, ArrowRightLeft, ArrowUpRight, AlertTriangle, Check, Clock3, GitCompareArrows, MoveRight, ShieldCheck, BookOpen } from "lucide-react";
import { compareScheduleDigests, createScheduleDigest } from "../utils/scheduleDiff.js";

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
const TIMES = ["9:15–10:15", "10:15–11:15", "11:30–12:30", "12:30–1:30", "2:15–3:15", "3:15–4:15"];
const PRACTICAL_STARTS = [0, 2, 4];

function getCellLabel(cell) {
    return cell?.subject || cell?.courseName || cell?.courseCode || cell?.batchAllocations?.[0]?.subject || cell?.type || "Scheduled session";
}

export default function ScheduleWorkbench({
    timetable = {},
    comparisonTimetable = null,
    conflictReport,
    onApplyTimetable,
    onValidateTimetable,
    scheduleVersions = [],
    auditTrail = [],
    facultyWorkloadReport,
    resourceUtilizationReport,
    coordinationItems = [],
    generationReport = null,
    department = "",
}) {
    const [selectedSessionKey, setSelectedSessionKey] = useState("");
    const [targetDay, setTargetDay] = useState("Monday");
    const [targetSlot, setTargetSlot] = useState(0);
    const [editMessage, setEditMessage] = useState("");
    const [showAllConflicts, setShowAllConflicts] = useState(false);

    const sessions = useMemo(() => Object.entries(timetable || {}).flatMap(([division, days]) =>
        Object.entries(days || {}).flatMap(([day, slots]) => (slots || []).flatMap((cell, slot) => {
            if (!cell || cell.span === 0) return [];
            return [{ key: `${division}|${day}|${slot}`, division, day, slot, cell }];
        }))
    ), [timetable]);
    const unallocatedSessions = useMemo(() => {
        const categories = [
            ["LECTURE", generationReport?.missingLectures || []],
            ["TUTORIAL", generationReport?.missingTutorials || []],
            ["PRACTICAL", generationReport?.missingPracticals || []],
        ];
        return categories.flatMap(([category, items]) => items.map((session) => {
            const key = session._deptDivKey || "";
            const [sessionDepartment, ...divisionParts] = key.includes(":") ? key.split(":") : ["", key];
            return {
                ...session,
                category,
                department: sessionDepartment || department,
                divisionLabel: divisionParts.join(":") || [session.year, session.division].filter(Boolean).join("-") || "—",
            };
        })).filter((session) => !department || session.department === department);
    }, [generationReport, department]);
    const selectedSession = sessions.find((session) => session.key === selectedSessionKey);
    const conflicts = useMemo(() => {
        const all = conflictReport?.conflicts || [];
        return all.filter((conflict) => {
            const divisions = [conflict.divisionKey, ...(conflict.affectedClasses || []).map((item) => item.divisionKey)].filter(Boolean);
            return divisions.length === 0 || divisions.some((division) => Object.hasOwn(timetable || {}, division));
        });
    }, [conflictReport, timetable]);
    const currentDigest = useMemo(() => createScheduleDigest(comparisonTimetable || timetable), [comparisonTimetable, timetable]);
    const previousVersion = scheduleVersions.length ? scheduleVersions[scheduleVersions.length - 1] : null;
    const versionDiff = previousVersion ? compareScheduleDigests(previousVersion.digest, currentDigest) : null;

    const moveSelectedSession = () => {
        if (!selectedSession) return;
        const sourceSlots = timetable[selectedSession.division]?.[selectedSession.day] || [];
        const session = sourceSlots[selectedSession.slot];
        if (!session || session.fixed) {
            setEditMessage("Fixed sessions are locked and cannot be moved.");
            return;
        }
        if (selectedSession.day === targetDay && selectedSession.slot === Number(targetSlot)) {
            setEditMessage("Choose a different time to move this session.");
            return;
        }

        const isDouble = session.span === 2;
        const targetSlots = timetable[selectedSession.division]?.[targetDay] || [];
        if (targetSlots[targetSlot] && !(targetDay === selectedSession.day && Number(targetSlot) === selectedSession.slot + 1 && isDouble)) {
            setEditMessage("That time is already occupied. Choose an open slot.");
            return;
        }
        if (isDouble && (!PRACTICAL_STARTS.includes(Number(targetSlot)) || Number(targetSlot) >= 5)) {
            setEditMessage("Two-period sessions must start at 9:15, 11:30, or 2:15.");
            return;
        }
        if (isDouble && targetSlots[Number(targetSlot) + 1] && !(targetDay === selectedSession.day && Number(targetSlot) + 1 === selectedSession.slot + 1)) {
            setEditMessage("The adjacent period is occupied. A two-period session needs both periods open.");
            return;
        }

        const next = { ...timetable, [selectedSession.division]: { ...timetable[selectedSession.division] } };
        Object.entries(timetable[selectedSession.division] || {}).forEach(([day, slots]) => {
            next[selectedSession.division][day] = [...(slots || [])];
        });
        next[selectedSession.division][selectedSession.day][selectedSession.slot] = null;
        if (isDouble) next[selectedSession.division][selectedSession.day][selectedSession.slot + 1] = null;
        next[selectedSession.division][targetDay][Number(targetSlot)] = { ...session, movedManually: true };
        if (isDouble) next[selectedSession.division][targetDay][Number(targetSlot) + 1] = { ...session, span: 0, movedManually: true };
        const validation = onValidateTimetable?.(next) || { allowed: true };
        if (!validation.allowed) {
            setEditMessage(validation.message || "This move would introduce a new timetable conflict. Choose another time.");
            return;
        }
        onApplyTimetable?.(next);
        setSelectedSessionKey("");
        setEditMessage(`Moved ${getCellLabel(session)} to ${targetDay}, ${TIMES[targetSlot]}.`);
    };

    const chooseConflictSession = (conflict) => {
        const division = conflict.divisionKey || conflict.affectedClasses?.[0]?.divisionKey;
        const day = conflict.day;
        const slot = Number(conflict.slot ?? 0);
        const session = sessions.find((item) => item.division === division && item.day === day && item.slot === slot);
        if (session) {
            setSelectedSessionKey(session.key);
            setTargetDay(day);
            setTargetSlot((slot + 1) % 6);
            setEditMessage(`Selected ${getCellLabel(session)} for review.`);
            document.getElementById("schedule-editor")?.scrollIntoView({ behavior: "smooth", block: "center" });
        }
    };

    const facultyEntries = (Array.isArray(facultyWorkloadReport)
        ? facultyWorkloadReport.map((entry) => [entry.faculty, entry])
        : Object.entries(facultyWorkloadReport || {})).slice(0, 5);
    const resources = resourceUtilizationReport?.resources || [];
    const overloadedFaculty = (Array.isArray(facultyWorkloadReport) ? facultyWorkloadReport : Object.values(facultyWorkloadReport || {})).filter((entry) => ["HEAVY LOAD", "OVERLOADED"].includes(entry.status)).length;
    const averageRoomUse = resources.length
        ? Math.round(resources.reduce((sum, resource) => sum + (Number(resource.utilizationPercent ?? resource.utilizationRate) || 0), 0) / resources.length)
        : 0;

    return (
        <section className="space-y-4" aria-label="Schedule review and editing tools">
            <article className={`overflow-hidden rounded-2xl border bg-white shadow-sm ${unallocatedSessions.length ? "border-amber-200" : "border-emerald-200"}`} aria-label="Unallocated timetable sessions">
                <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
                    <div className="flex items-center gap-3">
                        <span className={`grid h-9 w-9 place-items-center rounded-xl ${unallocatedSessions.length ? "bg-amber-50 text-amber-700" : "bg-emerald-50 text-emerald-700"}`}><BookOpen className="h-4 w-4" /></span>
                        <div>
                            <h3 className="text-sm font-bold text-slate-900">Unallocated courses & faculty</h3>
                            <p className="mt-0.5 text-xs text-slate-500">{unallocatedSessions.length ? "These required sessions are missing from the timetable." : "Every required session for this department is in the timetable."}</p>
                        </div>
                    </div>
                    <span className={`rounded-full px-3 py-1 text-xs font-extrabold ${unallocatedSessions.length ? "bg-amber-100 text-amber-900" : "bg-emerald-100 text-emerald-800"}`}>{unallocatedSessions.length} unallocated</span>
                </div>
                {unallocatedSessions.length > 0 && <div className="overflow-x-auto overscroll-x-contain touch-pan-x border-t border-amber-100" tabIndex={0} aria-label="Scrollable unallocated sessions table">
                    <table className="w-full min-w-[760px] text-left text-xs">
                        <thead className="bg-amber-50/70 text-[10px] font-extrabold uppercase tracking-wide text-slate-500"><tr>
                            {(!department) && <th className="px-5 py-2.5">Department</th>}
                            <th className="px-5 py-2.5">Class / Division</th><th className="px-5 py-2.5">Course</th><th className="px-5 py-2.5">Type</th><th className="px-5 py-2.5">Assigned faculty</th><th className="px-5 py-2.5">Why it was not placed</th>
                        </tr></thead>
                        <tbody className="divide-y divide-slate-100">{unallocatedSessions.map((session, index) => <tr key={`${session._deptDivKey}-${session.subject}-${session.category}-${index}`} className="align-top hover:bg-amber-50/30">
                            {(!department) && <td className="px-5 py-3 font-bold text-slate-700">{session.department || "—"}</td>}
                            <td className="px-5 py-3 font-semibold text-slate-700">{session.divisionLabel}{session.batch ? ` · ${session.batch}` : ""}</td>
                            <td className="max-w-[260px] px-5 py-3"><span className="font-bold text-slate-900">{session.subject || session.courseCode || "Course"}</span>{session.subjectName && <span className="mt-0.5 block text-slate-500">{session.subjectName}</span>}</td>
                            <td className="px-5 py-3 text-slate-600">{session.category}</td>
                            <td className="px-5 py-3 font-semibold text-slate-700">{session.faculty || "Not assigned"}</td>
                            <td className="max-w-[320px] px-5 py-3 leading-5 text-slate-600">{session.diagnosticReason || session.rejectionReasons?.[0] || "No available timetable slot was found."}</td>
                        </tr>)}</tbody>
                    </table>
                </div>}
            </article>
            <div className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
                <article className="rounded-2xl border border-[#e0e4ef] bg-white p-5 shadow-sm">
                    <div className="flex items-start justify-between gap-4">
                        <div>
                            <p className="flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-[0.15em] text-indigo-700"><AlertTriangle className="h-3.5 w-3.5" /> Conflict review</p>
                            <h3 className="mt-1 text-base font-bold text-slate-900">{conflicts.length ? `${conflicts.length} items need attention` : "No detected conflicts"}</h3>
                            <p className="mt-1 text-xs text-slate-500">Select an item to focus the affected session in the editor.</p>
                        </div>
                        <span className={`rounded-full px-2.5 py-1 text-xs font-extrabold ${conflicts.length ? "bg-amber-50 text-amber-800" : "bg-indigo-50 text-indigo-800"}`}>{conflicts.length}</span>
                    </div>
                    {conflicts.length ? (
                        <div className="mt-4 space-y-2">
                            {(showAllConflicts ? conflicts : conflicts.slice(0, 4)).map((conflict, index) => (
                                <button key={`${conflict.type}-${conflict.day}-${conflict.slot}-${index}`} type="button" onClick={() => chooseConflictSession(conflict)} className="flex w-full items-start gap-3 rounded-xl border border-slate-100 bg-slate-50/70 p-3 text-left transition-colors hover:border-indigo-200 hover:bg-indigo-50/50">
                                    <span className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-white text-amber-700"><AlertTriangle className="h-3.5 w-3.5" /></span>
                                    <span className="min-w-0 flex-1"><span className="block text-xs font-bold text-slate-800">{conflict.type?.replaceAll("_", " ") || "Schedule conflict"}</span><span className="mt-1 block text-[11px] leading-5 text-slate-500">{conflict.description || `${conflict.day || "Schedule"} · ${conflict.divisionKey || "Multiple classes"}`}</span></span>
                                    <MoveRight className="mt-1 h-4 w-4 shrink-0 text-indigo-600" />
                                </button>
                            ))}
                            {conflicts.length > 4 && <button type="button" onClick={() => setShowAllConflicts((value) => !value)} className="px-1 text-xs font-bold text-indigo-700 hover:text-indigo-900">{showAllConflicts ? "Show fewer" : `View all ${conflicts.length} conflicts`}</button>}
                        </div>
                    ) : (
                        <div className="mt-4 flex items-center gap-3 rounded-xl border border-indigo-100 bg-indigo-50/60 p-3 text-xs font-semibold text-indigo-900"><ShieldCheck className="h-4 w-4 shrink-0" /> Validation found no room or faculty clashes in this department.</div>
                    )}
                </article>

                <article id="schedule-editor" className="rounded-2xl border border-[#e0e4ef] bg-white p-5 shadow-sm">
                    <div className="flex items-start gap-3">
                        <span className="grid h-9 w-9 place-items-center rounded-xl bg-indigo-50 text-indigo-700"><ArrowRightLeft className="h-4 w-4" /></span>
                        <div><h3 className="text-base font-bold text-slate-900">Move a session</h3><p className="mt-1 text-xs text-slate-500">Move an unlocked session within its division. Practical blocks stay intact.</p></div>
                    </div>
                    <label className="mt-4 block text-[10px] font-extrabold uppercase tracking-wider text-slate-500">Session</label>
                    <select value={selectedSessionKey} onChange={(event) => { setSelectedSessionKey(event.target.value); setEditMessage(""); }} className="mt-1.5 h-10 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-semibold text-slate-800 outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100">
                        <option value="">Choose a scheduled session</option>
                        {sessions.map((session) => <option key={session.key} value={session.key} disabled={session.cell.fixed}>{session.division} · {session.day}, {TIMES[session.slot]} · {getCellLabel(session.cell)}{session.cell.fixed ? " (fixed)" : ""}</option>)}
                    </select>
                    <div className="mt-3 grid grid-cols-2 items-end gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]">
                        <label className="min-w-0 text-[10px] font-extrabold uppercase tracking-wider text-slate-500">New day<select value={targetDay} onChange={(event) => setTargetDay(event.target.value)} className="mt-1.5 h-10 w-full min-w-0 rounded-xl border border-slate-200 bg-slate-50 px-2 text-xs font-semibold text-slate-800 outline-none focus:border-indigo-400">{DAYS.map((day) => <option key={day}>{day}</option>)}</select></label>
                        <label className="min-w-0 text-[10px] font-extrabold uppercase tracking-wider text-slate-500">Start time<select value={targetSlot} onChange={(event) => setTargetSlot(Number(event.target.value))} className="mt-1.5 h-10 w-full min-w-0 rounded-xl border border-slate-200 bg-slate-50 px-2 text-xs font-semibold text-slate-800 outline-none focus:border-indigo-400">{TIMES.map((time, index) => <option key={time} value={index}>{time}</option>)}</select></label>
                        <button type="button" onClick={moveSelectedSession} disabled={!selectedSession || selectedSession.cell.fixed} className="col-span-2 inline-flex h-10 w-full items-center justify-center gap-1.5 rounded-xl bg-indigo-700 px-3 text-xs font-bold text-white transition-colors hover:bg-indigo-800 disabled:cursor-not-allowed disabled:bg-slate-300 sm:col-span-1 sm:w-auto"><MoveRight className="h-3.5 w-3.5" /> Move</button>
                    </div>
                    {editMessage && <p role="status" className="mt-3 text-[11px] font-semibold text-indigo-800">{editMessage}</p>}
                </article>
            </div>

            <div className="grid gap-4 lg:grid-cols-3">
                <article className="rounded-2xl border border-[#e0e4ef] bg-white p-4 shadow-sm">
                    <div className="flex items-center gap-2 text-xs font-extrabold text-slate-800"><GitCompareArrows className="h-4 w-4 text-indigo-700" /> Version comparison</div>
                    {versionDiff ? <><p className="mt-2 text-[11px] text-slate-500">Current schedule compared with the previous generated version.</p><div className="mt-3 grid grid-cols-3 gap-2">{[["Changed", versionDiff.changed, ArrowRightLeft], ["Added", versionDiff.added, ArrowUpRight], ["Removed", versionDiff.removed, ArrowDownRight]].map(([label, value, Icon]) => <div key={label} className="rounded-xl bg-slate-50 p-2.5"><div className="flex items-center gap-1 text-[9px] font-bold uppercase text-slate-500"><Icon className="h-3 w-3" />{label}</div><p className="mt-1 text-lg font-extrabold text-slate-900">{value}</p></div>)}</div><p className="mt-2 text-[10px] text-slate-400">Previous version: {new Date(previousVersion.createdAt).toLocaleString()}</p></> : <p className="mt-2 text-[11px] leading-5 text-slate-500">Generate a revised schedule to compare it with the current version.</p>}
                </article>

                <article className="rounded-2xl border border-[#e0e4ef] bg-white p-4 shadow-sm">
                    <div className="flex items-center gap-2 text-xs font-extrabold text-slate-800"><Activity className="h-4 w-4 text-indigo-700" /> Resource balance</div>
                    <div className="mt-3 flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2"><span className="text-[11px] font-semibold text-slate-600">Average room use</span><span className="text-sm font-extrabold text-indigo-800">{averageRoomUse}%</span></div>
                    <div className="mt-2 flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2"><span className="text-[11px] font-semibold text-slate-600">Faculty above target load</span><span className="text-sm font-extrabold text-amber-700">{overloadedFaculty}</span></div>
                    {facultyEntries.length > 0 && <p className="mt-2 truncate text-[10px] text-slate-400">Faculty reviewed: {facultyEntries.map(([key, value]) => value.faculty || key).join(", ")}</p>}
                    {resources.length === 0 && <p className="mt-2 flex items-center gap-1 text-[10px] text-slate-400"><Clock3 className="h-3 w-3" /> Room data is not available for this schedule.</p>}
                </article>

                <article className="rounded-2xl border border-[#e0e4ef] bg-white p-4 shadow-sm">
                    <div className="flex items-center gap-2 text-xs font-extrabold text-slate-800"><Check className="h-4 w-4 text-indigo-700" /> College coordination</div>
                    {coordinationItems.length ? <div className="mt-3 space-y-2">{coordinationItems.slice(0, 4).map((item, index) => <div key={`${item.title}-${index}`} className="rounded-xl bg-amber-50/70 px-3 py-2"><p className="text-[11px] font-bold text-amber-900">{item.title}</p><p className="mt-0.5 text-[10px] leading-4 text-amber-800">{item.detail}</p></div>)}</div> : <p className="mt-2 text-[11px] leading-5 text-slate-500">No shared faculty or resource collision was identified across departments.</p>}
                </article>
            </div>

            <article className="rounded-2xl border border-[#e0e4ef] bg-white p-5 shadow-sm">
                <div className="flex items-center gap-2 text-xs font-extrabold text-slate-800"><Clock3 className="h-4 w-4 text-indigo-700" /> Validation and edit history</div>
                {auditTrail.length ? <ol className="mt-3 grid gap-2 md:grid-cols-2">{auditTrail.slice(-6).reverse().map((item, index) => <li key={`${item.id || item.createdAt}-${index}`} className="flex gap-3 rounded-xl bg-slate-50 px-3 py-2.5"><span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-indigo-500" /><span className="min-w-0 flex-1"><span className="block text-[11px] font-bold text-slate-800">{item.title}</span><span className="mt-0.5 block text-[10px] text-slate-500">{item.detail}</span></span><time className="shrink-0 text-[9px] text-slate-400">{new Date(item.createdAt).toLocaleString()}</time></li>)}</ol> : <p className="mt-2 text-[11px] text-slate-500">Generation, validation, and manual schedule changes will be recorded here.</p>}
            </article>
        </section>
    );
}
