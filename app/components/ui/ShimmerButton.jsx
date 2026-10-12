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
    if (variant === 'success') return '#147c65';
    if (variant === 'secondary') return '#ffffff';
    return '#1e1b4b';
  };

  const getTextColor = () => {
    if (variant === 'secondary') return '#3730a3';
    return '#ffffff';
  };

  const getShadow = () => {
    if (variant === 'secondary') return '0 1px 3px rgba(13,148,136,0.06)';
    return '0 5px 14px rgba(19, 61, 55, 0.12), 0 1px 2px rgba(0, 0, 0, 0.04)';
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`group relative inline-flex items-center justify-center gap-2 overflow-hidden rounded-xl px-5 py-2.5 font-semibold text-sm transition-all duration-200 hover:brightness-105 hover:shadow-md active:scale-[0.985] disabled:opacity-50 disabled:pointer-events-none cursor-pointer ${className}`}
      style={{
        background: getGradient(),
        color: getTextColor(),
        boxShadow: getShadow(),
        border: variant === 'secondary' ? '1px solid #e1e9e6' : '1px solid transparent',
      }}
    >
      <span className="relative z-10 flex items-center gap-2">{children}</span>
    </button>
  );
}
