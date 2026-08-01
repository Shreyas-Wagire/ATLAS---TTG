"use client";

import React from "react";
import { Download } from "lucide-react";
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
    validationScore
}) {
    const handleExport = () => {
        exportTimetable(timetable, report, {
            conflictReport,
            facultyWorkloadReport,
            resourceUtilizationReport,
            facultyTimetable,
            locationTimetable,
            validationScore,
        });
    };

    return (
        <ShimmerButton
            onClick={handleExport}
            variant="success"
            className="py-1.5 px-4 text-xs font-extrabold"
        >
            <Download className="w-3.5 h-3.5" />
            <span>Export Full Report (XLSX)</span>
        </ShimmerButton>
    );
}
