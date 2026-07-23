'use client';

import React from 'react';

export default function ShimmerButton({
  children,
  onClick,
  disabled = false,
  className = '',
  variant = 'primary', // 'primary' | 'secondary' | 'success'
  type = 'button',
}) {
  const getGradient = () => {
    if (variant === 'success') return 'linear-gradient(135deg, #10b981 0%, #059669 100%)';
    if (variant === 'secondary') return 'linear-gradient(135deg, #ffffff 0%, #f4f9f8 100%)';
    return 'linear-gradient(135deg, #0d9488 0%, #0f766e 100%)';
  };

  const getTextColor = () => {
    if (variant === 'secondary') return '#0f766e';
    return '#ffffff';
  };

  const getShadow = () => {
    if (variant === 'secondary') return '0 1px 3px rgba(13,148,136,0.08)';
    return '0 4px 14px rgba(13, 148, 136, 0.35)';
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`group relative inline-flex items-center justify-center gap-2 overflow-hidden rounded-xl px-5 py-2.5 font-bold text-xs transition-all duration-300 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none cursor-pointer ${className}`}
      style={{
        background: getGradient(),
        color: getTextColor(),
        boxShadow: getShadow(),
        border: variant === 'secondary' ? '1px solid #d3e6e2' : 'none',
      }}
    >
      {/* Shimmer light sweep animation */}
      <span
        className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-in-out pointer-events-none opacity-30"
        style={{
          background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.9), transparent)',
        }}
      />
      <span className="relative z-10 flex items-center gap-2">{children}</span>
    </button>
  );
}
