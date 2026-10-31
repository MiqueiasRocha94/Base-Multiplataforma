"use client";

import { useMemo, useState } from "react";
import { LucideCheck, LucideSearch, LucideX } from "lucide-react";

import { cn } from "@/lib/utils";
import type { DynamicSelectOption } from "@/types/dynamic-form";

export type SelectOverlayLabels = {
  title: string;
  close: string;
  filter: string;
  confirm: string;
  empty: string;
};

const DEFAULT_LABELS: SelectOverlayLabels = {
  title: "Selecionar",
  close: "Fechar",
  filter: "Filtrar",
  confirm: "Confirmar",
  empty: "Nenhum item encontrado.",
};

/**
 * Selecao em tela cheia (o "foco" de um campo select no mobile). Topbar com
 * titulo/fechar, lista de opcoes (radio para unica, checkbox para multipla) e
 * dock de filtro no rodape, ao alcance do polegar. Porta o SelectOverlay da base
 * mobile. Deve ser montado apenas quando aberto (estado inicial vem das props).
 */
export function SelectOverlay({
  title,
  options,
  multiple,
  selectedLabels,
  onApply,
  onClose,
  labels = DEFAULT_LABELS,
}: {
  title?: string;
  options: DynamicSelectOption[];
  multiple: boolean;
  selectedLabels: string[];
  onApply: (labels: string[]) => void;
  onClose: () => void;
  labels?: SelectOverlayLabels;
}) {
  const [filter, setFilter] = useState("");
  const [draft, setDraft] = useState<string[]>(selectedLabels);

  const filtered = useMemo(() => {
    const normalized = filter.trim().toLowerCase();
    if (!normalized) {
      return options;
    }
    return options.filter((option) => option.label.toLowerCase().includes(normalized));
  }, [filter, options]);

  const toggle = (label: string) => {
    if (multiple) {
      setDraft((current) => (current.includes(label) ? current.filter((item) => item !== label) : [...current, label]));
      return;
    }
    onApply([label]);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[1200] flex flex-col bg-[color:var(--color-background)]">
      <div className="flex items-center justify-between gap-3 bg-primary px-4 py-3 text-white pt-[max(var(--app-safe-top),0.75rem)]">
        <span className="min-w-0 truncate text-base font-medium">{title ?? labels.title}</span>
        <button type="button" onClick={onClose} className="shrink-0 text-sm font-semibold">
          {labels.close}
        </button>
      </div>

      {/* Lista invertida: os itens comecam no fundo (perto do filtro/polegar) e crescem para o topo. */}
      <div className="flex min-h-0 flex-1 flex-col-reverse gap-2 overflow-y-auto p-3">
        {filtered.length === 0 ? (
          <p className="py-8 text-center text-sm text-text-muted">{labels.empty}</p>
        ) : (
          filtered.map((option) => {
            const selected = draft.includes(option.label);
            return (
              <button
                key={String(option.id)}
                type="button"
                onClick={() => toggle(option.label)}
                className={cn(
                  "flex items-center gap-3 rounded-xl border bg-surface px-3 py-3 text-left transition",
                  selected ? "border-primary" : "border-border",
                )}
              >
                <span
                  className={cn(
                    "inline-flex size-5 shrink-0 items-center justify-center border",
                    multiple ? "rounded-md" : "rounded-full",
                    selected ? "border-primary bg-primary text-white" : "border-border",
                  )}
                >
                  {selected ? <LucideCheck className="size-3.5" /> : null}
                </span>
                <span className="flex-1 text-sm font-medium text-text">{option.label}</span>
              </button>
            );
          })
        )}
      </div>

      <div className="grid gap-2 border-t border-border bg-[color:var(--color-background)] p-3 pb-[max(var(--app-safe-bottom),0.75rem)]">
        <div className="flex items-center gap-2 rounded-xl border border-border bg-surface px-3">
          <LucideSearch className="size-4 text-text-muted" />
          <input
            value={filter}
            onChange={(event) => setFilter(event.target.value)}
            placeholder={labels.filter}
            className="h-11 flex-1 bg-transparent text-sm text-text outline-none placeholder:text-text-muted"
          />
          {filter ? (
            <button type="button" onClick={() => setFilter("")} aria-label={labels.close}>
              <LucideX className="size-4 text-text-muted" />
            </button>
          ) : null}
        </div>

        {multiple ? (
          <button
            type="button"
            onClick={() => {
              onApply(draft);
              onClose();
            }}
            className="rounded-xl bg-primary py-3 text-sm font-semibold text-white transition hover:bg-primary-strong"
          >
            {labels.confirm}
          </button>
        ) : null}
      </div>
    </div>
  );
}
