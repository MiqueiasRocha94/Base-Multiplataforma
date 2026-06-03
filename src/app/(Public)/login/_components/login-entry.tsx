"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { LoginForm } from "@/app/(Public)/login/_components/login-form";
import { useAuth } from "@/contexts/AuthContext";
import { useDevice } from "@/contexts/DeviceContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { requestBiometricAuth } from "@/lib/platform/biometrics";

type LoginMode = "loading" | "form" | "biometric";

export function LoginEntry() {
  const router = useRouter();
  const { dictionary } = useLanguage();
  const { isNative } = useDevice();
  const { isReady, session, hasProtectedSession, resolveAccessMode, signOut } = useAuth();
  const [mode, setMode] = useState<LoginMode>("loading");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isReady) {
      return;
    }

    void (async () => {
      await Promise.resolve();

      if (!session) {
        setMode("form");
        return;
      }

      if (!isNative) {
        router.replace("/portal/home");
        return;
      }

      const savedProtectedSession = await hasProtectedSession();
      if (!savedProtectedSession) {
        setMode("form");
        return;
      }

      const accessMode = await resolveAccessMode();
      if (accessMode === "biometric") {
        setMode("biometric");
        return;
      }

      router.replace("/portal/home");
    })();
  }, [hasProtectedSession, isNative, isReady, resolveAccessMode, router, session]);

  if (mode === "loading") {
    return <p className="text-sm text-text-muted">{dictionary.common.loading}</p>;
  }

  if (mode === "biometric") {
    return (
      <div className="mx-auto grid max-w-md gap-4 rounded-[var(--radius-2xl)] border border-border bg-surface p-8 shadow-[var(--shadow-soft)]">
        <div className="space-y-2 text-center">
          <h1 className="text-2xl font-semibold tracking-tight">{dictionary.portal.biometricTitle}</h1>
          <p className="text-sm leading-6 text-text-muted">{dictionary.portal.biometricDescription}</p>
        </div>
        {error ? <p className="text-center text-sm text-error">{error}</p> : null}
        <button
          type="button"
          onClick={async () => {
            setError(null);
            const result = await requestBiometricAuth(dictionary.portal.biometricDescription);
            if (result.authenticated) {
              router.replace("/portal/home");
              return;
            }

            setError(dictionary.login.error);
          }}
          className="inline-flex h-12 items-center justify-center rounded-2xl bg-primary px-5 font-semibold text-white transition hover:bg-primary-strong"
        >
          {dictionary.portal.retry}
        </button>
        <button
          type="button"
          onClick={() => {
            signOut();
            setMode("form");
          }}
          className="inline-flex h-12 items-center justify-center rounded-2xl border border-border px-5 font-semibold transition hover:bg-[color:var(--color-surface-strong)]"
        >
          {dictionary.common.signOut}
        </button>
      </div>
    );
  }

  return <LoginForm labels={dictionary.login} targetPath="/portal/home" />;
}
