"use client";

import { useEffect, useRef, useState } from "react";
import { LucideEye, LucideEyeOff, LucideLock, LucideMail, LucidePencil, LucidePhone, LucideUser } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { dismissKeyboard } from "@/lib/platform/keyboard";
import { cn } from "@/lib/utils";
import type { DynamicFieldIcon, DynamicFormField, FieldKind, FormValue } from "@/types/dynamic-form";

const FIELD_ICONS: Record<DynamicFieldIcon, typeof LucideUser> = {
  user: LucideUser,
  lock: LucideLock,
  mail: LucideMail,
  phone: LucidePhone,
};

/** Icone a esquerda do campo (quando `field.icon` esta definido). */
function LeadingIcon({ icon }: { icon?: DynamicFieldIcon }) {
  if (!icon) {
    return null;
  }
  const Icon = FIELD_ICONS[icon];
  return (
    <Icon className="pointer-events-none absolute inset-y-0 left-0 my-auto ml-4 size-4 text-text-muted" aria-hidden="true" />
  );
}

/**
 * Campo de texto do formulario dinamico, portado da base mobile.
 *
 * - Foco (aparelho de toque: celular e tablet): tocar no campo abre um editor focado (bottom-sheet)
 *   com o conteudo selecionado; confirmar avanca para o proximo campo.
 * - Auto-select (web + mobile): ao focar, seleciona o conteudo; Enter/"Proximo"
 *   avanca para o proximo campo editavel (onRequestNext).
 */
