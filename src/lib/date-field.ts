/**
 * Helpers puros do campo de data (`components/ui/date-field`). O valor trafega
 * no formato da API — dia `yyyy-MM-dd`, mês `yyyy-MM`, vazio = sem data — e é
 * exibido/digitado como `dd/mm/aaaa` ou `mm/aaaa`.
 */
export type DateFieldMode = "day" | "month";

const pad = (n: number) => String(n).padStart(2, "0");

/** Dias do mês (`month` de 1 a 12). */
export function daysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

/** `yyyy-MM-dd` / `yyyy-MM` → partes; inválido → null. */
export function parseIso(value: string, mode: DateFieldMode): { year: number; month: number; day: number } | null {
  const match = mode === "day" ? /^(\d{4})-(\d{2})-(\d{2})$/.exec(value) : /^(\d{4})-(\d{2})$/.exec(value);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = mode === "day" ? Number(match[3]) : 1;
  if (month < 1 || month > 12 || day < 1 || day > daysInMonth(year, month)) return null;
  return { year, month, day };
}

/** Partes → valor da API. */
export function toIso(mode: DateFieldMode, year: number, month: number, day = 1): string {
  return mode === "day" ? `${year}-${pad(month)}-${pad(day)}` : `${year}-${pad(month)}`;
}

/** Valor da API → texto exibido (`dd/mm/aaaa` · `mm/aaaa`); vazio/inválido → "". */
export function formatDisplay(value: string, mode: DateFieldMode): string {
  const parts = parseIso(value, mode);
  if (!parts) return "";
  return mode === "day" ? `${pad(parts.day)}/${pad(parts.month)}/${parts.year}` : `${pad(parts.month)}/${parts.year}`;
}

/** Máscara de digitação: só dígitos, barras inseridas (`dd/mm/aaaa` · `mm/aaaa`). */
export function maskTyping(text: string, mode: DateFieldMode): string {
  const digits = text.replace(/\D/g, "").slice(0, mode === "day" ? 8 : 6);
  if (mode === "month") {
    return digits.length > 2 ? `${digits.slice(0, 2)}/${digits.slice(2)}` : digits;
  }
  if (digits.length > 4) return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
  if (digits.length > 2) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return digits;
}

/** Texto digitado completo → valor da API; incompleto ou data inexistente → null. */
export function parseTyping(text: string, mode: DateFieldMode): string | null {
  const match = mode === "day" ? /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(text) : /^(\d{2})\/(\d{4})$/.exec(text);
  if (!match) return null;
  const iso = mode === "day" ? `${match[3]}-${match[2]}-${match[1]}` : `${match[2]}-${match[1]}`;
  return parseIso(iso, mode) ? iso : null;
}

/** Dentro dos limites (comparação textual: o formato ISO ordena). */
export function withinRange(value: string, min?: string, max?: string): boolean {
  return (!min || value >= min) && (!max || value <= max);
}
