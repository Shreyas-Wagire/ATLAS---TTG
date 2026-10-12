'use client';

import React, { useState } from 'react';
import { ArrowUpRight, Cpu, Users } from 'lucide-react';
import TeamModal from './TeamModal';

export default function AppFooter() {
  const [showTeamModal, setShowTeamModal] = useState(false);

  return (
    <>
      <footer className="relative mt-auto overflow-hidden border-t border-[#e5e7f1] bg-white">
        <div aria-hidden="true" className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#a5a0eb] to-transparent" />

        <div className="relative mx-auto grid max-w-[1520px] grid-cols-[1fr_auto] items-center gap-x-4 gap-y-3 px-5 py-4 sm:px-8 md:grid-cols-[1fr_auto_1fr] md:gap-8 md:py-4">
          <div className="flex min-w-0 items-center gap-2.5">
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-[#e2e2f3] bg-[#f5f5ff] text-[#4338ca]">
              <Cpu className="h-4 w-4" strokeWidth={1.8} />
            </span>
            <div>
              <div className="flex items-baseline gap-2">
                <span className="text-sm font-extrabold tracking-[0.04em] text-[#1e1b4b]">ATLAS</span>
                <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#8a8da7]">Engine · v6.7</span>
              </div>
              <p className="text-[10px] leading-3 text-[#777d96]">Academic schedules, thoughtfully coordinated.</p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setShowTeamModal(true)}
            className="group inline-flex min-h-8 w-fit items-center gap-2 rounded-lg border border-[#e5e7f1] bg-white px-2.5 text-[11px] font-semibold text-[#343751] transition duration-200 hover:-translate-y-0.5 hover:border-[#c8c5ee] hover:bg-[#fafaff] hover:text-[#3730a3] hover:shadow-[0_5px_14px_rgba(49,46,129,0.08)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4338ca]/30"
            title="Meet the development team"
          >
            <Users className="h-3.5 w-3.5 text-[#655cce] transition-transform duration-200 group-hover:scale-110" strokeWidth={1.8} />
            Meet the team
            <ArrowUpRight className="h-3.5 w-3.5 text-[#9294aa] transition-transform duration-200 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-[#4338ca]" />
          </button>

          <div className="col-span-2 flex items-center justify-between gap-4 border-t border-[#ececf4] pt-2.5 md:col-span-1 md:justify-self-end md:border-0 md:pt-0">
            <div className="flex items-center gap-2.5">
              <span className="relative flex h-2.5 w-2.5 items-center justify-center">
                <span className="absolute h-full w-full animate-ping rounded-full bg-[#8bc5a1] opacity-40" />
                <span className="relative h-1.5 w-1.5 rounded-full bg-[#4f9b6b]" />
              </span>
              <span className="text-xs font-semibold text-[#4b755e]">System operational</span>
            </div>
            <span className="text-[10px] font-medium uppercase tracking-[0.12em] text-[#9da2b5]">Timetable studio</span>
          </div>
        </div>
      </footer>

      <TeamModal isOpen={showTeamModal} onClose={() => setShowTeamModal(false)} />
    </>
  );
}
