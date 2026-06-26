import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import { PromptDialog } from '../ui/PromptDialog';

interface DialogContextValue {
  confirm: (message: string, title?: string) => Promise<boolean>;
  prompt: (message: string, defaultValue?: string, title?: string) => Promise<string | null>;
}

const DialogContext = createContext<DialogContextValue | null>(null);

export function useDialog() {
  const ctx = useContext(DialogContext);
  if (!ctx) throw new Error('useDialog must be used within DialogProvider');
  return ctx;
}

export function DialogProvider({ children }: { children: React.ReactNode }) {
  const [confirmState, setConfirmState] = useState<{
    isOpen: boolean;
    message: string;
    title: string;
    resolve: (val: boolean) => void;
  } | null>(null);

  const [promptState, setPromptState] = useState<{
    isOpen: boolean;
    message: string;
    defaultValue: string;
    title: string;
    resolve: (val: string | null) => void;
  } | null>(null);

  const confirm = useCallback((message: string, title = 'Підтвердження') => {
    return new Promise<boolean>((resolve) => {
      setConfirmState({ isOpen: true, message, title, resolve });
    });
  }, []);

  const prompt = useCallback((message: string, defaultValue = '', title = 'Введення даних') => {
    return new Promise<string | null>((resolve) => {
      setPromptState({ isOpen: true, message, defaultValue, title, resolve });
    });
  }, []);

  const handleConfirmClose = useCallback((value: boolean) => {
    if (confirmState) {
      confirmState.resolve(value);
      setConfirmState(null);
    }
  }, [confirmState]);

  const handlePromptClose = useCallback((value: string | null) => {
    if (promptState) {
      promptState.resolve(value);
      setPromptState(null);
    }
  }, [promptState]);

  const api = useMemo(() => ({ confirm, prompt }), [confirm, prompt]);

  return (
    <DialogContext.Provider value={api}>
      {children}
      {confirmState && (
        <ConfirmDialog
          title={confirmState.title}
          message={confirmState.message}
          onClose={handleConfirmClose}
        />
      )}
      {promptState && (
        <PromptDialog
          title={promptState.title}
          message={promptState.message}
          defaultValue={promptState.defaultValue}
          onClose={handlePromptClose}
        />
      )}
    </DialogContext.Provider>
  );
}
