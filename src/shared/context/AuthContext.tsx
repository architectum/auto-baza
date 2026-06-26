import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { auth, logEvent } from '@services/firebase';

import { GoogleAuthProvider, signInWithPopup, signOut as firebaseSignOut, onAuthStateChanged, User } from 'firebase/auth';

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  loginError: unknown;
  clearLoginError: () => void;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [loginError, setLoginError] = useState<unknown>(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async u => {
      if (u) {
        try {
          await u.getIdToken(true);
        } catch (e) {
          console.error('Failed to get token:', e);
        }
      }
      setUser(u);
      setLoading(false);
    });
    return unsub;
  }, []);

  const signIn = useCallback(async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
      logEvent('login', { method: 'Google' });
    } catch (e: any) {
      if (e?.code === 'auth/popup-closed-by-user' || e?.code === 'auth/cancelled-popup-request') {
        return;
      }
      console.error(e);
      setLoginError(e);
      throw e;
    }
  }, []);

  const signOut = useCallback(async () => {
    try {
      await firebaseSignOut(auth);
      logEvent('logout');
    } catch (e) {
      console.error(e);
      throw e;
    }
  }, []);

  const clearLoginError = useCallback(() => {
    setLoginError(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, loginError, clearLoginError, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}
