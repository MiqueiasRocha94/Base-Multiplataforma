"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";

import { getStorageItem, setStorageItem, storageKeys } from "@/lib/platform/storage";

export type DeveloperModeSettings = {
  quickAccessEnabled: boolean;
  formBlocksEnabled: boolean;
  zodEnabled: boolean;
  mockedDataEnabled: boolean;
  ignoreTlsEnabled: boolean;
  /** Desliga o captcha (Turnstile) do login/esqueci a senha na web. */
  captchaDisabled: boolean;
};

type DeveloperModeContextValue = {
  developerModeEnabled: boolean;
  settings: DeveloperModeSettings;
  updateSetting: <K extends keyof DeveloperModeSettings>(key: K, value: DeveloperModeSettings[K]) => void;
  resetSettings: () => void;
};

const DEFAULT_DEVELOPER_MODE_SETTINGS: DeveloperModeSettings = {
  quickAccessEnabled: true,
  formBlocksEnabled: false,
  zodEnabled: true,
  mockedDataEnabled: false,
  ignoreTlsEnabled: false,
  captchaDisabled: false,
};

// So habilita no ambiente de desenvolvimento explicito. Isso fecha o buraco de
// um `next build` cru (sem APP_ENV) herdar as flags de dev do .env base e ligar
// comportamentos sensiveis (dados mockados, ignorar TLS, etc.) em producao.
const isDevEnv = process.env.NEXT_PUBLIC_APP_ENV === "development";
const developerModeEnabled =
  isDevEnv &&
  (String(process.env.NEXT_PUBLIC_DEVELOPER_MODE ?? "").trim().toLowerCase() === "true" ||
    process.env.NODE_ENV !== "production");

const DeveloperModeContext = createContext<DeveloperModeContextValue | null>(null);

function resolveInitialSettings() {
  if (!developerModeEnabled) {
    return DEFAULT_DEVELOPER_MODE_SETTINGS;
  }

  const storedSettings = getStorageItem(storageKeys.developerModeSettings);

  if (!storedSettings) {
    return DEFAULT_DEVELOPER_MODE_SETTINGS;
  }

  try {
    const parsedSettings = JSON.parse(storedSettings) as Partial<DeveloperModeSettings>;

    return {
      ...DEFAULT_DEVELOPER_MODE_SETTINGS,
      ...parsedSettings,
    };
  } catch {
    return DEFAULT_DEVELOPER_MODE_SETTINGS;
  }
}

export function DeveloperModeProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<DeveloperModeSettings>(resolveInitialSettings);

  useEffect(() => {
    if (!developerModeEnabled) {
      return;
    }

    setStorageItem(storageKeys.developerModeSettings, JSON.stringify(settings));
  }, [settings]);

  const value = useMemo<DeveloperModeContextValue>(
    () => ({
      developerModeEnabled,
      settings,
      updateSetting: (key, value) => {
        setSettings((currentSettings) => ({
          ...currentSettings,
          [key]: value,
        }));
      },
      resetSettings: () => {
        setSettings(DEFAULT_DEVELOPER_MODE_SETTINGS);
      },
    }),
    [settings],
  );

  return <DeveloperModeContext.Provider value={value}>{children}</DeveloperModeContext.Provider>;
}

export function useDeveloperMode() {
  const context = useContext(DeveloperModeContext);

  if (!context) {
    throw new Error("useDeveloperMode must be used within DeveloperModeProvider.");
  }

  return context;
}
