import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Lock, Delete, ShieldCheck } from 'lucide-react';

/**
 * SHA-256 hash of PIN "2323"
 * Generated via: crypto.subtle.digest('SHA-256', new TextEncoder().encode('2323'))
 */
const PIN_HASH = '61503690505f84b144e6ac89124540a3eb8d22e77db76500984cfc50a1d8776e';

async function sha256(message: string): Promise<string> {
  const msgBuffer = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

const LOCK_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes

interface PinLockProps {
  children: React.ReactNode;
}

export function PinLockProvider({ children }: PinLockProps) {
  const [isLocked, setIsLocked] = useState(true);
  const [pin, setPin] = useState('');
  const [error, setError] = useState(false);
  const [checking, setChecking] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastActivityRef = useRef<number>(Date.now());

  const resetTimer = useCallback(() => {
    lastActivityRef.current = Date.now();
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      setIsLocked(true);
      setPin('');
      setError(false);
    }, LOCK_TIMEOUT_MS);
  }, []);

  // Set up activity listeners
  useEffect(() => {
    if (isLocked) return;

    resetTimer();

    const handleActivity = () => resetTimer();

    const events = ['touchstart', 'mousedown', 'keydown', 'scroll', 'mousemove'];
    events.forEach(e => window.addEventListener(e, handleActivity, { passive: true }));

    return () => {
      events.forEach(e => window.removeEventListener(e, handleActivity));
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [isLocked, resetTimer]);

  // Auto-check PIN when 4 digits entered
  useEffect(() => {
    if (pin.length === 4) {
      setChecking(true);
      sha256(pin).then(hash => {
        if (hash === PIN_HASH) {
          setIsLocked(false);
          setPin('');
          setError(false);
        } else {
          setError(true);
          setTimeout(() => {
            setPin('');
            setError(false);
          }, 600);
        }
        setChecking(false);
      });
    }
  }, [pin]);

  const handleDigit = (digit: string) => {
    if (pin.length >= 4 || checking) return;
    setError(false);
    setPin(prev => prev + digit);
  };

  const handleDelete = () => {
    if (checking) return;
    setError(false);
    setPin(prev => prev.slice(0, -1));
  };

  // Тимчасово вимкнено пін-код та автоблокування
  if (true || !isLocked) {
    return <>{children}</>;
  }

  return (
    <div
      className="fixed inset-0 z-[9999] flex flex-col items-center justify-center min-h-dvh select-none"
      style={{ background: 'var(--t-surface-bg)' }}
    >
      {/* Decorative gradient orbs */}
      <div
        className="absolute top-[-15%] right-[-10%] w-[55vw] h-[55vw] rounded-full opacity-15 blur-3xl pointer-events-none"
        style={{
          background: 'radial-gradient(circle, var(--t-accent-gradient-from), transparent 70%)',
        }}
      />
      <div
        className="absolute bottom-[-10%] left-[-15%] w-[45vw] h-[45vw] rounded-full opacity-10 blur-3xl pointer-events-none"
        style={{
          background: 'radial-gradient(circle, var(--t-secondary-gradient-from), transparent 70%)',
        }}
      />

      <div className="animate-fade-in-up relative z-10 flex flex-col items-center w-full max-w-xs px-6">
        {/* Lock icon */}
        <div
          className="w-20 h-20 rounded-3xl flex items-center justify-center mb-6 t-accent-gradient t-accent-shadow"
          style={{
            animation: error ? 'pinShake 0.4s ease-in-out' : undefined,
          }}
        >
          {error ? (
            <Lock className="w-10 h-10" style={{ color: 'var(--t-text-on-accent)' }} />
          ) : (
            <ShieldCheck className="w-10 h-10" style={{ color: 'var(--t-text-on-accent)' }} />
          )}
        </div>

        <h2
          className="text-xl font-bold tracking-tight mb-2 text-center"
          style={{ color: 'var(--t-text-primary)' }}
        >
          Введіть PIN-код
        </h2>
        <p
          className="text-sm text-center mb-8"
          style={{ color: 'var(--t-text-muted)' }}
        >
          Для доступу до додатку
        </p>

        {/* PIN dots */}
        <div
          className="flex items-center justify-center gap-4 mb-10"
          style={{ animation: error ? 'pinShake 0.4s ease-in-out' : undefined }}
        >
          {[0, 1, 2, 3].map(i => (
            <div
              key={i}
              className="w-4 h-4 rounded-full transition-all duration-200"
              style={{
                background: error
                  ? 'var(--t-status-problem)'
                  : pin.length > i
                    ? 'var(--t-accent-primary)'
                    : 'var(--t-border-default)',
                transform: pin.length > i ? 'scale(1.2)' : 'scale(1)',
                boxShadow: pin.length > i && !error
                  ? '0 0 12px var(--t-accent-shadow)'
                  : 'none',
              }}
            />
          ))}
        </div>

        {/* Numeric keypad */}
        <div className="grid grid-cols-3 gap-3 w-full">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'del'].map((key, idx) => {
            if (key === '') {
              return <div key={idx} />;
            }
            if (key === 'del') {
              return (
                <button
                  key={idx}
                  id="pin-delete-btn"
                  onClick={handleDelete}
                  className="aspect-square rounded-2xl flex items-center justify-center transition-all active:scale-90"
                  style={{
                    background: 'transparent',
                    color: 'var(--t-text-secondary)',
                  }}
                >
                  <Delete className="w-6 h-6" />
                </button>
              );
            }
            return (
              <button
                key={idx}
                id={`pin-key-${key}`}
                onClick={() => handleDigit(key)}
                className="aspect-square rounded-2xl flex items-center justify-center text-2xl font-semibold transition-all active:scale-90 border"
                style={{
                  background: 'var(--t-surface-card)',
                  color: 'var(--t-text-primary)',
                  borderColor: 'var(--t-border-default)',
                }}
              >
                {key}
              </button>
            );
          })}
        </div>
      </div>

      {/* Shake animation */}
      <style>{`
        @keyframes pinShake {
          0%, 100% { transform: translateX(0); }
          20% { transform: translateX(-10px); }
          40% { transform: translateX(10px); }
          60% { transform: translateX(-6px); }
          80% { transform: translateX(6px); }
        }
      `}</style>
    </div>
  );
}
