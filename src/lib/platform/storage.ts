const storagePrefix = "@multiplataforma-base";

export const storageKeys = {
  locale: `${storagePrefix}/locale`,
  session: `${storagePrefix}/session`,
  biometricPreferenceByLogin: `${storagePrefix}/biometric_preference`,
  developerModeSettings: `${storagePrefix}/developer_mode_settings`,
  theme: `${storagePrefix}/theme`,
  fontPreset: `${storagePrefix}/font_preset`,
} as const;

export function getStorageItem(key: string) {
  if (typeof window === "undefined") {
    return null;
  }

  return window.localStorage.getItem(key);
}

export function setStorageItem(key: string, value: string) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(key, value);
}

export function removeStorageItem(key: string) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem(key);
}
