"use client";

import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export type BarAction = {
  label: string;
  onPress: () => void;
  icon?: ReactNode;
  loading?: boolean;
  disabled?: boolean;
};

/**
 * Barra inferior generica com duas acoes (secundaria + primaria), ao alcance do
 * polegar. Porta o comportamento da BottomActionBar da base mobile para web.
 */
export function BottomActionBar({
  secondary,
  primary,
  className,
}: {
  secondary: BarAction;
  primary: BarAction;
  className?: string;
}) {
  return (
    <div className={cn("flex gap-3 border-t border-border bg-surface px-4 py-3", className)}>
      <button
        type="button"
        onClick={secondary.onPress}
        disabled={secondary.disabled || secondary.loading}
        className="flex flex-1 items-center justify-center gap-2 rounded-2xl border border-border py-3 text-sm font-semibold text-text transition hover:bg-[color:var(--color-surface-strong)] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {secondary.icon}
        {secondary.label}
      </button>

      <button
        type="button"
        onClick={primary.onPress}
        disabled={primary.disabled || primary.loading}
        className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-primary py-3 text-sm font-semibold text-white transition hover:bg-primary-strong disabled:cursor-not-allowed disabled:opacity-60"
      >
        {primary.loading ? (
          <span className="size-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
        ) : (
          <>
            {primary.icon}
            {primary.label}
          </>
        )}
      </button>
    </div>
  );
}
