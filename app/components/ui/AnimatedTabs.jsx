'use client';

import React from 'react';
import { motion } from 'framer-motion';

export default function AnimatedTabs({
  tabs = [],
  activeTab,
  onChange,
  className = '',
}) {
  return (
    <div className={`relative flex gap-1.5 p-1.5 rounded-xl bg-[var(--color-surface-subtle)] border border-[var(--color-border)] ${className}`}>
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            className={`relative flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg transition-colors duration-200 z-10 ${
              isActive ? 'text-[var(--color-accent-dark)] font-bold' : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-heading)]'
            }`}
          >
            {isActive && (
              <motion.div
                layoutId="activeTabPill"
                className="absolute inset-0 bg-white rounded-lg shadow-sm border border-[var(--color-border)] -z-10"
                transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              />
            )}
            {tab.icon && <span className="text-sm">{tab.icon}</span>}
            <span>{tab.label}</span>
            {tab.badge !== undefined && (
              <span
                className={`px-1.5 py-0.5 text-[10px] rounded-full font-bold ${
                  isActive
                    ? 'bg-[var(--color-accent-bg)] color-[var(--color-accent-dark)]'
                    : 'bg-[var(--color-border)] text-[var(--color-text-muted)]'
                }`}
              >
                {tab.badge}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
