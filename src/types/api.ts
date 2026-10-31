/**
 * Formatos genéricos da API (listagens e contrato). Nomes seguem o JSON da API.
 */

/** Paginação de uma listagem `GET /{entity}?page=&size=` (formato `PagedModel` do Spring). */
export type PaginaMeta = {
  /** Tamanho da página pedido (1–500, padrão 10). */
  size: number;
  /** Página atual, começando em 0. */
  number: number;
  totalElements: number;
  totalPages: number;
};

/** Resposta de listagem da API: `{content, page}`. */
export type Pagina<T> = {
  content: T[];
  page: PaginaMeta;
};

/** Parâmetros de paginação de uma listagem da API (`page` começa em 0). */
export type Paginacao = {
  page?: number;
  size?: number;
};

/** Documento gerado no backend (PDF/CSV): corpo + nome vindo do `Content-Disposition`. */
export type ArquivoBaixado = {
  blob: Blob;
  nome: string;
};
