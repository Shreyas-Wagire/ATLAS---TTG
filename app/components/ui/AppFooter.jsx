'use client';

import React, { useState } from 'react';
import { CheckCircle2, Cpu, Users, Heart } from 'lucide-react';
import TeamModal from './TeamModal';

export default function AppFooter() {
  const [showTeamModal, setShowTeamModal] = useState(false);

  return (
    <>
      <footer className="bg-[#f8fafb] border-t border-[#e2e8f0] py-3 px-6 text-xs text-[#94a3b8] mt-auto">
        <div className="max-w-[1520px] mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          {/* Left: System Health & Version */}
          <div className="flex items-center gap-3 font-medium text-[11px]">
            <span className="flex items-center gap-1.5 text-emerald-600 font-semibold">
              <CheckCircle2 className="w-3.5 h-3.5" />
              All Systems Operational
            </span>
            <span className="text-[#e2e8f0]">|</span>
            <span className="flex items-center gap-1.5 font-bold text-[#334155]">
              <Cpu className="w-3.5 h-3.5 text-[#0d9488]" />
              ATLAS Engine v4.5 Turbo
            </span>
          </div>

          {/* Center: Premium Team Showcase Trigger (Replaced shortcuts) */}
          <div className="flex items-center">
            <button
              onClick={() => setShowTeamModal(true)}
              className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white hover:bg-[#ccfbf1]/50 text-[#0f766e] border border-[#b8ccc8]/80 hover:border-[#0d9488]/40 transition-all duration-200 text-xs font-extrabold shadow-2xs hover:shadow-xs group cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
              title="Meet the Development Team"
            >
              <Users className="w-3.5 h-3.5 text-[#0d9488] group-hover:scale-110 transition-transform" />
              <span>Meet the Development Team</span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            </button>
          </div>

          {/* Right: Edition & Institutional Label */}
          <div className="text-[11px] font-medium text-[#94a3b8]">
            <span>Automatic Timetable Generator System</span>
            <span className="mx-2 text-[#e2e8f0]">|</span>
            <span className="font-semibold text-[#64748b]">Enterprise v4.5</span>
          </div>
        </div>
      </footer>

      {/* Development Team Modal */}
      <TeamModal isOpen={showTeamModal} onClose={() => setShowTeamModal(false)} />
    </>
  );
}
