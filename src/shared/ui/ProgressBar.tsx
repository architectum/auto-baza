import React from 'react';

interface ProgressBarProps {
  progress: number;
  className?: string;
  showLabel?: boolean;
}

export function ProgressBar({ progress, className = '', showLabel = true }: ProgressBarProps) {
  const clampedProgress = Math.min(100, Math.max(0, progress));

  return (
    <div className={`w-full ${className}`}>
      {showLabel && (
        <div className="flex justify-between items-center mb-1 text-xs font-semibold" style={{ color: 'var(--t-text-secondary)' }}>
          <span>Завантаження...</span>
          <span className="font-mono">{clampedProgress}%</span>
        </div>
      )}
      <div 
        className="w-full h-1.5 rounded-full overflow-hidden" 
        style={{ background: 'var(--t-surface-input, #222)' }}
      >
        <div 
          className="h-full rounded-full transition-all duration-300 ease-out"
          style={{ 
            width: `${clampedProgress}%`,
            background: 'linear-gradient(90deg, var(--t-accent-gradient-from, #3b82f6), var(--t-accent-gradient-to, #60a5fa))'
          }}
        />
      </div>
    </div>
  );
}
