// @dev-only:start
import { devApiBase } from "@/dev-tools/runtime";
// @dev-only:end
import { usaCookieDeRenovacao } from "@/lib/auth/canal";
import { criarProvaDpop, tokenVinculado } from "@/lib/auth/dpop";
import { clearSession, getSession, saveSession, sessaoRenovavel, type AuthSession } from "@/lib/auth/session";
import { apiFetch, HttpError } from "@/lib/http";
import type { SessaoAcesso } from "@/types/acesso";

/**
 * Transporte da API (`/auth/*` e `/private/*`) usado pelos services
 * `acesso` e `entidades` (docs/autenticacao-e-permissoes.md → "Canais, vinculação e renovação do token"):
 *
 * - web e nativo: prova `DPoP` em toda chamada (inclusive login e refresh);
 *   token vinculado (`cnf.jkt`) vai como `Authorization: DPoP`. O backend
 *   recusa token de usuario em `Bearer`. `DPoP-Nonce` do servidor, se vier,
 *   entra na proxima prova.
 * - web: auth com `credentials: include` (refresh token em cookie HttpOnly).
 * - 401 com o token da sessao renovavel → renova UMA vez e repete a chamada;
 *   401 que persiste (ou sem renovacao possivel) → logout automatico.
 */

/**
 * Raiz da API autenticada — SEPARADA da API do portal de proposito: o auth pode
 * estar num dominio diferente e ir para a API real enquanto o portal segue no mock
 * (`NEXT_PUBLIC_API_BASE_URL` vazio). Sem fallback: vazia = dev-backend.
 */
export const ACESSO_API_URL = process.env.NEXT_PUBLIC_ACESSO_API_URL ?? "";

type OpcoesApi = RequestInit & {
  token?: string;
  /** `false` nas chamadas que nao podem disparar renovacao (refresh, logout). */
  renovar?: boolean;
};

let nonceDpop: string | undefined;

function guardarNonce(headers: Headers | undefined) {
  const nonce = headers?.get("DPoP-Nonce");
  if (nonce) {
    nonceDpop = nonce;
  }
}

/** O servidor pediu nonce antes de avaliar a chamada (nao conta tentativa de login). */
function pediuNonce(erro: HttpError): boolean {
  return (erro.status === 400 || erro.status === 401)
    && Boolean(erro.headers?.get("WWW-Authenticate")?.includes("use_dpop_nonce"));
}

async function enviar(caminho: string, init: RequestInit, token?: string, repetiuNonce = false): Promise<Response> {
  const headers = new Headers(init.headers);
  if (token) {
    headers.set("Authorization", `${tokenVinculado(token) ? "DPoP" : "Bearer"} ${token}`);
  }
  const metodo = init.method ?? "GET";
  let raiz = ACESSO_API_URL;
  // @dev-only:start
  // Em dev a chamada vai pelo proxy na mesma origem (raiz vazia), que repassa o
  // Host original: o `htu` é a URL chamada, resolvida contra a página.
  raiz = devApiBase(raiz);
  // @dev-only:end
  headers.set("DPoP", await criarProvaDpop(metodo, `${raiz}${caminho}`, { token, nonce: nonceDpop }));
  const credentials = usaCookieDeRenovacao() && caminho.startsWith("/auth/") ? "include" : init.credentials;

  try {
    const response = await apiFetch(caminho, { ...init, headers, credentials, baseUrl: raiz });
    guardarNonce(response.headers);
    return response;
  } catch (erro) {
    if (erro instanceof HttpError) {
      guardarNonce(erro.headers);
      if (!repetiuNonce && pediuNonce(erro)) {
        return enviar(caminho, init, token, true);
      }
    }
    throw erro;
  }
}

let renovacao: Promise<AuthSession | null> | null = null;

/**
 * `POST /auth/refresh` — uma renovacao por vez (chamadas simultaneas
 * aguardam a mesma). Refresh recusado (401/403) derruba a sessao; rede/5xx
 * propaga o erro e mantem a sessao para a proxima tentativa.
 */
export function renovarSessao(): Promise<AuthSession | null> {
  renovacao ??= (async () => {
    const atual = getSession();
    if (!atual || !sessaoRenovavel(atual)) {
      return null;
    }
    const init: RequestInit = { method: "POST" };
    if (atual.refreshToken) {
      init.body = JSON.stringify({ refreshToken: atual.refreshToken });
    }
    try {
      const response = await enviar("/auth/refresh", init);
      return saveSession((await response.json()) as SessaoAcesso, atual);
    } catch (erro) {
      if (erro instanceof HttpError && (erro.status === 401 || erro.status === 403)) {
        clearSession();
        return null;
      }
      throw erro;
    }
  })().finally(() => {
    renovacao = null;
  });
  return renovacao;
}

/**
 * Logout automatico: 401 que sobrou depois da renovacao = sessao invalida.
 * Derruba a sessao (o AuthContext ouve e o PortalGate leva ao login) so se o
 * token recusado ainda for o da sessao — resposta atrasada de uma sessao antiga
 * nao derruba a nova.
 */
function encerrarSeSessaoRecusada(erro: unknown, token: string) {
  if (erro instanceof HttpError && erro.status === 401 && getSession()?.accessToken === token) {
    clearSession();
  }
}

/**
 * Chamada a API. Erros chegam como `HttpError` (a decisao fica no chamador),
 * exceto o 401 de chamada autenticada sem renovacao possivel: alem de propagar,
 * encerra a sessao (logout automatico).
 */
export async function chamarApi(caminho: string, opcoes: OpcoesApi = {}): Promise<Response> {
  const { token, renovar = true, ...init } = opcoes;
  try {
    return await enviar(caminho, init, token);
  } catch (erro) {
    if (!renovar || !token || !(erro instanceof HttpError) || erro.status !== 401) {
      throw erro;
    }
    const atual = getSession();
    if (!atual || !sessaoRenovavel(atual)) {
      encerrarSeSessaoRecusada(erro, token);
      throw erro;
    }
    // Outra chamada ja renovou: so repete com o token atual.
    const vigente = atual.accessToken !== token ? atual : await renovarSessao();
    if (!vigente) {
      // Refresh recusado: `renovarSessao` ja encerrou a sessao.
      throw erro;
    }
    try {
      return await enviar(caminho, init, vigente.accessToken);
    } catch (repetido) {
      encerrarSeSessaoRecusada(repetido, vigente.accessToken);
      throw repetido;
    }
  }
}
