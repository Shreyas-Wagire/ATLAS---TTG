'use client';

import React, { useState, useRef } from 'react';

export default function MagicCard({
  children,
  className = '',
  gradientColor = 'rgba(124, 91, 240, 0.15)',
  borderColor = 'var(--color-border)',
  style = {},
  onClick,
}) {
  const containerRef = useRef(null);
  const [position, setPosition] = useState({ x: -500, y: -500 });
  const [opacity, setOpacity] = useState(0);

  const handleMouseMove = (e) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    setPosition({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
  };

  const handleMouseEnter = () => setOpacity(1);
  const handleMouseLeave = () => setOpacity(0);

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={onClick}
      className={`relative overflow-hidden rounded-2xl bg-white border border-[var(--color-border)] shadow-md transition-all duration-300 hover:shadow-lg hover:border-[var(--color-accent-light)] ${className}`}
      style={{
        ...style,
      }}
    >
      {/* Spotlight glow effect */}
      <div
        className="pointer-events-none absolute -inset-px transition-opacity duration-300"
        style={{
          opacity,
          background: `radial-gradient(600px circle at ${position.x}px ${position.y}px, ${gradientColor}, transparent 40%)`,
        }}
      />
      <div className="relative z-10">{children}</div>
    </div>
  );
}
