import { isNativePlatform } from "@/lib/platform/capacitor";

/**
 * Canal do cliente no auth (docs/autenticacao-e-permissoes.md → "Canais, vinculação e renovação do
 * token").
 *
 * Os dois canais usam DPoP em toda chamada; muda onde fica o refresh token.
 */

/** `client_id` do OAuth: quem está pedindo o token (`clientId` do login). */
export type ClienteApp = "portal-web" | "app-mobile";

export function clienteApp(): ClienteApp {
  return isNativePlatform() ? "app-mobile" : "portal-web";
}

/** Web: o refresh token vive em cookie HttpOnly → auth com `credentials: include`. */
export function usaCookieDeRenovacao(): boolean {
  return !isNativePlatform();
}
