"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { LocaleSwitcher } from "@/components/LocaleSwitcher";
import { ThemeToggleButton } from "@/components/ThemeToggleButton";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { useDevice } from "@/contexts/DeviceContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useTheme } from "@/contexts/ThemeProvider";
import { fontPresets, themeOptions } from "@/lib/preferences/options";

function PublicMobileConfigModal({
  onClose,
}: {
  onClose: () => void;
}) {
  const { dictionary } = useLanguage();
  const { fontPreset, setFontPreset, theme, setTheme } = useTheme();

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 px-4 py-6">
      <Card className="w-full max-w-md">
        <CardHeader className="border-b border-border/60">
          <div className="flex items-start justify-between gap-4">
            <div className="grid gap-1">
              <CardTitle className="text-xl">{dictionary.home.quickConfigTitle}</CardTitle>
              <CardDescription>{dictionary.home.quickConfigSubtitle}</CardDescription>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="inline-flex size-10 items-center justify-center rounded-full border border-border text-text-muted transition hover:bg-[color:var(--color-surface-strong)]"
            >
              x
            </button>
          </div>
        </CardHeader>
        <CardContent className="grid gap-5 p-6">
          <div className="grid gap-3">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-text-muted">{dictionary.profile.configTitle}</p>
            <div className="flex flex-wrap items-center gap-3">
              <LocaleSwitcher />
              <ThemeToggleButton />
            </div>
          </div>

          <div className="grid gap-3">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-text-muted">{dictionary.profile.themeTitle}</p>
            <div className="flex flex-wrap gap-3">
              {themeOptions.map((option) => (
                <Button
                  key={option.value}
                  variant={theme === option.value ? "default" : "outline"}
                  onClick={() => setTheme(option.value)}
                >
                  {dictionary.profile[option.labelKey]}
                </Button>
              ))}
            </div>
          </div>

          <div className="grid gap-3">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-text-muted">{dictionary.profile.fontTitle}</p>
            <div className="flex flex-wrap gap-3">
              {fontPresets.map((option) => (
                <Button
                  key={option.value}
                  variant={fontPreset === option.value ? "default" : "outline"}
                  onClick={() => setFontPreset(option.value)}
                >
                  {dictionary.profile[option.labelKey]}
                </Button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function PublicMobileHome() {
  const router = useRouter();
  const { dictionary } = useLanguage();
  const [configOpen, setConfigOpen] = useState(false);

  return (
    <>
      <section className="mx-auto flex min-h-[calc(100vh-2rem)] w-full max-w-md items-center justify-center py-6">
        <div className="grid w-full gap-6 rounded-[var(--radius-2xl)] border border-border bg-surface p-6 shadow-[var(--shadow-soft)]">
          <div className="flex items-start justify-between gap-4">
            <div className="grid gap-2">
              <p className="text-sm font-medium uppercase tracking-[0.24em] text-primary">{dictionary.home.mobileBadge}</p>
              <h1 className="text-3xl font-semibold tracking-tight">{dictionary.home.mobileTitle}</h1>
              <p className="text-sm leading-6 text-text-muted">{dictionary.home.mobileSubtitle}</p>
            </div>
            <button
              type="button"
              onClick={() => setConfigOpen(true)}
              className="inline-flex size-11 items-center justify-center rounded-full border border-border bg-[color:var(--color-surface-strong)] text-lg transition hover:bg-white"
              aria-label={dictionary.home.quickConfigTitle}
            >
              ⚙
            </button>
          </div>

          <div className="grid gap-3">
            <Button onClick={() => router.push("/login")}>{dictionary.nav.login}</Button>
            <Button variant="outline" onClick={() => router.push("/register")}>
              {dictionary.home.registerCta}
            </Button>
          </div>
        </div>
      </section>

      {configOpen ? <PublicMobileConfigModal onClose={() => setConfigOpen(false)} /> : null}
    </>
  );
}

function PublicEntryCard() {
  const router = useRouter();
  const { dictionary } = useLanguage();

  return (
    <section className="mx-auto flex min-h-[calc(100vh-10rem)] w-full max-w-3xl items-center justify-center py-8">
      <Card>
        <CardHeader className="gap-4">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="grid gap-2">
              <p className="text-sm font-medium uppercase tracking-[0.24em] text-primary">{dictionary.home.badge}</p>
              <CardTitle className="text-3xl">{dictionary.home.title}</CardTitle>
              <CardDescription className="max-w-3xl">{dictionary.home.subtitle}</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="grid gap-5">
          <div className="grid gap-4 rounded-[var(--radius-xl)] border border-border bg-[color:var(--color-surface-strong)] p-5">
            <p className="text-sm leading-6 text-text-muted">{dictionary.home.publicDescription}</p>
            <div className="grid gap-3 sm:grid-cols-2">
              <Button onClick={() => router.push("/login")}>{dictionary.nav.login}</Button>
              <Button variant="outline" onClick={() => router.push("/register")}>
                {dictionary.home.registerCta}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </section>
  );
}

export default function HomePage() {
  const { shellMode } = useDevice();
  const { session } = useAuth();

  if (shellMode === "mobile" && !session) {
    return <PublicMobileHome />;
  }

  return <PublicEntryCard />;
}
