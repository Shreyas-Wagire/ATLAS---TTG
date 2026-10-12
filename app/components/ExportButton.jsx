"use client";

import React, { useMemo, useState } from "react";
import { ChevronDown, Download } from "lucide-react";
import { exportTimetable } from "../utils/exportTimetable";
import ShimmerButton from "./ui/ShimmerButton";

export default function ExportButton({
    timetable,
    report,
    conflictReport,
    facultyWorkloadReport,
    resourceUtilizationReport,
    facultyTimetable,
    locationTimetable,
    validationScore,
    isMultiDept = false,
    departmentOrder = [],
    departmentResults = {},
    facultyRegistryReport = null,
}) {
    const [isOpen, setIsOpen] = useState(false);
    const [availableSheets, setAvailableSheets] = useState([]);
    const [selectedSheets, setSelectedSheets] = useState([]);
    const [fileName, setFileName] = useState("");

    const inferredDepartments = [...new Set(
        Object.keys(timetable || {}).filter((key) => key.includes(":")).map((key) => key.split(":", 1)[0])
    )];
    const departments = departmentOrder.length > 0 ? departmentOrder : inferredDepartments;

    const exportOptions = useMemo(() => ({
        conflictReport,
        facultyWorkloadReport,
        resourceUtilizationReport,
        facultyTimetable,
        locationTimetable,
        validationScore,
        isMultiDept,
        departmentOrder,
        departmentResults,
        facultyRegistryReport,
    }), [
        conflictReport,
        facultyWorkloadReport,
        resourceUtilizationReport,
        facultyTimetable,
        locationTimetable,
        validationScore,
        isMultiDept,
        departmentOrder,
        departmentResults,
        facultyRegistryReport,
    ]);

    const toggleExportMenu = () => {
        if (!isOpen) {
            const workbook = exportTimetable(timetable, report, { ...exportOptions, exportType: "full", previewOnly: true });
            const sheetNames = workbook?.SheetNames || [];
            setAvailableSheets(sheetNames);
            setSelectedSheets(sheetNames);
        }
        setIsOpen((open) => !open);
    };

    const handleExport = (exportType, exportDepartment = "", format = "xlsx") => {
        exportTimetable(timetable, report, {
            ...exportOptions,
            exportType,
            exportDepartment,
            exportFormat: format,
            selectedSheets: exportType === "selected" ? selectedSheets : null,
            fileName: exportDepartment
                ? (fileName.trim() ? `${exportDepartment}_${fileName.trim()}` : "")
                : fileName.trim(),
        });
        setIsOpen(false);
    };

    return (
        <div className="relative">
            <div className="flex items-center">
                <ShimmerButton
                    onClick={() => handleExport("full")}
                    variant="success"
                    className="py-1.5 px-4 text-xs font-extrabold rounded-r-none"
                >
                    <Download className="w-3.5 h-3.5" />
                    <span>Export Full Report (XLSX)</span>
                </ShimmerButton>
                <button
                    type="button"
                    aria-label="Show export options"
                    aria-expanded={isOpen}
                    onClick={toggleExportMenu}
                    className="inline-flex h-9 items-center rounded-r-lg border-l border-white/30 bg-emerald-600 px-2 text-white hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                    <ChevronDown className="h-4 w-4" />
                </button>
            </div>
            {isOpen && (
                <div className="absolute right-0 z-30 mt-2 max-h-[75vh] w-72 overflow-y-auto rounded-xl border border-slate-200 bg-white p-2 shadow-xl">
                    <label className="block px-2 pb-2 text-[10px] font-bold uppercase tracking-wide text-slate-500">
                        File name
                        <input
                            value={fileName}
                            onChange={(event) => setFileName(event.target.value)}
                            placeholder={isMultiDept ? "College_Timetable_Master_Report" : "Timetable_Master_Report"}
                            className="mt-1 block h-9 w-full rounded-lg border border-slate-200 px-2.5 text-xs font-medium normal-case tracking-normal text-slate-800 outline-none focus:border-emerald-500"
                        />
                    </label>
                    <div className="border-t border-slate-100 px-2 py-2">
                        <div className="mb-1 flex items-center justify-between">
                            <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Choose sheets</p>
                            <button type="button" onClick={() => setSelectedSheets(availableSheets)} className="text-[10px] font-bold text-emerald-700 hover:text-emerald-900">Select all</button>
                        </div>
                        <div className="max-h-36 space-y-1 overflow-y-auto">
                            {availableSheets.map((sheet) => (
                                <label key={sheet} className="flex cursor-pointer items-center gap-2 rounded-md px-1 py-1 text-xs text-slate-700 hover:bg-slate-50">
                                    <input type="checkbox" checked={selectedSheets.includes(sheet)} onChange={(event) => setSelectedSheets((current) => event.target.checked ? [...current, sheet] : current.filter((name) => name !== sheet))} className="accent-emerald-700" />
                                    <span className="truncate">{sheet}</span>
                                </label>
                            ))}
                        </div>
                        <div className="mt-2 grid grid-cols-2 gap-2">
                            <button type="button" disabled={!selectedSheets.length} onClick={() => handleExport("selected")} className="rounded-lg bg-emerald-700 px-2 py-2 text-[11px] font-bold text-white hover:bg-emerald-800 disabled:cursor-not-allowed disabled:bg-slate-300">Selected XLSX</button>
                            <button type="button" disabled={!selectedSheets.length} onClick={() => handleExport("selected", "", "pdf")} className="rounded-lg border border-emerald-200 px-2 py-2 text-[11px] font-bold text-emerald-800 hover:bg-emerald-50 disabled:cursor-not-allowed disabled:text-slate-400">Selected PDF</button>
                        </div>
                        <p className="mt-1.5 text-[9px] leading-4 text-slate-400">PDF opens the print dialog. Choose “Save as PDF” to download it.</p>
                    </div>
                    <div className="my-1 border-t border-slate-100" />
                    {[
                        ["division", "Division Timetables"],
                        ["faculty", "Faculty Timetables"],
                        ["location", "Location Timetables"],
                    ].map(([type, label]) => (
                        <button
                            key={type}
                            type="button"
                            onClick={() => handleExport(type)}
                            className="block w-full rounded-lg px-3 py-2 text-left text-xs font-semibold text-slate-700 hover:bg-emerald-50 hover:text-emerald-800"
                        >
                            Export {label} (XLSX)
                        </button>
                    ))}
                    {departments.length > 0 && (
                        <>
                            <div className="my-1.5 border-t border-slate-100" />
                            {departments.map((department) => (
                                <button
                                    key={department}
                                    type="button"
                                    onClick={() => handleExport("department", department)}
                                    className="block w-full rounded-lg px-3 py-2 text-left text-xs font-semibold text-slate-700 hover:bg-emerald-50 hover:text-emerald-800"
                                >
                                    Export {department} (XLSX)
                                </button>
                            ))}
                        </>
                    )}
                </div>
            )}
        </div>
    );
}
