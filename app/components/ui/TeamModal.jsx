"use client";

import React, { useEffect } from "react";
import { createPortal } from "react-dom";
import { motion, useReducedMotion } from "framer-motion";
import { X, Heart, BookOpen } from "lucide-react";

const teamMembers = [
    {
        name: "Shreyas Wagire",
        role: "Project Lead & Core Algorithm Architect",
        subRole: "Solver lead · Core optimization",
        scheduleMark: [0, 2, 5, 8, 11, 13, 16, 19],
        initials: "SW",
        description: "Conceptualized and engineered the ATLAS core solver: 4-layer constraint optimization, 2D multi-course practical stacking, DAPS/RCAA heuristics, and self-healing CASC cascade repair.",
        skills: ["Algorithm solver", "Constraint optimization", "Next.js", "CASC engine"],
    },
    {
        name: "Shreya Chougule",
        role: "Systems & Data Architecture",
        subRole: "Parser · Data model engineering",
        scheduleMark: [1, 3, 4, 7, 10, 12, 15, 18],
        initials: "SC",
        description: "Architected automated department workbook detection, course-load normalization, faculty availability rules, and multi-sheet timetable exports.",
        skills: ["Data normalization", "XLSX processing", "Schema validation", "Presentations"],
    },
    {
        name: "Shruti Khanchanale",
        role: "UI/UX & Product Design",
        subRole: "Interface architecture · Research",
        scheduleMark: [0, 4, 6, 9, 11, 14, 17, 19],
        initials: "SK",
        description: "Designed the ATLAS interface, interactive timetable studio, conflict diagnostics, validation reports, and user research experience.",
        skills: ["Design systems", "2D matrix studio", "Analytics", "UX research"],
    },
];

