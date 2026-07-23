'use client';

import React from 'react';
import { CheckCircle2, Cpu } from 'lucide-react';

export default function AppFooter() {
  return (
    <footer className="bg-[#f5f7f6] border-t border-[#b8ccc8] py-2.5 px-6 text-xs text-[#64748b] mt-auto">
      <div className="max-w-[1520px] mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
        {/* System Health */}
        <div className="flex items-center gap-2 font-medium text-[11px]">
          <span className="flex items-center gap-1.5 text-emerald-700 font-bold">
            <CheckCircle2 className="w-3.5 h-3.5" />
            All Systems Operational
          </span>
          <span className="text-[#b8ccc8]">•</span>
          <span className="flex items-center gap-1 font-extrabold text-[#0f172a]">
            <Cpu className="w-3.5 h-3.5 text-[#0d9488]" />
            ATLAS Engine v2.4 Turbo
          </span>
        </div>

        {/* Keyboard Shortcuts */}
        <div className="hidden lg:flex items-center gap-4 text-[11px] font-medium text-[#64748b]">
          <div className="flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 text-[10px] font-mono bg-white border border-[#b8ccc8] rounded shadow-2xs">⌘/Ctrl + U</kbd>
            <span>Upload</span>
          </div>
          <div className="flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 text-[10px] font-mono bg-white border border-[#b8ccc8] rounded shadow-2xs">⌘/Ctrl + G</kbd>
            <span>Generate</span>
          </div>
        </div>

        {/* Version & Copyright */}
        <div className="text-[11px] font-medium text-[#64748b]">
          <span>Automatic Timetable Generator System</span>
          <span className="mx-2 text-[#b8ccc8]">•</span>
          <span className="font-bold text-[#0f172a]">Enterprise Edition</span>
        </div>
      </div>
    </footer>
  );
}
