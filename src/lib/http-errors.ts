import { HttpError } from "@/lib/http";

/** Mensagem exibível: 4xx traz a `message` da API; o resto vira genérica. */
export function mensagemDeErro(erro: unknown) {
  if (erro instanceof HttpError && erro.status < 500) {
    return erro.message;
  }
  return "Não foi possível carregar agora. Tente de novo.";
}
