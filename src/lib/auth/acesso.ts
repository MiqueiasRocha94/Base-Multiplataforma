import type { ProximaTela, SessaoAcesso } from "@/types/acesso";
import type { Permission, Role, User } from "@/types/user";

/**
 * Conversao do payload do auth (`types/acesso`) para os tipos do base (`User`)
 * + as rotas do fluxo de acesso. Funcoes puras.
 */

/** Tela de troca de senha expirada. */
export const SENHA_EXPIRADA_PATH = "/portal/alterar-senha-expirada";
/** Destino apos o fluxo de acesso. */
export const INICIO_PATH = "/portal/home";

/** Rota da proxima tela do fluxo. */
export function caminhoDaTela(tela: ProximaTela): string {
  return tela === "trocarSenha" ? SENHA_EXPIRADA_PATH : INICIO_PATH;
}

/** Identidade do base a partir da sessao do auth. */
export function toUser(sessao: SessaoAcesso): User {
  const roles = (sessao.papeis ?? []) as Role[];
  const permissions = [...new Set<Permission>(sessao.permissoes ?? [])];
  const code = String(sessao.id ?? "");
  const nowIso = new Date().toISOString();

  return {
    id: code,
    code,
    username: sessao.login,
    name: sessao.nome,
    displayName: sessao.nome.split(" ")[0] ?? sessao.nome,
    email: sessao.email ?? "",
    phone: sessao.telefone ?? "",
    avatar: "",
    status: "ACTIVE",
    authentication: {
      provider: "LOCAL",
      authenticated: true,
      mfa: false,
      sessionId: code,
      authenticatedAt: nowIso,
    },
    authorization: { roles, permissions },
    organization: {
      tenant: "",
      type: "LEGAL_PERSON",
      id: "",
      document: "",
      name: "",
      tradeName: "",
      email: "",
      phone: "",
      bond: { type: "EMPLOYEE", id: code },
    },
    preferences: { theme: "system", language: "pt-BR", homePage: INICIO_PATH, pageSize: 50 },
    localization: { locale: "pt-BR", timezone: "America/Sao_Paulo", currency: "BRL" },
    metadata: { apiVersion: "", environment: "PRODUCTION", issuedAt: nowIso },
  };
}
