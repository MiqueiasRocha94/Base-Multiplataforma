"use client";

import { useLanguage } from "@/contexts/LanguageContext";
import { cn } from "@/lib/utils";

/**
 * Indicador de carregamento (inspirado na Base-Next): três anéis concêntricos
 * girando em ritmos diferentes. Usa tokens de tema (primária, gráfico-3 e
 * secundária), então acompanha tema, paleta acessível e cores personalizadas.
 */
export function Loading({ message, className, fullScreen = false }: { message?: string; className?: string; fullScreen?: boolean }) {
  const { dictionary } = useLanguage();
  const text = message ?? dictionary.common.loading;

  // `fullScreen`: cobre a tela inteira (acima de header/sidebars/footer) — para
  // esperas em que o shell ainda está no estado errado (ex.: gate do portal
  // antes da sessão, que mostraria o layout público por trás).
  return (
    <div
      aria-busy="true"
      className={cn(
        "flex flex-col items-center justify-center gap-4",
        fullScreen ? "fixed inset-0 z-[1500] bg-[color:var(--color-background)]" : "min-h-[60vh]",
        className,
      )}
    >
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
