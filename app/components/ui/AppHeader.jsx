'use client';

import React from 'react';
import { Calendar, Sparkles, RefreshCw, Home, Layers, Check, Beaker } from 'lucide-react';
import ExportButton from '../ExportButton.jsx';
import ShimmerButton from './ShimmerButton.jsx';

const STAGES = [
  { id: 1, name: 'Import', label: 'Data Upload' },
  { id: 2, name: 'Rules', label: 'Configure' },
  { id: 3, name: 'Engine', label: 'Diagnostics' },
  { id: 4, name: 'Studio', label: '2D Scheduler' },
  { id: 5, name: 'Export', label: 'Analytics' },
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
}) {
  return (
    <header className="sticky top-0 z-50 bg-[#f5f7f6]/95 backdrop-blur-md border-b border-[#b8ccc8] shadow-xs min-h-14 flex items-center py-2">
      <div className="max-w-[1520px] w-full mx-auto px-4 sm:px-6 flex flex-wrap items-center justify-between gap-3">
        {/* Left: Brand Identity & View Switcher */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => onViewChange('home')}>
            <div className="w-8 h-8 rounded-lg bg-[#0d9488] flex items-center justify-center text-white shadow-xs font-bold shrink-0">
              <Calendar className="w-4 h-4" />
            </div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-sm text-[#0f172a] tracking-tight whitespace-nowrap">
                ATLAS Engine v2.4
              </span>
              <span className="px-2 py-0.5 text-[10px] font-extrabold rounded-full bg-amber-100 text-amber-900 border border-amber-300 flex items-center gap-1 shadow-2xs">
                <Beaker className="w-3 h-3 text-amber-600" />
                <span>BETA TESTING</span>
              </span>
            </div>
          </div>

          {/* Navigation Mode Switcher Pills */}
          <div className="flex items-center gap-1 p-1 rounded-xl bg-[#d2dfdc]/70 border border-[#b8ccc8]">
            <button
              onClick={() => onViewChange('home')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-extrabold transition-all cursor-pointer ${
                activeView === 'home'
                  ? 'bg-white text-[#0f766e] shadow-2xs'
                  : 'text-[#64748b] hover:text-[#0f172a]'
              }`}
            >
              <Home className="w-3.5 h-3.5" />
              <span>Home</span>
            </button>
            <button
              onClick={() => onViewChange('studio')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-extrabold transition-all cursor-pointer ${
                activeView === 'studio'
                  ? 'bg-[#0d9488] text-white shadow-xs'
                  : 'text-[#64748b] hover:text-[#0f172a]'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Timetable Studio</span>
            </button>
          </div>
        </div>

        {/* Center: Smart Integrated 5-Stage Stepper Bar (Only when in Timetable Studio view) */}
        {activeView === 'studio' && (
          <div className="flex items-center gap-1 bg-[#d2dfdc]/60 p-1 rounded-xl border border-[#b8ccc8] overflow-x-auto no-scrollbar">
            {STAGES.map((stage, idx) => {
              const isCompleted = stage.id < activeStep;
              const isActive = stage.id === activeStep;
              const isUnlocked = stage.id <= maxUnlockedStep;

              return (
                <React.Fragment key={stage.id}>
                  <button
                    onClick={() => isUnlocked && onStepClick && onStepClick(stage.id)}
                    disabled={!isUnlocked}
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-extrabold transition-all shrink-0 ${
                      isActive
                        ? 'bg-[#ccfbf1] text-[#0f766e] border border-[#0d9488] shadow-2xs ring-1 ring-[#0d9488]/40'
                        : isCompleted
                        ? 'bg-[#0d9488]/15 text-[#0f766e] hover:bg-[#0d9488]/25'
                        : 'bg-white/60 text-[#64748b] opacity-60'
                    } ${isUnlocked ? 'cursor-pointer' : 'cursor-not-allowed'}`}
                  >
                    <div
                      className={`w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-extrabold ${
                        isActive
                          ? 'bg-[#0d9488] text-white'
                          : isCompleted
                          ? 'bg-[#0f766e] text-white'
                          : 'bg-[#b8ccc8] text-[#64748b]'
                      }`}
                    >
                      {isCompleted ? <Check className="w-2.5 h-2.5" /> : stage.id}
                    </div>
                    <span>{stage.name}</span>
                  </button>

                  {idx < STAGES.length - 1 && (
                    <span className="w-3 h-[1px] bg-[#b8ccc8] shrink-0" />
                  )}
                </React.Fragment>
              );
            })}
          </div>
        )}

        {/* Right: Actions */}
        <div className="flex items-center gap-2">
          {hasData && activeView === 'studio' && (
            <button
              onClick={onReset}
              className="flex items-center gap-1 px-2.5 py-1 text-xs font-bold text-[#64748b] hover:text-red-600 bg-white hover:bg-red-50 border border-[#b8ccc8] rounded-lg transition-all shadow-2xs"
              title="Reset System State"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Reset</span>
            </button>
          )}

          {hasData && activeView === 'studio' && (
            <ShimmerButton
              onClick={onGenerate}
              disabled={isGenerating}
              variant="primary"
              className="py-1.5 px-3.5 text-xs font-bold"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>{isGenerating ? 'Generating...' : 'Generate Engine'}</span>
            </ShimmerButton>
          )}

          {hasTimetable && activeView === 'studio' && (
            <ExportButton timetable={timetable} />
          )}

          {activeView === 'home' && (
            <ShimmerButton
              onClick={() => onViewChange('studio')}
              variant="primary"
              className="py-1.5 px-4 text-xs font-bold"
            >
              <span>Launch Studio</span>
            </ShimmerButton>
          )}
        </div>
      </div>
    </header>
  );
}
