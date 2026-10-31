/**
 * Credenciais do "Entrar com a API" contra uma API real (ex.: homolog), lidas
 * de variáveis do `.env.development.local` (local, ignorado pelo git):
 * `NEXT_PUBLIC_DEV_QUICK_LOGIN` e `NEXT_PUBLIC_DEV_QUICK_PASSWORD`.
 * Só valem com a API configurada (`NEXT_PUBLIC_ACESSO_API_URL`); sem ela, ou sem
 * as variáveis, `null` → o atalho não aparece.
 *
 * Ferramenta de dev: a entrada de build de homologação/produção não tem este
 * módulo nem a chamada a ele (docs/ferramentas-dev.md → "Fora dos artefatos").
 */
export type QuickLogin = { login: string; password: string };

export function apiQuickLogin(): QuickLogin | null {
  const login = process.env.NEXT_PUBLIC_DEV_QUICK_LOGIN?.trim() ?? "";
  const password = process.env.NEXT_PUBLIC_DEV_QUICK_PASSWORD ?? "";
  if (!process.env.NEXT_PUBLIC_ACESSO_API_URL || !login || !password) {
    return null;
  }
  return { login, password };
}
