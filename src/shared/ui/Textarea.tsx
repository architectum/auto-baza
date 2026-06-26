import React, { useId, useRef, useEffect, useCallback } from 'react';
import { useVoiceRecognition } from '../hooks/useVoiceRecognition';
import { Mic, Loader2, Square } from '../icons/Icons';

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  hint?: string;
  autoGrow?: boolean;
  minRows?: number;
  maxRows?: number;
  fullWidth?: boolean;
  enableVoice?: boolean;
  voiceContext?: 'car' | 'history' | 'client' | 'text';
  onVoiceInput?: (text: string) => void;
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
  enableVoice = false,
  voiceContext = 'text',
  onVoiceInput,
  ...props
}: TextareaProps) {
  const autoId = useId();
  const textareaId = propId || autoId;
  const ref = useRef<HTMLTextAreaElement>(null);

  const { isRecording, isProcessing, elapsedSeconds, start, stop } = useVoiceRecognition(
    voiceContext,
    (data) => {
      let transcribed = '';
      if (data && typeof data === 'object' && 'text' in data) {
        transcribed = data.text;
      } else if (typeof data === 'string') {
        transcribed = data;
      }
      if (transcribed && onVoiceInput) {
        onVoiceInput(transcribed);
      }
    }
  );

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

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
      <div className="relative">
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
            ${enableVoice ? 'pr-12' : ''}
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
        
        {enableVoice && (
          <div className="absolute top-2 right-2 flex items-center gap-1.5 z-10">
            {isRecording && (
              <span 
                className="text-[11px] font-bold tracking-wide px-1.5 py-0.5 rounded-md animate-pulse shrink-0" 
                style={{ color: 'var(--t-recording)', background: 'var(--t-recording-bg)' }}
              >
                {formatTime(elapsedSeconds)}
              </span>
            )}
            {isProcessing && (
              <span 
                className="text-[10px] font-semibold tracking-wide animate-pulse shrink-0" 
                style={{ color: 'var(--t-text-accent)' }}
              >
                Обробка...
              </span>
            )}
            <button
              type="button"
              onClick={isRecording ? stop : start}
              disabled={isProcessing}
              className={`
                w-8 h-8 rounded-full flex items-center justify-center 
                transition-all active:scale-90 outline-none relative shrink-0
                ${isProcessing ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}
              `.trim()}
              style={{
                background: isRecording
                  ? 'var(--t-recording)'
                  : isProcessing
                    ? 'var(--t-accent-primary-muted)'
                    : 'transparent',
                color: isRecording 
                  ? 'var(--t-text-on-accent)' 
                  : isProcessing 
                    ? 'var(--t-text-accent)' 
                    : 'var(--t-text-muted)',
                boxShadow: isRecording
                  ? '0 0 0 3px var(--t-recording-bg), 0 0 12px -2px var(--t-recording)'
                  : 'none',
              }}
              title={isRecording ? "Зупинити запис" : "Надиктувати текст"}
            >
              {isProcessing ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : isRecording ? (
                <Square className="w-3.5 h-3.5" style={{ fill: 'currentColor' }} />
              ) : (
                <Mic className="w-4 h-4 hover:text-[var(--t-text-secondary)]" />
              )}
            </button>
          </div>
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
