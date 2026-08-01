'use client';

import React from 'react';
import {
  Calendar,
  Sparkles,
  RefreshCw,
  Home,
  Check,
  ChevronLeft,
  BookOpen,
  Cpu,
  Zap,
  LayoutGrid,
  Upload,
  Settings,
  MonitorPlay,
  BarChart3,
  Plus,
} from 'lucide-react';
import ExportButton from '../ExportButton.jsx';
import ShimmerButton from './ShimmerButton.jsx';

const STAGES = [
  { id: 1, name: 'Stage 1', label: 'Import Data', icon: Upload },
  { id: 2, name: 'Stage 2', label: 'Configure Rules', icon: Settings },
  { id: 3, name: 'Stage 3', label: 'Engine Diagnostics', icon: Cpu },
  { id: 4, name: 'Stage 4', label: 'Scheduler Studio', icon: MonitorPlay },
  { id: 5, name: 'Stage 5', label: 'Analytics & Export', icon: BarChart3 },
];

export default function AppHeader({
  activeView = 'studio',
  onViewChange,
  activeStep = 1,
  maxUnlockedStep = 1,
  onStepClick,
  hasData = false,
  hasTimetable = false,
  stats = {},
  onReset,
  onGenerate,
  isGenerating = false,
  timetable = null,
  activeSemester = null,
  onExitToSemesters,
}) {
  return (
    <header className="sticky top-0 z-50 w-full bg-gradient-to-b from-white via-white to-[#f0f4f3]/60 backdrop-blur-md border-b border-[#b8ccc8] shadow-[0_2px_10px_rgba(13,148,136,0.05)]">
      {/* ── ROW 1: Brand, View Navigation & Primary Actions ───────────── */}
      <div className="max-w-[1520px] w-full mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-4">
        {/* Left: Brand Identity & Semester Context */}
        <div className="flex items-center gap-3">
          {/* Official Brand Logo (Light PNG) */}
          <div
            className="flex items-center gap-2 cursor-pointer group select-none shrink-0"
            onClick={() => onViewChange?.('home')}
          >
            <img
              src="/atlas-logo-light.png"
              alt="ATLAS Logo"
              className="h-7 sm:h-8 w-auto object-contain group-hover:scale-105 transition-transform"
            />

            <div className="flex items-baseline gap-1.5">
              <span className="font-extrabold text-sm text-[#0f172a] tracking-tight whitespace-nowrap">
                <span className="text-[#0d9488]">Engine</span>
              </span>
              <span className="text-[10px] font-bold text-[#64748b] bg-[#ebf4f2] px-1.5 py-0.5 rounded-md border border-[#b8ccc8]/50">
                v3.4
              </span>

            </div>

            <span className="hidden sm:inline-flex items-center px-2 py-0.5 text-[9px] font-extrabold rounded-full bg-amber-100 text-amber-900 border border-amber-300 shadow-2xs">
              BETA
            </span>
          </div>

          {/* Active Semester Badge */}
          {activeSemester && (
            <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 bg-[#ccfbf1] border border-[#99f6e4] rounded-xl shrink-0">
              <BookOpen className="w-3.5 h-3.5 text-[#0d9488]" />
              <span className="text-[11px] font-extrabold text-[#0f766e] truncate max-w-[140px]">
                {activeSemester.name}
              </span>
              <span className="px-1.5 py-0.2 text-[9px] font-extrabold rounded-md bg-[#0d9488] text-white">
                SEM {activeSemester.semNumber}
              </span>
            </div>
          )}
        </div>

        {/* Center: Navigation Mode Switcher */}
        <div className="flex items-center gap-1 p-1 rounded-xl bg-[#ebf4f2] border border-[#b8ccc8] shadow-inner shrink-0">
          <button
            onClick={() => onViewChange?.('home')}
            className={`flex items-center gap-1.5 px-3.5 py-1 rounded-lg text-xs font-extrabold transition-all cursor-pointer ${
              activeView === 'home'
                ? 'bg-white text-[#0f766e] shadow-2xs border border-[#b8ccc8]/40'
                : 'text-[#64748b] hover:text-[#0f172a]'
            }`}
          >
            <Home className="w-3.5 h-3.5" />
            <span>Home</span>
          </button>
          <button
            onClick={() => onViewChange?.('semesters')}
            className={`flex items-center gap-1.5 px-3.5 py-1 rounded-lg text-xs font-extrabold transition-all cursor-pointer ${
              activeView === 'semesters'
                ? 'bg-[#0d9488] text-white shadow-xs'
                : 'text-[#64748b] hover:text-[#0f172a]'
            }`}
          >
            <LayoutGrid className="w-3.5 h-3.5" />
            <span>Semesters</span>
          </button>
        </div>

        {/* Right: Contextual Actions & Status (No Dead Space!) */}
        <div className="flex items-center gap-2.5 shrink-0">
          {/* STUDIO VIEW ACTIONS */}
          {activeView === 'studio' && (
            <>
              {hasData && (
                <button
                  onClick={onReset}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-extrabold text-[#64748b] hover:text-red-600 bg-white hover:bg-red-50 border border-[#b8ccc8] hover:border-red-200 rounded-xl transition-all shadow-2xs cursor-pointer"
                  title="Reset System State"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Reset</span>
                </button>
              )}

              {hasData && (
                <ShimmerButton
                  onClick={onGenerate}
                  disabled={isGenerating}
                  variant="primary"
                  className="py-1.5 px-4 text-xs font-extrabold"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>{isGenerating ? 'Generating...' : 'Generate Engine'}</span>
                </ShimmerButton>
              )}

              {hasTimetable && (
                <ExportButton timetable={timetable} />
              )}
            </>
          )}

          {/* SEMESTERS VIEW ACTIONS */}
          {activeView === 'semesters' && (
            <div className="flex items-center gap-2">
              <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#ccfbf1]/60 border border-[#99f6e4] text-xs text-[#0f766e] font-extrabold">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>Engine Active</span>
              </div>
              <ShimmerButton
                onClick={() => onViewChange?.('home')}
                variant="secondary"
                className="py-1.5 px-3.5 text-xs font-extrabold"
              >
                <Home className="w-3.5 h-3.5" />
                <span>Overview</span>
              </ShimmerButton>
            </div>
          )}

          {/* HOME VIEW ACTIONS */}
          {activeView === 'home' && (
            <ShimmerButton
              onClick={() => onViewChange?.('semesters')}
              variant="primary"
              className="py-1.5 px-4 text-xs font-extrabold"
            >
              <Zap className="w-3.5 h-3.5" />
              <span>Explore Semesters</span>
            </ShimmerButton>
          )}
        </div>
      </div>

      {/* ── ROW 2: Dedicated Stage Pipeline Sub-Header (Studio View) ──── */}
      {activeView === 'studio' && (
        <div className="bg-[#ebf4f2] border-t border-[#b8ccc8] py-2">
          <div className="max-w-6xl w-full mx-auto px-4 sm:px-6 flex items-center justify-between gap-2 overflow-x-auto no-scrollbar">
            {STAGES.map((stage, idx) => {
              const isCompleted = stage.id < activeStep;
              const isActive = stage.id === activeStep;
              const isUnlocked = stage.id <= maxUnlockedStep;

              return (
                <React.Fragment key={stage.id}>
                  <button
                    onClick={() => isUnlocked && onStepClick?.(stage.id)}
                    disabled={!isUnlocked}
                    className={`flex items-center gap-2.5 px-3.5 py-1.5 rounded-xl text-xs font-extrabold transition-all duration-200 shrink-0 ${
                      isActive
                        ? 'bg-white text-[#0f766e] shadow-xs border border-[#0d9488]/40 ring-2 ring-[#0d9488]/20'
                        : isCompleted
                        ? 'bg-[#0d9488]/15 text-[#0f766e] border border-[#0d9488]/30 hover:bg-[#0d9488]/25'
                        : 'bg-white text-[#64748b] border border-[#b8ccc8] opacity-70'
                    } ${isUnlocked ? 'cursor-pointer' : 'cursor-not-allowed'}`}
                  >
                    <div
                      className={`w-5 h-5 rounded-lg flex items-center justify-center text-[10px] font-extrabold ${
                        isActive
                          ? 'bg-[#0d9488] text-white shadow-2xs'
                          : isCompleted
                          ? 'bg-[#0f766e] text-white'
                          : 'bg-[#b8ccc8] text-white'
                      }`}
                    >
                      {isCompleted ? <Check className="w-3 h-3" /> : stage.id}
                    </div>

                    <div className="flex flex-col text-left">
                      <span className="font-extrabold text-[11px] leading-tight">
                        {stage.name}
                      </span>
                      <span className="text-[10px] opacity-80 leading-tight">
                        {stage.label}
                      </span>
                    </div>
                  </button>

                  {idx < STAGES.length - 1 && (
                    <div className="w-6 h-[1px] bg-[#b8ccc8] shrink-0" />
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </div>
      )}
    </header>
  );
}
