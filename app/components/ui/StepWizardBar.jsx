'use client';

import React from 'react';
import { Upload, Sliders, Cpu, Calendar, BarChart3, Check } from 'lucide-react';

const STAGES = [
  { id: 1, name: 'Stage 1', label: 'Import Data', icon: Upload },
  { id: 2, name: 'Stage 2', label: 'Configure Rules', icon: Sliders },
  { id: 3, name: 'Stage 3', label: 'Engine Diagnostics', icon: Cpu },
  { id: 4, name: 'Stage 4', label: 'Scheduler Studio', icon: Calendar },
  { id: 5, name: 'Stage 5', label: 'Analytics & Export', icon: BarChart3 },
];

export default function StepWizardBar({ activeStep, maxUnlockedStep, onStepClick }) {
  return (
    <div className="bg-[#f0f4f3] border-b border-[#b8ccc8] py-2.5">
      <div className="max-w-[1520px] mx-auto px-6">
        <div className="flex items-center justify-between gap-2 overflow-x-auto no-scrollbar">
          {STAGES.map((stage, idx) => {
            const Icon = stage.icon;
            const isCompleted = stage.id < activeStep;
            const isActive = stage.id === activeStep;
            const isUnlocked = stage.id <= maxUnlockedStep;

            return (
              <React.Fragment key={stage.id}>
                <button
                  onClick={() => isUnlocked && onStepClick(stage.id)}
                  disabled={!isUnlocked}
                  className={`flex items-center gap-2.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all duration-200 shrink-0 ${
                    isActive
                      ? 'bg-[#ccfbf1] text-[#0f766e] border border-[#0d9488] shadow-xs ring-2 ring-[#0d9488]/30'
                      : isCompleted
                      ? 'bg-[#0d9488]/15 text-[#0f766e] border border-[#0d9488]/40 hover:bg-[#0d9488]/25'
                      : 'bg-white text-[#64748b] border border-[#b8ccc8] opacity-70'
                  } ${isUnlocked ? 'cursor-pointer' : 'cursor-not-allowed'}`}
                >
                  <div
                    className={`w-5 h-5 rounded-lg flex items-center justify-center text-[10px] font-extrabold ${
                      isActive
                        ? 'bg-[#0d9488] text-white'
                        : isCompleted
                        ? 'bg-[#0f766e] text-white'
                        : 'bg-[#b8ccc8] text-[#64748b]'
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
    </div>
  );
}
