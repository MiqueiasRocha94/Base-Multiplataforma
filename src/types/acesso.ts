/**
 * Contrato do AUTH (`/auth/*`) — ver docs/autenticacao-e-permissoes.md.
 *
 * Vive na RAIZ de `src/types/` (identidade/sessao, nao entidade CRUD). Os nomes
 * seguem o JSON da API (pt-BR) de proposito: o service devolve o payload cru e
 * `lib/auth/acesso.ts` converte para os tipos do base (`User`).
 */

/**
 * Resposta de login, `/senha`, `/me` e `/refresh`.
 *
 * - `/me` nao traz `token`/`expiresIn` (continua valendo o token guardado).
 * - `/refresh` devolve a sessao com token novo.
 * Campos nulos nao vem na resposta.
 */
export type SessaoAcesso = {
  token?: string;
  /** Segundos ate expirar (`agora + expiresIn`). */
  expiresIn?: number;
  /** `DPoP` = token vinculado a chave da instalacao. */
  tokenType?: "Bearer" | "DPoP";
  /** So nativo (web recebe o refresh em cookie HttpOnly). Rotativo: cada uso devolve outro. */
  refreshToken?: string;
  /** Segundos ate o fim da validade absoluta da sessao (web e nativo). */
  refreshExpiresIn?: number;
  id?: number | string;
  login: string;
  nome: string;
  email?: string;
  telefone?: string;
  /** Papeis do usuario (decididos pelo backend). */
  papeis?: string[];
  /** Codigos de permissao do usuario (decididos pelo backend). */
  permissoes?: string[];
  senhaExpirada?: boolean;
};

/** Corpo de erro comum a todas as rotas da API. */
export type ErroApi = {
  timestamp?: string;
  message: string;
  codigo: number;
  erros?: { message: string; codigo: number }[];
};

/** Proxima tela depois de login ou troca de senha. */
export type ProximaTela = "trocarSenha" | "inicio";
