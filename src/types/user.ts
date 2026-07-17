import type { AppLocale } from "@/lib/i18n/settings";
import type { AppTheme } from "@/contexts/ThemeProvider";

/**
 * Identidade do usuario autenticado (o "principal" da sessao) — a fonte de
 * verdade da AUTORIZACAO.
 *
 * Vive na RAIZ de `src/types/` DE PROPOSITO: e uma interface estatica, nao um
 * recurso CRUD, entao NAO vai para `src/types/model/` e o scaffold nunca gera
 * paginas para ela. A entidade CRUD de exemplo e `Person` (`types/model/person.ts`).
 *
 * Substitua/expanda os literais conforme o dominio do seu backend.
 */

/** Situacao cadastral do usuario. */
export type UserStatus = "ACTIVE" | "INACTIVE" | "BLOCKED" | "PENDING";

/** Origem da autenticacao. */
export type AuthProvider = "LOCAL" | "GOOGLE" | "MICROSOFT" | "LDAP" | "SSO";

/** Natureza juridica da organizacao. */
export type OrganizationType = "LEGAL_PERSON" | "NATURAL_PERSON";

/** Tipo de vinculo do usuario com a organizacao. */
export type OrganizationBondType = "EMPLOYEE" | "PARTNER" | "CONTRACTOR" | "CUSTOMER" | "REPRESENTATIVE";

/** Ambiente que emitiu a resposta. */
export type AuthEnvironment = "PRODUCTION" | "HOMOLOG" | "DEVELOPMENT";

/**
 * Papel/perfil de acesso. Tipado como uniao para o dominio demo (spec §1).
 * O backend real pode reabrir para `string` sem impacto na UI.
 */
export type Role = "USER" | "ANALISTA" | "ADMIN";

/**
 * Permissao granular no formato "recurso.acao". Uniao para o dominio demo
 * (entidade `Person`); reabra conforme o backend.
 */
export type Permission =
  | "pessoa.visualizar"
  | "pessoa.criar"
  | "pessoa.editar"
  | "pessoa.remover"
  | "pessoa.exportar";

/** Estado da autenticacao corrente. */
export type UserAuthentication = {
  provider: AuthProvider;
  authenticated: boolean;
  /** Autenticacao multifator concluida nesta sessao. */
  mfa: boolean;
  sessionId: string;
  /** ISO 8601 (ex.: "2026-06-30T08:15:42Z"). */
  authenticatedAt: string;
};

/** Papeis e permissoes efetivas do usuario. */
export type UserAuthorization = {
  roles: Role[];
  permissions: Permission[];
};

/** Vinculo do usuario dentro da organizacao. */
export type OrganizationBond = {
  type: OrganizationBondType;
  /** Identificador do vinculo (ex.: matricula do funcionario). */
  id: string;
};

/** Organizacao (tenant) a qual o usuario pertence. */
export type UserOrganization = {
  /** Chave logica do tenant (ex.: "VILLEFORT"). */
  tenant: string;
  type: OrganizationType;
  id: string;
  /** Documento fiscal (CNPJ/CPF conforme `type`). */
  document: string;
  name: string;
  tradeName: string;
  email: string;
  phone: string;
  bond: OrganizationBond;
};

/** Preferencias de uso do usuario. */
export type UserPreferences = {
  theme: AppTheme;
  language: AppLocale;
  /** Rota inicial apos login (ex.: "/portal/home"). */
  homePage: string;
  /** Tamanho de pagina padrao em listagens. */
  pageSize: number;
};

/** Regionalizacao (formatacao de datas, numeros e moeda). */
export type UserLocalization = {
  locale: AppLocale;
  /** IANA timezone (ex.: "America/Sao_Paulo"). */
  timezone: string;
  /** ISO 4217 (ex.: "BRL"). */
  currency: string;
};

/** Metadados da resposta que originou a sessao. */
export type UserMetadata = {
  apiVersion: string;
  environment: AuthEnvironment;
  /** ISO 8601 de emissao do payload. */
  issuedAt: string;
};

/** Usuario autenticado completo (identidade + autorizacao). */
export type User = {
  id: string;
  /** Codigo de negocio legivel (ex.: "000001"). */
  code: string;
  username: string;
  name: string;
  /** Nome curto para saudacoes/menu (ex.: "Joao"). */
  displayName: string;
  email: string;
  phone: string;
  avatar: string;
  status: UserStatus;

  authentication: UserAuthentication;
  authorization: UserAuthorization;
  organization: UserOrganization;
  preferences: UserPreferences;
  localization: UserLocalization;
  metadata: UserMetadata;
};
