import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

/**
 * Zonas de ergonomia da tela (mobile) — divisão INVISÍVEL e SUGESTIVA:
 * - `top` → zona de LEITURA (difícil alcance): título/subtítulo, resumos,
 *   avisos — nada que peça toque frequente;
 * - `children` → zona de ALCANCE (polegar): listas/cards, formulários, ações.
 *
 * Não é linha fixa: a zona de alcance só "assenta" junto à navegação quando
 * SOBRA espaço (`margin-top: auto` numa coluna de altura mínima cheia). Se o
 * conteúdo passa da tela, segue o fluxo normal e rola — nada é cortado nem
 * reservado. No desktop as zonas ficam em sequência (fluxo de sempre).
 *
 * A altura chega aqui pela cadeia flex do shell: scroll do MainContent →
 * contêiner da rota (AppStructure) → PortalGate → esta coluna (`flex-1`).
 * Opt-in: telas de leitura longa (termo, detalhes) não usam.
 */
export function ScreenZones({ top, children, className }: { top?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <div data-screen-zones className={cn("flex min-h-full flex-1 flex-col gap-3", className)}>
      {top != null ? <div data-zone="read">{top}</div> : null}
      <div data-zone="reach" className="mobile:mt-auto">
        {children}
      </div>
    </div>
  );
}
