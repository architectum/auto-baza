import React, { useId, useRef, useEffect, useCallback } from 'react';

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  hint?: string;
  autoGrow?: boolean;
  minRows?: number;
  maxRows?: number;
  fullWidth?: boolean;
}

export function Textarea({
  label,
  error,
  hint,
  autoGrow = true,
  minRows = 2,
  maxRows = 8,
  fullWidth = true,
  className = '',
  style,
  id: propId,
  onChange,
  value,
  ...props
}: TextareaProps) {
  const autoId = useId();
  const textareaId = propId || autoId;
  const ref = useRef<HTMLTextAreaElement>(null);

  const adjustHeight = useCallback(() => {
    if (!autoGrow || !ref.current) return;
    const el = ref.current;
    el.style.height = 'auto';
    const lineHeight = parseFloat(getComputedStyle(el).lineHeight) || 24;
    const minHeight = lineHeight * minRows + 24; // padding
    const maxHeight = lineHeight * maxRows + 24;
    el.style.height = `${Math.min(Math.max(el.scrollHeight, minHeight), maxHeight)}px`;
  }, [autoGrow, minRows, maxRows]);

  useEffect(() => {
    adjustHeight();
  }, [value, adjustHeight]);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onChange?.(e);
    adjustHeight();
  };

  return (
    <div className={`${fullWidth ? 'w-full' : ''}`}>
      {label && (
        <label
          htmlFor={textareaId}
          className="block text-xs font-semibold uppercase tracking-wider mb-1.5"
          style={{ color: error ? 'var(--t-status-problem)' : 'var(--t-text-muted)' }}
        >
          {label}
        </label>
      )}
      <textarea
        ref={ref}
        id={textareaId}
        value={value}
        onChange={handleChange}
        rows={minRows}
        className={`
          w-full rounded-xl px-4 py-3 text-sm font-medium
          border outline-none transition-all resize-none
          t-focus
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
