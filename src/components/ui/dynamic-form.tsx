"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { LucideChevronDown } from "lucide-react";

import { FormFieldInput } from "@/components/ui/form-field-input";
import { Label } from "@/components/ui/label";
import { SelectOverlay } from "@/components/ui/select-overlay";
import { Switch } from "@/components/ui/switch";
import { useDevice } from "@/contexts/DeviceContext";
import { cn } from "@/lib/utils";
import type { DynamicFormField, DynamicFormMode, DynamicFormValues, FormValue } from "@/types/dynamic-form";

/**
 * Formulario dinamico dirigido por schema, portado da base mobile.
 *
 * - Campos de texto: o foco (editor no mobile) e o auto-select (avanco para o
 *   proximo campo, web + mobile) ficam no FormFieldInput, via a cadeia focusKey.
 * - Campos select: no mobile, tocar abre uma tela de selecao/filtragem
 *   (SelectOverlay); no web, um <select> nativo (tela pequena nao e problema).
 */
export type DynamicFormProps = {
  fields: DynamicFormField[];
  values: DynamicFormValues;
  mode: DynamicFormMode;
  errors?: Record<string, string | undefined>;
  onChange?: (key: string, value: FormValue) => void;
  /**
   * Layout dos campos. "single" (padrão) = sempre 1 coluna. "adaptive" = no
   * web vira 2 colunas em telas largas (1 em telas menores); no mobile
   * permanece 1 coluna.
   */
  columns?: "single" | "adaptive";
  /**
   * Oculta os rotulos acima dos campos (o `label` vira `aria-label` no editor).
   * Usado por telas de credencial (login) que seguem o desenho "so placeholder
   * + icone". Padrao: `false` (rotulos visiveis).
   */
  hideLabels?: boolean;
};

function displayText(value: FormValue): string {
  if (Array.isArray(value)) {
    return value.length > 0 ? value.join(", ") : "-";
  }
  if (typeof value === "boolean") {
    return value ? "Sim" : "Nao";
  }
  const text = value == null ? "" : String(value);
  return text.trim() ? text : "-";
}

function hasDisplayValue(value: FormValue): boolean {
  if (Array.isArray(value)) return value.length > 0;
  if (value == null) return false;
  if (typeof value === "string") return value.trim().length > 0;
  return true;
}

function toSelectedLabels(value: FormValue): string[] {
  if (Array.isArray(value)) return value.map((item) => String(item));
  return value != null && value !== "" ? [String(value)] : [];
}

/** Proximo campo editavel (pula switch/select — que nao usam o editor de texto). */
function findNextEditableFieldKey(fields: DynamicFormField[], currentKey: string): string | null {
  const currentIndex = fields.findIndex((field) => field.key === currentKey);
  if (currentIndex < 0) {
    return null;
  }
  for (let index = currentIndex + 1; index < fields.length; index += 1) {
    const field = fields[index];
    if (field.kind === "switch" || field.kind === "select") {
      continue;
    }
    return field.key;
  }
  return null;
}

