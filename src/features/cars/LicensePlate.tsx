import React from 'react';

export interface LicensePlateProps {
  plate?: string;
  country?: string;
  plateColor?: string;
  plateForm?: string;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export function LicensePlate({
  plate,
  country = 'UA',
  plateColor = 'white',
  plateForm = 'standard',
  className = '',
  size = 'md',
}: LicensePlateProps) {
  if (!plate) {
    return (
      <div
        className={`font-mono font-bold px-3 py-1.5 rounded-lg tracking-wider uppercase shrink-0 shadow-sm flex items-center justify-center ${className}`}
        style={{
          background: 'var(--t-surface-elevated)',
          color: 'var(--t-text-primary)',
          border: '1px solid var(--t-border-default)',
          fontSize: size === 'sm' ? '0.75rem' : size === 'lg' ? '1.125rem' : '0.875rem',
        }}
      >
        БЕЗ НОМЕРА
      </div>
    );
  }

  // Country display code
  const countryCode = (country || 'UA').toUpperCase();

  // Helper formatting for 1-line and 2-line plates
  const cleanPlate = plate.replace(/[^A-Za-z0-9]/g, '').toUpperCase();

  const is8Char = cleanPlate.length === 8;
  const line1 = is8Char ? cleanPlate.slice(0, 2) : cleanPlate.length > 4 ? cleanPlate.slice(0, Math.ceil(cleanPlate.length / 2)) : cleanPlate;
  const line2 = is8Char ? `${cleanPlate.slice(2, 6)} ${cleanPlate.slice(6, 8)}` : cleanPlate.length > 4 ? cleanPlate.slice(Math.ceil(cleanPlate.length / 2)) : '';

  const formatOneLine = (p: string) => {
    if (is8Char) {
      return `${cleanPlate.slice(0, 2)} ${cleanPlate.slice(2, 6)} ${cleanPlate.slice(6, 8)}`;
    }
    return p.toUpperCase();
  };

  // Color configurations
  const getColorStyles = (color: string) => {
    switch (color) {
      case 'yellow':
        return {
          bg: 'bg-amber-400',
          text: 'text-gray-950',
          border: 'border-gray-900',
          barBg: 'bg-[#002B7F]',
        };
      case 'red':
        return {
          bg: 'bg-red-700',
          text: 'text-white',
          border: 'border-red-950',
          barBg: 'bg-[#002B7F]',
        };
      case 'green':
        return {
          bg: 'bg-white',
          text: 'text-emerald-600',
          border: 'border-emerald-600',
          barBg: 'bg-[#002B7F]',
        };
      case 'black_military':
      case 'black_old':
        return {
          bg: 'bg-gray-900',
          text: 'text-white',
          border: 'border-gray-950',
          barBg: 'bg-gray-800',
        };
      case 'blue':
        return {
          bg: 'bg-blue-600',
          text: 'text-white',
          border: 'border-blue-900',
          barBg: 'bg-blue-800',
        };
      case 'white':
      default:
        return {
          bg: 'bg-white',
          text: 'text-gray-900',
          border: 'border-gray-900',
          barBg: 'bg-[#002B7F]',
        };
    }
  };

  const styleConfig = getColorStyles(plateColor);

  // Dimension classes based on size & form
  const isSquare = plateForm === 'square_us' || plateForm === 'square_moto';

  const containerHeight = isSquare
    ? size === 'sm' ? 'h-12 w-16' : size === 'lg' ? 'h-20 w-28' : 'h-16 w-22'
    : size === 'sm' ? 'h-7' : size === 'lg' ? 'h-12' : 'h-9';

  const mainTextSize = isSquare
    ? size === 'sm' ? 'text-xs' : size === 'lg' ? 'text-lg' : 'text-sm'
    : size === 'sm' ? 'text-xs font-bold' : size === 'lg' ? 'text-2xl font-bold' : 'text-lg font-bold';

  const barWidth = isSquare
    ? size === 'sm' ? 'w-full h-3 flex-row' : size === 'lg' ? 'w-full h-5 flex-row' : 'w-full h-4 flex-row'
    : size === 'sm' ? 'w-4.5 flex-col' : size === 'lg' ? 'w-8 flex-col' : 'w-6 flex-col';

  const countryTextSize = size === 'sm' ? 'text-[7px]' : size === 'lg' ? 'text-[11px]' : 'text-[9px]';

  // Render Flag/Stars icon for Left Bar
  const renderCountryBar = () => {
    const isEU = ['PL', 'D', 'LT', 'CZ', 'RO', 'MD', 'GB'].includes(countryCode);

    return (
      <div
        className={`flex items-center justify-between px-1 shrink-0 ${styleConfig.barBg} ${barWidth}`}
        style={{
          color: '#FFFFFF',
        }}
      >
        {/* Flag or EU symbol */}
        {isEU ? (
          <div className="flex items-center justify-center text-[8px] leading-none text-yellow-300">
            ★
          </div>
        ) : (
          <div className="flex items-center justify-center">
            {/* Ukrainian flag micro bar */}
            <div className="w-2.5 h-1.5 flex flex-col rounded-[1px] overflow-hidden">
              <div className="h-1/2 bg-[#0057B7]" />
              <div className="h-1/2 bg-[#FFD700]" />
            </div>
          </div>
        )}

        {/* Country code */}
        <span className={`font-bold font-sans tracking-tighter text-white ${countryTextSize}`}>
          {countryCode}
        </span>
      </div>
    );
  };

  // Render 2-line square layout (US / Moto)
  if (isSquare) {
    return (
      <div
        className={`flex flex-col rounded border overflow-hidden ${styleConfig.bg} ${styleConfig.border} shrink-0 shadow-sm ${containerHeight} ${className}`}
        style={{
          boxShadow: '0 1px 3px rgba(0,0,0,0.12), inset 0 1px 2px rgba(255,255,255,0.6)',
        }}
      >
        {/* Top country bar */}
        {renderCountryBar()}

        {/* 2-line content */}
        <div className={`flex-1 flex flex-col items-center justify-center px-1 font-mono font-bold leading-tight ${styleConfig.text} ${mainTextSize}`}>
          <span>{line1}</span>
          <span className="tracking-wider">{line2 || line1}</span>
        </div>
      </div>
    );
  }

  // Render 1-line standard horizontal layout
  return (
    <div
      className={`flex items-stretch rounded border overflow-hidden ${styleConfig.bg} ${styleConfig.border} shrink-0 shadow-sm ${containerHeight} ${className}`}
      style={{
        boxShadow: '0 1px 3px rgba(0,0,0,0.12), inset 0 1px 2px rgba(255,255,255,0.6)',
      }}
    >
      {/* Left side bar */}
      {renderCountryBar()}

      {/* Main plate text */}
      <div className={`flex-1 flex items-center justify-center px-2.5 font-mono tracking-widest leading-none drop-shadow-sm ${styleConfig.text} ${mainTextSize}`}>
        {formatOneLine(plate)}
      </div>
    </div>
  );
}
