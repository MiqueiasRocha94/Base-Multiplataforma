"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";

import { getStorageItem, setStorageItem, storageKeys } from "@/lib/platform/storage";

export type AppTheme = "system" | "light" | "dark";
export type FontPreset = "system" | "reading" | "compact";

type ThemeContextValue = {
  theme: AppTheme;
  resolvedTheme: "light" | "dark";
  setTheme: (theme: AppTheme) => void;
  fontPreset: FontPreset;
  setFontPreset: (preset: FontPreset) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

function resolveInitialTheme(): AppTheme {
  const storedTheme = getStorageItem(storageKeys.theme);

  if (storedTheme === "light" || storedTheme === "dark" || storedTheme === "system") {
    return storedTheme;
  }

  return "system";
}

function resolveInitialFontPreset(): FontPreset {
  const storedFontPreset = getStorageItem(storageKeys.fontPreset);

  if (storedFontPreset === "system" || storedFontPreset === "reading" || storedFontPreset === "compact") {
    return storedFontPreset;
  }

  return "system";
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<AppTheme>(resolveInitialTheme);
  const [fontPreset, setFontPreset] = useState<FontPreset>(resolveInitialFontPreset);
  const [resolvedTheme, setResolvedTheme] = useState<"light" | "dark">("light");

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");

    const syncResolvedTheme = () => {
      if (theme === "system") {
        setResolvedTheme(mediaQuery.matches ? "dark" : "light");
        return;
      }

      setResolvedTheme(theme);
    };

    syncResolvedTheme();
    mediaQuery.addEventListener("change", syncResolvedTheme);

    return () => {
      mediaQuery.removeEventListener("change", syncResolvedTheme);
    };
  }, [theme]);

  useEffect(() => {
    setStorageItem(storageKeys.theme, theme);

    if (theme === "system") {
      delete document.documentElement.dataset.theme;
      return;
    }

    document.documentElement.dataset.theme = theme;
  }, [theme]);

  useEffect(() => {
    setStorageItem(storageKeys.fontPreset, fontPreset);
    document.documentElement.dataset.font = fontPreset;
  }, [fontPreset]);

  const value = useMemo<ThemeContextValue>(
    () => ({
      theme,
      resolvedTheme,
      setTheme,
      fontPreset,
      setFontPreset,
    }),
    [fontPreset, resolvedTheme, theme],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);

  if (!context) {
    throw new Error("useTheme must be used within ThemeProvider.");
  }

  return context;
}
