import React from 'react';

export function LicensePlate({ plate, className = '', size = 'md' }: { plate?: string, className?: string, size?: 'sm' | 'md' | 'lg' }) {
  if (!plate) {
    return (
      <div
        className={`font-mono font-bold px-3 py-1.5 rounded-lg tracking-wider uppercase shrink-0 shadow-sm flex items-center justify-center ${className}`}
        style={{
          background: 'var(--t-surface-elevated)',
          color: 'var(--t-text-primary)',
          border: '1px solid var(--t-border-default)',
          fontSize: size === 'sm' ? '0.875rem' : size === 'lg' ? '1.25rem' : '1rem',
        }}
      >
        БЕЗ НОМЕРА
      </div>
    );
  }

  const heightClass = size === 'sm' ? 'h-7' : size === 'lg' ? 'h-12' : 'h-9';
  const textClass = size === 'sm' ? 'text-sm' : size === 'lg' ? 'text-2xl' : 'text-lg';
  const barWidth = size === 'sm' ? 'w-5' : size === 'lg' ? 'w-8' : 'w-6';
  const uaTextSize = size === 'sm' ? 'text-[8px]' : size === 'lg' ? 'text-[12px]' : 'text-[10px]';
  const iconSize = size === 'sm' ? 'w-2.5 h-2.5' : size === 'lg' ? 'w-4 h-4' : 'w-3 h-3';

  const formatPlate = (p: string) => {
    const clean = p.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
    if (clean.length === 8) {
      return `${clean.slice(0, 2)} ${clean.slice(2, 6)} ${clean.slice(6, 8)}`;
    }
    return p.toUpperCase();
  };

  return (
    <div 
      className={`flex items-stretch rounded border border-gray-900 overflow-hidden bg-white shrink-0 shadow-sm ${heightClass} ${className}`}
      style={{
        boxShadow: '0 1px 3px rgba(0,0,0,0.1), inset 0 1px 2px rgba(255,255,255,0.8)',
      }}
    >
      {/* Left Ukraine bar */}
      <div className={`flex flex-col shrink-0 border-r border-gray-300 ${barWidth}`}>
        <div className="flex-1 bg-[#0057B7] flex items-center justify-center relative">
          <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent"></div>
          {/* Stylized Tryzub */}
          <svg viewBox="0 0 24 32" className={`${iconSize} text-[#FFD700] fill-none stroke-current relative z-10`} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2 L12 30" />
            <path d="M12 2 C8 2, 7 8, 7 14 C7 18, 9 20, 12 20 C15 20, 17 18, 17 14 C17 8, 16 2, 12 2 Z" />
            <path d="M5 12 L5 18 C5 24, 7 28, 12 30 C17 28, 19 24, 19 18 L19 12" />
          </svg>
        </div>
        <div className="flex-1 bg-[#FFD700] flex items-center justify-center relative">
          <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent"></div>
          <span className={`text-black font-bold font-sans tracking-tight relative z-10 ${uaTextSize}`} style={{ lineHeight: 1 }}>UA</span>
        </div>
      </div>
      {/* Main plate text */}
      <div className="flex-1 flex items-center justify-center px-3 bg-gradient-to-b from-white via-gray-50 to-gray-100">
        <span className={`text-gray-900 font-mono font-bold tracking-widest leading-none drop-shadow-sm ${textClass}`}>
          {formatPlate(plate)}
        </span>
      </div>
    </div>
  );
}
