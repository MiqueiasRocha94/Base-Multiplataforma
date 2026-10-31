"use client";

import { ArrowLeft } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * Título da tela no header mobile (slot `header.start`) — o MESMO para o
 * breadcrumb (`BreadCrumb mode="lite"`) e para as telas que injetam título via
 * `ScreenLayout`. Com `onBack`, a linha inteira é o botão de voltar (seta ←,
 * alvo de toque grande). A cor vem do header (`text-current` + tokens da região
 * `[data-region="header"]`), nunca da tela.
 */
export function ScreenTitle({
  title,
  onBack,
  backLabel,
  className,
}: {
  title: string;
  onBack?: () => void;
  /** Rótulo acessível do voltar (default: o próprio título). */
  backLabel?: string;
  className?: string;
}) {
  if (!onBack) {
    return <span className={cn("block truncate px-1 text-base font-semibold text-current", className)}>{title}</span>;
  }

  return (
    <button
      type="button"
      onClick={onBack}
      aria-label={backLabel}
      className={cn(
        "inline-flex min-w-0 max-w-full items-center gap-2 rounded-full py-2 pl-2 pr-3 text-base font-semibold text-current transition hover:bg-[color:color-mix(in_srgb,currentColor_12%,transparent)]",
        className,
      )}
    >
      <ArrowLeft aria-hidden="true" className="size-5 shrink-0" />
      <span className="truncate">{title}</span>
    </button>
  );
}
