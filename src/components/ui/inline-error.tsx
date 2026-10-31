"use client";

import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

/** Aviso de erro inline (operação com a tela já montada). Sem mensagem, não renderiza. */
export function InlineError({ children, className }: { children?: ReactNode; className?: string }) {
  if (children == null || children === "" || children === false) return null;
  return (
    <p className={cn("text-sm text-error", className)} role="alert">
      {children}
    </p>
  );
}
