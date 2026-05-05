import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import { X, Copy, Check, AlertTriangle, Bug } from 'lucide-react';

// ── Error details shape ──
export interface ErrorDetails {
  title: string;
  message: string;
  operation?: string;
  path?: string;
  stack?: string;
  timestamp: string;
  extra?: Record<string, unknown>;
}

// ── Context ──
interface ErrorContextValue {
  showError: (details: ErrorDetails) => void;
}

const ErrorContext = createContext<ErrorContextValue | null>(null);

export function useErrorModal() {
  const ctx = useContext(ErrorContext);
  if (!ctx) throw new Error('useErrorModal must be used within ErrorProvider');
  return ctx;
}

// ── Provider + Modal ──
export function ErrorProvider({ children }: { children: React.ReactNode }) {
  const [error, setError] = useState<ErrorDetails | null>(null);
  const [copied, setCopied] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);

  const showError = useCallback((details: ErrorDetails) => {
    setError(details);
    setCopied(false);
  }, []);

  const dismiss = useCallback(() => {
    setError(null);
  }, []);

  // Close on Escape key
  useEffect(() => {
    if (!error) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') dismiss();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [error, dismiss]);

  // Global unhandled error handlers
  useEffect(() => {
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      event.preventDefault();
      const err = event.reason;
      showError(createErrorDetails(
        err,
        'Необроблена помилка (Promise)',
        'unhandledrejection'
      ));
    };

    const handleGlobalError = (event: ErrorEvent) => {
      // Avoid duplicate reports for errors already caught by React boundary
      if (event.message === 'Script error.' && !event.filename) return;
      event.preventDefault();
      showError(createErrorDetails(
        event.error || new Error(event.message),
        'Глобальна помилка',
        'window.onerror',
        event.filename ? `${event.filename}:${event.lineno}:${event.colno}` : undefined
      ));
    };

    window.addEventListener('unhandledrejection', handleUnhandledRejection);
    window.addEventListener('error', handleGlobalError);
    return () => {
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
      window.removeEventListener('error', handleGlobalError);
    };
  }, [showError]);

  const copyErrorToClipboard = async () => {
    if (!error) return;
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
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <ErrorContext.Provider value={{ showError }}>
      {children}
      {error && (
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
            ref={modalRef}
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
      )}
    </ErrorContext.Provider>
  );
}

// ── Error Boundary ──
interface ErrorBoundaryProps {
  children: React.ReactNode;
}
interface ErrorBoundaryState {
  error: Error | null;
}

export class AppErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  render() {
    if (this.state.error) {
      const err = this.state.error;
      return (
        <div
          className="min-h-dvh flex items-center justify-center p-6"
          style={{ background: 'var(--t-surface-bg, #0f0f1a)' }}
        >
          <div
            className="w-full max-w-md rounded-2xl border p-6"
            style={{
              background: 'var(--t-surface-card, #1a1a2e)',
              borderColor: 'var(--t-status-problem, #ff4444)',
            }}
          >
            <div className="flex items-center gap-3 mb-4">
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center"
                style={{ background: 'var(--t-status-problem, #ff4444)', color: '#fff' }}
              >
                <Bug className="w-6 h-6" />
              </div>
              <div>
                <h2
                  className="text-lg font-bold"
                  style={{ color: 'var(--t-status-problem, #ff4444)' }}
                >
                  Критична помилка
                </h2>
                <p className="text-xs" style={{ color: 'var(--t-text-muted, #888)' }}>
                  {new Date().toLocaleString('uk-UA')}
                </p>
              </div>
            </div>
            <div
              className="text-sm font-mono p-3 rounded-xl mb-4 whitespace-pre-wrap break-all"
              style={{
                background: 'var(--t-surface-input, #151525)',
                color: 'var(--t-text-primary, #eee)',
                lineHeight: 1.6,
              }}
            >
              {err.message}
            </div>
            {err.stack && (
              <div
                className="text-[11px] font-mono p-3 rounded-xl mb-4 whitespace-pre-wrap break-all"
                style={{
                  background: 'var(--t-surface-input, #151525)',
                  color: 'var(--t-text-muted, #888)',
                  maxHeight: '200px',
                  overflowY: 'auto',
                  lineHeight: 1.6,
                }}
              >
                {err.stack}
              </div>
            )}
            <p className="text-xs mb-4 flex items-center gap-1.5" style={{ color: 'var(--t-text-muted, #888)' }}>
              <AlertTriangle className="w-3.5 h-3.5" />
              Зробіть скріншот цього екрану для розробника
            </p>
            <button
              onClick={() => {
                this.setState({ error: null });
                window.location.reload();
              }}
              className="w-full py-3 rounded-xl font-semibold text-sm transition-all active:scale-[0.98]"
              style={{
                background: 'var(--t-accent-primary, #6366f1)',
                color: 'var(--t-text-on-accent, #fff)',
              }}
            >
              Перезавантажити
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// ── Helper: format error for clipboard ──
function formatErrorForCopy(error: ErrorDetails): string {
  let text = `=== ПОМИЛКА ===\n`;
  text += `Заголовок: ${error.title}\n`;
  text += `Час: ${error.timestamp}\n`;
  text += `Повідомлення: ${error.message}\n`;
  if (error.operation) text += `Операція: ${error.operation}\n`;
  if (error.path) text += `Шлях: ${error.path}\n`;
  if (error.extra) text += `Дані: ${JSON.stringify(error.extra, null, 2)}\n`;
  if (error.stack) text += `\nСтек:\n${error.stack}\n`;
  text += `===============\n`;
  return text;
}

// ── Helper: create ErrorDetails from any error ──
export function createErrorDetails(
  err: unknown,
  title: string,
  operation?: string,
  path?: string,
  extra?: Record<string, unknown>
): ErrorDetails {
  const isError = err instanceof Error;
  return {
    title,
    message: isError ? err.message : String(err),
    operation,
    path,
    stack: isError ? err.stack : undefined,
    timestamp: new Date().toLocaleString('uk-UA', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    }),
    extra,
  };
}
