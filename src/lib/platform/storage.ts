import { isNativePlatform } from "@/lib/platform/capacitor";

const storagePrefix = "@multiplataforma-base";

export const storageKeys = {
  locale: `${storagePrefix}/locale`,
  session: `${storagePrefix}/session`,
  sessionUser: `${storagePrefix}/session_user`,
  deviceId: `${storagePrefix}/device_id`,
  biometricPreferenceByLogin: `${storagePrefix}/biometric_preference`,
  // @dev-only:start
  developerModeSettings: `${storagePrefix}/developer_mode_settings`,
  // @dev-only:end
  theme: `${storagePrefix}/theme`,
  themeColors: `${storagePrefix}/theme_colors`,
  colorScheme: `${storagePrefix}/color_scheme`,
  fontPreset: `${storagePrefix}/font_preset`,
  fontScale: `${storagePrefix}/font_scale`,
  radiusPreset: `${storagePrefix}/radius_preset`,
  pushDeviceToken: `${storagePrefix}/push_device_token`,
  deviceNotifications: `${storagePrefix}/device_notifications`,
  mobileNavPinsByUser: `${storagePrefix}/mobile_nav_pins`,
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

/**
 * Storage da SESSAO autenticada (token). Web: `sessionStorage` — o token morre
 * com a aba (evitar `localStorage` para o token).
 * Nativo: `localStorage` do WebView do app (ponto de troca para um plugin de
 * armazenamento seguro do aparelho).
 */
function sessionStore(): Storage | null {
  if (typeof window === "undefined") {
    return null;
  }

  return isNativePlatform() ? window.localStorage : window.sessionStorage;
}

export function getSessionItem(key: string) {
  return sessionStore()?.getItem(key) ?? null;
}

export function setSessionItem(key: string, value: string) {
  sessionStore()?.setItem(key, value);
}

export function removeSessionItem(key: string) {
  sessionStore()?.removeItem(key);
}
