/**
 * Formatação de APRESENTAÇÃO (pt-BR) dos valores que a API manda prontos:
 * moeda, percentual, data e competência. Só forma — nada é recalculado.
 */

export const brl = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

/** `R$ 1,2 mil` — eixos de gráfico (o valor cheio fica no tooltip). */
export const brlCompacto = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", notation: "compact", maximumFractionDigits: 1 });

/** Percentual com 2 casas: `35,00%`. */
export const percentual = (v: number) =>
  `${v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`;

/** Taxa já em percentual, de 2 a 4 casas (`1,8500%` → `1,85%`); ausente → vazio. */
export const percentualTaxa = (valor?: number) =>
  valor == null ? "" : `${valor.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 4 })}%`;

/** `2026-06` → `06/2026`. */
export const formatCompetencia = (competencia?: string) => {
  const [ano, mes] = competencia?.split("-") ?? [];
  return ano && mes ? `${mes}/${ano}` : "—";
};

/** Data ISO-8601 (com fuso) → `dd/MM/yyyy`, usando só a parte da data. */
export const formatData = (iso?: string) => {
  const [ano, mes, dia] = iso?.slice(0, 10).split("-") ?? [];
  return ano && mes && dia ? `${dia}/${mes}/${ano}` : "—";
};
