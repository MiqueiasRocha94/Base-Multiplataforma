"use client";

import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

/** Estado vazio de lista/bloco, com o texto próprio de cada tela (como o `emptyMessage` do web). */
export function EmptyState({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <p className={cn("rounded-[var(--radius-xl)] border border-border bg-surface p-5 text-sm text-text-muted", className)}>
      {children}
    </p>
  );
}
