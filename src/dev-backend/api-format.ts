import { HttpError } from "@/lib/http";

/**
 * DEV BACKEND — formato de erro da API (`{message, codigo, erros[]}`), como
 * chega do `apiFetch`, para os mocks responderem igual à API real.
 */
export function erroApi(status: number, message: string): HttpError {
  return new HttpError(status, { message, codigo: status, erros: [{ message, codigo: status }] }, message);
}
