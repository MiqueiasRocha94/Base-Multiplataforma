"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DynamicForm } from "@/components/ui/dynamic-form";
import { useAuth } from "@/contexts/AuthContext";
import { useDeveloperMode } from "@/contexts/DeveloperModeContext";
import { useDevice } from "@/contexts/DeviceContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { loginSchema } from "@/lib/auth/login.schema";
import { DEMO_USER_EMAILS } from "@/lib/auth/demo-users";
import type { DynamicFormField, DynamicFormValues, FormValue } from "@/types/dynamic-form";

type LoginMode = "loading" | "form" | "biometric";

const TARGET_PATH = "/portal/home";

// Login e local (sem API): os campos sao estaticos e a validacao usa o loginSchema,
// mesmo padrao schema-driven (DynamicForm) do modulo users — que monta os campos a
// partir da entidade via entity-runtime.
export default function LoginPage() {
  const router = useRouter();
  const { dictionary } = useLanguage();
  const { isNative, view, authenticateBiometric } = useDevice();
  const { developerModeEnabled, settings } = useDeveloperMode();
  const { isReady, session, hasProtectedSession, resolveAccessMode, signIn, signOut } = useAuth();

  const t = dictionary.login;
  const isMobile = view === "mobile";

  const [mode, setMode] = useState<LoginMode>("loading");
  const [values, setValues] = useState<DynamicFormValues>({ email: "", password: "", biometricOptIn: false });
  const [errors, setErrors] = useState<Record<string, string | undefined>>({});
  const [error, setError] = useState<string | null>(null);
  const [biometricError, setBiometricError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

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
        router.replace(TARGET_PATH);
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

      router.replace(TARGET_PATH);
    })();
  }, [hasProtectedSession, isNative, isReady, resolveAccessMode, router, session]);

  const fields = useMemo<DynamicFormField[]>(() => {
    const base: DynamicFormField[] = [
      { key: "email", label: t.email, kind: "email", placeholder: "name@company.com" },
      { key: "password", label: t.password, kind: "password", placeholder: "******" },
    ];
    if (isNative) {
      base.push({ key: "biometricOptIn", label: t.biometricOptIn, kind: "switch" });
    }
    return base;
  }, [t, isNative]);

  const onChange = (key: string, value: FormValue) => {
    setValues((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: undefined }));
  };

  const submit = () => {
    setError(null);
    const parsed = loginSchema.safeParse({ email: values.email, password: values.password });
    if (!parsed.success) {
      const nextErrors: Record<string, string | undefined> = {};
      for (const issue of parsed.error.issues) {
        const key = String(issue.path[0] ?? "");
        if (key && !nextErrors[key]) {
          nextErrors[key] = issue.message;
        }
      }
      setErrors(nextErrors);
      return;
    }

    startTransition(async () => {
      try {
        await signIn(parsed.data.email, values.biometricOptIn === true);
        router.push(TARGET_PATH);
      } catch {
        setError(t.error);
      }
    });
  };

  const quickSignIn = (email: string, biometric: boolean) => {
    startTransition(async () => {
      try {
        await signIn(email, biometric);
        router.push(TARGET_PATH);
      } catch {
        setError(t.error);
      }
    });
  };

  let content: React.ReactNode;

  if (mode === "loading") {
    content = <p className="text-sm text-text-muted">{dictionary.common.loading}</p>;
  } else if (mode === "biometric") {
    content = (
      <div className="mx-auto grid max-w-md gap-4 rounded-[var(--radius-2xl)] border border-border bg-surface p-8 shadow-[var(--shadow-soft)]">
        <div className="space-y-2 text-center">
          <h1 className="text-2xl font-semibold tracking-tight">{dictionary.portal.biometricTitle}</h1>
          <p className="text-sm leading-6 text-text-muted">{dictionary.portal.biometricDescription}</p>
        </div>
        {biometricError ? <p className="text-center text-sm text-error">{biometricError}</p> : null}
        <button
          type="button"
          onClick={async () => {
            setBiometricError(null);
            const authenticated = await authenticateBiometric(dictionary.portal.biometricDescription);
            if (authenticated) {
              router.replace(TARGET_PATH);
              return;
            }
            setBiometricError(t.error);
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
  } else {
    content = (
      <form
        className="grid"
        onSubmit={(event) => {
          event.preventDefault();
          submit();
        }}
      >
        <Card className={isMobile ? "rounded-2xl shadow-none" : undefined}>
          <CardHeader className={isMobile ? "gap-2" : undefined}>
            <CardTitle className={isMobile ? "text-3xl font-extrabold text-primary" : undefined}>{t.title}</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4">
            <DynamicForm fields={fields} values={values} mode="write" errors={errors} onChange={onChange} />

            {developerModeEnabled && settings.quickAccessEnabled ? (
              <div className="grid gap-3 rounded-[var(--radius-xl)] border border-dashed border-border bg-[color:var(--color-surface-strong)] p-4">
                <p className="text-sm font-semibold">{t.quickAccessTitle}</p>
                <div className="grid gap-3 sm:grid-cols-3">
                  <Button
                    className={isMobile ? "w-full" : undefined}
                    variant="outline"
                    onClick={() => quickSignIn(DEMO_USER_EMAILS.comum, false)}
                  >
                    {t.quickAccessCommon}
                  </Button>
                  <Button
                    className={isMobile ? "w-full" : undefined}
                    variant="outline"
                    onClick={() => quickSignIn(DEMO_USER_EMAILS.analista, false)}
                  >
                    {t.quickAccessAnalyst}
                  </Button>
                  <Button
                    className={isMobile ? "w-full" : undefined}
                    variant="outline"
                    onClick={() => quickSignIn(DEMO_USER_EMAILS.admin, isNative)}
                  >
                    {t.quickAccessAdmin}
                  </Button>
                </div>
              </div>
            ) : null}

            {error ? <p className="text-sm text-error">{error}</p> : null}

            <Button htmlType="submit" className={isMobile ? "w-full" : undefined} disabled={isPending}>
              {isPending ? "..." : t.submit}
            </Button>

            <div className="grid gap-3 pt-2">
              <Button
                variant="outline"
                className={isMobile ? "w-full" : undefined}
                onClick={() => router.push("/register")}
              >
                {dictionary.home.registerCta}
              </Button>
              <Button
                variant="ghost"
                className={isMobile ? "w-full" : undefined}
                onClick={() => router.push("/home")}
              >
                {dictionary.common.signOut}
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>
    );
  }

  if (isMobile) {
    return (
      <section className="relative flex min-h-screen w-full flex-col justify-center px-5 py-8">
        <Logo />
        {content}
      </section>
    );
  }

  return <section className="mx-auto grid max-w-xl gap-6 py-8">{content}</section>;
}