type FormFieldInputProps = {
  field: DynamicFormField;
  value: FormValue;
  error?: string;
  disabled?: boolean;
  /** Aparelho de toque (celular/tablet): edita num painel acima do teclado virtual. */
  touch: boolean;
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

/** Tecla de ação (Enter / "Próximo" / "Ir"), fora de composição (IME). */
function isActionKey(event: React.KeyboardEvent<HTMLInputElement>) {
  return event.key === "Enter" && !event.nativeEvent.isComposing;
}

/**
 * Botões do editor de toque: impede que o toque tire o foco do input. Sem isso
 * o teclado virtual recolhe no pointerdown, a folha (ancorada no rodapé) desce
 * e o click cai no fundo — que cancelava o rascunho. Com o foco preservado, o
 * teclado segue aberto e "Próximo" passa o foco direto ao campo seguinte.
 */
function keepSheetFocus(event: React.PointerEvent | React.MouseEvent) {
  event.preventDefault();
}

/**
 * Último campo: Enter/"Ir" do teclado submete o <form> que envolve o campo (se
 * houver). Adiado um tick para o submit enxergar o valor recém-confirmado (o
 * onChange do editor ainda não re-renderizou o form).
 */
function submitEnclosingForm(element: HTMLElement | null) {
  const form = element?.closest("form");
  if (form) {
    setTimeout(() => form.requestSubmit(), 0);
  }
}

export function FormFieldInput({
  field,
  value,
  error,
  disabled,
  touch,
  focusKey,
  nextField,
  labels = DEFAULT_LABELS,
  onChange,
  onRequestNext,
  onConsumeFocus,
}: FormFieldInputProps) {
  const inlineRef = useRef<HTMLInputElement>(null);
  const sheetRef = useRef<HTMLInputElement>(null);
  const sheetPanelRef = useRef<HTMLDivElement>(null);
  // Editor de toque: `closed` evita confirmar/cancelar duas vezes (Enter + blur);
  // `intent` marca, no pointerdown, um toque em Cancelar/fora ("cancel") ou no
  // botão Próximo ("action") — o blur que vem antes do click não deve decidir.
  const sheetClosedRef = useRef(true);
  const sheetIntentRef = useRef<"cancel" | "action" | null>(null);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const [reveal, setReveal] = useState(false);
  const isPassword = field.kind === "password";

  // Orquestracao de foco: quando o focusKey aponta para este campo, abre o
  // editor (toque) ou foca o input inline (desktop).
  useEffect(() => {
    if (!focusKey || focusKey !== field.key) {
      return;
    }
    if (!disabled) {
      /* eslint-disable react-hooks/set-state-in-effect */
      // Senha usa input inline (web + mobile): sem o editor bottom-sheet, que
      // exporia o valor e faz auto-select — inadequado para campo sensivel.
      if (touch && !isPassword) {
        sheetClosedRef.current = false;
        sheetIntentRef.current = null;
        setDraft(value == null ? "" : String(value));
        setEditing(true);
      } else {
        inlineRef.current?.focus();
      }
      /* eslint-enable react-hooks/set-state-in-effect */
    }
    onConsumeFocus?.(field.key);
  }, [focusKey, field.key, disabled, touch, isPassword, value, onConsumeFocus]);

  // Foca e seleciona o input do editor ao abrir (toque).
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

  const openSheet = () => {
    sheetClosedRef.current = false;
    sheetIntentRef.current = null;
    setDraft(value == null ? "" : String(value));
    setEditing(true);
  };

  const commit = (advance: boolean) => {
    if (sheetClosedRef.current) {
      return;
    }
    sheetClosedRef.current = true;
    // Valor lido do PRÓPRIO campo: teclados/simuladores que escrevem no `value`
    // sem disparar `input` deixariam o `draft` (estado) desatualizado.
    onChange?.(field.key, sheetRef.current?.value ?? draft);
    // Só "Próximo" com campo seguinte mantém o teclado (o foco passa direto ao
    // próximo campo). Concluir/último campo fecha: o input do editor é
    // desmontado com foco (os botões preservam o foco) e remover um elemento
    // focado não dispara blur — o teclado ficaria aberto sem campo.
    // (Via blur o foco já está em outro elemento — não é roubado.)
    if (!(advance && nextField) && document.activeElement === sheetRef.current) {
      dismissKeyboard();
    }
    setEditing(false);
    if (advance) {
      onRequestNext?.(nextField?.key ?? null);
    }
  };

  const cancel = () => {
    sheetClosedRef.current = true;
    // Idem: o input sai de cena ainda focado (botão/fundo preservam o foco).
    if (document.activeElement === sheetRef.current) {
      dismissKeyboard();
    }
    setEditing(false);
  };

  // O editor perdeu o foco SEM Enter nem botão: a tecla "Próximo" do teclado
  // virtual (o navegador move o foco sozinho para o próximo campo do form, sem
  // keydown Enter) ou o "OK"/recolher do teclado. Confirma o rascunho em vez de
  // perdê-lo; foco indo para outro campo = avançar.
  const onSheetBlur = (event: React.FocusEvent<HTMLInputElement>) => {
    if (sheetClosedRef.current || sheetIntentRef.current) {
      return;
    }
    const to = event.relatedTarget;
    if (to instanceof Node && sheetPanelRef.current?.contains(to)) {
      return; // foco num botão do próprio editor: o click decide
    }
    commit(to instanceof HTMLElement);
  };

  // Tecla de ação do teclado virtual: "Próximo" enquanto houver campo depois;
  // no último, "Ir" (submete). Sem o hint, o Android mostra ↵ (quebra de linha).
  const enterKeyHint = nextField ? "next" : "go";

  // Ação do teclado num input inline: avança; no último campo, submete o form
  // (o submit fecha o teclado virtual — listener do DeviceContext).
  // Input inline controlado: se algo escreveu no DOM sem disparar `input`
  // (teclado simulado, autofill antigo), leva o valor ao form antes de sair.
  const syncInline = (element: HTMLInputElement) => {
    if (element.value !== (value == null ? "" : String(value))) {
      onChange?.(field.key, element.value);
    }
  };

  const inlineAction = (element: HTMLInputElement) => {
    syncInline(element);
    if (nextField) {
      onRequestNext?.(nextField.key);
    } else {
      submitEnclosingForm(element);
    }
  };

  // Ação do teclado no editor de toque: confirma e avança; no último, submete.
  const sheetAction = (element: HTMLInputElement) => {
    commit(true);
    if (!nextField) {
      submitEnclosingForm(element);
    }
  };

  const onInlineEnter = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (isActionKey(event)) {
      event.preventDefault();
      inlineAction(event.currentTarget);
    }
  };

  // Teclados virtuais que NÃO mandam keydown Enter (Android: keyCode 229 /
  // "Unidentified") ainda disparam `beforeinput` de quebra de linha — nativo,
  // porque o onBeforeInput do React não expõe `inputType`. A ação mais recente
  // fica num ref (os handlers fecham sobre props/estado do último render).
  const actionsRef = useRef({ inline: inlineAction, sheet: sheetAction });
  useEffect(() => {
    actionsRef.current = { inline: inlineAction, sheet: sheetAction };
  });
  useEffect(() => {
    const bind = (element: HTMLInputElement | null, kind: "inline" | "sheet") => {
      if (!element) {
        return () => undefined;
      }
      const onBeforeInput = (event: InputEvent) => {
        if (event.inputType === "insertLineBreak" || event.inputType === "insertParagraph") {
          event.preventDefault();
          actionsRef.current[kind](element);
        }
      };
      element.addEventListener("beforeinput", onBeforeInput);
      return () => element.removeEventListener("beforeinput", onBeforeInput);
    };
    const unbindInline = bind(inlineRef.current, "inline");
    const unbindSheet = bind(sheetRef.current, "sheet");
    return () => {
      unbindInline();
      unbindSheet();
    };
  }, [editing, touch, isPassword]);

  if (isPassword) {
    return (
      <div className="relative">
        <LeadingIcon icon={field.icon} />
        <Input
          ref={inlineRef}
          type={reveal ? "text" : "password"}
          value={value == null ? "" : String(value)}
          placeholder={field.placeholder}
          disabled={disabled}
          autoComplete="current-password"
          enterKeyHint={enterKeyHint}
          onChange={(event) => onChange?.(field.key, event.target.value)}
          onBlur={(event) => syncInline(event.currentTarget)}
          onKeyDown={onInlineEnter}
          className={cn("pr-12", field.icon ? "pl-11" : undefined, error ? "border-danger" : undefined)}
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

  if (touch) {
    return (
      <>
        <button
          type="button"
          disabled={disabled}
          onClick={() => {
            if (disabled) return;
            openSheet();
          }}
          className={cn(
            "relative flex h-12 w-full items-center justify-between gap-2 rounded-2xl border px-4 text-left text-base transition",
            field.icon ? "pl-11" : undefined,
            error ? "border-danger" : "border-border",
            disabled ? "opacity-70" : "bg-surface",
          )}
        >
          <LeadingIcon icon={field.icon} />
          <span className={cn("truncate", hasDisplayValue(value) ? "text-text" : "text-text-muted")}>
            {hasDisplayValue(value) ? String(value) : field.placeholder ?? "Toque para preencher"}
          </span>
          {disabled ? <LucideLock className="size-4 text-text-muted" /> : <LucidePencil className="size-4 text-text-muted" />}
        </button>

        {editing ? (
          <div
            className="fixed inset-0 z-[1200] flex flex-col justify-end bg-black/45"
            onPointerDown={(event) => {
              if (event.target === event.currentTarget) sheetIntentRef.current = "cancel";
            }}
            // Só cancela se o toque COMEÇOU no fundo: um click que "cai" aqui por
            // deslocamento de layout (teclado recolhendo) não descarta o rascunho.
            onClick={() => {
              if (sheetIntentRef.current === "cancel") cancel();
            }}
          >
            <div
              ref={sheetPanelRef}
              // Tela larga (tablet, celular deitado): mesma folha, com largura
              // limitada e centralizada — por tamanho, não por view.
              className="grid gap-3 rounded-t-[var(--radius-2xl)] border-t border-border bg-surface p-4 pb-[max(var(--app-safe-bottom),1rem)] sm:mx-auto sm:w-full sm:max-w-xl sm:border-x"
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
                enterKeyHint={enterKeyHint}
                onFocus={(event) => {
                  sheetIntentRef.current = null;
                  event.currentTarget.select();
                }}
                onBlur={onSheetBlur}
                onChange={(event) => setDraft(event.target.value)}
                onKeyDown={(event) => {
                  if (isActionKey(event)) {
                    event.preventDefault();
                    sheetAction(event.currentTarget);
                  }
                }}
              />

              <div className="grid grid-cols-2 gap-3">
                <Button
                  variant="outline"
                  onPointerDown={(event) => {
                    keepSheetFocus(event);
                    sheetIntentRef.current = "cancel";
                  }}
                  onMouseDown={keepSheetFocus}
                  onClick={cancel}
                >
                  {labels.cancel}
                </Button>
                <Button
                  onPointerDown={(event) => {
                    keepSheetFocus(event);
                    sheetIntentRef.current = "action";
                  }}
                  onMouseDown={keepSheetFocus}
                  onClick={() => commit(true)}
                >
                  {nextField ? labels.next : labels.done}
                </Button>
              </div>
            </div>
          </div>
        ) : null}
      </>
    );
  }

  return (
    <div className="relative">
      <LeadingIcon icon={field.icon} />
      <Input
        ref={inlineRef}
        type={inputType(field.kind)}
        inputMode={inputMode(field.kind)}
        value={value == null ? "" : String(value)}
        placeholder={field.placeholder}
        disabled={disabled}
        enterKeyHint={enterKeyHint}
        onFocus={(event) => event.currentTarget.select()}
        onChange={(event) => onChange?.(field.key, event.target.value)}
        onBlur={(event) => syncInline(event.currentTarget)}
        onKeyDown={onInlineEnter}
        className={cn(field.icon ? "pl-11" : undefined, error ? "border-danger" : undefined)}
      />
    </div>
  );
}
