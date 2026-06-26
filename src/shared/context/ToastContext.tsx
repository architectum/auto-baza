import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';
import { ToastContainer } from '../ui/Toast';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface ToastMessage {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastContextValue {
  toast: {
    success: (msg: string) => void;
    error: (msg: string) => void;
    info: (msg: string) => void;
    warning: (msg: string) => void;
  };
  toasts: ToastMessage[];
  removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const addToast = useCallback((message: string, type: ToastType) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts(prev => {
      const next = [...prev, { id, message, type }];
      if (next.length > 5) {
        next.shift();
      }
      return next;
    });

    const duration = type === 'success' ? 3000 : type === 'error' ? 5000 : 4000;
    setTimeout(() => {
      removeToast(id);
    }, duration);
  }, [removeToast]);

  const toastApi = useMemo(() => ({
    success: (msg: string) => addToast(msg, 'success'),
    error: (msg: string) => addToast(msg, 'error'),
    info: (msg: string) => addToast(msg, 'info'),
    warning: (msg: string) => addToast(msg, 'warning'),
  }), [addToast]);

  return (
    <ToastContext.Provider value={{ toast: toastApi, toasts, removeToast }}>
      {children}
      <ToastContainer />
    </ToastContext.Provider>
  );
}
