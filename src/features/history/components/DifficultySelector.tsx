import React from 'react';

interface DifficultySelectorProps {
  difficulty: number;
  onChange: (level: number) => void;
  size?: 'sm' | 'md';
}

export function DifficultySelector({ difficulty, onChange, size = 'md' }: DifficultySelectorProps) {
  const btnSize = size === 'sm' ? 'w-8 h-8' : 'w-9 h-9';
  
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map(level => (
        <button
          key={level}
          type="button"
          onClick={() => onChange(level)}
          className={`${btnSize} rounded-lg text-sm font-bold transition-all active:scale-90`}
          style={{
            background: difficulty >= level
              ? `color-mix(in srgb, #f97316 ${20 + level * 16}%, transparent)`
              : 'var(--t-surface-elevated)',
            color: difficulty >= level ? '#f97316' : 'var(--t-text-muted)',
            border: difficulty >= level ? '1px solid color-mix(in srgb, #f97316 30%, transparent)' : '1px solid transparent',
          }}
        >
          {level}
        </button>
      ))}
    </div>
  );
}
