"use client";

import { useSyncExternalStore } from "react";
import { LucideCheckCircle2, LucideCircleAlert, LucideInfo, LucideX } from "lucide-react";

import { useLanguage } from "@/contexts/LanguageContext";
import { dismissToast, getServerToasts, getToasts, subscribeToasts, type ToastTone } from "@/lib/toast";
import { cn } from "@/lib/utils";

const toneIcon: Record<ToastTone, typeof LucideInfo> = {
  success: LucideCheckCircle2,
  error: LucideCircleAlert,
  info: LucideInfo,
};

const toneAccent: Record<ToastTone, string> = {
  success: "text-[color:var(--color-success)]",
  error: "text-error",
  info: "text-primary",
};

/**
 * Exibe os avisos de `toast` (lib/toast). Montado uma vez no AppStructure.
 * Mobile: no topo, abaixo da área segura (zona de leitura, longe da navbar);
 * desktop: canto inferior direito.
 */
export function Toaster() {
  const items = useSyncExternalStore(subscribeToasts, getToasts, getServerToasts);
  const { dictionary } = useLanguage();

  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 top-[calc(var(--app-safe-top)+0.75rem)] z-[1450] flex flex-col items-center gap-2 px-4 desktop:inset-x-auto desktop:top-auto desktop:right-6 desktop:bottom-6 desktop:items-end desktop:px-0"
    >
      {items.map((item) => {
        const Icon = toneIcon[item.tone];
        return (
          <div
            key={item.id}
            role={item.tone === "error" ? "alert" : "status"}
            className="pointer-events-auto flex w-full max-w-sm items-center gap-3 rounded-[var(--radius-xl)] border border-border bg-surface px-4 py-3 text-sm text-text shadow-[var(--shadow-soft)]"
          >
            <Icon aria-hidden="true" className={cn("size-5 shrink-0", toneAccent[item.tone])} />
            <p className="min-w-0 flex-1">{item.message}</p>
            <button
              type="button"
              onClick={() => dismissToast(item.id)}
              aria-label={dictionary.common.close}
              className="inline-flex size-8 shrink-0 items-center justify-center rounded-full text-text-muted transition hover:bg-[color:var(--color-surface-strong)]"
            >
              <LucideX className="size-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
