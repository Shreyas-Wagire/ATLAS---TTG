'use client';

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  BarChart3,
  ClipboardCheck,
  BookOpen,
  Building2,
  Check,
  Cpu,
  Home,
  LayoutGrid,
  MonitorPlay,
  RefreshCw,
  Settings,
  Sparkles,
  Upload,
  Zap,
} from 'lucide-react';
import ExportButton from '../ExportButton.jsx';
import ShimmerButton from './ShimmerButton.jsx';

const STAGES = [
  { id: 1, name: 'Stage 1', label: 'Import Data', icon: Upload },
  { id: 2, name: 'Stage 2', label: 'Configure Rules', icon: Settings },
  { id: 3, name: 'Stage 3', label: 'Engine Diagnostics', icon: Cpu },
  { id: 4, name: 'Stage 4', label: 'Scheduler Studio', icon: MonitorPlay },
  { id: 5, name: 'Stage 5', label: 'Review & Refine', icon: ClipboardCheck },
  { id: 6, name: 'Stage 6', label: 'Analytics & Export', icon: BarChart3 },
];

const interaction = {
  whileHover: { y: -1 },
  whileTap: { scale: 0.97 },
  transition: { type: 'spring', stiffness: 460, damping: 30 },
};

function ViewSwitcher({ activeView, onViewChange, compact = false }) {
  return (
    <nav aria-label="Main navigation" className={`flex items-center gap-1 rounded-2xl border border-[#e3ebe8] bg-[#f5f8f6] p-1 ${compact ? 'w-full' : ''}`}>
      {[
        { id: 'home', label: 'Home', icon: Home },
        { id: 'semesters', label: 'Semesters', icon: LayoutGrid },
      ].map(({ id, label, icon: Icon }) => {
        const selected = activeView === id;
        return (
          <motion.button
            key={id}
            type="button"
            aria-current={selected ? 'page' : undefined}
            onClick={() => onViewChange?.(id)}
            {...interaction}
            className={`relative flex min-h-9 flex-1 items-center justify-center gap-2 rounded-xl px-3.5 text-xs font-bold transition-colors duration-200 ${selected ? 'text-[#1e1b4b]' : 'text-[#788984] hover:text-[#294943]'}`}
          >
            {selected && <motion.span layoutId="header-view-active" className="absolute inset-0 rounded-xl border border-white bg-white shadow-[0_2px_8px_rgba(28,66,57,0.08)]" transition={{ type: 'spring', stiffness: 420, damping: 34 }} />}
            <Icon className="relative h-3.5 w-3.5" />
            <span className="relative">{label}</span>
          </motion.button>
        );
      })}
    </nav>
  );
}

