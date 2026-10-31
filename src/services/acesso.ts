// @dev-only:start
import { devEsqueciSenha, devLogin, devMe, devTrocarSenha } from "@/dev-backend/acesso";
// @dev-only:end
import { clienteApp } from "@/lib/auth/canal";
import { obterJktDpop } from "@/lib/auth/dpop";
import type { AuthSession } from "@/lib/auth/session";
import { obterAtestadoApp } from "@/lib/platform/app-attestation";
import { ACESSO_API_URL, chamarApi, renovarSessao } from "@/services/api/cliente";
import type { ProximaTela, SessaoAcesso } from "@/types/acesso";

/**
 * Service de ACESSO — auth da API (docs/autenticacao-e-permissoes.md).
 *
 * Com `ACESSO_API_URL` definido fala com a API (`chamarApi`); sem ele usa o
 * dev-backend, que reproduz o mesmo contrato. As telas nao sabem a origem.
 * Canal, captcha, DPoP e refresh seguem docs/autenticacao-e-permissoes.md "Canais".
 *
 * Erros chegam como `HttpError` (`status` = `codigo`, `message` = `message` da
 * API). A decisao do que fazer (401 → login, 403 → mensagem...) fica no chamador.
 */

export { ACESSO_API_URL };

const usaApi = () => Boolean(ACESSO_API_URL);

async function chamar(caminho: string, init: RequestInit = {}, token?: string): Promise<SessaoAcesso> {
  const response = await chamarApi(caminho, { ...init, token });
  return (await response.json()) as SessaoAcesso;
}

const post = (corpo?: unknown): RequestInit => ({
  method: "POST",
  body: corpo === undefined ? undefined : JSON.stringify(corpo),
});

/**
 * Campos de canal do login: `clientId` (obrigatorio), `captcha` (web) e o
 * atestado do app (nativo; hoje `null` — plugin pendente).
 */
async function camposDoCanal(captcha?: string) {
  const atestado = await obterAtestadoApp(await obterJktDpop());
  return { clientId: clienteApp(), captcha, atestado: atestado ?? undefined };
}

/**
 * `POST /auth/login`. Senha em texto (HTTPS); nunca reenviar automaticamente.
 * `captcha` = token do Turnstile (web, uso unico — o form gera outro a cada envio).
 */
export async function login(usuario: string, senha: string, deviceid: string, captcha?: string): Promise<SessaoAcesso> {
  // @dev-only:start
  if (!usaApi()) {
    return devLogin(usuario, senha);
  }
  // @dev-only:end
  return chamar("/auth/login", post({ login: usuario, senha, deviceid, ...(await camposDoCanal(captcha)) }));
}

/**
 * `POST /auth/senha` — troca a senha de ACESSO, expirada (tela obrigatoria)
 * ou voluntaria (menu "Redefinir senha"). Devolve sessao com token novo.
 * 400 = senha atual incorreta ou nova fora da regra (mostrar `message`).
 */
export function trocarSenha(senhaAntiga: string, senha: string, token: string): Promise<SessaoAcesso> {
  // @dev-only:start
  if (!usaApi()) {
    return devTrocarSenha(senhaAntiga, senha, token);
  }
  // @dev-only:end
  return chamar("/auth/senha", post({ senhaAntiga, senha }), token);
}

/**
 * `POST /auth/esqueci-senha` (sem token) → 204: senha nova (ja expirada) vai
 * para o e-mail. 400 `Informacoes invalidas.` · 403 conta bloqueada · 409 falha
 * no envio. E-mail errado conta tentativa invalida, como a senha errada.
 */
export async function esqueciSenha(usuario: string, email: string, captcha?: string): Promise<void> {
  // @dev-only:start
  if (!usaApi()) {
    return devEsqueciSenha(usuario, email);
  }
  // @dev-only:end
  await chamarApi("/auth/esqueci-senha", post({ login: usuario, email, clientId: clienteApp(), captcha }));
}

/** `GET /auth/me` — recarrega a sessao ao abrir o app (sem `token` na resposta). */
export function me(token: string): Promise<SessaoAcesso> {
  // @dev-only:start
  if (!usaApi()) {
    return devMe(token);
  }
  // @dev-only:end
  return chamar("/auth/me", {}, token);
}

/**
 * `POST /auth/refresh` — token novo antes de o atual vencer.
 * Sem API ou sem refresh valido → `null`.
 */
export function renovar(): Promise<AuthSession | null> {
  // @dev-only:start
  if (!usaApi()) {
    return Promise.resolve(null);
  }
  // @dev-only:end
  return renovarSessao();
}

/**
 * `POST /auth/logout` — revoga a sessao no servidor (token e refresh param
 * na hora; no web apaga o cookie). Aceita token expirado.
 */
export async function sair(token: string): Promise<void> {
  // @dev-only:start
  if (!usaApi()) {
    return;
  }
  // @dev-only:end
  await chamarApi("/auth/logout", { method: "POST", token, renovar: false });
}

/** Proxima tela: troca obrigatoria quando a senha expirou; senao, o inicio. */
export function proximaTela(sessao: Pick<SessaoAcesso, "senhaExpirada">): ProximaTela {
  return sessao.senhaExpirada ? "trocarSenha" : "inicio";
}