export default function TeamModal({ isOpen, onClose }) {
    const reduceMotion = useReducedMotion();

    useEffect(() => {
        if (!isOpen) return undefined;
        const handleKeyDown = (event) => {
            if (event.key === "Escape") onClose();
        };
        const originalOverflow = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        window.addEventListener("keydown", handleKeyDown);
        return () => {
            window.removeEventListener("keydown", handleKeyDown);
            document.body.style.overflow = originalOverflow;
        };
    }, [isOpen, onClose]);

    if (!isOpen || typeof document === "undefined") return null;

    const transition = reduceMotion ? { duration: 0 } : { duration: 0.22, ease: [0.22, 1, 0.36, 1] };

    return createPortal(
        <motion.div
            className="fixed inset-0 z-[9999] flex items-center justify-center overflow-y-auto bg-[#0c2723]/40 p-3 backdrop-blur-md sm:p-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={transition}
            onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}
            role="presentation"
        >
            <motion.section
                role="dialog"
                aria-modal="true"
                aria-labelledby="team-dialog-title"
                initial={reduceMotion ? false : { opacity: 0, y: 14, scale: 0.985 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 8, scale: 0.99 }}
                transition={transition}
                className="my-auto flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-[28px] border border-white/80 bg-[#fbfcfb] shadow-[0_36px_100px_-38px_rgba(8,38,33,0.55)]"
            >
                <header className="relative shrink-0 overflow-hidden border-b border-[#e6eeea] bg-white px-5 py-5 sm:px-8 sm:py-7">
                            <div className="relative flex items-start justify-between gap-4">
                        <div className="flex items-start gap-3.5">
                            <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-[#eaf6f1] text-[#3730a3] ring-1 ring-inset ring-[#d4eae0]">
                                <BookOpen className="h-5 w-5" />
                            </div>
                            <div>
                                <p className="mb-1 text-[9px] font-extrabold uppercase tracking-[0.18em] text-[#0d8b7e]">The people behind ATLAS</p>
                                <h2 id="team-dialog-title" className="text-lg font-extrabold tracking-[-0.035em] text-[#1e1b4b] sm:text-xl">Meet the team</h2>
                                <p className="mt-1 max-w-lg text-xs leading-5 text-[#71817d]">A small team building better tools for academic scheduling.</p>
                            </div>
                        </div>
                        <motion.button
                            type="button"
                            onClick={onClose}
                            whileHover={{ rotate: 90, backgroundColor: "#f1f6f3" }}
                            whileTap={{ scale: 0.92 }}
                            transition={{ duration: 0.18 }}
                            className="grid h-9 w-9 shrink-0 place-items-center rounded-xl text-[#81918c] transition-colors hover:text-[#294943] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4338ca]/40"
                            aria-label="Close team dialog"
                        ><X className="h-4 w-4" /></motion.button>
                    </div>
                </header>

                <div className="overflow-y-auto px-5 py-5 sm:px-8 sm:py-7">
                    <div className="grid gap-3.5 md:grid-cols-3">
                        {teamMembers.map((member, index) => (
                            <motion.article
                                key={member.initials}
                                initial={reduceMotion ? false : { opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ ...transition, delay: reduceMotion ? 0 : index * 0.055 }}
                                whileHover={reduceMotion ? undefined : { y: -3 }}
                                className={`group relative flex min-h-[370px] flex-col overflow-hidden rounded-2xl border bg-[#fffefa] shadow-[0_5px_18px_-16px_rgba(20,57,51,0.35)] transition-shadow duration-200 hover:shadow-[0_16px_30px_-24px_rgba(20,57,51,0.32)] ${member.lead ? "border-[#bdcec5]" : "border-[#e2e7e1]"}`}
                            >
                                <div className="border-b border-[#e7e9df] bg-[#f4f3eb] px-4 py-3">
                                    <div className="flex items-center justify-between gap-3">
                                        <div className="flex items-center gap-2 text-[#566a61]">
                                            <BookOpen className="h-3.5 w-3.5" />
                                            <span className="text-[9px] font-bold uppercase tracking-[0.14em]">ATLAS · Academic Timetabling</span>
                                        </div>
                                        <span className="font-mono text-[10px] font-semibold tabular-nums text-[#89948c]">0{index + 1}</span>
                                    </div>
                                </div>

                                <div className="flex flex-1 flex-col p-4 sm:p-5">
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="flex min-w-0 items-center gap-3">
                                            <div className="relative grid h-[58px] w-[58px] shrink-0 place-items-center border border-[#d6ddd3] bg-[#f7f7f1] font-serif text-lg font-bold tracking-[-0.06em] text-[#315d50]">
                                                <span>{member.initials}</span>
                                                <span className="absolute bottom-1 left-1 right-1 h-px bg-[#ccd6cd]" />
                                            </div>
                                            <div className="min-w-0">
                                                <p className="mb-1 text-[8px] font-bold uppercase tracking-[0.14em] text-[#89948c]">Project team</p>
                                                <h3 className="font-serif text-[17px] font-bold leading-tight tracking-[-0.025em] text-[#203f35]">{member.name}</h3>
                                            </div>
                                        </div>

                                        <div className="shrink-0 pt-0.5" aria-hidden="true">
                                            <p className="mb-1.5 text-center font-mono text-[7px] font-semibold tracking-[0.1em] text-[#9aa299]">WEEK</p>
                                            <div className="grid grid-cols-5 gap-[3px]">
                                                {Array.from({ length: 20 }, (_, cell) => (
                                                    <span key={cell} className={`h-[7px] w-[8px] border ${member.scheduleMark.includes(cell) ? "border-[#668777] bg-[#668777]" : "border-[#dce1d8] bg-[#fbfbf8]"}`} />
                                                ))}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="mt-4 border-l-2 border-[#8eae99] pl-3">
                                        <p className="text-[11px] font-bold leading-[1.55] text-[#315d50]">{member.role}</p>
                                        <p className="mt-1 text-[10px] font-medium text-[#829087]">{member.subRole}</p>
                                    </div>

                                    <p className="mt-4 flex-1 text-[11px] leading-[1.75] text-[#66736b]">{member.description}</p>

                                    <div className="mt-4 border-t border-[#e7e9df] pt-3">
                                        <p className="mb-2 text-[8px] font-bold uppercase tracking-[0.14em] text-[#89948c]">Contribution areas</p>
                                        <ul className="grid grid-cols-2 gap-x-3 gap-y-1.5">
                                            {member.skills.map((skill) => (
                                                <li key={skill} className="flex min-w-0 items-start gap-1.5 text-[9px] font-medium leading-4 text-[#52675c]"><span className="mt-[5px] h-1 w-1 shrink-0 bg-[#739381]" /><span>{skill}</span></li>
                                            ))}
                                        </ul>
                                    </div>
                                </div>
                            </motion.article>
                        ))}
                    </div>
                </div>

                <footer className="flex shrink-0 flex-col gap-3 border-t border-[#e7eeeb] bg-white/80 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-8">
                    <p className="flex items-center gap-1.5 text-[11px] font-medium text-[#879791]">Built for academic institutions, with <Heart className="h-3 w-3 fill-[#e47777] text-[#e47777]" /> by ATLAS.</p>
                    <motion.button
                        type="button"
                        onClick={onClose}
                        whileHover={{ y: -1 }}
                        whileTap={{ scale: 0.98 }}
                        className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-[#1e1b4b] px-4 text-xs font-bold text-white transition-colors hover:bg-[#3730a3] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4338ca]/50 focus-visible:ring-offset-2"
                    >Close</motion.button>
                </footer>
            </motion.section>
        </motion.div>,
        document.body
    );
}
