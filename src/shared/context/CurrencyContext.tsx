import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { auth, db } from '@services/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { onAuthStateChanged, User } from 'firebase/auth';

export type Currency = 'UAH' | 'USD' | 'EUR';

export interface CurrencyConfig {
  code: Currency;
  symbol: string;
  label: string;
  position: 'left' | 'right';
}

export const CURRENCY_CONFIGS: Record<Currency, CurrencyConfig> = {
  UAH: {
    code: 'UAH',
    symbol: '₴',
    label: 'UAH (₴)',
    position: 'right',
  },
  USD: {
    code: 'USD',
    symbol: '$',
    label: 'USD ($)',
    position: 'left',
  },
  EUR: {
    code: 'EUR',
    symbol: '€',
    label: 'EUR (€)',
    position: 'left',
  },
};

const STORAGE_KEY = 'app_currency';

export function getCurrencySymbol(curr: Currency = 'UAH'): string {
  return CURRENCY_CONFIGS[curr]?.symbol || '₴';
}

export function formatCurrency(
  amount: number | string | undefined | null,
  curr: Currency = 'UAH',
  options?: { round?: boolean; prefixPlus?: boolean }
): string {
  if (amount === undefined || amount === null || amount === '') return '';
  const num = typeof amount === 'number' ? amount : Number(amount);
  if (isNaN(num)) return String(amount);

  const val = options?.round ? Math.round(num) : num;
  const formatted = val.toLocaleString();
  const plus = options?.prefixPlus && val > 0 ? '+' : '';

  switch (curr) {
    case 'USD':
      return `${plus}$${formatted}`;
    case 'EUR':
      return `${plus}€${formatted}`;
    case 'UAH':
    default:
      return `${plus}${formatted} ₴`;
  }
}

export function formatCurrencyRate(
  rate: number,
  curr: Currency = 'UAH',
  hourUnit: string = 'год'
): string {
  const formatted = Math.round(rate).toLocaleString();
  switch (curr) {
    case 'USD':
      return `$${formatted}/${hourUnit}`;
    case 'EUR':
      return `€${formatted}/${hourUnit}`;
    case 'UAH':
    default:
      return `${formatted} ₴/${hourUnit}`;
  }
}

export function formatCompactCurrency(
  amount: number,
  curr: Currency = 'UAH'
): string {
  const kVal = (amount / 1000).toFixed(1) + 'k';
  switch (curr) {
    case 'USD':
      return `$${kVal}`;
    case 'EUR':
      return `€${kVal}`;
    case 'UAH':
    default:
      return `${kVal} ₴`;
  }
}

interface CurrencyContextValue {
  currency: Currency;
  setCurrency: (curr: Currency) => Promise<void>;
  currencySymbol: string;
  formatMoney: (amount: number | string | undefined | null, options?: { round?: boolean; prefixPlus?: boolean }) => string;
  formatRate: (rate: number, hourUnit?: string) => string;
  formatCompact: (amount: number) => string;
}

const CurrencyContext = createContext<CurrencyContextValue | null>(null);

export function useCurrency(): CurrencyContextValue {
  const ctx = useContext(CurrencyContext);
  if (!ctx) {
    throw new Error('useCurrency must be used within CurrencyProvider');
  }
  return ctx;
}

export function CurrencyProvider({ children }: { children: React.ReactNode }) {
  const [currency, setCurrencyState] = useState<Currency>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === 'UAH' || saved === 'USD' || saved === 'EUR') return saved;
    return 'UAH';
  });

  const [currentUser, setCurrentUser] = useState<User | null>(auth.currentUser);

  // Sync with Firestore profile when user logs in or auth state is restored
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      if (user) {
        try {
          const userRef = doc(db, 'users', user.uid);
          const snap = await getDoc(userRef);
          if (snap.exists()) {
            const data = snap.data();
            if (data.currency && (data.currency === 'UAH' || data.currency === 'USD' || data.currency === 'EUR')) {
              const localCurr = localStorage.getItem(STORAGE_KEY);
              if (!localCurr) {
                setCurrencyState(data.currency);
                localStorage.setItem(STORAGE_KEY, data.currency);
              }
            } else {
              await setDoc(userRef, { currency, updatedAt: new Date().toISOString() }, { merge: true });
            }
          } else {
            await setDoc(userRef, { currency, updatedAt: new Date().toISOString() }, { merge: true });
          }
        } catch (e) {
          console.warn('Could not sync currency with user profile:', e);
        }
      }
    });
    return unsub;
  }, [currency]);

  const setCurrency = useCallback(async (newCurr: Currency) => {
    setCurrencyState(newCurr);
    localStorage.setItem(STORAGE_KEY, newCurr);

    if (currentUser) {
      try {
        const userRef = doc(db, 'users', currentUser.uid);
        await setDoc(userRef, { currency: newCurr, updatedAt: new Date().toISOString() }, { merge: true });
      } catch (e) {
        console.warn('Could not update currency in user profile:', e);
      }
    }
  }, [currentUser]);

  const currencySymbol = useMemo(() => getCurrencySymbol(currency), [currency]);

  const formatMoney = useCallback(
    (amount: number | string | undefined | null, options?: { round?: boolean; prefixPlus?: boolean }) => {
      return formatCurrency(amount, currency, options);
    },
    [currency]
  );

  const formatRate = useCallback(
    (rate: number, hourUnit: string = 'год') => {
      return formatCurrencyRate(rate, currency, hourUnit);
    },
    [currency]
  );

  const formatCompact = useCallback(
    (amount: number) => {
      return formatCompactCurrency(amount, currency);
    },
    [currency]
  );

  const value = useMemo(
    () => ({
      currency,
      setCurrency,
      currencySymbol,
      formatMoney,
      formatRate,
      formatCompact,
    }),
    [currency, setCurrency, currencySymbol, formatMoney, formatRate, formatCompact]
  );

  return (
    <CurrencyContext.Provider value={value}>
      {children}
    </CurrencyContext.Provider>
  );
}
