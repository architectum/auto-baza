import React, { useEffect, useState } from 'react';
import { auth } from '../services/firebase';
import { GoogleAuthProvider, signInWithPopup, onAuthStateChanged, User } from 'firebase/auth';
import { Wrench } from 'lucide-react';
import { Logo } from './Logo';
import { ThemeProvider } from './ThemeProvider';
import { useErrorModal, createErrorDetails } from './ErrorModal';

export function AuthLayer({ children }: { children: (user: User) => React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [loginError, setLoginError] = useState<unknown>(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, u => {
      setUser(u);
      setLoading(false);
    });
    return unsub;
  }, []);

  const handleLogin = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (e: any) {
      // Ignore user cancellation
      if (e?.code === 'auth/popup-closed-by-user' || e?.code === 'auth/cancelled-popup-request') {
        return;
      }
      console.error(e);
      // We can't use useErrorModal here since AuthLayer wraps ThemeProvider,
      // but InnerAuthLayer can. So we forward the error.
      setLoginError(e);
    }
  };

  return (
    <ThemeProvider>
      <InnerAuthLayer user={user} loading={loading} onLogin={handleLogin} loginError={loginError} clearLoginError={() => setLoginError(null)}>
        {children}
      </InnerAuthLayer>
    </ThemeProvider>
  );
}

function InnerAuthLayer({ user, loading, onLogin, loginError, clearLoginError, children }: { user: User | null, loading: boolean, onLogin: () => void, loginError: unknown, clearLoginError: () => void, children: (user: User) => React.ReactNode }) {
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
  }, [loginError]);
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
            АвтоЕлектрик
          </h1>
          <p
            className="text-base text-center mb-10 leading-relaxed max-w-xs"
            style={{ color: 'var(--t-text-secondary)' }}
          >
            Розумне управління транспортом та історією обслуговування за допомогою голосового введення та AI.
          </p>

          <button
            id="login-btn"
            onClick={onLogin}
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

  return <>{children(user)}</>;
}
