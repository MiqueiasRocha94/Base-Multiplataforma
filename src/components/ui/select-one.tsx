"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { LucideChevronDown } from "lucide-react";

import { SelectOverlay } from "@/components/ui/select-overlay";
import { useDevice } from "@/contexts/DeviceContext";
import { cn } from "@/lib/utils";
import type { DynamicSelectOption } from "@/types/dynamic-form";

export type SelectOneProps = {
  /** Id da opção selecionada (ou null). */
  value: string | number | null;
  options: DynamicSelectOption[];
  /** Recebe o `id` (string) da opção escolhida. */
  onChange: (id: string) => void;
  placeholder?: string;
  /** Título da tela de seleção no mobile (SelectOverlay). */
  title?: string;
  ariaLabel?: string;
  className?: string;
};

/**
 * Seleção única ADAPTATIVA — a peça de select do `DynamicForm` extraída para
 * reúso fora de formulários. No web é um `<select>` nativo; no mobile o toque
 * abre o `SelectOverlay` (tela cheia com filtro, ao alcance do polegar) e o back
 * do sistema fecha. As opções são identificadas por `id`; o overlay opera por
 * rótulo, então mapeamos label↔id aqui (rótulos devem ser únicos).
 */
export function SelectOne({
  value,
  options,
  onChange,
  placeholder = "Selecionar",
  title,
  ariaLabel,
  className,
}: SelectOneProps) {
  const { view } = useDevice();
  const isMobile = view === "mobile";
  const [open, setOpen] = useState(false);
  const pendingChange = useRef<(() => void) | null>(null);

  const applyPendingChange = useCallback(() => {
    const change = pendingChange.current;
    pendingChange.current = null;
    change?.();
  }, []);

  const selected = options.find((option) => String(option.id) === String(value ?? "")) ?? null;

  // A tela de seleção abre como um nível de navegação: o back do sistema fecha.
  const openPicker = useCallback(() => {
    setOpen(true);
    if (typeof window !== "undefined") {
      window.history.pushState({ __selectOne: true }, "");
    }
  }, []);

  const closePicker = useCallback(() => {
    if (typeof window !== "undefined" && (window.history.state as { __selectOne?: boolean } | null)?.__selectOne) {
      window.history.back();
      return;
    }
    setOpen(false);
    applyPendingChange();
  }, [applyPendingChange]);

  useEffect(() => {
    const onPop = () => {
      setOpen(false);
      // Remove o nivel do seletor antes de permitir que onChange navegue.
      applyPendingChange();
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, [applyPendingChange]);

  if (isMobile) {
    return (
      <>
        <button
          type="button"
          aria-label={ariaLabel}
          onClick={openPicker}
          className={cn(
            // min-w-0: rótulo longo trunca em vez de alargar o grid/formulário.
            "flex h-12 w-full min-w-0 items-center justify-between gap-2 rounded-2xl border border-border bg-surface px-4 text-left text-base transition",
            className,
          )}
        >
          <span className={cn("truncate", selected ? "text-text" : "text-text-muted")}>
            {selected ? selected.label : placeholder}
          </span>
          <LucideChevronDown className="size-4 shrink-0 text-text-muted" />
        </button>

        {open ? (
          <SelectOverlay
            title={title ?? ariaLabel}
            options={options}
            multiple={false}
            selectedLabels={selected ? [selected.label] : []}
            onApply={(labels) => {
              const option = options.find((item) => item.label === labels[0]);
              if (option) {
                pendingChange.current = () => onChange(String(option.id));
              }
            }}
            onClose={closePicker}
          />
        ) : null}
      </>
    );
  }

  return (
    <select
      aria-label={ariaLabel}
      value={selected ? String(selected.id) : ""}
      onChange={(event) => onChange(event.target.value)}
      className={cn(
        "h-12 w-full rounded-2xl border border-border bg-surface px-4 text-base text-text outline-none transition focus:border-primary",
        className,
      )}
    >
      <option value="" disabled>
        {placeholder}
      </option>
      {options.map((option) => (
        <option key={String(option.id)} value={String(option.id)}>
          {option.label}
        </option>
      ))}
    </select>
  );
}
