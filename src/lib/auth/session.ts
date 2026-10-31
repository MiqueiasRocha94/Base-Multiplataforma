import { toUser } from "@/lib/auth/acesso";
import {
  getSessionItem,
  getStorageItem,
  removeSessionItem,
  removeStorageItem,
  setSessionItem,
  setStorageItem,
  storageKeys,
} from "@/lib/platform/storage";
import type { SessaoAcesso } from "@/types/acesso";
import type { User } from "@/types/user";

/**
 * Sessao autenticada no app (docs/autenticacao-e-permissoes.md).
 *
 * Guarda o token e a hora de expiracao (`agora + expiresIn`), nunca a senha.
 * A resposta traz `refreshExpiresIn`: a sessao segue viva enquanto o refresh
 * valer e o transporte renova o token (web: refresh em cookie HttpOnly;
 * nativo: `refreshToken` aqui). Sem refresh: expirou → a sessao some e o
 * gate manda para o login. Web usa `sessionStorage`; nativo, o storage do app
 * (ver `getSessionItem`).
 */
export type AuthSession = {
  /** Login digitado — chave por usuario (biometria, atalhos da barra). */
  login: string;
  /** Nome para exibicao. */
  username: string;
  /** E-mail do usuario (cai para o login quando a API nao envia). */
  email: string;
  accessToken: string;
  /** `DPoP` = token vinculado a chave da instalacao (`lib/auth/dpop`). */
  tokenType?: "Bearer" | "DPoP";
  /** Epoch em ms. */
  expiresAt: number;
  /** So nativo (no web o refresh fica em cookie HttpOnly). */
  refreshToken?: string;
  /** Epoch em ms; ausente = sessao sem renovacao. */
  refreshExpiresAt?: number;
  loggedAt: string;
  senhaExpirada: boolean;
};

type SessionListener = (session: AuthSession | null) => void;

const listeners = new Set<SessionListener>();

/**
 * Avisa mudancas feitas fora do AuthContext (renovacao do token pelo
 * transporte, refresh recusado). Devolve o cancelamento.
 */
export function subscribeSession(listener: SessionListener) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function notify(session: AuthSession | null) {
  listeners.forEach((listener) => listener(session));
}

/** Refresh ainda valido → a sessao sobrevive ao access token expirado. */
export function sessaoRenovavel(session: AuthSession): boolean {
  return typeof session.refreshExpiresAt === "number" && session.refreshExpiresAt > Date.now();
}

/**
 * Persiste a resposta do auth (login, `/senha`, `/refresh`, `/me`).
 * Toda resposta com `token` SUBSTITUI o guardado (e a renovacao que veio com
 * ele); `/me` (sem token) mantem o atual.
 */
export function saveSession(sessao: SessaoAcesso, current: AuthSession | null = null): AuthSession {
  const token = sessao.token ?? current?.accessToken;
  if (!token) {
    throw new Error("Resposta do auth sem token.");
  }

  const now = Date.now();
  const novoToken = Boolean(sessao.token);
  const session: AuthSession = {
    login: sessao.login,
    username: sessao.nome || sessao.login,
    email: sessao.email || sessao.login,
    accessToken: token,
    tokenType: novoToken ? (sessao.tokenType ?? "Bearer") : current?.tokenType,
    expiresAt: sessao.expiresIn ? now + sessao.expiresIn * 1000 : (current?.expiresAt ?? now),
    refreshToken: novoToken ? sessao.refreshToken : current?.refreshToken,
    refreshExpiresAt: novoToken
      ? (sessao.refreshExpiresIn ? now + sessao.refreshExpiresIn * 1000 : undefined)
      : current?.refreshExpiresAt,
    loggedAt: current?.loggedAt ?? new Date().toISOString(),
    senhaExpirada: sessao.senhaExpirada === true,
  };

  setSessionItem(storageKeys.session, JSON.stringify(session));
  setSessionItem(storageKeys.sessionUser, JSON.stringify(toUser(sessao)));

  notify(session);
  return session;
}

/**
 * Sessao guardada, ou `null` quando ausente, corrompida ou expirada (token
 * vencido SEM refresh valido). Limpa sem avisar: pode rodar durante o render.
 */
export function getSession(): AuthSession | null {
  const serialized = getSessionItem(storageKeys.session);
  if (!serialized) {
    return null;
  }

  try {
    const session = JSON.parse(serialized) as AuthSession;
    const vigente = typeof session.expiresAt === "number" && (session.expiresAt > Date.now() || sessaoRenovavel(session));
    if (!session.accessToken || !vigente) {
      removeStoredSession();
      return null;
    }
    return session;
  } catch {
    removeStoredSession();
    return null;
  }
}

/** Identidade autenticada da sessao guardada. */
export function getSessionUser(): User | null {
  const serialized = getSessionItem(storageKeys.sessionUser);
  if (!serialized) {
    return null;
  }

  try {
    return JSON.parse(serialized) as User;
  } catch {
    removeSessionItem(storageKeys.sessionUser);
    return null;
  }
}

export function setBiometricPreference(login: string, enabled: boolean) {
  setStorageItem(`${storageKeys.biometricPreferenceByLogin}:${login.toLowerCase()}`, String(enabled));
}

export function getBiometricPreference(login: string) {
  return getStorageItem(`${storageKeys.biometricPreferenceByLogin}:${login.toLowerCase()}`) === "true";
}

function removeStoredSession() {
  removeSessionItem(storageKeys.session);
  removeSessionItem(storageKeys.sessionUser);
  // Sessao demo antiga ficava no localStorage.
  removeStorageItem(storageKeys.session);
  removeStorageItem(storageKeys.sessionUser);
}

/**
 * Logout local = descartar o token no app. O AuthContext tambem chama
 * `/auth/logout` para revogar a sessao no servidor.
 */
export function clearSession() {
  removeStoredSession();
  notify(null);
}
