import type { Permission, Role, User } from "@/types/user";

/**
 * Fixtures de LOGIN (identidade `User`) — o que `/auth/me` devolveria por e-mail.
 *
 * Tres identidades estaveis com autorizacao distinta, para demonstrar o filtro
 * de acoes por permissao (RBAC) sobre a entidade `Person`. No app real, o backend
 * devolve o `User` com suas permissoes; aqui `resolveAuthUser` faz esse papel.
 *
 * Diferente do seed com faker (dev-backend), sao fixtures determinísticos e
 * separados — nunca passam pelo faker.
 */

export type DemoUserKind = "comum" | "analista" | "admin";

type DemoUserSpec = {
  kind: DemoUserKind;
  code: string;
  name: string;
  displayName: string;
  email: string;
  roles: Role[];
  permissions: Permission[];
};

const DEMO_SPECS: Record<DemoUserKind, DemoUserSpec> = {
  comum: {
    kind: "comum",
    code: "000101",
    name: "Clara Comum",
    displayName: "Clara",
    email: "comum@demo.local",
    roles: ["USER"],
    permissions: ["pessoa.visualizar"],
  },
  analista: {
    kind: "analista",
    code: "000102",
    name: "Andre Analista",
    displayName: "Andre",
    email: "analista@demo.local",
    roles: ["ANALISTA"],
    permissions: ["pessoa.visualizar", "pessoa.exportar"],
  },
  admin: {
    kind: "admin",
    code: "000103",
    name: "Alice Admin",
    displayName: "Alice",
    email: "admin@demo.local",
    roles: ["ADMIN"],
    permissions: ["pessoa.visualizar", "pessoa.criar", "pessoa.editar", "pessoa.remover", "pessoa.exportar"],
  },
};

/** E-mails demo (atalhos de login). */
export const DEMO_USER_EMAILS: Record<DemoUserKind, string> = {
  comum: DEMO_SPECS.comum.email,
  analista: DEMO_SPECS.analista.email,
  admin: DEMO_SPECS.admin.email,
};

function buildUser(spec: DemoUserSpec, email: string): User {
  const nowIso = new Date().toISOString();
  return {
    id: `USR_${spec.code}`,
    code: spec.code,
    username: email.split("@")[0] || email,
    name: spec.name,
    displayName: spec.displayName,
    email,
    phone: "+55 31 99999-9999",
    avatar: `https://i.pravatar.cc/150?u=${encodeURIComponent(spec.email)}`,
    status: "ACTIVE",
    authentication: {
      provider: "LOCAL",
      authenticated: true,
      mfa: false,
      sessionId: `SESS_${spec.code}`,
      authenticatedAt: nowIso,
    },
    authorization: {
      roles: spec.roles,
      permissions: spec.permissions,
    },
    organization: {
      tenant: "DEMO",
      type: "LEGAL_PERSON",
      id: "ORG_000001",
      document: "12.345.678/0001-90",
      name: "EMPRESA DEMO",
      tradeName: "DEMO",
      email: "contato@demo.local",
      phone: "+55 31 3333-0000",
      bond: { type: "EMPLOYEE", id: `FUNC_${spec.code}` },
    },
    preferences: {
      theme: "system",
      language: "pt-BR",
      homePage: "/portal/home",
      pageSize: 50,
    },
    localization: {
      locale: "pt-BR",
      timezone: "America/Sao_Paulo",
      currency: "BRL",
    },
    metadata: {
      apiVersion: "2.0.0",
      environment: "DEVELOPMENT",
      issuedAt: nowIso,
    },
  };
}

/** Classifica um e-mail livre em um dos perfis demo (heuristica amigavel). */
export function classifyDemoUser(email: string): DemoUserKind {
  const normalized = email.trim().toLowerCase();
  for (const kind of Object.keys(DEMO_SPECS) as DemoUserKind[]) {
    if (DEMO_SPECS[kind].email === normalized) {
      return kind;
    }
  }
  const local = normalized.split("@")[0] ?? "";
  if (local.includes("admin")) {
    return "admin";
  }
  if (local.includes("analista")) {
    return "analista";
  }
  return "comum";
}

/**
 * `/auth/me` mockado: resolve o `User` completo a partir do e-mail logado.
 * E-mails demo conhecidos mapeiam para o perfil correspondente; qualquer outro
 * cai em "comum", preservando o e-mail digitado na sessao.
 */
export function resolveAuthUser(email: string): User {
  const kind = classifyDemoUser(email);
  const spec = DEMO_SPECS[kind];
  // Para e-mails demo conhecidos, usa o e-mail canonico; senao, o digitado.
  const resolvedEmail = spec.email === email.trim().toLowerCase() ? spec.email : email;
  return buildUser(spec, resolvedEmail);
}
