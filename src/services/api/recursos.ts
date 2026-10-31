import { ACESSO_API_URL, chamarApi } from "@/services/api/cliente";
import type { ArquivoBaixado } from "@/types/api";

/**
 * Helpers dos services de RECURSO da API (`/private/*`) — ex.: as entidades de
 * `services/entidades`. Todos seguem o mesmo padrao:
 *
 * - `usaApi()`: com `NEXT_PUBLIC_ACESSO_API_URL` fala com a API; sem ela o service
 *   usa o dev-backend, com o MESMO contrato;
 * - filtros em query string (`comQuery`), so os preenchidos; a prova DPoP usa a
 *   URL sem query (feito em `chamarApi`);
 * - erros chegam como `HttpError` com a `message` da API — a decisao (401 →
 *   login, 4xx → mostrar, 5xx → generica) fica na tela;
 * - arquivos (PDF/CSV) gerados no BACKEND: o front so baixa o corpo e o nome do
 *   `Content-Disposition` (`baixarArquivo`); salvar/compartilhar e da tela.
 */
export const usaApi = () => Boolean(ACESSO_API_URL);

/**
 * GETs em andamento, por token + caminho. Uma chamada igual enquanto a primeira
 * ainda nao respondeu reaproveita a mesma promise — evita a requisicao dobrada
 * do StrictMode em dev (efeito monta/desmonta/monta) e de cards remontando. Ao
 * terminar sai do mapa: "Tentar de novo" sempre vai a rede.
 */
const emAndamento = new Map<string, Promise<unknown>>();

/** `GET` JSON da API (com reaproveitamento de chamadas iguais em andamento). */
export function getJson<T>(caminho: string, token: string, headers?: Record<string, string>): Promise<T> {
  // Com headers (ex.: um segredo) não reaproveita: a chave conteria o valor.
  const chave = headers ? null : `${token}\n${caminho}`;
  const atual = chave ? emAndamento.get(chave) : undefined;
  if (atual) {
    return atual as Promise<T>;
  }

  // `chamarApi` escolhe o esquema (Bearer/DPoP) e renova o token num 401.
  const requisicao = chamarApi(caminho, { token, headers })
    .then((response) => response.json() as Promise<T>)
    .finally(() => {
      if (chave) emAndamento.delete(chave);
    });
  if (chave) emAndamento.set(chave, requisicao);
  return requisicao;
}

/** `POST` JSON da API. Corpo vazio na resposta (204/201 sem corpo) → `undefined`. */
export async function postJson<T>(caminho: string, token: string, corpo?: unknown): Promise<T> {
  const response = await chamarApi(caminho, {
    token,
    method: "POST",
    body: corpo === undefined ? undefined : JSON.stringify(corpo),
  });
  const texto = await response.text();
  return (texto ? JSON.parse(texto) : undefined) as T;
}

/** `caminho?chave=valor` só com os filtros preenchidos. */
export function comQuery(
  caminho: string,
  filtros: Record<string, string | number | boolean | readonly string[] | undefined>,
): string {
  const query = new URLSearchParams();
  for (const [chave, valor] of Object.entries(filtros)) {
    // Lista → parâmetro repetido (ex.: `sort=a,asc&sort=b,desc`).
    for (const item of Array.isArray(valor) ? valor : [valor]) {
      const texto = item == null ? "" : String(item).trim();
      if (texto) {
        query.append(chave, texto);
      }
    }
  }
  return query.size > 0 ? `${caminho}?${query}` : caminho;
}

/** Nome do arquivo no `Content-Disposition` (`filename*=UTF-8''…` ou `filename="…"`). */
export function nomeDoArquivo(header: string | null, padrao: string): string {
  if (!header) {
    return padrao;
  }
  const estendido = /filename\*=UTF-8''([^;]+)/i.exec(header);
  if (estendido) {
    try {
      return decodeURIComponent(estendido[1].trim());
    } catch {
      // nome malformado — cai no `filename=` simples.
    }
  }
  const simples = /filename="?([^";]+)"?/i.exec(header);
  return simples ? simples[1].trim() : padrao;
}

/**
 * `GET` de um DOCUMENTO gerado no backend (PDF/CSV): corpo + nome do
 * `Content-Disposition` (`padrao` se a API não mandar).
 */
export async function baixarArquivo(
  caminho: string,
  token: string,
  padrao: string,
  headers?: Record<string, string>,
): Promise<ArquivoBaixado> {
  const response = await chamarApi(caminho, { token, headers });
  return { blob: await response.blob(), nome: nomeDoArquivo(response.headers.get("Content-Disposition"), padrao) };
}
