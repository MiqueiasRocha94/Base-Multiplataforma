/**
 * Query generica de listagem — os parametros "basicos" que uma API de lista
 * costuma aceitar. Espelha o contrato da base Expo (`ListQuery`): no modo
 * servidor sao enviados como query string (`?limit=&offset=&from=&to=`); no modo
 * cliente, `applyListQuery` os aplica sobre a lista em memoria.
 */
export type ListQuery = {
  /** Tamanho da pagina. `null` = sem limite ("Todos"). */
  limit: number | null;
  /** Deslocamento: pula os primeiros N registros. */
  offset: number;
  /** Filtro por data (timestamp ms). `null` = sem limite. */
  dateFrom: number | null;
  dateTo: number | null;
};

export const EMPTY_LIST_QUERY: ListQuery = {
  limit: null,
  offset: 0,
  dateFrom: null,
  dateTo: null,
};

export type ListPage<T> = {
  data: T[];
  total: number;
};

/**
 * Aplica os parametros basicos (data → offset → limite) sobre uma lista em
 * memoria, devolvendo a pagina e o total apos o filtro de data. `dateOf` extrai
 * o timestamp do item (obrigatorio para o filtro de data).
 */
export function applyListQuery<T>(
  items: T[],
  query: ListQuery,
  dateOf?: (item: T) => number,
): ListPage<T> {
  let result = items;

  if (dateOf && (query.dateFrom !== null || query.dateTo !== null)) {
    result = result.filter((item) => {
      const value = dateOf(item);
      if (query.dateFrom !== null && value < query.dateFrom) {
        return false;
      }
      if (query.dateTo !== null && value > query.dateTo) {
        return false;
      }
      return true;
    });
  }

  const total = result.length;

  if (query.offset > 0) {
    result = result.slice(query.offset);
  }

  if (query.limit !== null && query.limit > 0) {
    result = result.slice(0, query.limit);
  }

  return { data: result, total };
}
