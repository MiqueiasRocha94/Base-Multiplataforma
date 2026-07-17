"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";

import { useDevice } from "@/contexts/DeviceContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { languageFlags, languageLabels, locales } from "@/lib/i18n/settings";
import { cn } from "@/lib/utils";

function ChevronDownIcon({ open }: { open: boolean }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 20 20"
      className={cn("size-4 text-text-muted transition-transform", open && "rotate-180")}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M5 7.5 10 12.5 15 7.5" />
    </svg>
  );
}

export function LocaleSwitcher() {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const { view } = useDevice();
  const { locale, dictionary, setLocale } = useLanguage();
  const [open, setOpen] = useState(false);
  const compactMode = view === "mobile";

  useEffect(() => {
    if (!open || compactMode) {
      return;
    }

    const handlePointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    window.addEventListener("mousedown", handlePointerDown);

    return () => {
      window.removeEventListener("mousedown", handlePointerDown);
    };
  }, [compactMode, open]);

  if (compactMode) {
    return (
      <nav aria-label={dictionary.common.locale} className="flex items-center gap-1 rounded-full border border-border bg-surface/85 p-1 text-sm shadow-sm backdrop-blur">
        {locales.map((targetLocale) => {
          const active = targetLocale === locale;

          return (
            <button
              key={targetLocale}
              type="button"
              onClick={() => setLocale(targetLocale)}
              aria-pressed={active}
              aria-label={languageLabels[targetLocale]}
              title={languageLabels[targetLocale]}
              className={cn(
                "inline-flex size-10 items-center justify-center rounded-full transition",
                active ? "bg-primary text-white" : "text-[color:var(--color-text-muted)] hover:bg-[color:var(--color-surface-strong)]",
              )}
            >
              <Image
                src={languageFlags[targetLocale]}
                alt={languageLabels[targetLocale]}
                width={20}
                height={20}
                className="size-5 rounded-full object-cover shadow-sm"
              />
            </button>
          );
        })}
      </nav>
    );
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        aria-label={dictionary.common.locale}
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
        className="inline-flex items-center gap-2 rounded-full border border-border bg-surface/85 px-2.5 py-2 text-sm shadow-sm backdrop-blur transition hover:bg-[color:var(--color-surface-strong)]"
      >
        <Image
          src={languageFlags[locale]}
          alt={languageLabels[locale]}
          width={24}
          height={24}
          className="size-6 rounded-full object-cover shadow-sm"
        />
        <ChevronDownIcon open={open} />
      </button>

      {open ? (
        <ul className="absolute right-0 top-[calc(100%+0.5rem)] z-40 grid min-w-56 gap-1 rounded-[var(--radius-xl)] border border-border bg-surface p-2 shadow-[var(--shadow-soft)]">
          {locales.map((targetLocale) => {
            const active = targetLocale === locale;

            return (
              <li key={targetLocale}>
                <button
                  type="button"
                  onClick={() => {
                    setLocale(targetLocale);
                    setOpen(false);
                  }}
                  className={cn("flex w-full items-center gap-3 rounded-[var(--radius-lg)] px-3 py-2 text-left transition", active ? "bg-[color:var(--color-surface-strong)] text-text" : "text-text-muted hover:bg-[color:var(--color-surface-strong)]")}
                >
                  <Image
                    src={languageFlags[targetLocale]}
                    alt={languageLabels[targetLocale]}
                    width={24}
                    height={24}
                    className="size-6 rounded-full object-cover shadow-sm"
                  />
                  <span className="flex-1 text-sm font-medium">{languageLabels[targetLocale]}</span>
                  {active ? <span className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">On</span> : null}
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}
