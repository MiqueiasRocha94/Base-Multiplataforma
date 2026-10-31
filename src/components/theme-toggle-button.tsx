"use client";

import { useLanguage } from "@/contexts/LanguageContext";
import { useTheme } from "@/contexts/ThemeProvider";
import { useMounted } from "@/hooks/use-mounted";
import { cn } from "@/lib/utils";

function SunIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2.5v2.5M12 19v2.5M4.9 4.9l1.8 1.8M17.3 17.3l1.8 1.8M2.5 12H5M19 12h2.5M4.9 19.1l1.8-1.8M17.3 6.7l1.8-1.8" />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 15.3A8.5 8.5 0 1 1 8.7 4a7 7 0 1 0 11.3 11.3Z" />
    </svg>
  );
}

export function ThemeToggleButton({ className }: { className?: string }) {
  const { dictionary } = useLanguage();
  const { resolvedTheme, setTheme, theme } = useTheme();
  const mounted = useMounted();

  const darkModeActive = mounted ? resolvedTheme === "dark" : false;
  const nextTheme = darkModeActive ? "light" : "dark";
  const label = mounted ? (darkModeActive ? dictionary.account.themeDark : dictionary.account.themeLight) : dictionary.account.themeLight;
  const themeMode = mounted ? theme : "system";

  return (
    <button
      type="button"
      onClick={() => setTheme(nextTheme)}
      title={label}
      aria-label={label}
      data-theme-mode={themeMode}
      className={cn(
        "group inline-flex items-center justify-center gap-2 rounded-full border border-border bg-surface px-3 py-2 transition hover:bg-[color:var(--color-surface-strong)]",
        className,
      )}
    >
      <span className="text-text">{darkModeActive ? <MoonIcon /> : <SunIcon />}</span>
      <span className="overflow-hidden text-sm font-medium text-text-muted transition-all duration-300 max-w-0 group-hover:max-w-32 group-focus-visible:max-w-32">
        {label}
      </span>
    </button>
  );
}
