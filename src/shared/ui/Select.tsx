import React, { useId } from 'react';

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  hint?: string;
  icon?: React.ReactNode;
  fullWidth?: boolean;
  options: { value: string; label: string }[];
  placeholder?: string;
}

export function Select({
  label,
  error,
  hint,
  icon,
  fullWidth = true,
  options,
  placeholder,
  className = '',
  style,
  id: propId,
  ...props
}: SelectProps) {
  const autoId = useId();
  const selectId = propId || autoId;

  return (
    <div className={`${fullWidth ? 'w-full' : ''}`}>
      {label && (
        <label
          htmlFor={selectId}
          className="block text-xs font-semibold uppercase tracking-wider mb-1.5"
          style={{ color: error ? 'var(--t-status-problem)' : 'var(--t-text-muted)' }}
        >
          {label}
        </label>
      )}
      <div className="relative">
        {icon && (
          <span
            className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center pointer-events-none"
            style={{ color: 'var(--t-text-muted)' }}
          >
            {icon}
          </span>
        )}
        <select
          id={selectId}
          className={`
            w-full rounded-xl py-3 text-sm font-medium
            border outline-none transition-all
            appearance-none cursor-pointer
            t-focus
            ${icon ? 'pl-10' : 'pl-4'}
            pr-10
            ${className}
          `.trim()}
          style={{
            background: 'var(--t-surface-input)',
            color: 'var(--t-text-primary)',
            borderColor: error ? 'var(--t-status-problem)' : 'var(--t-border-default)',
            ...style,
          }}
          {...props}
        >
          {placeholder && (
            <option value="" disabled>
              {placeholder}
            </option>
          )}
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        {/* Chevron icon */}
        <span
          className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none"
          style={{ color: 'var(--t-text-muted)' }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="m6 9 6 6 6-6" />
          </svg>
        </span>
      </div>
      {(error || hint) && (
        <p
          className="mt-1 text-xs font-medium"
          style={{ color: error ? 'var(--t-status-problem)' : 'var(--t-text-muted)' }}
        >
          {error || hint}
        </p>
      )}
    </div>
  );
}
