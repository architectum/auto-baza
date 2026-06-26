import React, { useEffect, useRef, useState, useCallback } from 'react';
import { X } from '@shared/icons/Icons';

interface BottomSheetProps {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  title?: string;
  showHandle?: boolean;
  showClose?: boolean;
  maxHeight?: string;
  className?: string;
}

export function BottomSheet({
  open,
  onClose,
  children,
  title,
  showHandle = true,
  showClose = true,
  maxHeight = '85dvh',
  className = '',
}: BottomSheetProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const sheetRef = useRef<HTMLDivElement>(null);
  const startY = useRef(0);
  const currentY = useRef(0);

  // Open/close animation
  useEffect(() => {
    if (open) {
      setIsVisible(true);
      requestAnimationFrame(() => {
        requestAnimationFrame(() => setIsAnimating(true));
      });
      document.body.style.overflow = 'hidden';
    } else {
      setIsAnimating(false);
      const timer = setTimeout(() => {
        setIsVisible(false);
        document.body.style.overflow = '';
      }, 300);
      return () => clearTimeout(timer);
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  // Escape key
  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [open, onClose]);

  // Swipe down to dismiss
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    startY.current = e.touches[0].clientY;
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    currentY.current = e.touches[0].clientY;
    const diff = currentY.current - startY.current;
    if (diff > 0 && sheetRef.current) {
      sheetRef.current.style.transform = `translateY(${diff}px)`;
    }
  }, []);

  const handleTouchEnd = useCallback(() => {
    const diff = currentY.current - startY.current;
    if (sheetRef.current) {
      sheetRef.current.style.transform = '';
    }
    if (diff > 100) {
      onClose();
    }
  }, [onClose]);

  if (!isVisible) return null;

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 z-50 transition-opacity duration-300"
        style={{
          background: 'var(--t-surface-overlay, rgba(0,0,0,0.6))',
          opacity: isAnimating ? 1 : 0,
        }}
        onClick={onClose}
      />

      {/* Sheet */}
      <div
        ref={sheetRef}
        className={`fixed inset-x-0 bottom-0 z-50 transition-transform duration-300 ease-out ${className}`}
        style={{
          maxHeight,
          transform: isAnimating ? 'translateY(0)' : 'translateY(100%)',
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <div
          className="rounded-t-3xl border-t safe-bottom overflow-y-auto"
          style={{
            background: 'var(--t-surface-card)',
            borderColor: 'var(--t-border-default)',
            maxHeight,
          }}
        >
          {/* Handle */}
          {showHandle && (
            <div className="flex justify-center pt-3 pb-1">
              <div
                className="w-10 h-1 rounded-full"
                style={{ background: 'var(--t-border-default)' }}
              />
            </div>
          )}

          {/* Header */}
          {(title || showClose) && (
            <div className="flex items-center justify-between px-5 pt-2 pb-2">
              {title && (
                <h2
                  className="text-lg font-bold"
                  style={{ color: 'var(--t-text-primary)' }}
                >
                  {title}
                </h2>
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

          {/* Content */}
          <div className="px-5 pb-6">
            {children}
          </div>
        </div>
      </div>
    </>
  );
}
