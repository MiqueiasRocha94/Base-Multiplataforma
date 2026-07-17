"use client";

import { useLanguage } from "@/contexts/LanguageContext";
import { cn } from "@/lib/utils";

/**
 * Indicador de carregamento (inspirado na Base-Next): três anéis concêntricos
 * girando em ritmos diferentes. Usa tokens de tema (primária, gráfico-3 e
 * secundária), então acompanha tema, paleta acessível e cores personalizadas.
 */
export function Loading({ message, className }: { message?: string; className?: string }) {
  const { dictionary } = useLanguage();
  const text = message ?? dictionary.common.loading;

  return (
    <div className={cn("flex min-h-[60vh] flex-col items-center justify-center gap-4", className)}>
      <div className="relative size-16" role="status" aria-live="polite">
        <div
          className="absolute inset-0 animate-spin rounded-full border-4 border-[color:var(--color-primary)] border-t-transparent"
          style={{ animationDuration: "2.4s" }}
        />
        <div
          className="absolute inset-[4px] animate-spin rounded-full border-4 border-[color:var(--chart-3)] border-b-transparent"
          style={{ animationDuration: "1.4s" }}
        />
        <div
          className="absolute inset-[8px] animate-spin rounded-full border-4 border-[color:var(--color-secondary)] border-r-transparent"
          style={{ animationDuration: "1.8s" }}
        />
      </div>
      <span className="text-center text-sm text-text-muted">{text}</span>
    </div>
  );
}
