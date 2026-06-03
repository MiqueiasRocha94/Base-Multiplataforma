"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { useDevice } from "@/contexts/DeviceContext";
import { useLanguage } from "@/contexts/LanguageContext";

const TRANSITION_SECONDS = 3;

export default function Page() {
  const router = useRouter();
  const { shellMode } = useDevice();
  const { dictionary } = useLanguage();
  const [secondsLeft, setSecondsLeft] = useState(TRANSITION_SECONDS);

  useEffect(() => {
    if (shellMode === "web") {
      router.replace("/home");
      return;
    }

    const intervalId = window.setInterval(() => {
      setSecondsLeft((currentSeconds) => {
        if (currentSeconds <= 1) {
          window.clearInterval(intervalId);
          router.replace("/home");
          return 0;
        }

        return currentSeconds - 1;
      });
    }, 1000);

    return () => window.clearInterval(intervalId);
  }, [router, shellMode]);

  if (shellMode === "web") {
    return null;
  }

  return (
    <section className="mx-auto flex min-h-[calc(100vh-10rem)] w-full max-w-3xl items-center justify-center py-8">
      <div className="grid w-full gap-6 rounded-[var(--radius-2xl)] border border-border bg-surface p-8 text-center shadow-[var(--shadow-soft)] lg:p-10">
        <div className="mx-auto size-16 rounded-full border-4 border-[color:var(--color-surface-strong)] border-t-primary animate-spin" />
        <div className="grid gap-2">
          <p className="text-sm font-medium uppercase tracking-[0.24em] text-primary">{dictionary.start.transitionBadge}</p>
          <h1 className="text-3xl font-semibold tracking-tight">{dictionary.start.transitionTitle}</h1>
          <p className="text-sm leading-6 text-text-muted">{dictionary.start.transitionDescription}</p>
        </div>
        <div className="mx-auto rounded-[var(--radius-xl)] border border-border bg-[color:var(--color-surface-strong)] px-5 py-4">
          <p className="text-sm text-text-muted">{dictionary.start.transitionCounterLabel}</p>
          <p className="mt-2 text-3xl font-semibold tracking-tight text-primary">{secondsLeft}</p>
        </div>
      </div>
    </section>
  );
}
