import { useState } from 'react';
import { X, Copy, Check, AlertTriangle, Bug } from '@shared/icons/Icons';
import { ErrorDetails, formatErrorForCopy } from './errorUtils';


interface ErrorModalProps {
  error: ErrorDetails;
  dismiss: () => void;
}

export function ErrorModal({ error, dismiss }: ErrorModalProps) {
  const [copied, setCopied] = useState(false);

  const copyErrorToClipboard = async () => {
    const text = formatErrorForCopy(error);
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback
      const textarea = document.createElement('textarea');
      textarea.value = text;
      document.body.appendChild(textarea);
      textarea.select();
      try {
        document.execCommand('copy');
      } catch (err) {
        console.error('Failed to copy text: ', err);
      }
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center"
      style={{ animation: 'fadeIn 0.15s ease-out' }}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0"
        style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
        onClick={dismiss}
      />

      {/* Modal */}
      <div
        className="relative w-full max-w-lg mx-4 mb-4 sm:mb-0 rounded-2xl border overflow-hidden"
        style={{
          background: 'var(--t-surface-card, #1a1a2e)',
          borderColor: 'var(--t-status-problem, #ff4444)',
          boxShadow: '0 0 40px -10px rgba(255,68,68,0.3), 0 25px 50px -12px rgba(0,0,0,0.5)',
          animation: 'errorModalSlideUp 0.25s ease-out',
          maxHeight: '85dvh',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Header */}
        <div
          className="flex items-center gap-3 px-5 py-4 border-b shrink-0"
          style={{
            background: 'var(--t-status-problem-bg, rgba(255,68,68,0.1))',
            borderColor: 'color-mix(in srgb, var(--t-status-problem, #ff4444) 20%, transparent)',
          }}
        >
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
            style={{
              background: 'var(--t-status-problem, #ff4444)',
              color: '#fff',
            }}
          >
            <Bug className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <h2
              className="font-bold text-base truncate"
              style={{ color: 'var(--t-status-problem, #ff4444)' }}
            >
              {error.title}
            </h2>
            <p
              className="text-xs font-mono truncate mt-0.5"
              style={{ color: 'var(--t-text-muted, #888)' }}
            >
              {error.timestamp}
            </p>
          </div>
          <button
            onClick={dismiss}
            className="w-9 h-9 rounded-xl flex items-center justify-center transition-all active:scale-90 shrink-0"
            style={{
              background: 'var(--t-surface-elevated, #2a2a3e)',
              color: 'var(--t-text-muted, #888)',
            }}
          >
            <X className="w-4.5 h-4.5" />
          </button>
        </div>

        {/* Scrollable content */}
        <div
          className="overflow-y-auto px-5 py-4 flex-1"
          style={{ overscrollBehavior: 'contain' }}
        >
          {/* Error message */}
          <div className="mb-4">
            <div
              className="text-xs font-semibold uppercase tracking-wider mb-1.5"
              style={{ color: 'var(--t-text-muted, #888)' }}
            >
              Повідомлення
            </div>
            <div
              className="text-sm font-medium p-3 rounded-xl border whitespace-pre-wrap break-words"
              style={{
                background: 'var(--t-surface-input, #151525)',
                color: 'var(--t-text-primary, #eee)',
                borderColor: 'var(--t-border-default, #333)',
                lineHeight: 1.6,
              }}
            >
              {error.message}
            </div>
          </div>

          {/* Operation & Path */}
          {(error.operation || error.path) && (
            <div className="grid grid-cols-2 gap-3 mb-4">
              {error.operation && (
                <div>
                  <div
                    className="text-xs font-semibold uppercase tracking-wider mb-1"
                    style={{ color: 'var(--t-text-muted, #888)' }}
                  >
                    Операція
                  </div>
                  <div
                    className="text-sm font-mono font-medium px-3 py-2 rounded-lg"
                    style={{
                      background: 'var(--t-surface-elevated, #2a2a3e)',
                      color: 'var(--t-text-secondary, #bbb)',
                    }}
                  >
                    {error.operation}
                  </div>
                </div>
              )}
              {error.path && (
                <div>
                  <div
                    className="text-xs font-semibold uppercase tracking-wider mb-1"
                    style={{ color: 'var(--t-text-muted, #888)' }}
                  >
                    Шлях
                  </div>
                  <div
                    className="text-sm font-mono font-medium px-3 py-2 rounded-lg truncate"
                    style={{
                      background: 'var(--t-surface-elevated, #2a2a3e)',
                      color: 'var(--t-text-secondary, #bbb)',
                    }}
                  >
                    {error.path}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Extra info */}
          {error.extra && Object.keys(error.extra).length > 0 && (
            <div className="mb-4">
              <div
                className="text-xs font-semibold uppercase tracking-wider mb-1.5"
                style={{ color: 'var(--t-text-muted, #888)' }}
              >
                Додаткові дані
              </div>
              <div
                className="text-xs font-mono p-3 rounded-xl border whitespace-pre-wrap break-all"
                style={{
                  background: 'var(--t-surface-input, #151525)',
                  color: 'var(--t-text-secondary, #bbb)',
                  borderColor: 'var(--t-border-default, #333)',
                  lineHeight: 1.7,
                  maxHeight: '120px',
                  overflowY: 'auto',
                }}
              >
                {JSON.stringify(error.extra, null, 2)}
              </div>
            </div>
          )}

          {/* Stack trace */}
          {error.stack && (
            <div className="mb-2">
              <div
                className="text-xs font-semibold uppercase tracking-wider mb-1.5"
                style={{ color: 'var(--t-text-muted, #888)' }}
              >
                Стек виклику
              </div>
              <div
                className="text-[11px] font-mono p-3 rounded-xl border whitespace-pre-wrap break-all"
                style={{
                  background: 'var(--t-surface-input, #151525)',
                  color: 'var(--t-text-muted, #888)',
                  borderColor: 'var(--t-border-default, #333)',
                  lineHeight: 1.6,
                  maxHeight: '150px',
                  overflowY: 'auto',
                }}
              >
                {error.stack}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          className="flex items-center gap-3 px-5 py-4 border-t shrink-0"
          style={{
            borderColor: 'var(--t-border-default, #333)',
            background: 'var(--t-surface-elevated, #2a2a3e)',
          }}
        >
          <div className="flex items-center gap-1.5 flex-1 min-w-0">
            <AlertTriangle className="w-3.5 h-3.5 shrink-0" style={{ color: 'var(--t-text-muted, #888)' }} />
            <span
              className="text-xs truncate"
              style={{ color: 'var(--t-text-muted, #888)' }}
            >
              Зробіть скріншот для розробника
            </span>
          </div>
          <button
            onClick={copyErrorToClipboard}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all active:scale-95 shrink-0"
            style={{
              background: copied
                ? 'var(--t-status-solution-bg, rgba(34,197,94,0.15))'
                : 'var(--t-accent-primary, #6366f1)',
              color: copied
                ? 'var(--t-status-solution, #22c55e)'
                : 'var(--t-text-on-accent, #fff)',
            }}
          >
            {copied ? (
              <>
                <Check className="w-4 h-4" />
                Скопійовано
              </>
            ) : (
              <>
                <Copy className="w-4 h-4" />
                Копіювати
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
