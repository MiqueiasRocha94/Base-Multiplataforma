/**
 * Diagnóstico do card de 500 no MODO DESENVOLVEDOR: o erro real (nome, mensagem,
 * status) e a origem — BACKEND quando veio da API (`HttpError` 5xx, ou resposta
 * fora do contrato com `origin: "api"`), senão FRONT com o alvo.
 *
 * Ferramenta de dev: a entrada de build de homologação/produção não tem este
 * módulo nem a chamada a ele (docs/ferramentas-dev.md → "Fora dos artefatos").
 */
export type ErrorDiagnostics = {
  code: string;
  origin: string;
  title: string;
  description: string;
};

type DiagnosableError = Error & { status?: number; origin?: string };

export function errorDiagnostics(error: DiagnosableError, front: string): ErrorDiagnostics | null {
  const fromApi = error.name === "HttpError" && typeof error.status === "number";
  return {
    code: fromApi ? String(error.status) : "500",
    origin: fromApi
      ? `Backend · API ${error.status}`
      : error.origin === "api"
        ? "Backend · API (resposta fora do contrato)"
        : `Front · ${front}`,
    title: error.name || "Error",
    description: error.message,
  };
}
