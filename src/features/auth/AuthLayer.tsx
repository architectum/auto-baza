import React, { useEffect } from 'react';
import { useAuth } from '@shared/context/AuthContext';
import { Wrench } from '@shared/icons/Icons';
import { Logo } from '@shared/ui/Logo';
import { useErrorModal } from '@shared/lib/errorContext';
import { createErrorDetails } from '@shared/lib/errorUtils';
import { useLanguage } from '@shared/i18n';
import { useCurrency, Currency } from '@shared/context/CurrencyContext';
import { auth, db } from '@services/firebase';
import { doc, setDoc } from 'firebase/firestore';

export function AuthLayer({ children }: { children: React.ReactNode }) {
  const { user, loading, loginError, clearLoginError, signIn } = useAuth();
  const { showError } = useErrorModal();
  const { language, setLanguage, t } = useLanguage();
  const { currency, setCurrency } = useCurrency();

  // Show login errors in the modal
  useEffect(() => {
    if (loginError) {
      showError(createErrorDetails(
        loginError,
        t('auth.authError'),
        'Google Sign-In',
        undefined,
        { authProvider: 'Google' }
      ));
      clearLoginError();
    }
  }, [loginError, showError, clearLoginError, t]);

  const handleSignIn = async () => {
    try {
      await signIn();
      // Ensure the selected language and currency on login screen are immediately persisted to user profile
      if (auth.currentUser) {
        await setDoc(doc(db, 'users', auth.currentUser.uid), {
          language,
          currency,
          updatedAt: new Date().toISOString(),
        }, { merge: true });
      }
    } catch {
      // Handled by loginError in AuthContext
    }
  };

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
        {/* Decorative gradient orbs */}
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
            className="w-24 h-24 rounded-3xl flex items-center justify-center mb-6 t-accent-gradient t-accent-shadow"
          >
            <Logo className="w-14 h-14" style={{ color: 'var(--t-text-on-accent)' }} />
          </div>

          <h1
            className="text-3xl font-bold tracking-tight mb-2 text-center"
            style={{ color: 'var(--t-text-primary)' }}
          >
            {t('auth.appTitle')}
          </h1>
          <p
            className="text-base text-center mb-6 leading-relaxed max-w-xs"
            style={{ color: 'var(--t-text-secondary)' }}
          >
            {t('auth.appSubtitle')}
          </p>

          {/* Language Selector on Login Screen */}
          <div
            className="flex rounded-2xl p-1 gap-1 mb-2.5 w-full"
            style={{ background: 'var(--t-surface-elevated)', border: '1px solid var(--t-border-default)' }}
          >
            <button
              type="button"
              id="login-lang-uk"
              onClick={() => setLanguage('uk')}
              className="flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer"
              style={{
                background: language === 'uk' ? 'var(--t-surface-card)' : 'transparent',
                color: language === 'uk' ? 'var(--t-text-primary)' : 'var(--t-text-muted)',
                boxShadow: language === 'uk' ? '0 2px 8px rgba(0,0,0,0.12)' : 'none',
              }}
            >
              <span>🇺🇦</span>
              <span>Українська</span>
            </button>
            <button
              type="button"
              id="login-lang-en"
              onClick={() => setLanguage('en')}
              className="flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer"
              style={{
                background: language === 'en' ? 'var(--t-surface-card)' : 'transparent',
                color: language === 'en' ? 'var(--t-text-primary)' : 'var(--t-text-muted)',
                boxShadow: language === 'en' ? '0 2px 8px rgba(0,0,0,0.12)' : 'none',
              }}
            >
              <span>🇬🇧</span>
              <span>English</span>
            </button>
          </div>

          {/* Currency Selector on Login Screen */}
          <div
            className="flex rounded-2xl p-1 gap-1 mb-6 w-full"
            style={{ background: 'var(--t-surface-elevated)', border: '1px solid var(--t-border-default)' }}
          >
            {(['UAH', 'USD', 'EUR'] as const).map((currCode) => (
              <button
                key={currCode}
                type="button"
                id={`login-curr-${currCode.toLowerCase()}`}
                onClick={() => setCurrency(currCode)}
                className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer"
                style={{
                  background: currency === currCode ? 'var(--t-surface-card)' : 'transparent',
                  color: currency === currCode ? 'var(--t-text-primary)' : 'var(--t-text-muted)',
                  boxShadow: currency === currCode ? '0 2px 8px rgba(0,0,0,0.12)' : 'none',
                }}
              >
                <span className="font-bold">{currCode === 'UAH' ? '₴' : currCode === 'USD' ? '$' : '€'}</span>
                <span>{currCode}</span>
              </button>
            ))}
          </div>

          <button
            id="login-btn"
            onClick={handleSignIn}
            className="w-full py-4 rounded-2xl font-semibold text-base transition-all active:scale-[0.98] t-accent-gradient t-accent-shadow cursor-pointer"
            style={{ color: 'var(--t-text-on-accent)' }}
          >
            {t('auth.loginWithGoogle')}
          </button>

          <p
            className="text-xs mt-6 text-center"
            style={{ color: 'var(--t-text-muted)' }}
          >
            {t('auth.dataProtected')}
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
