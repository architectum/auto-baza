import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { uk as ukTranslations } from './uk';
import { en as enTranslations } from './en';
import { Language, Translations } from './types';
import { uk as ukLocale } from 'date-fns/locale';
import { enUS as enLocale } from 'date-fns/locale';
import { Locale } from 'date-fns';
import { auth, db } from '@services/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { onAuthStateChanged, User } from 'firebase/auth';

const STORAGE_KEY = 'app_language';

interface LanguageContextValue {
  language: Language;
  setLanguage: (lang: Language) => Promise<void>;
  t: (path: string, params?: Record<string, string | number>) => string;
  dateLocale: Locale;
  formatProblemsCount: (n: number) => string;
  formatResolutionTime: (ms: number) => string;
}

const LanguageContext = createContext<LanguageContextValue | null>(null);

const translations: Record<Language, Translations> = {
  uk: ukTranslations,
  en: enTranslations,
};

function getNestedValue(obj: any, path: string): string | undefined {
  const parts = path.split('.');
  let curr = obj;
  for (const part of parts) {
    if (curr == null) return undefined;
    curr = curr[part];
  }
  return typeof curr === 'string' ? curr : undefined;
}

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === 'uk' || saved === 'en') return saved;
    // Default to Ukrainian
    return 'uk';
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
            // If user has language in Firestore and nothing in localStorage or differs
            if (data.language && (data.language === 'uk' || data.language === 'en')) {
              const localLang = localStorage.getItem(STORAGE_KEY);
              if (!localLang) {
                setLanguageState(data.language);
                localStorage.setItem(STORAGE_KEY, data.language);
              }
            } else {
              // Write current language to Firestore profile
              await setDoc(userRef, { language, updatedAt: new Date().toISOString() }, { merge: true });
            }
          } else {
            // Document doesn't exist yet, save current language
            await setDoc(userRef, { language, updatedAt: new Date().toISOString() }, { merge: true });
          }
        } catch (e) {
          console.warn('Could not sync language with user profile:', e);
        }
      }
    });
    return unsub;
  }, [language]);

  const setLanguage = useCallback(async (newLang: Language) => {
    setLanguageState(newLang);
    try {
      localStorage.setItem(STORAGE_KEY, newLang);
      document.documentElement.lang = newLang;
    } catch (e) {
      console.warn('Failed to save language to localStorage:', e);
    }

    if (auth.currentUser) {
      try {
        const userRef = doc(db, 'users', auth.currentUser.uid);
        await setDoc(userRef, { language: newLang, updatedAt: new Date().toISOString() }, { merge: true });
      } catch (e) {
        console.warn('Failed to save language to user account:', e);
      }
    }
  }, []);

  const t = useCallback((path: string, params?: Record<string, string | number>): string => {
    const dict = translations[language];
    let val = getNestedValue(dict, path);
    
    // Fallback to Ukrainian if missing in English
    if (!val && language !== 'uk') {
      val = getNestedValue(translations.uk, path);
    }

    if (!val) {
      return path;
    }

    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        val = val!.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v));
      });
    }

    return val;
  }, [language]);

  const dateLocale = useMemo(() => {
    return language === 'uk' ? ukLocale : enLocale;
  }, [language]);

  const formatProblemsCount = useCallback((n: number): string => {
    if (language === 'en') {
      return `${n} ${n === 1 ? 'problem' : 'problems'}`;
    }
    const mod10 = Math.abs(n) % 10;
    const mod100 = Math.abs(n) % 100;
    let noun = 'проблем';
    if (mod10 === 1 && mod100 !== 11) noun = 'проблема';
    else if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) noun = 'проблеми';
    return `${n} ${noun}`;
  }, [language]);

  const formatResolutionTime = useCallback((ms: number): string => {
    const totalMinutes = Math.floor(ms / 60000);
    const totalHours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;

    if (language === 'en') {
      if (totalHours >= 24) {
        const days = Math.floor(totalHours / 24);
        const hours = totalHours % 24;
        return `${days}d ${hours}h ${minutes}m`;
      }
      return `${totalHours}h ${minutes}m`;
    }

    if (totalHours >= 24) {
      const days = Math.floor(totalHours / 24);
      const hours = totalHours % 24;
      return `${days}д ${hours}г ${minutes}хв`;
    }
    return `${totalHours}г ${minutes}хв`;
  }, [language]);

  return (
    <LanguageContext.Provider
      value={{
        language,
        setLanguage,
        t,
        dateLocale,
        formatProblemsCount,
        formatResolutionTime,
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return ctx;
}