export function DynamicForm({ fields, values, mode, errors, onChange, columns = "single", hideLabels = false }: DynamicFormProps) {
  // `view`: estrutura (select → tela de seleção só no layout mobile).
  // `isTouch`: comportamento do input (editor com teclado virtual) — celular e tablet.
  const { view, isTouch } = useDevice();
  const isMobile = view === "mobile";
  const readOnly = mode === "read";

  const [focusKey, setFocusKey] = useState<string | null>(null);
  const [pickerKey, setPickerKey] = useState<string | null>(null);

  const consumeFocus = useCallback((key: string) => {
    setFocusKey((current) => (current === key ? null : current));
  }, []);

  const fieldsByKey = useMemo(() => new Map(fields.map((field) => [field.key, field])), [fields]);
  const pickerField = pickerKey ? fieldsByKey.get(pickerKey) ?? null : null;

  // A tela de selecao abre como um nivel de navegacao: o back do sistema fecha.
  const openPicker = useCallback((key: string) => {
    setPickerKey(key);
    if (typeof window !== "undefined") {
      window.history.pushState({ __picker: true }, "");
    }
  }, []);

  const closePicker = useCallback(() => {
    if (typeof window !== "undefined" && (window.history.state as { __picker?: boolean } | null)?.__picker) {
      window.history.back();
      return;
    }
    setPickerKey(null);
  }, []);

  useEffect(() => {
    const onPop = () => setPickerKey(null);
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  return (
    <div className={cn("grid gap-4", columns === "adaptive" && "desktop:items-start desktop:lg:grid-cols-2 wide:items-start wide:grid-cols-2")}>
      {fields.map((field) => {
        const value = values[field.key];
        const error = errors?.[field.key];
        const nextKey = findNextEditableFieldKey(fields, field.key);
        const nextField = nextKey ? fieldsByKey.get(nextKey) ?? null : null;

        return (
          <div key={field.key} className="grid gap-1.5">
            {hideLabels ? null : <Label>{field.label}</Label>}

            {readOnly ? (
              <p className="rounded-2xl border border-border bg-surface px-4 py-3 text-sm text-text">{displayText(value)}</p>
            ) : field.kind === "switch" ? (
              <div className="flex items-center gap-3">
                <Switch checked={Boolean(value)} onCheckedChange={(checked) => onChange?.(field.key, checked)} />
                {/* Sem rótulo acima (hideLabels), o próprio rótulo vai ao lado: o
                    switch sozinho não diz o que liga. */}
                <span className="text-sm text-text-muted">{hideLabels ? field.label : Boolean(value) ? "Sim" : "Nao"}</span>
              </div>
            ) : field.kind === "select" ? (
              isMobile ? (
                <button
                  type="button"
                  onClick={() => openPicker(field.key)}
                  className={cn(
                    "flex h-12 w-full items-center justify-between gap-2 rounded-2xl border bg-surface px-4 text-left text-base transition",
                    error ? "border-danger" : "border-border",
                  )}
                >
                  <span className={cn("truncate", hasDisplayValue(value) ? "text-text" : "text-text-muted")}>
                    {hasDisplayValue(value) ? displayText(value) : field.placeholder ?? "Selecionar"}
                  </span>
                  <LucideChevronDown className="size-4 shrink-0 text-text-muted" />
                </button>
              ) : (
                <select
                  value={value == null ? "" : String(value)}
                  onChange={(event) => onChange?.(field.key, event.target.value)}
                  className={cn(
                    "h-12 w-full rounded-2xl border bg-surface px-4 text-base text-text outline-none transition focus:border-primary",
                    error ? "border-danger" : "border-border",
                  )}
                >
                  <option value="">—</option>
                  {field.options?.map((option) => (
                    <option key={String(option.id)} value={option.label}>
                      {option.label}
                    </option>
                  ))}
                </select>
              )
            ) : (
              <FormFieldInput
                field={field}
                value={value}
                error={error}
                touch={isTouch}
                focusKey={focusKey}
                nextField={nextField}
                onChange={onChange}
                onRequestNext={setFocusKey}
                onConsumeFocus={consumeFocus}
              />
            )}

            {error ? <span className="text-xs font-medium text-danger">{error}</span> : null}
          </div>
        );
      })}

      {pickerField ? (
        <SelectOverlay
          title={pickerField.label}
          options={pickerField.options ?? []}
          multiple={Array.isArray(values[pickerField.key])}
          selectedLabels={toSelectedLabels(values[pickerField.key])}
          onApply={(labels) => {
            const multiple = Array.isArray(values[pickerField.key]);
            onChange?.(pickerField.key, multiple ? labels : labels[0] ?? "");
          }}
          onClose={closePicker}
        />
      ) : null}
    </div>
  );
}