export default function AppHeader({
  activeView = 'studio',
  onViewChange,
  activeStep = 1,
  maxUnlockedStep = 1,
  onStepClick,
  hasData = false,
  canGenerate = true,
  hasTimetable = false,
  stats = {},
  onReset,
  onGenerate,
  isGenerating = false,
  timetable = null,
  activeSemester = null,
  departments = [],
  selectedDepartment = '',
  onDepartmentChange,
}) {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const visibleStages = STAGES.filter((stage) => stage.id !== 1);

  return (
    <header className={`sticky top-0 z-50 w-full border-b transition-[background-color,border-color,box-shadow] duration-300 ${scrolled ? 'navbar-scrolled border-[#cbd9d5]/80 shadow-[0_8px_28px_-22px_rgba(20,55,49,0.45)]' : 'border-[#e3ebe8] bg-white/90 backdrop-blur-2xl'}`}>
      <div className="mx-auto grid min-h-[68px] max-w-[1520px] grid-cols-[1fr_auto] items-center gap-x-4 gap-y-3 px-4 py-2.5 sm:px-6 lg:grid-cols-[1fr_auto_1fr] lg:px-8">
        <div className="flex min-w-0 items-center gap-3 sm:gap-4">
          <motion.button
            type="button"
            onClick={() => onViewChange?.('home')}
            whileHover={{ y: -1 }}
            whileTap={{ scale: 0.97 }}
            aria-label="ATLAS Engine home"
            className="group flex shrink-0 items-center gap-2.5 rounded-xl text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4338ca]/50 focus-visible:ring-offset-2"
          >
            <span className="flex items-baseline gap-1.5">
              <span className="whitespace-nowrap text-[13px] font-extrabold tracking-[-0.04em] text-[#1e1b4b] sm:text-[15px]">ATLAS <span className="hidden font-medium tracking-[-0.02em] text-[#71817d] sm:inline">Engine</span></span>
              <span className="hidden rounded-md border border-[#e0e9e5] bg-[#f5f8f6] px-1.5 py-0.5 text-[9px] font-bold text-[#667873] sm:inline">v6.7</span>
            </span>
          </motion.button>

          <span className="hidden h-7 w-px bg-[#e5ece9] xl:block" />
          <span className="hidden items-center gap-1.5 rounded-full border border-[#dcebe5] bg-[#f5faf7] px-3 py-1.5 text-[11px] font-bold text-[#49645e] xl:flex">
            <span className="h-1.5 w-1.5 rounded-full bg-[#4338ca]" />
            Engine <span className="text-[#9aa9a4]">/</span> <span className="text-[#3730a3]">New</span>
          </span>

          {activeSemester && (
            <div className="hidden min-w-0 items-center gap-2 rounded-xl border border-[#e3ebe8] bg-white/80 px-3 py-1.5 shadow-[0_2px_10px_rgba(20,55,49,0.035)] md:flex">
              <BookOpen className="h-3.5 w-3.5 shrink-0 text-[#4338ca]" />
              <span className="max-w-[130px] truncate text-[11px] font-bold text-[#425d56]">{activeSemester.name}</span>
              <span className="rounded-md bg-[#e8f4ef] px-1.5 py-0.5 text-[9px] font-extrabold text-[#3730a3]">AY {activeSemester.academicYear || 'Workspace'}</span>
            </div>
          )}
        </div>

        <div className="hidden xl:block xl:w-[220px]">
          <ViewSwitcher activeView={activeView} onViewChange={onViewChange} />
        </div>

        <div className="flex items-center justify-end gap-1.5 sm:gap-2 lg:justify-self-end">
          {activeView === 'studio' && (
            <>
              {hasData && (
                <motion.button
                  type="button"
                  onClick={onReset}
                  title="Reset system state"
                  aria-label="Reset system state"
                  whileHover={{ y: -1, color: '#b42318', borderColor: '#fecaca' }}
                  whileTap={{ scale: 0.96 }}
                  className="inline-flex h-10 items-center gap-2 rounded-xl border border-[#e3ebe8] bg-white px-3 text-xs font-semibold text-[#71817d] transition-colors duration-200 hover:bg-red-50"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Reset</span>
                </motion.button>
              )}
              {hasData && canGenerate && (
                <ShimmerButton onClick={onGenerate} disabled={isGenerating} variant="primary" className="h-10 px-3.5 text-xs font-extrabold sm:px-4">
                  <Sparkles className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">{isGenerating ? 'Generating…' : 'Generate Engine'}</span>
                  <span className="sm:hidden">Generate</span>
                </ShimmerButton>
              )}
              {hasTimetable && <ExportButton timetable={timetable} />}
            </>
          )}

          {activeView === 'semesters' && (
            <>
              <div className="hidden items-center gap-2 rounded-full border border-[#dcebe5] bg-[#f5faf7] px-3 py-2 text-[11px] font-bold text-[#477568] sm:flex">
                <span className="relative flex h-2 w-2"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-50" /><span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" /></span>
                Engine active
              </div>
              <ShimmerButton onClick={() => onViewChange?.('home')} variant="secondary" className="h-10 px-3.5 text-xs font-extrabold">
                <Home className="h-3.5 w-3.5" /><span>Overview</span>
              </ShimmerButton>
            </>
          )}

          {activeView === 'home' && (
            <ShimmerButton onClick={() => onViewChange?.('semesters')} variant="primary" className="h-10 px-3.5 text-xs font-extrabold sm:px-4">
              <Zap className="h-3.5 w-3.5" /><span>Explore Semesters</span>
            </ShimmerButton>
          )}
        </div>

        <div className="col-span-2 xl:hidden">
          <ViewSwitcher activeView={activeView} onViewChange={onViewChange} compact />
        </div>
      </div>

      {activeView === 'studio' && activeStep > 1 && (
        <div className="border-t border-[#e9efec] bg-[#fbfcfb]/90">
          <div className="mx-auto flex max-w-[1520px] flex-col gap-2 px-4 py-2.5 sm:px-6 lg:flex-row lg:items-center lg:gap-5 lg:px-8">
            {departments.length > 0 && (
              <nav aria-label="Department workspaces" className="flex shrink-0 items-center gap-1 overflow-x-auto no-scrollbar lg:border-r lg:border-[#e6eeea] lg:pr-4">
                <span className="mr-1 hidden items-center gap-1.5 px-1 text-[9px] font-extrabold uppercase tracking-[0.12em] text-[#9aa9a4] lg:flex"><Building2 className="h-3 w-3" /> Workspace</span>
                {departments.map((department) => {
                  const selected = department === selectedDepartment;
                  return (
                    <motion.button
                      key={department}
                      type="button"
                      aria-pressed={selected}
                      onClick={() => onDepartmentChange?.(department)}
                      whileHover={{ y: -1 }}
                      whileTap={{ scale: 0.96 }}
                      className={`relative shrink-0 rounded-lg px-3 py-2 text-[11px] font-bold transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4338ca]/40 ${selected ? 'text-[#3730a3]' : 'text-[#7b8b86] hover:bg-white hover:text-[#294943]'}`}
                    >
                      {selected && <motion.span layoutId="active-department-pill" transition={{ type: 'spring', stiffness: 420, damping: 34 }} className="absolute inset-0 rounded-lg border border-[#cce8df] bg-[#eaf6f1] shadow-[0_2px_8px_rgba(55,48,163,0.08)]" />}
                      <span className="relative">{department}</span>
                    </motion.button>
                  );
                })}
              </nav>
            )}

            <nav aria-label="Timetable stages" className="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto no-scrollbar">
              {visibleStages.map((stage, index) => {
                const isCompleted = stage.id < activeStep;
                const isActive = stage.id === activeStep;
                const isUnlocked = stage.id <= maxUnlockedStep;
                const StageIcon = stage.icon;
                return (
                  <React.Fragment key={stage.id}>
                    <motion.button
                      type="button"
                      onClick={() => isUnlocked && onStepClick?.(stage.id)}
                      disabled={!isUnlocked}
                      aria-current={isActive ? 'step' : undefined}
                      whileHover={isUnlocked ? { y: -1 } : undefined}
                      whileTap={isUnlocked ? { scale: 0.97 } : undefined}
                      transition={{ type: 'spring', stiffness: 430, damping: 30 }}
                      className={`relative flex min-h-10 shrink-0 items-center gap-2 rounded-xl px-3 py-1.5 text-left transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4338ca]/40 ${isActive ? 'text-[#3730a3]' : isCompleted ? 'text-[#4f8075] hover:bg-[#eef7f3]' : 'text-[#a0afaa]'} ${isUnlocked ? 'cursor-pointer' : 'cursor-not-allowed'}`}
                    >
                      {isActive && <motion.span layoutId="active-stage-pill" transition={{ type: 'spring', stiffness: 420, damping: 34 }} className="absolute inset-0 rounded-xl border border-[#d5eae2] bg-white shadow-[0_3px_12px_rgba(24,66,57,0.07)]" />}
                      <span className={`relative grid h-6 w-6 shrink-0 place-items-center rounded-lg transition-colors duration-200 ${isActive ? 'bg-[#4338ca] text-white shadow-[0_3px_8px_rgba(13,148,136,0.22)]' : isCompleted ? 'bg-[#e3f2eb] text-[#3730a3]' : 'bg-[#edf2f0] text-[#a0afaa]'}`}>
                        {isCompleted ? <Check className="h-3.5 w-3.5" /> : <StageIcon className="h-3.5 w-3.5" />}
                      </span>
                      <span className="relative flex flex-col leading-tight">
                        <span className="text-[10px] font-extrabold">{stage.name}</span>
                        <span className="mt-0.5 whitespace-nowrap text-[10px] font-medium opacity-75">{stage.label}</span>
                      </span>
                    </motion.button>
                    {index < visibleStages.length - 1 && <span aria-hidden="true" className="h-px min-w-3 flex-1 bg-gradient-to-r from-[#dce8e3] to-[#e8efec]" />}
                  </React.Fragment>
                );
              })}
            </nav>
          </div>
        </div>
      )}
    </header>
  );
}
