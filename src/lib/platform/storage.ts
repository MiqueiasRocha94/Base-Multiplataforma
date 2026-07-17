const storagePrefix = "@multiplataforma-base";

export const storageKeys = {
  locale: `${storagePrefix}/locale`,
  session: `${storagePrefix}/session`,
  sessionUser: `${storagePrefix}/session_user`,
  biometricPreferenceByLogin: `${storagePrefix}/biometric_preference`,
  developerModeSettings: `${storagePrefix}/developer_mode_settings`,
  theme: `${storagePrefix}/theme`,
  themeColors: `${storagePrefix}/theme_colors`,
  colorScheme: `${storagePrefix}/color_scheme`,
  fontPreset: `${storagePrefix}/font_preset`,
  fontScale: `${storagePrefix}/font_scale`,
  radiusPreset: `${storagePrefix}/radius_preset`,
  pushDeviceToken: `${storagePrefix}/push_device_token`,
  deviceNotifications: `${storagePrefix}/device_notifications`,
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
