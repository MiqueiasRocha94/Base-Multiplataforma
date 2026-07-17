"use client";

import { useState } from "react";
import { LucideX } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useDevice } from "@/contexts/DeviceContext";
import { cn } from "@/lib/utils";

export type FilterFieldKind = "text" | "number" | "select" | "date-range";

export type FilterOption = { id: string; label: string };

export type FilterField = {
  key: string;
  label: string;
  kind: FilterFieldKind;
  options?: FilterOption[];
  placeholder?: string;
  /** Peso da coluna quando os basicos sao dispostos em linha. */
  flex?: number;
};

export type FilterValues = Record<string, string>;

export type FilterModalLabels = {
  title: string;
  close: string;
  clear: string;
  apply: string;
  all: string;
  customFrom: string;
  customTo: string;
};

const DEFAULT_LABELS: FilterModalLabels = {
  title: "Filtros",
  close: "Fechar",
  clear: "Limpar",
  apply: "Aplicar",
  all: "Todos",
  customFrom: "De (AAAA-MM-DD)",
  customTo: "Ate (AAAA-MM-DD)",
};

type FilterModalProps = {
  open: boolean;
  /** Filtros basicos (limite, pular, data) — fixos no rodape, perto do polegar. */
  basicFields: FilterField[];
  /** Filtros da entidade — area rolavel acima do basico. */
  entityFields: FilterField[];
  values: FilterValues;
  labels?: Partial<FilterModalLabels>;
  onApply: (values: FilterValues) => void;
  onClose: () => void;
};

function FieldControl({
  field,
  draft,
  setDraft,
  allLabel,
  customFromLabel,
  customToLabel,
}: {
  field: FilterField;
  draft: FilterValues;
  setDraft: React.Dispatch<React.SetStateAction<FilterValues>>;
  allLabel: string;
  customFromLabel: string;
  customToLabel: string;
}) {
  const customLabel = field.options?.find((option) => option.id === "custom")?.label;
  const isCustom = field.kind === "date-range" && customLabel != null && draft[field.key] === customLabel;

  return (
    <div className="grid gap-1.5">
      <label className="text-sm font-semibold text-text">{field.label}</label>

      {field.kind === "date-range" ? (
        <>
          <div className="flex flex-wrap gap-2">
            {field.options?.map((option) => {
              const selected = draft[field.key] === option.label;
              return (
                <button
                  key={option.id}
                  type="button"
                  onClick={() =>
                    setDraft((current) => ({
                      ...current,
                      [field.key]: option.label,
                      ...(option.id === "custom" ? {} : { [`${field.key}From`]: "", [`${field.key}To`]: "" }),
                    }))
                  }
                  className={cn(
                    "rounded-full border px-3 py-2 text-sm font-semibold transition",
                    selected
                      ? "border-primary bg-primary text-white"
                      : "border-border text-text hover:bg-[color:var(--color-surface-strong)]",
                  )}
                >
                  {option.label}
                </button>
              );
            })}
          </div>
          {isCustom ? (
            <div className="mt-1 grid grid-cols-2 gap-2">
              <Input
                type="date"
                aria-label={customFromLabel}
                value={draft[`${field.key}From`] ?? ""}
                onChange={(event) => setDraft((current) => ({ ...current, [`${field.key}From`]: event.target.value }))}
              />
              <Input
                type="date"
                aria-label={customToLabel}
                value={draft[`${field.key}To`] ?? ""}
                onChange={(event) => setDraft((current) => ({ ...current, [`${field.key}To`]: event.target.value }))}
              />
            </div>
          ) : null}
        </>
      ) : field.kind === "select" ? (
        <select
          value={draft[field.key] ?? ""}
          onChange={(event) => setDraft((current) => ({ ...current, [field.key]: event.target.value }))}
          className="h-12 rounded-2xl border border-border bg-surface px-3 text-sm text-text outline-none transition focus:border-primary"
        >
          <option value="">{field.placeholder ?? allLabel}</option>
          {field.options?.map((option) => (
            <option key={option.id} value={option.label}>
              {option.label}
            </option>
          ))}
        </select>
      ) : (
        <Input
          type={field.kind === "number" ? "number" : "text"}
          inputMode={field.kind === "number" ? "numeric" : undefined}
          placeholder={field.placeholder}
          value={draft[field.key] ?? ""}
          onChange={(event) => setDraft((current) => ({ ...current, [field.key]: event.target.value }))}
        />
      )}
    </div>
  );
}

