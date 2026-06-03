"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

import {
  getBiometricPreference,
  getSession,
  setBiometricPreference,
  signIn as persistSession,
  signOut as clearPersistedSession,
  type DemoSession,
} from "@/lib/auth/session";
import { hasSavedProtectedSession, resolveProtectedAccessMode, type ProtectedAccessMode } from "@/lib/auth/protected-access";

type AuthContextValue = {
  isReady: boolean;
  session: DemoSession | null;
  biometricEnabled: boolean;
  setBiometricEnabled: (enabled: boolean) => void;
  signIn: (email: string, biometricOptIn?: boolean) => Promise<DemoSession>;
  signOut: () => void;
  refreshSession: () => Promise<DemoSession | null>;
  resolveAccessMode: () => Promise<ProtectedAccessMode>;
  hasProtectedSession: () => Promise<boolean>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<DemoSession | null>(null);
  const [biometricEnabled, setBiometricEnabledState] = useState(false);
  const [isReady, setIsReady] = useState(false);

  const refreshSession = useCallback(async () => {
    const nextSession = getSession();
    setSession(nextSession);
    setBiometricEnabledState(nextSession ? getBiometricPreference(nextSession.email) : false);
    setIsReady(true);
    return nextSession;
  }, []);

  useEffect(() => {
    void (async () => {
      await Promise.resolve();
      await refreshSession();
    })();
  }, [refreshSession]);

  const signIn = useCallback(async (email: string, biometricOptIn = false) => {
    const nextSession = await persistSession(email, biometricOptIn);
    setSession(nextSession);
    setBiometricEnabledState(biometricOptIn);
    setIsReady(true);
    return nextSession;
  }, []);

  const signOut = useCallback(() => {
    clearPersistedSession();
    setSession(null);
    setBiometricEnabledState(false);
    setIsReady(true);
  }, []);

  const handleSetBiometricEnabled = useCallback((enabled: boolean) => {
    if (!session) {
      return;
    }

    setBiometricPreference(session.email, enabled);
    setBiometricEnabledState(enabled);
  }, [session]);

  const value = useMemo<AuthContextValue>(
    () => ({
      isReady,
      session,
      biometricEnabled,
      setBiometricEnabled: handleSetBiometricEnabled,
      signIn,
      signOut,
      refreshSession,
      resolveAccessMode: resolveProtectedAccessMode,
      hasProtectedSession: hasSavedProtectedSession,
    }),
    [biometricEnabled, handleSetBiometricEnabled, isReady, refreshSession, session, signIn, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used within AuthProvider.");
  }

  return context;
}
