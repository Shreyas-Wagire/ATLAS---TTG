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
            badge: "Lead Developer",
            avatar: "SW",
            avatarBg: "bg-gradient-to-tr from-[#0d9488] to-[#2dd4bf]",
            description: "Conceptualized and engineered the ATLAS Engine solver architecture, including the 2D multi-course practical stacking algorithm, DAPS priority scoring, and zero-conflict CASC cascade repair.",
            skills: ["Algorithm Architecture", "Constraint Optimization", "Next.js", "Full-Stack Design"],
            isLead: true,
        },
        {
            name: "Systems & Data Architecture",
            role: "Parser & Data Model Engineering",
            badge: "Core Systems",
            avatar: "SE",
            avatarBg: "bg-gradient-to-tr from-[#3b82f6] to-[#60a5fa]",
            description: "Engineered automated departmental Excel sheet detection, dynamic course-load normalization, faculty constraint blackouts, and multi-sheet XLSX export matrices.",
            skills: ["Data Normalization", "XLSX Processing", "Schema Validation", "State Hydration"],
            isLead: false,
        },
        {
            name: "UI/UX & Product Design",
            role: "Interface Architecture & Analytics",
            badge: "Design System",
            avatar: "UI",
            avatarBg: "bg-gradient-to-tr from-[#8b5cf6] to-[#a78bfa]",
            description: "Crafted the Minimal Cool Mint SaaS visual language, interactive 2D timetable studio, automated conflict diagnostics, and real-time validation scoring reports.",
            skills: ["Design Systems", "Interactive Visualization", "Responsive Layouts", "Accessibility"],
            isLead: false,
        },
        {
            name: "Academic Domain & Scheduling Research",
            role: "Institutional Framework Advisors",
            badge: "Domain Research",
            avatar: "AR",
            avatarBg: "bg-gradient-to-tr from-amber-500 to-amber-300",
            description: "Formalized institutional scheduling heuristics, NEP academic credit compliance, shared laboratory capacity models, and departmental faculty workload distribution bounds.",
            skills: ["Scheduling Heuristics", "Credit Frameworks", "Resource Modeling", "Validation Standards"],
            isLead: false,
        }
    ];

    return createPortal(
        <div 
            className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-150"
            onClick={onClose}
        >
            <div 
                className="bg-white rounded-3xl border border-[#b8ccc8] shadow-2xl max-w-2xl w-full p-6 sm:p-7 space-y-6 relative overflow-hidden animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] flex flex-col"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Modal Header */}
                <div className="flex items-start justify-between gap-4 border-b border-[#e2e8f0] pb-5 shrink-0">
                    <div className="flex items-center gap-3.5">
                        <div className="w-11 h-11 rounded-2xl bg-[#ccfbf1] border border-[#99f6e4] flex items-center justify-center text-[#0d9488] shadow-xs">
                            <Users className="w-5 h-5" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h3 className="text-lg font-extrabold text-[#0f172a] tracking-tight">
                                    Architects of ATLAS
                                </h3>
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-[#ccfbf1] text-[#0f766e] border border-[#99f6e4]">
                                    PROJECT TEAM
                                </span>
                            </div>
                            <p className="text-xs text-[#64748b] font-medium mt-0.5">
                                The passionate researchers and developers behind the ATLAS Academic Timetable Generator
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

                {/* Team Grid */}
                <div className="space-y-4 overflow-y-auto pr-1 flex-1">
                    {teamMembers.map((member, idx) => (
                        <div 
                            key={idx}
                            className={`p-4 sm:p-5 rounded-2xl border transition-all duration-200 ${
                                member.isLead 
                                    ? "bg-gradient-to-br from-[#f0fdf9] via-white to-white border-[#0d9488]/40 shadow-xs ring-1 ring-[#0d9488]/15" 
                                    : "bg-white border-[#e2e8f0] hover:border-[#b8ccc8]"
                            }`}
                        >
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-2.5">
                                <div className="flex items-center gap-3">
                                    <div className={`w-10 h-10 rounded-2xl ${member.avatarBg} text-white flex items-center justify-center font-extrabold text-sm shadow-xs shrink-0`}>
                                        {member.avatar}
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <h4 className="text-sm font-extrabold text-[#0f172a]">
                                                {member.name}
                                            </h4>
                                            {member.isLead && (
                                                <span className="flex items-center gap-1 px-2 py-0.2 rounded-full text-[9px] font-black bg-[#0d9488] text-white">
                                                    <Sparkles className="w-2.5 h-2.5" />
                                                    LEAD
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-xs font-semibold text-[#0f766e]">
                                            {member.role}
                                        </p>
                                    </div>
                                </div>
                                <span className="px-2.5 py-0.5 text-[10px] font-bold rounded-full bg-[#f1f5f9] text-[#475569] self-start sm:self-center border border-[#e2e8f0]">
                                    {member.badge}
                                </span>
                            </div>

                            <p className="text-xs text-[#64748b] leading-relaxed mb-3">
                                {member.description}
                            </p>

                            <div className="flex flex-wrap items-center gap-1.5">
                                {member.skills.map((skill, sIdx) => (
                                    <span 
                                        key={sIdx}
                                        className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-[#f8fafb] text-[#475569] border border-[#e2e8f0]"
                                    >
                                        {skill}
                                    </span>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>

                {/* Footer Notes & Close */}
                <div className="pt-3 border-t border-[#e2e8f0] flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
                    <div className="flex items-center gap-1.5 text-xs text-[#64748b] font-medium">
                        <span>Crafted with</span>
                        <Heart className="w-3.5 h-3.5 text-red-500 fill-red-500" />
                        <span>for Academic Institutions</span>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-[#0d9488] hover:bg-[#0f766e] text-white font-extrabold text-xs transition-all shadow-xs hover:shadow-md cursor-pointer"
                    >
                        Close Team Showcase
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
}
