"use client";

import React, { useEffect } from "react";
import { createPortal } from "react-dom";
import { 
    X, Sparkles, Award, Code, Layers, Users, Cpu, ShieldCheck, 
    Heart, ExternalLink, Github, Mail, GraduationCap, CheckCircle2 
} from "lucide-react";

export default function TeamModal({ isOpen, onClose }) {
    useEffect(() => {
        if (!isOpen) return;
        const handleKeyDown = (e) => {
            if (e.key === "Escape") onClose();
        };
        window.addEventListener("keydown", handleKeyDown);
        const originalOverflow = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        return () => {
            window.removeEventListener("keydown", handleKeyDown);
            document.body.style.overflow = originalOverflow;
        };
    }, [isOpen, onClose]);

    if (!isOpen || typeof document === "undefined") return null;

    const teamMembers = [
        {
            name: "Shreyas Wagire",
            role: "Project Lead & Core Algorithm Architect",
            subRole: "Solver Lead • Core Optimization",
            clearance: "LEVEL 01 • PROJECT LEAD",
            badge: "LEAD",
            badgeColor: "bg-[#0d9488] text-white border-[#0f766e]",
            accentRing: "ring-[#0d9488]/30",
            avatarBg: "bg-gradient-to-tr from-[#0d9488] via-[#0f766e] to-[#2dd4bf]",
            idCode: "ATLAS-2026-SW01",
            initials: "SW",
            description: "Conceptualized and engineered the ATLAS core solver: 4-layer constraint optimization, 2D multi-course practical stacking (4→3→2→1), dynamic DAPS/RCAA heuristics, and self-healing CASC cascade repair.",
            skills: ["Algorithm Solver", "Constraint Optimization", "Next.js Architecture", "CASC Engine"],
            isLead: true,
        },
        {
            name: "Shreya Chougule",
            role: "Systems & Data Architecture",
            subRole: "Parser & Data Model Engineering with Great Presenter",
            clearance: "LEVEL 02 • CO-LEAD",
            badge: "CO-LEAD",
            badgeColor: "bg-[#2563eb] text-white border-[#1d4ed8]",
            accentRing: "ring-blue-500/30",
            avatarBg: "bg-gradient-to-tr from-[#2563eb] via-[#1d4ed8] to-[#06b6d4]",
            idCode: "ATLAS-2026-SC02",
            initials: "SC",
            description: "Parser & Data Model Engineering with Great Presenter. Architected automated departmental Excel sheet detection, dynamic course-load normalization, faculty constraint blackouts, and multi-sheet XLSX export matrices.",
            skills: ["Data Normalization", "XLSX Processing Engine", "Schema Validation", "Great Presenter"],
            isLead: false,
        },
        {
            name: "Shruti Khanchanale",
            role: "UI/UX & Product Design",
            subRole: "Interface Architecture & Analytics and Research",
            clearance: "LEVEL 02 • CORE DESIGN",
            badge: "CORE",
            badgeColor: "bg-[#7c3aed] text-white border-[#6d28d9]",
            accentRing: "ring-purple-500/30",
            avatarBg: "bg-gradient-to-tr from-[#7c3aed] via-[#6d28d9] to-[#ec4899]",
            idCode: "ATLAS-2026-SK03",
            initials: "SK",
            description: "Interface Architecture & Analytics and Research. Crafted the Minimal Cool Mint SaaS visual language, interactive 2D timetable studio, automated conflict diagnostics, real-time validation scoring reports, and user research.",
            skills: ["Design Systems", "2D Matrix Studio", "Analytics & Insights", "UX Research"],
            isLead: false,
        }
    ];

    return createPortal(
        <div 
            className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-4 bg-slate-900/65 backdrop-blur-md animate-in fade-in duration-150"
            onClick={onClose}
        >
            <div 
                className="bg-white rounded-3xl border border-[#b8ccc8] shadow-2xl max-w-5xl w-full p-6 sm:p-7 space-y-6 relative overflow-hidden animate-in fade-in zoom-in-95 duration-200 max-h-[92vh] flex flex-col"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Modal Header */}
                <div className="flex items-start justify-between gap-4 border-b border-[#e2e8f0] pb-4 shrink-0">
                    <div className="flex items-center gap-3.5">
                        <div className="w-11 h-11 rounded-2xl bg-[#ccfbf1] border border-[#99f6e4] flex items-center justify-center text-[#0d9488] shadow-xs">
                            <ShieldCheck className="w-6 h-6" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h3 className="text-lg font-extrabold text-[#0f172a] tracking-tight">
                                    ATLAS Core Engineering Team
                                </h3>
                                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-[#ccfbf1] text-[#0f766e] border border-[#99f6e4]">
                                    ACCESS PASS ID
                                </span>
                            </div>
                            <p className="text-xs text-[#64748b] font-medium mt-0.5">
                                Official project credentials & roles of the core 3 architects behind the ATLAS Academic Timetable Generator
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1.5 rounded-xl hover:bg-slate-100 text-[#94a3b8] hover:text-[#0f172a] transition-colors cursor-pointer"
                        aria-label="Close Team Modal"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* ID Cards 3-Column Grid */}
                <div className="overflow-y-auto pr-1 flex-1">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-3 pb-2">
                        {teamMembers.map((member, idx) => (
                            <div 
                                key={idx}
                                className="relative pt-4 flex flex-col"
                            >
                                {/* Physical Metallic Lanyard Clip & Punch Hole */}
                                <div className="absolute top-0 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center pointer-events-none">
                                    <div className="w-12 h-3.5 rounded-t-md bg-gradient-to-b from-slate-200 via-slate-300 to-slate-400 border border-slate-400/80 shadow-xs flex items-center justify-center">
                                        <div className="w-6 h-1.5 rounded-full bg-slate-900/90 shadow-inner" />
                                    </div>
                                </div>

                                {/* Vertical ID Card Badge Body */}
                                <div className={`relative rounded-3xl bg-white border border-[#b8ccc8]/80 shadow-lg hover:shadow-2xl transition-all duration-300 overflow-hidden flex flex-col justify-between hover:-translate-y-1.5 ring-1 ${member.accentRing} flex-1`}>
                                    {/* Top Card Security Strip */}
                                    <div className="px-5 pt-5 pb-3 bg-gradient-to-b from-[#f8fafb] to-white border-b border-[#f1f5f9]">
                                        <div className="flex items-center justify-between">
                                            {/* Micro EMV Smart Chip */}
                                            <div className="flex items-center gap-2">
                                                <div className="w-7 h-5 rounded-md bg-gradient-to-br from-amber-200 via-amber-300 to-amber-400 border border-amber-500/60 shadow-2xs relative flex items-center justify-center overflow-hidden">
                                                    <div className="w-2.5 h-full border-x border-amber-700/20" />
                                                    <div className="h-1.5 w-full border-y border-amber-700/20 absolute" />
                                                </div>
                                                <span className="text-[9px] font-mono font-bold tracking-wider text-[#94a3b8] uppercase">
                                                    ATLAS R&D
                                                </span>
                                            </div>

                                            {/* Clearance Badge */}
                                            <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-extrabold tracking-wide uppercase border shadow-2xs ${member.badgeColor}`}>
                                                {member.badge}
                                            </span>
                                        </div>

                                        <div className="mt-2 flex items-center justify-between text-[9px] font-mono text-[#64748b]">
                                            <span className="font-semibold">{member.clearance}</span>
                                            <span className="flex items-center gap-1 text-emerald-600 font-bold">
                                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                                VERIFIED
                                            </span>
                                        </div>
                                    </div>

                                    {/* Portrait & Identity Block */}
                                    <div className="p-5 space-y-3.5 flex-1 flex flex-col">
                                        {/* Avatar with Security Crosshairs */}
                                        <div className="flex items-start gap-3.5">
                                            <div className="relative p-1 rounded-2xl bg-white border border-[#e2e8f0] shadow-xs shrink-0">
                                                {/* Corner Bracket Marks */}
                                                <div className="absolute top-0 left-0 w-2 h-2 border-t-2 border-l-2 border-[#0d9488]" />
                                                <div className="absolute top-0 right-0 w-2 h-2 border-t-2 border-r-2 border-[#0d9488]" />
                                                <div className="absolute bottom-0 left-0 w-2 h-2 border-b-2 border-l-2 border-[#0d9488]" />
                                                <div className="absolute bottom-0 right-0 w-2 h-2 border-b-2 border-r-2 border-[#0d9488]" />

                                                <div className={`w-13 h-13 rounded-xl ${member.avatarBg} text-white font-black text-base flex items-center justify-center shadow-inner tracking-wider`}>
                                                    {member.initials}
                                                </div>
                                            </div>

                                            <div className="space-y-0.5">
                                                <h4 className="text-base font-extrabold text-[#0f172a] leading-tight">
                                                    {member.name}
                                                </h4>
                                                <p className="text-xs font-bold text-[#0f766e]">
                                                    {member.role}
                                                </p>
                                                {member.subRole && (
                                                    <p className="text-[11px] font-semibold text-[#0284c7] leading-tight">
                                                        {member.subRole}
                                                    </p>
                                                )}
                                            </div>
                                        </div>

                                        {/* Description */}
                                        <p className="text-xs text-[#475569] leading-relaxed font-normal flex-1">
                                            {member.description}
                                        </p>

                                        {/* Competency Tags */}
                                        <div className="flex flex-wrap gap-1.5 pt-1">
                                            {member.skills.map((skill, sIdx) => (
                                                <span 
                                                    key={sIdx} 
                                                    className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-[#f0fdf9] text-[#0f766e] border border-[#ccfbf1]"
                                                >
                                                    {skill}
                                                </span>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Bottom Security Barcode & Card Serial */}
                                    <div className="p-3.5 bg-[#f8fafb] border-t border-[#e2e8f0] flex items-center justify-between">
                                        <div className="space-y-0.5">
                                            <div className="text-[9px] font-mono uppercase tracking-wider text-[#94a3b8]">
                                                Credential ID
                                            </div>
                                            <div className="text-xs font-mono font-extrabold text-[#0f172a]">
                                                {member.idCode}
                                            </div>
                                        </div>

                                        {/* Stylized Barcode */}
                                        <div className="flex items-center gap-[2px] h-5 px-1.5 py-0.5 bg-white rounded border border-[#e2e8f0] shadow-2xs" aria-label="Security barcode">
                                            {[3, 1, 2, 4, 1, 3, 2, 1, 4, 2, 1, 3, 1, 2, 3].map((w, bIdx) => (
                                                <span 
                                                    key={bIdx} 
                                                    className="h-full bg-slate-800 rounded-2xs inline-block"
                                                    style={{ width: `${w}px` }}
                                                />
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Footer Notes & Close */}
                <div className="pt-3 border-t border-[#e2e8f0] flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
                    <div className="flex items-center gap-1.5 text-xs text-[#64748b] font-medium">
                        <span>Crafted with</span>
                        <Heart className="w-3.5 h-3.5 text-red-500 fill-red-500" />
                        <span>for Academic Institutions • ATLAS v4.5</span>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-[#0d9488] hover:bg-[#0f766e] text-white font-extrabold text-xs transition-all shadow-xs hover:shadow-md cursor-pointer"
                    >
                        Close Team Access Pass
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
}
