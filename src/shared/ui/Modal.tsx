import React, { useEffect, useRef, useCallback } from 'react';
import { X } from '@shared/icons/Icons';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  title?: string;
  maxWidth?: string;
  closeOnOverlay?: boolean;
  showClose?: boolean;
  className?: string;
  contentClassName?: string;
}

export function Modal({
  open,
  onClose,
  children,
  title,
  maxWidth = '28rem',
  closeOnOverlay = true,
  showClose = true,
  className = '',
  contentClassName = '',
}: ModalProps) {
  const contentRef = useRef<HTMLDivElement>(null);
  const previousFocus = useRef<HTMLElement | null>(null);

  // Escape key
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    }
  }, [onClose]);

  // Focus trap
  useEffect(() => {
    if (!open) return;

    previousFocus.current = document.activeElement as HTMLElement;
    document.addEventListener('keydown', handleKeyDown);
    document.body.style.overflow = 'hidden';

    // Focus first focusable element
    requestAnimationFrame(() => {
      const firstFocusable = contentRef.current?.querySelector<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      firstFocusable?.focus();
    });

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
      previousFocus.current?.focus();
    };
  }, [open, handleKeyDown]);

  if (!open) return null;

  return (
    <div className={`fixed inset-0 z-[10000] flex items-center justify-center p-4 ${className}`}>
      {/* Overlay */}
      <div
        className="absolute inset-0 animate-fade-in"
        style={{ background: 'var(--t-surface-overlay, rgba(0,0,0,0.6))', backdropFilter: 'blur(4px)' }}
        onClick={closeOnOverlay ? onClose : undefined}
      />

      {/* Content */}
      <div
        ref={contentRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`relative w-full rounded-2xl border shadow-2xl animate-scale-in ${contentClassName}`}
        style={{
          maxWidth,
          background: 'var(--t-surface-card)',
          borderColor: 'var(--t-border-default)',
        }}
      >
        {/* Header */}
        {(title || showClose) && (
          <div className="flex items-center justify-between p-4 pb-2">
            {title && (
              <h3
                className="text-lg font-bold"
                style={{ color: 'var(--t-text-primary)' }}
              >
                {title}
              </h3>
            )}
            {showClose && (
              <button
                onClick={onClose}
                className="w-8 h-8 flex items-center justify-center rounded-full transition-all active:scale-95 ml-auto"
                style={{
                  background: 'var(--t-surface-elevated)',
                  color: 'var(--t-text-muted)',
                }}
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        )}

        {/* Body */}
        <div className="p-4 pt-2 overflow-y-auto" style={{ maxHeight: '70vh' }}>
          {children}
        </div>
      </div>
    </div>
  );
}
