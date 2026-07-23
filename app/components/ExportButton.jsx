"use client";

import React, { useState } from "react";
import { exportTimetable } from "../utils/exportTimetable";

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
    const [isHovered, setIsHovered] = useState(false);

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
        <button
            onClick={handleExport}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            style={{
                background: "var(--gradient-success)",
                color: "#ffffff",
                padding: "10px 24px",
                borderRadius: "var(--radius-md)",
                fontWeight: "600",
                fontSize: "0.9rem",
                boxShadow: "var(--shadow-success)",
                border: "none",
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
                transform: isHovered ? "scale(1.02)" : "scale(1)"
            }}
        >
            📥 Export Full Report (XLSX)
        </button>
    );
}
