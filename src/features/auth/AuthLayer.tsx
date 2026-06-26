import React, { useEffect } from 'react';
import { useAuth } from '@shared/context/AuthContext';
import { Wrench } from '@shared/icons/Icons';
import { Logo } from '@shared/ui/Logo';
import { useErrorModal } from '@shared/lib/errorContext';
import { createErrorDetails } from '@shared/lib/errorUtils';


export function AuthLayer({ children }: { children: React.ReactNode }) {
  const { user, loading, loginError, clearLoginError, signIn } = useAuth();
  const { showError } = useErrorModal();

  // Show login errors in the modal
  useEffect(() => {
    if (loginError) {
      showError(createErrorDetails(
        loginError,
        'Помилка авторизації',
        'Google Sign-In',
        undefined,
        { authProvider: 'Google' }
      ));
      clearLoginError();
    }
  }, [loginError, showError, clearLoginError]);

  if (loading) {
    return (
      <div
        className="min-h-dvh flex items-center justify-center"
        style={{ background: 'var(--t-surface-bg)' }}
      >
        <div className="animate-scale-in flex flex-col items-center gap-4">
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center t-accent-gradient animate-pulse"
          >
            <Wrench className="w-7 h-7" style={{ color: 'var(--t-text-on-accent)' }} />
          </div>
          <div
            className="w-32 h-1.5 rounded-full overflow-hidden"
            style={{ background: 'var(--t-surface-elevated)' }}
          >
            <div
              className="h-full rounded-full t-accent-gradient"
              style={{
                width: '60%',
                animation: 'shimmer 1.2s ease-in-out infinite',
                backgroundSize: '200% 100%',
              }}
            />
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div
        className="min-h-dvh flex flex-col items-center justify-center p-6 safe-top safe-bottom relative overflow-hidden"
        style={{ background: 'var(--t-surface-bg)' }}
      >
        {/* Decorative gradient orb */}
        <div
          className="absolute top-[-20%] right-[-15%] w-[60vw] h-[60vw] rounded-full opacity-20 blur-3xl pointer-events-none"
          style={{
            background: 'radial-gradient(circle, var(--t-accent-gradient-from), transparent 70%)',
          }}
        />
        <div
          className="absolute bottom-[-10%] left-[-20%] w-[50vw] h-[50vw] rounded-full opacity-15 blur-3xl pointer-events-none"
          style={{
            background: 'radial-gradient(circle, var(--t-secondary-gradient-from), transparent 70%)',
          }}
        />

        <div className="animate-fade-in-up relative z-10 flex flex-col items-center max-w-sm w-full">
          {/* Logo */}
          <div
            className="w-24 h-24 rounded-3xl flex items-center justify-center mb-8 t-accent-gradient t-accent-shadow"
          >
            <Logo className="w-14 h-14" style={{ color: 'var(--t-text-on-accent)' }} />
          </div>

          <h1
            className="text-3xl font-bold tracking-tight mb-2 text-center"
            style={{ color: 'var(--t-text-primary)' }}
          >
            АвтоБаза
          </h1>
          <p
            className="text-base text-center mb-10 leading-relaxed max-w-xs"
            style={{ color: 'var(--t-text-secondary)' }}
          >
            Розумне управління транспортом та історією обслуговування за допомогою голосового введення та AI.
          </p>

          <button
            id="login-btn"
            onClick={signIn}
            className="w-full py-4 rounded-2xl font-semibold text-base transition-all active:scale-[0.98] t-accent-gradient t-accent-shadow"
            style={{ color: 'var(--t-text-on-accent)' }}
          >
            Увійти через Google
          </button>

          <p
            className="text-xs mt-6 text-center"
            style={{ color: 'var(--t-text-muted)' }}
          >
            Ваші дані надійно захищені
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
