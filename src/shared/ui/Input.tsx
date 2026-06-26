import React, { useId } from 'react';

interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'prefix'> {
  label?: string;
  error?: string;
  hint?: string;
  prefix?: React.ReactNode;
  suffix?: React.ReactNode;
  fullWidth?: boolean;
}

export function Input({
  label,
  error,
  hint,
  prefix,
  suffix,
  fullWidth = true,
  className = '',
  style,
  id: propId,
  ...props
}: InputProps) {
  const autoId = useId();
  const inputId = propId || autoId;

  return (
    <div className={`${fullWidth ? 'w-full' : ''}`}>
      {label && (
        <label
          htmlFor={inputId}
          className="block text-xs font-semibold uppercase tracking-wider mb-1.5"
          style={{ color: error ? 'var(--t-status-problem)' : 'var(--t-text-muted)' }}
        >
          {label}
        </label>
      )}
      <div className="relative">
        {prefix && (
          <span
            className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center pointer-events-none"
            style={{ color: 'var(--t-text-muted)' }}
          >
            {prefix}
          </span>
        )}
        <input
          id={inputId}
          className={`
            w-full rounded-xl py-3 text-sm font-medium
            border outline-none transition-all
            t-focus
            ${prefix ? 'pl-10' : 'pl-4'}
            ${suffix ? 'pr-10' : 'pr-4'}
            ${className}
          `.trim()}
          style={{
            background: 'var(--t-surface-input)',
            color: 'var(--t-text-primary)',
            borderColor: error ? 'var(--t-status-problem)' : 'var(--t-border-default)',
            ...style,
          }}
          {...props}
        />
        {suffix && (
          <span
            className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center"
            style={{ color: 'var(--t-text-muted)' }}
          >
            {suffix}
          </span>
        )}
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
