"use client";

import type { ReactNode } from "react";

export type SidebarItemProps = {
    id: string;
    title: string;
    markerTitle: string;
    icon: ReactNode;
    children: ReactNode;
    /** Conteudo extra exibido no cabecalho do painel, junto do titulo. */
    headerExtra?: ReactNode;
    /**
     * Substitui o botao de fechar quando o rail esta colapsado (so icones).
     * Ao expandir/focar, some e o botao de fechar volta a aparecer.
     */
    headerCollapsed?: ReactNode;
};

export function SidebarItem(_: SidebarItemProps) {
    return null;
}