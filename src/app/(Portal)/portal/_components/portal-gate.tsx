"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { useAuth } from "@/contexts/AuthContext";
import { useDevice } from "@/contexts/DeviceContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { subscribeToAppVisibility } from "@/lib/platform/app-visibility";
import { isBiometricAuthAvailable, requestBiometricAuth } from "@/lib/platform/biometrics";

type GateState = "loading" | "locked" | "unlocked";

export function PortalGate({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { dictionary } = useLanguage();
  const { isNative } = useDevice();
  const { isReady, session, biometricEnabled, setBiometricEnabled, signOut, refreshSession } = useAuth();
  const [gateState, setGateState] = useState<GateState>("loading");
  const [isBiometricAvailable, setIsBiometricAvailable] = useState(false);

  const unlock = useCallback(async (force = false) => {
    if (!isNative || !isBiometricAvailable || biometricEnabled !== true) {
      if (force) {
        setGateState("unlocked");
      }
      return;
    }

    setGateState("loading");
    const result = await requestBiometricAuth(dictionary.portal.biometricDescription);
    setGateState(result.authenticated ? "unlocked" : "locked");
  }, [biometricEnabled, dictionary.portal.biometricDescription, isBiometricAvailable, isNative]);

  useEffect(() => {
    if (!isReady) {
      return;
    }

    if (!session) {
      router.replace("/login");
      return;
    }

    void (async () => {
      await refreshSession();
      const available = isNative ? await isBiometricAuthAvailable() : false;

      setIsBiometricAvailable(available);

      if (isNative && available && biometricEnabled) {
        setGateState("locked");
        await unlock(true);
        return;
      }

      setGateState("unlocked");
    })();
  }, [biometricEnabled, dictionary.portal.biometricDescription, isBiometricAvailable, isNative, isReady, refreshSession, router, session, unlock]);

  useEffect(() => {
    if (!isNative || biometricEnabled !== true || isBiometricAvailable !== true) {
      return;
    }

    return subscribeToAppVisibility((visible) => {
      if (!visible) {
        setGateState("locked");
        return;
      }

      if (session) {
        void unlock();
      }
    });
  }, [biometricEnabled, isBiometricAvailable, isNative, session, unlock]);

  if (!isReady || !session || gateState === "loading") {
    return <p className="text-sm text-text-muted">{dictionary.common.loading}</p>;
  }

  if (gateState === "locked") {
    return (
      <div className="mx-auto grid max-w-md gap-4 rounded-[var(--radius-2xl)] border border-border bg-surface p-8 shadow-[var(--shadow-soft)]">
        <div className="space-y-2 text-center">
          <h1 className="text-2xl font-semibold tracking-tight">{dictionary.portal.biometricTitle}</h1>
          <p className="text-sm leading-6 text-text-muted">{dictionary.portal.biometricDescription}</p>
        </div>
        <button
          type="button"
          onClick={async () => {
            await unlock();
          }}
          className="inline-flex h-12 items-center justify-center rounded-2xl bg-primary px-5 font-semibold text-white transition hover:bg-primary-strong"
        >
          {dictionary.portal.retry}
        </button>
        <button
          type="button"
          onClick={() => {
            signOut();
            router.replace("/login");
          }}
          className="inline-flex h-12 items-center justify-center rounded-2xl border border-border px-5 font-semibold transition hover:bg-[color:var(--color-surface-strong)]"
        >
          {dictionary.common.signOut}
        </button>
      </div>
    );
  }

  return (
    <div className="grid gap-4">
      {isNative && isBiometricAvailable ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-[var(--radius-xl)] border border-border bg-surface px-4 py-4">
          <p className="text-sm text-text-muted">
            {biometricEnabled ? dictionary.portal.biometricEnabled : dictionary.portal.biometricDisabled}
          </p>
          <button
            type="button"
            onClick={() => {
              setBiometricEnabled(!biometricEnabled);
            }}
            className="inline-flex h-10 items-center justify-center rounded-2xl border border-border px-4 text-sm font-semibold transition hover:bg-[color:var(--color-surface-strong)]"
          >
            {biometricEnabled ? dictionary.portal.disableBiometric : dictionary.portal.enableBiometric}
          </button>
        </div>
      ) : null}
      {children}
    </div>
  );
}