/**
 * Tela de filtro espelhando a base Expo: atributos da entidade roláveis no topo
 * e os básicos (limite/pular/data) fixos no rodapé, perto do polegar. No mobile
 * desliza do rodapé (sheet); no desktop abre centralizado (dialog).
 */
export function FilterModal({ open, ...props }: FilterModalProps) {
  // Monta o corpo apenas quando aberto: assim o rascunho (`draft`) é semeado a
  // partir de `values` no `useState`, sem precisar de efeito de sincronização.
  if (!open) {
    return null;
  }

  return <FilterModalBody {...props} />;
}

function FilterModalBody({ basicFields, entityFields, values, labels, onApply, onClose }: Omit<FilterModalProps, "open">) {
  const { view } = useDevice();
  const isMobile = view === "mobile";
  const resolvedLabels = { ...DEFAULT_LABELS, ...labels };
  const [draft, setDraft] = useState<FilterValues>(values);

  return (
    <div
      className={cn(
        "fixed inset-0 z-[1200] flex bg-black/40 backdrop-blur-sm",
        isMobile ? "items-end justify-center" : "items-center justify-center p-4",
      )}
      onClick={onClose}
    >
      <div
        onClick={(event) => event.stopPropagation()}
        className={cn(
          "flex max-h-[90vh] w-full flex-col overflow-hidden border border-border bg-surface shadow-[var(--shadow-soft)]",
          isMobile ? "rounded-t-[var(--radius-2xl)]" : "max-w-lg rounded-[var(--radius-2xl)]",
        )}
      >
        <div className="flex items-center justify-between gap-4 border-b border-border bg-primary px-5 py-4 text-white">
          <p className="text-base font-bold">{resolvedLabels.title}</p>
          <button type="button" onClick={onClose} aria-label={resolvedLabels.close} className="inline-flex size-9 items-center justify-center rounded-full transition hover:bg-white/15">
            <LucideX className="size-4" />
          </button>
        </div>

        <div className="grid flex-1 gap-4 overflow-y-auto p-5">
          {entityFields.map((field) => (
            <FieldControl
              key={field.key}
              field={field}
              draft={draft}
              setDraft={setDraft}
              allLabel={resolvedLabels.all}
              customFromLabel={resolvedLabels.customFrom}
              customToLabel={resolvedLabels.customTo}
            />
          ))}
        </div>

        {basicFields.length > 0 ? (
          <div className="border-t border-border bg-[color:var(--color-surface-strong)]/40 p-5">
            <div className="flex items-start gap-3">
              {basicFields.map((field) => (
                <div key={field.key} style={{ flex: field.flex ?? 1 }}>
                  <FieldControl
                    field={field}
                    draft={draft}
                    setDraft={setDraft}
                    allLabel={resolvedLabels.all}
                    customFromLabel={resolvedLabels.customFrom}
                    customToLabel={resolvedLabels.customTo}
                  />
                </div>
              ))}
            </div>
          </div>
        ) : null}

        <div className="grid grid-cols-2 gap-3 border-t border-border p-5">
          <Button variant="outline" onClick={() => setDraft({})}>
            {resolvedLabels.clear}
          </Button>
          <Button
            onClick={() => {
              onApply(draft);
              onClose();
            }}
          >
            {resolvedLabels.apply}
          </Button>
        </div>
      </div>
    </div>
  );
}
