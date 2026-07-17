import { getStorageItem, removeStorageItem, setStorageItem, storageKeys } from "@/lib/platform/storage";
import { resolveAuthUser } from "@/lib/auth/demo-users";
import type { User } from "@/types/user";

export type DemoSession = {
  email: string;
  accessToken: string;
  username: string;
  profile: "portal";
  allowedRoutes: string[];
  loggedAt: string;
};

const cookieKeys = {
  accessToken: "mp_access_token",
  username: "mp_username",
  profile: "mp_profile",
  allowedRoutes: "mp_allowed_routes",
};

function writeCookie(name: string, value: string, maxAge = 60 * 60 * 8) {
  if (typeof document === "undefined") {
    return;
  }

  document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=${maxAge}; SameSite=Lax`;
}

function clearCookie(name: string) {
  if (typeof document === "undefined") {
    return;
  }

  document.cookie = `${name}=; path=/; max-age=0; SameSite=Lax`;
}

function readCookie(name: string): string | null {
  if (typeof document === "undefined") {
    return null;
  }

  const match = document.cookie.match(new RegExp(`(^| )${name}=([^;]+)`));
  return match ? decodeURIComponent(match[2]) : null;
}

function persistSessionCookies(session: DemoSession) {
  writeCookie(cookieKeys.accessToken, session.accessToken);
  writeCookie(cookieKeys.username, session.username);
  writeCookie(cookieKeys.profile, session.profile);
  writeCookie(cookieKeys.allowedRoutes, JSON.stringify(session.allowedRoutes));
}

function clearSessionCookies() {
  clearCookie(cookieKeys.accessToken);
  clearCookie(cookieKeys.username);
  clearCookie(cookieKeys.profile);
  clearCookie(cookieKeys.allowedRoutes);
}

export async function signIn(email: string, biometricOptIn = false): Promise<DemoSession> {
  const session = {
    email,
    accessToken: `demo-token-${Math.random().toString(36).slice(2, 10)}`,
    username: email.split("@")[0] || email,
    profile: "portal" as const,
    allowedRoutes: ["portal"],
    loggedAt: new Date().toISOString(),
  } satisfies DemoSession;

  setStorageItem(storageKeys.session, JSON.stringify(session));
  persistSessionCookies(session);
  setBiometricPreference(email, biometricOptIn);

  // Resolve e persiste a identidade completa (`/auth/me` mockado). No backend
  // real, o `User` (com roles/permissions) vem da resposta do login.
  const user = resolveAuthUser(email);
  setStorageItem(storageKeys.sessionUser, JSON.stringify(user));

  return session;
}

/** Identidade autenticada persistida (fonte de verdade da autorizacao na UI). */
export function getSessionUser(): User | null {
  const serialized = getStorageItem(storageKeys.sessionUser);

  if (!serialized) {
    return null;
  }

  try {
    return JSON.parse(serialized) as User;
  } catch {
    removeStorageItem(storageKeys.sessionUser);
    return null;
  }
}

export function getSession(): DemoSession | null {
  const serialized = getStorageItem(storageKeys.session);

  if (serialized) {
    try {
      return JSON.parse(serialized) as DemoSession;
    } catch {
      removeStorageItem(storageKeys.session);
    }
  }

  const accessToken = readCookie(cookieKeys.accessToken);
  const username = readCookie(cookieKeys.username);
  const profile = readCookie(cookieKeys.profile);
  const allowedRoutesRaw = readCookie(cookieKeys.allowedRoutes);

  if (!accessToken || !username || profile !== "portal") {
    return null;
  }

  let allowedRoutes: string[] = [];
  try {
    allowedRoutes = allowedRoutesRaw ? JSON.parse(allowedRoutesRaw) : [];
  } catch {
    allowedRoutes = [];
  }

  return {
    email: username,
    accessToken,
    username,
    profile: "portal",
    allowedRoutes,
    loggedAt: new Date().toISOString(),
  };
}

export function setBiometricPreference(login: string, enabled: boolean) {
  setStorageItem(`${storageKeys.biometricPreferenceByLogin}:${login.toLowerCase()}`, String(enabled));
}

export function getBiometricPreference(login: string) {
  return getStorageItem(`${storageKeys.biometricPreferenceByLogin}:${login.toLowerCase()}`) === "true";
}

export function clearSession() {
  removeStorageItem(storageKeys.session);
  removeStorageItem(storageKeys.sessionUser);
  clearSessionCookies();
}

export function signOut() {
  clearSession();
}
