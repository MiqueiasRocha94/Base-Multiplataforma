"use client";

import { useState } from "react";
import { LucideX } from "lucide-react";

import { Button } from "@/components/ui/button";
import { DateField } from "@/components/ui/date-field";
import { Input } from "@/components/ui/input";
import { SelectOne } from "@/components/ui/select-one";

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
  customFrom: "De",
  customTo: "Até",
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
          {/* SelectOne (adaptativo): web = <select>, mobile = overlay. Guarda o
              LABEL no draft (contrato do generic-table); usa os ids reais só para
              detectar a opção "custom" e limpar o intervalo. */}
          <SelectOne
            ariaLabel={field.label}
            title={field.label}
            placeholder={field.placeholder ?? allLabel}
            value={field.options?.find((option) => option.label === draft[field.key])?.id ?? ""}
            options={field.options ?? []}
            onChange={(id) => {
              const option = field.options?.find((item) => String(item.id) === id);
              setDraft((current) => ({
                ...current,
                [field.key]: option?.label ?? "",
                ...(id === "custom" ? {} : { [`${field.key}From`]: "", [`${field.key}To`]: "" }),
              }));
            }}
          />
          {isCustom ? (
            <div className="mt-1 grid grid-cols-2 gap-2">
              <DateField
                ariaLabel={customFromLabel}
                title={customFromLabel}
                value={draft[`${field.key}From`] ?? ""}
                max={draft[`${field.key}To`] || undefined}
                onChange={(valor) => setDraft((current) => ({ ...current, [`${field.key}From`]: valor }))}
              />
              <DateField
                ariaLabel={customToLabel}
                title={customToLabel}
                value={draft[`${field.key}To`] ?? ""}
                min={draft[`${field.key}From`] || undefined}
                onChange={(valor) => setDraft((current) => ({ ...current, [`${field.key}To`]: valor }))}
              />
            </div>
          ) : null}
        </>
      ) : field.kind === "select" ? (
        // SelectOne adaptativo. O draft guarda o LABEL (id = label aqui); para
        // limpar um filtro use "Todos" (quando houver) ou o botão Limpar.
        <SelectOne
          ariaLabel={field.label}
          title={field.label}
          placeholder={field.placeholder ?? allLabel}
          value={draft[field.key] ?? ""}
          options={(field.options ?? []).map((option) => ({ id: option.label, label: option.label }))}
          onChange={(id) => setDraft((current) => ({ ...current, [field.key]: id }))}
        />
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
  const resolvedLabels = { ...DEFAULT_LABELS, ...labels };
  const [draft, setDraft] = useState<FilterValues>(values);

  return (
    <div
      // Mobile: folha ancorada embaixo; tablet/desktop: diálogo centralizado.
      className="fixed inset-0 z-[1200] flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm mobile:items-end mobile:p-0 wide:items-center wide:p-4"
      onClick={onClose}
    >
      <div
        onClick={(event) => event.stopPropagation()}
        className="flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-[var(--radius-2xl)] border border-border bg-surface shadow-[var(--shadow-soft)] mobile:max-w-none mobile:rounded-b-none wide:max-w-lg wide:rounded-b-[var(--radius-2xl)]"
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
