import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { ErrorDetails, createErrorDetails } from './errorUtils';
import { ErrorModal } from './errorModal';

interface ErrorContextValue {
  showError: (details: ErrorDetails) => void;
}

const ErrorContext = createContext<ErrorContextValue | null>(null);

export function useErrorModal() {
  const ctx = useContext(ErrorContext);
  if (!ctx) throw new Error('useErrorModal must be used within ErrorProvider');
  return ctx;
}

export function ErrorProvider({ children }: { children: React.ReactNode }) {
  const [error, setError] = useState<ErrorDetails | null>(null);

  const showError = useCallback((details: ErrorDetails) => {
    setError(details);
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

  return (
    <ErrorContext.Provider value={{ showError }}>
      {children}
      {error && <ErrorModal error={error} dismiss={dismiss} />}
    </ErrorContext.Provider>
  );
}
