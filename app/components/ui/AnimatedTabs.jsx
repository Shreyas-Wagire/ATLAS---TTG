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
    <div className={`relative flex gap-1 p-1 rounded-xl bg-[#f3f6f5] border border-[#e1e9e6] ${className}`}>
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onChange(tab.id)}
            aria-pressed={isActive}
            className={`relative flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-lg transition-colors duration-200 z-10 ${
              isActive ? 'text-[#174a42] font-bold' : 'text-[#71817d] hover:text-[#243d39]'
            }`}
          >
            {isActive && (
              <motion.div
                layoutId="activeTabPill"
                className="absolute inset-0 bg-white rounded-lg shadow-xs border border-[#e1e9e6] -z-10"
                transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              />
            )}
            {tab.icon && (
              React.isValidElement(tab.icon) ? (
                tab.icon
              ) : typeof tab.icon === 'function' || (typeof tab.icon === 'object' && tab.icon?.$$typeof) ? (
                <tab.icon className="w-3.5 h-3.5" />
              ) : typeof tab.icon === 'string' ? (
                <span className="text-sm">{tab.icon}</span>
              ) : null
            )}
            <span>{tab.label}</span>
            {tab.badge !== undefined && (
              <span
                className={`px-1.5 py-0.5 text-[10px] rounded-full font-bold ${
                  isActive
                    ? 'bg-[#e3f1eb] text-[#3e6c5e]'
                    : 'bg-[#e8eeeb] text-[#879590]'
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
