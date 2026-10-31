"use client";

import { cn } from "@/lib/utils";

export type BarVariant = "brand" | "temperature";

// Variante "temperatura": interpola verde (frio) → vermelho (quente) pelo valor.
// Sem inversão, valor ALTO é quente (vermelho) — ex.: cota muito utilizada.
// `invert` troca a ponta quente, para métricas onde ALTO é bom (fica verde).
function temperatureFill(value: number, invert: boolean): string {
  const v = Math.min(100, Math.max(0, value));
  // 120° = verde, 0° = vermelho.
  const hue = (invert ? v : 100 - v) * 1.2;
  return `hsl(${hue} 68% 45%)`;
}

/**
 * Barra de progresso única, com dois estilos:
 * - `brand`: preenchida com a cor do white-label (`--color-primary`);
 * - `temperature`: escala verde→vermelho conforme o valor (com `invert` opcional).
 * O trilho usa `--color-surface-strong` (adapta a light/dark).
 */
export function Bar({
  value,
  variant = "brand",
  invert = false,
  color,
  className,
  label,
}: {
  /** Valor em 0–100. */
  value: number;
  /** `brand` = cor do WL; `temperature` = escala de temperatura. */
  variant?: BarVariant;
  /** Só em `temperature`: inverte a escala (valor alto = frio/verde). */
  invert?: boolean;
  /** Cor do preenchimento (CSS); sobrepõe a variante — ex.: faixa vinda da API. */
  color?: string;
  className?: string;
  /** Rótulo acessível da barra (aria-label). */
  label?: string;
}) {
  const pct = Math.min(100, Math.max(0, Math.round(value)));
  const fill = color ?? (variant === "temperature" ? temperatureFill(pct, invert) : "var(--color-primary)");

  return (
    <div
      role="progressbar"
      aria-valuenow={pct}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label}
      className={cn("h-2.5 w-full overflow-hidden rounded-full bg-[color:var(--color-surface-strong)]", className)}
    >
      <div className="h-full rounded-full transition-[width]" style={{ width: `${pct}%`, backgroundColor: fill }} />
    </div>
  );
}
