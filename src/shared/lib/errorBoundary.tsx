import React from 'react';
import { Bug, AlertTriangle, Copy, Check } from '@shared/icons/Icons';
import { formatErrorForCopy, createErrorDetails } from './errorUtils';


interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  error: Error | null;
  copied: boolean;
}

export class AppErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { error: null, copied: false };
  }

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  handleCopyError = async () => {
    if (!this.state.error) return;
    const errorDetails = createErrorDetails(this.state.error, 'Критична помилка рендеру');
    const text = formatErrorForCopy(errorDetails);
    try {
      await navigator.clipboard.writeText(text);
      this.setState({ copied: true });
      setTimeout(() => this.setState({ copied: false }), 2000);
    } catch {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      document.body.appendChild(textarea);
      textarea.select();
      try {
        document.execCommand('copy');
      } catch (err) {
        console.error('Failed to copy: ', err);
      }
      document.body.removeChild(textarea);
      this.setState({ copied: true });
      setTimeout(() => this.setState({ copied: false }), 2000);
    }
  };

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
              Зробіть скріншот цього екрану або скопіюйте помилку
            </p>
            <div className="flex gap-3">
              <button
                onClick={this.handleCopyError}
                className="flex-1 py-3 rounded-xl font-semibold text-sm transition-all active:scale-[0.98] border flex items-center justify-center gap-2"
                style={{
                  borderColor: 'var(--t-border-default, #333)',
                  background: 'var(--t-surface-elevated, #2a2a3e)',
                  color: 'var(--t-text-primary, #eee)',
                }}
              >
                {this.state.copied ? (
                  <>
                    <Check className="w-4 h-4" />
                    Скопійовано
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    Скопіювати
                  </>
                )}
              </button>
              <button
                onClick={() => {
                  this.setState({ error: null });
                  window.location.reload();
                }}
                className="flex-1 py-3 rounded-xl font-semibold text-sm transition-all active:scale-[0.98]"
                style={{
                  background: 'var(--t-accent-primary, #6366f1)',
                  color: 'var(--t-text-on-accent, #fff)',
                }}
              >
                Перезавантажити
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
