"use client";

import { useEffect, useRef, useState } from "react";
import { LucideEye, LucideEyeOff, LucideLock, LucidePencil } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { DynamicFormField, FieldKind, FormValue } from "@/types/dynamic-form";

/**
 * Campo de texto do formulario dinamico, portado da base mobile.
 *
 * - Foco (exclusivo mobile): tocar no campo abre um editor focado (bottom-sheet)
 *   com o conteudo selecionado; confirmar avanca para o proximo campo.
 * - Auto-select (web + mobile): ao focar, seleciona o conteudo; Enter/"Proximo"
 *   avanca para o proximo campo editavel (onRequestNext).
 */
type FormFieldInputProps = {
  field: DynamicFormField;
  value: FormValue;
  error?: string;
  disabled?: boolean;
  isMobile: boolean;
  focusKey?: string | null;
  nextField?: DynamicFormField | null;
  labels?: { cancel: string; next: string; done: string };
  onChange?: (key: string, value: FormValue) => void;
  onRequestNext?: (nextKey: string | null) => void;
  onConsumeFocus?: (key: string) => void;
};

const DEFAULT_LABELS = { cancel: "Cancelar", next: "Proximo", done: "Concluir" };

function inputType(kind?: FieldKind) {
  return kind === "email" ? "email" : kind === "number" ? "number" : kind === "password" ? "password" : "text";
}

function inputMode(kind?: FieldKind): "tel" | "numeric" | undefined {
  return kind === "phone" ? "tel" : kind === "number" ? "numeric" : undefined;
}

function hasDisplayValue(value: FormValue): boolean {
  if (value == null) return false;
  if (typeof value === "string") return value.trim().length > 0;
  return true;
}

export function FormFieldInput({
  field,
  value,
  error,
  disabled,
  isMobile,
  focusKey,
  nextField,
  labels = DEFAULT_LABELS,
  onChange,
  onRequestNext,
  onConsumeFocus,
}: FormFieldInputProps) {
  const inlineRef = useRef<HTMLInputElement>(null);
  const sheetRef = useRef<HTMLInputElement>(null);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const [reveal, setReveal] = useState(false);
  const isPassword = field.kind === "password";

  // Orquestracao de foco: quando o focusKey aponta para este campo, abre o
  // editor (mobile) ou foca o input inline (web).
  useEffect(() => {
    if (!focusKey || focusKey !== field.key) {
      return;
    }
    if (!disabled) {
      /* eslint-disable react-hooks/set-state-in-effect */
      // Senha usa input inline (web + mobile): sem o editor bottom-sheet, que
      // exporia o valor e faz auto-select — inadequado para campo sensivel.
      if (isMobile && !isPassword) {
        setDraft(value == null ? "" : String(value));
        setEditing(true);
      } else {
        inlineRef.current?.focus();
      }
      /* eslint-enable react-hooks/set-state-in-effect */
    }
    onConsumeFocus?.(field.key);
  }, [focusKey, field.key, disabled, isMobile, isPassword, value, onConsumeFocus]);

  // Foca e seleciona o input do editor ao abrir (mobile).
  useEffect(() => {
    if (!editing) {
      return;
    }
    const id = setTimeout(() => {
      sheetRef.current?.focus();
      sheetRef.current?.select();
    }, 60);
    return () => clearTimeout(id);
  }, [editing]);

  const commit = (advance: boolean) => {
    onChange?.(field.key, draft);
    setEditing(false);
    if (advance) {
      onRequestNext?.(nextField?.key ?? null);
    }
  };

  if (isPassword) {
    return (
      <div className="relative">
        <Input
          ref={inlineRef}
          type={reveal ? "text" : "password"}
          value={value == null ? "" : String(value)}
          placeholder={field.placeholder}
          disabled={disabled}
          autoComplete="current-password"
          onChange={(event) => onChange?.(field.key, event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              onRequestNext?.(nextField?.key ?? null);
            }
          }}
          className={cn("pr-12", error ? "border-danger" : undefined)}
        />
        <button
          type="button"
          tabIndex={-1}
          disabled={disabled}
          onClick={() => setReveal((current) => !current)}
          aria-label={reveal ? "Ocultar senha" : "Mostrar senha"}
          className="absolute inset-y-0 right-0 flex w-12 items-center justify-center text-text-muted transition hover:text-text disabled:opacity-70"
        >
          {reveal ? <LucideEyeOff className="size-4" /> : <LucideEye className="size-4" />}
        </button>
      </div>
    );
  }

  if (isMobile) {
    return (
      <>
        <button
          type="button"
          disabled={disabled}
          onClick={() => {
            if (disabled) return;
            setDraft(value == null ? "" : String(value));
            setEditing(true);
          }}
          className={cn(
            "flex h-12 w-full items-center justify-between gap-2 rounded-2xl border px-4 text-left text-base transition",
            error ? "border-danger" : "border-border",
            disabled ? "opacity-70" : "bg-surface",
          )}
        >
          <span className={cn("truncate", hasDisplayValue(value) ? "text-text" : "text-text-muted")}>
            {hasDisplayValue(value) ? String(value) : field.placeholder ?? "Toque para preencher"}
          </span>
          {disabled ? <LucideLock className="size-4 text-text-muted" /> : <LucidePencil className="size-4 text-text-muted" />}
        </button>

        {editing ? (
          <div className="fixed inset-0 z-[1200] flex flex-col justify-end bg-black/45" onClick={() => setEditing(false)}>
            <div
              className="grid gap-3 rounded-t-[var(--radius-2xl)] border-t border-border bg-surface p-4 pb-[max(env(safe-area-inset-bottom),1rem)]"
              onClick={(event) => event.stopPropagation()}
            >
              <p className="text-sm font-semibold text-text">{field.label}</p>
              {error || field.rule ? (
                <p className={cn("text-xs", error ? "font-semibold text-danger" : "text-text-muted")}>{error ?? field.rule}</p>
              ) : null}

              <Input
                ref={sheetRef}
                type={inputType(field.kind)}
                inputMode={inputMode(field.kind)}
                value={draft}
                placeholder={field.placeholder}
                onFocus={(event) => event.currentTarget.select()}
                onChange={(event) => setDraft(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    commit(true);
                  }
                }}
              />

              <div className="grid grid-cols-2 gap-3">
                <Button variant="outline" onClick={() => setEditing(false)}>
                  {labels.cancel}
                </Button>
                <Button onClick={() => commit(true)}>{nextField ? labels.next : labels.done}</Button>
              </div>
            </div>
          </div>
        ) : null}
      </>
    );
  }

  return (
    <Input
      ref={inlineRef}
      type={inputType(field.kind)}
      inputMode={inputMode(field.kind)}
      value={value == null ? "" : String(value)}
      placeholder={field.placeholder}
      disabled={disabled}
      onFocus={(event) => event.currentTarget.select()}
      onChange={(event) => onChange?.(field.key, event.target.value)}
      onKeyDown={(event) => {
        if (event.key === "Enter") {
          event.preventDefault();
          onRequestNext?.(nextField?.key ?? null);
        }
      }}
      className={error ? "border-danger" : undefined}
    />
  );
}
