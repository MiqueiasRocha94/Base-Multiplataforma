"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";

export function StartScreen() {
  const { dictionary } = useLanguage();
  const { isReady, session, refreshSession } = useAuth();
  const [status, setStatus] = useState<"booting" | "ready">("booting");

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void refreshSession();
      setStatus("ready");
    }, 700);

    return () => window.clearTimeout(timer);
  }, [refreshSession]);

  const hasSession = Boolean(session);

  return (
    <section className="grid gap-8">
      <div className="grid gap-6 rounded-[var(--radius-2xl)] border border-border bg-surface p-8 shadow-[var(--shadow-soft)] lg:grid-cols-[1.15fr_0.85fr] lg:p-10">
        <div className="space-y-5">
          <p className="text-sm font-medium uppercase tracking-[0.24em] text-primary">{dictionary.start.badge}</p>
          <h1 className="text-4xl font-semibold tracking-tight text-balance lg:text-5xl">{dictionary.start.title}</h1>
          <p className="max-w-2xl text-lg leading-8 text-text-muted">{dictionary.start.description}</p>

          <div className="rounded-[var(--radius-xl)] border border-border bg-[color:var(--color-surface-strong)] px-4 py-3 text-sm text-text-muted">
            {status === "booting" || !isReady
              ? dictionary.common.loading
              : hasSession
                ? dictionary.portal.webMessage
                : dictionary.home.subtitle}
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href="/home"
              className="inline-flex h-12 items-center justify-center rounded-2xl bg-primary px-5 font-semibold text-white transition hover:bg-primary-strong"
            >
              {dictionary.nav.home}
            </Link>
            <Link
              href={hasSession ? "/portal/home" : "/login"}
              className="inline-flex h-12 items-center justify-center rounded-2xl border border-border px-5 font-semibold transition hover:bg-[color:var(--color-surface-strong)]"
            >
              {hasSession ? dictionary.nav.portal : dictionary.nav.login}
            </Link>
          </div>
        </div>

        <div className="grid gap-4 rounded-[var(--radius-xl)] border border-border bg-[color:var(--color-surface-strong)] p-5">
          <div className="rounded-2xl bg-surface px-4 py-3">
            <p className="text-sm text-text-muted">{dictionary.common.web}</p>
            <p className="mt-1 font-semibold">Aplicacao web como base principal</p>
          </div>
          <div className="rounded-2xl bg-surface px-4 py-3">
            <p className="text-sm text-text-muted">{dictionary.common.mobile}</p>
            <p className="mt-1 font-semibold">Mesma interface, com adaptacoes nativas quando necessario</p>
          </div>
          <div className="rounded-2xl bg-surface px-4 py-3">
            <p className="text-sm text-text-muted">{dictionary.common.platform}</p>
            <p className="mt-1 font-semibold">Next.js como espinha dorsal do sistema</p>
          </div>
        </div>
      </div>
    </section>
  );
}
