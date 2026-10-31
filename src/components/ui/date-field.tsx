"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { LucideCalendar, LucideChevronLeft, LucideChevronRight } from "lucide-react";

import { useDevice } from "@/contexts/DeviceContext";
import { useLanguage } from "@/contexts/LanguageContext";
import {
  daysInMonth,
  formatDisplay,
  maskTyping,
  parseIso,
  parseTyping,
  toIso,
  withinRange,
  type DateFieldMode,
} from "@/lib/date-field";
import { cn } from "@/lib/utils";

export type DateFieldLabels = {
  close: string;
  clear: string;
  today: string;
  thisMonth: string;
  previous: string;
  next: string;
  openCalendar: string;
};

const DEFAULT_LABELS: DateFieldLabels = {
  close: "Fechar",
  clear: "Limpar",
  today: "Hoje",
  thisMonth: "Este mês",
  previous: "Anterior",
  next: "Próximo",
  openCalendar: "Abrir calendário",
};

export type DateFieldProps = {
  /** `day` = data (`yyyy-MM-dd`); `month` = mês/ano (`yyyy-MM`). */
  mode?: DateFieldMode;
  /** Valor no formato da API; "" = sem data. */
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  /** Título da tela cheia no mobile. */
  title?: string;
  ariaLabel?: string;
  /** Limites no mesmo formato do valor. */
  min?: string;
  max?: string;
  required?: boolean;
  invalid?: boolean;
  className?: string;
  labels?: Partial<DateFieldLabels>;
};

const FIELD =
  "flex h-12 w-full items-center gap-2 rounded-2xl border bg-surface px-4 text-base text-text transition focus-within:border-primary";

/**
 * Campo de data ADAPTATIVO, no lugar do `<input type="date|month">` nativo (que
 * muda de cara por navegador, some no tema escuro e não existe para mês em vários
 * navegadores). Web: digitação com máscara `dd/mm/aaaa` (ou `mm/aaaa`) + calendário
 * em popover. Mobile: o toque abre a tela cheia com o calendário embaixo, ao
 * alcance do polegar; o back do sistema fecha (como o `SelectOne`).
 */
export function DateField({
  mode = "day",
  value,
  onChange,
  placeholder,
  title,
  ariaLabel,
  min,
  max,
  required,
  invalid,
  className,
  labels: labelsProp,
}: DateFieldProps) {
  const { view } = useDevice();
  const labels = { ...DEFAULT_LABELS, ...labelsProp };
  const hint = placeholder ?? (mode === "day" ? "dd/mm/aaaa" : "mm/aaaa");

  if (view === "mobile") {
    return (
      <MobileDateField
        mode={mode}
        value={value}
        onChange={onChange}
        placeholder={hint}
        title={title ?? ariaLabel}
        ariaLabel={ariaLabel}
        min={min}
        max={max}
        invalid={invalid}
        className={className}
        labels={labels}
      />
    );
  }
  return (
    <DesktopDateField
      mode={mode}
      value={value}
      onChange={onChange}
      placeholder={hint}
      ariaLabel={ariaLabel}
      min={min}
      max={max}
      required={required}
      invalid={invalid}
      className={className}
      labels={labels}
    />
  );
}

type InnerProps = Omit<DateFieldProps, "labels" | "placeholder"> & { placeholder: string; labels: DateFieldLabels };

const POPOVER_WIDTH = 320;
const POPOVER_HEIGHT = 340;

function DesktopDateField({ mode = "day", value, onChange, placeholder, ariaLabel, min, max, required, invalid, className, labels }: InnerProps) {
  // Posição do popover (fixa, em portal: não é cortado por contêiner com rolagem, ex.: modal de filtros).
  const [popover, setPopover] = useState<{ top: number; left: number } | null>(null);
  // Texto em edição; null = mostra o valor formatado.
  const [draft, setDraft] = useState<string | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const open = popover != null;

  const toggle = () => {
    if (open || !rootRef.current) {
      setPopover(null);
      return;
    }
    const rect = rootRef.current.getBoundingClientRect();
    // Abre embaixo; sem espaço, em cima. Nunca passa da borda direita.
    const below = rect.bottom + 8 + POPOVER_HEIGHT <= window.innerHeight;
    setPopover({
      top: below ? rect.bottom + 8 : Math.max(8, rect.top - 8 - POPOVER_HEIGHT),
      left: Math.max(8, Math.min(rect.left, window.innerWidth - POPOVER_WIDTH - 8)),
    });
  };

  useEffect(() => {
    if (!open) return;
    const close = () => setPopover(null);
    const onDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (!rootRef.current?.contains(target) && !popoverRef.current?.contains(target)) close();
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
    };
    // Rolagem fora do popover ou redimensionar: a âncora mudou de lugar.
    const onScroll = (event: Event) => {
      if (!popoverRef.current?.contains(event.target as Node)) close();
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", close);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", close);
    };
  }, [open]);

  const text = draft ?? formatDisplay(value, mode);
  const draftInvalid = draft != null && draft !== "" && (parseTyping(draft, mode) == null || !withinRange(parseTyping(draft, mode) ?? "", min, max));

  const onType = (raw: string) => {
    const masked = maskTyping(raw, mode);
    setDraft(masked);
    if (masked === "") {
      onChange("");
      return;
    }
    const iso = parseTyping(masked, mode);
    if (iso && withinRange(iso, min, max)) onChange(iso);
  };

  return (
    <div ref={rootRef} className={cn("relative", className)}>
      <div className={cn(FIELD, invalid || draftInvalid ? "border-error" : "border-border")}>
        <input
          type="text"
          inputMode="numeric"
          aria-label={ariaLabel}
          aria-invalid={invalid || draftInvalid || undefined}
          required={required}
          placeholder={placeholder}
          value={text}
          onChange={(event) => onType(event.target.value)}
          // Ao sair, texto incompleto volta ao último valor válido.
          onBlur={() => setDraft(null)}
          onKeyDown={(event) => {
            if (event.key === "ArrowDown" && event.altKey && !open) toggle();
          }}
          className="min-w-0 flex-1 bg-transparent tabular-nums outline-none placeholder:text-text-muted"
        />
        <button
          type="button"
          aria-label={labels.openCalendar}
          aria-expanded={open}
          onClick={toggle}
          className="-mr-2 inline-flex size-9 shrink-0 items-center justify-center rounded-full text-text-muted transition hover:bg-[color:var(--color-surface-strong)] hover:text-primary"
        >
          <LucideCalendar className="size-4" />
        </button>
      </div>
      {popover
        ? createPortal(
            <div
              ref={popoverRef}
              role="dialog"
              aria-label={ariaLabel}
              style={{ top: popover.top, left: popover.left, width: POPOVER_WIDTH }}
              className="fixed z-[1300] rounded-[var(--radius-xl)] border border-border bg-surface p-3 shadow-[var(--shadow-soft)]"
            >
              <CalendarPanel
                mode={mode}
                value={value}
                min={min}
                max={max}
                labels={labels}
                onSelect={(iso) => {
                  setDraft(null);
                  onChange(iso);
                  setPopover(null);
                }}
              />
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}

function MobileDateField({ mode = "day", value, onChange, placeholder, title, ariaLabel, min, max, invalid, className, labels }: InnerProps) {
  const [open, setOpen] = useState(false);

  // Tela cheia como nível de navegação: o back do sistema fecha.
  const openPicker = useCallback(() => {
    setOpen(true);
    window.history.pushState({ __dateField: true }, "");
  }, []);

  const closePicker = useCallback(() => {
    if ((window.history.state as { __dateField?: boolean } | null)?.__dateField) {
      window.history.back();
      return;
    }
    setOpen(false);
  }, []);

  useEffect(() => {
    const onPop = () => setOpen(false);
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  const shown = formatDisplay(value, mode);
  const choose = (iso: string) => {
    onChange(iso);
    closePicker();
  };

  return (
    <>
      <button
        type="button"
        aria-label={ariaLabel}
        onClick={openPicker}
        className={cn(FIELD, "justify-between text-left", invalid ? "border-error" : "border-border", className)}
      >
        <span className={cn("truncate tabular-nums", shown ? "text-text" : "text-text-muted")}>{shown || placeholder}</span>
        <LucideCalendar className="size-4 shrink-0 text-text-muted" />
      </button>

      {open ? createPortal(
        <div className="fixed inset-0 z-[1300] flex flex-col bg-[color:var(--color-background)]">
          <div className="flex items-center justify-between gap-3 bg-primary px-4 py-3 pt-[max(var(--app-safe-top),0.75rem)] text-white">
            <span className="min-w-0 truncate text-base font-medium">{title}</span>
            <button type="button" onClick={closePicker} className="shrink-0 text-sm font-semibold">
              {labels.close}
            </button>
          </div>

          {/* Leitura em cima: o valor atual; alcance do polegar embaixo: o calendário. */}
          <div className="flex min-h-0 flex-1 items-end justify-center p-6">
            <p className={cn("text-3xl font-semibold tabular-nums", shown ? "text-text" : "text-text-muted")}>{shown || placeholder}</p>
          </div>

          <div className="grid gap-3 border-t border-border bg-surface p-3 pb-[max(var(--app-safe-bottom),0.75rem)]">
            <CalendarPanel mode={mode} value={value} min={min} max={max} labels={labels} onSelect={choose} large />
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => choose("")}
                className="rounded-xl border border-border py-3 text-sm font-semibold text-text transition hover:border-primary"
              >
                {labels.clear}
              </button>
              <TodayButton mode={mode} min={min} max={max} labels={labels} onSelect={choose} />
            </div>
          </div>
        </div>,
        document.body,
      ) : null}
    </>
  );
}

function hoje(mode: DateFieldMode): string {
  const now = new Date();
  return toIso(mode, now.getFullYear(), now.getMonth() + 1, now.getDate());
}

function TodayButton({ mode, min, max, labels, onSelect }: { mode: DateFieldMode; min?: string; max?: string; labels: DateFieldLabels; onSelect: (iso: string) => void }) {
  const today = hoje(mode);
  return (
    <button
      type="button"
      disabled={!withinRange(today, min, max)}
      onClick={() => onSelect(today)}
      className="rounded-xl bg-primary py-3 text-sm font-semibold text-white transition hover:bg-primary-strong disabled:opacity-50"
    >
      {mode === "day" ? labels.today : labels.thisMonth}
    </button>
  );
}

type PanelView = "days" | "months" | "years";

/**
 * Calendário: dias do mês (modo dia), meses do ano e anos em blocos de 12.
 * O título alterna para o nível de cima (dias → meses → anos), para chegar
 * rápido a datas distantes. Nomes de mês/dia pelo idioma ativo (`Intl`).
 */
function CalendarPanel({
  mode,
  value,
  min,
  max,
  labels,
  onSelect,
  large,
}: {
  mode: DateFieldMode;
  value: string;
  min?: string;
  max?: string;
  labels: DateFieldLabels;
  onSelect: (iso: string) => void;
  large?: boolean;
}) {
  const { locale } = useLanguage();
  const selected = parseIso(value, mode);
  const now = new Date();
  const [cursor, setCursor] = useState(() => ({ year: selected?.year ?? now.getFullYear(), month: selected?.month ?? now.getMonth() + 1 }));
  const [panel, setPanel] = useState<PanelView>(mode === "day" ? "days" : "months");

  const monthNames = useMemo(() => {
    const format = new Intl.DateTimeFormat(locale, { month: "short" });
    return Array.from({ length: 12 }, (_, index) => format.format(new Date(2026, index, 1)).replace(".", ""));
  }, [locale]);
  const monthLong = useMemo(() => new Intl.DateTimeFormat(locale, { month: "long", year: "numeric" }), [locale]);
  const weekDays = useMemo(() => {
    const format = new Intl.DateTimeFormat(locale, { weekday: "narrow" });
    // 2026-03-01 é domingo: semana começando no domingo.
    return Array.from({ length: 7 }, (_, index) => format.format(new Date(2026, 2, 1 + index)));
  }, [locale]);

  const todayIso = hoje("day");
  const cell = cn("rounded-xl text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-30", large ? "h-11" : "h-9");
  const mark = (isSelected: boolean, isToday: boolean) =>
    isSelected
      ? "bg-primary text-white"
      : cn("text-text hover:bg-[color:var(--color-surface-strong)]", isToday && "ring-1 ring-primary");

  const step = (delta: number) => {
    if (panel === "days") {
      const index = cursor.year * 12 + cursor.month - 1 + delta;
      setCursor({ year: Math.floor(index / 12), month: (index % 12) + 1 });
    } else {
      setCursor((current) => ({ ...current, year: current.year + delta * (panel === "years" ? 12 : 1) }));
    }
  };

  const startYear = cursor.year - (cursor.year % 12);
  const monthTitle = monthLong.format(new Date(cursor.year, cursor.month - 1, 1));
  // Só a 1ª letra maiúscula ("Junho de 2026"; `capitalize` faria "Junho De 2026").
  const heading =
    panel === "days" ? monthTitle.charAt(0).toUpperCase() + monthTitle.slice(1) : panel === "months" ? String(cursor.year) : `${startYear}–${startYear + 11}`;

  // Um mês/ano inteiro fora dos limites fica desabilitado.
  const monthAllowed = (month: number) =>
    withinRange(toIso("month", cursor.year, month), min?.slice(0, 7), max?.slice(0, 7));
  const yearAllowed = (year: number) => withinRange(String(year), min?.slice(0, 4), max?.slice(0, 4));

  const first = new Date(cursor.year, cursor.month - 1, 1).getDay();
  const total = daysInMonth(cursor.year, cursor.month);

  return (
    <div className="grid gap-2">
      <div className="flex items-center justify-between gap-2">
        <button type="button" aria-label={labels.previous} onClick={() => step(-1)} className="inline-flex size-9 items-center justify-center rounded-full text-text transition hover:bg-[color:var(--color-surface-strong)]">
          <LucideChevronLeft className="size-4" />
        </button>
        <button
          type="button"
          disabled={panel === "years"}
          onClick={() => setPanel(panel === "days" ? "months" : "years")}
          className="rounded-full px-3 py-1.5 text-sm font-semibold text-text transition hover:bg-[color:var(--color-surface-strong)] disabled:hover:bg-transparent"
        >
          {heading}
        </button>
        <button type="button" aria-label={labels.next} onClick={() => step(1)} className="inline-flex size-9 items-center justify-center rounded-full text-text transition hover:bg-[color:var(--color-surface-strong)]">
          <LucideChevronRight className="size-4" />
        </button>
      </div>

      {panel === "days" ? (
        <div className="grid grid-cols-7 gap-1 text-center">
          {weekDays.map((day, index) => (
            <span key={index} className="py-1 text-xs font-semibold uppercase text-text-muted">
              {day}
            </span>
          ))}
          {Array.from({ length: first }, (_, index) => (
            <span key={`vazio-${index}`} />
          ))}
          {Array.from({ length: total }, (_, index) => {
            const day = index + 1;
            const iso = toIso("day", cursor.year, cursor.month, day);
            return (
              <button
                key={iso}
                type="button"
                disabled={!withinRange(iso, min, max)}
                aria-pressed={iso === value}
                onClick={() => onSelect(iso)}
                className={cn(cell, "tabular-nums", mark(iso === value, iso === todayIso))}
              >
                {day}
              </button>
            );
          })}
        </div>
      ) : panel === "months" ? (
        <div className="grid grid-cols-3 gap-2">
          {monthNames.map((name, index) => {
            const month = index + 1;
            const isSelected = selected != null && selected.year === cursor.year && selected.month === month;
            const isCurrent = now.getFullYear() === cursor.year && now.getMonth() + 1 === month;
            return (
              <button
                key={name}
                type="button"
                disabled={!monthAllowed(month)}
                aria-pressed={isSelected}
                onClick={() => {
                  if (mode === "month") {
                    onSelect(toIso("month", cursor.year, month));
                    return;
                  }
                  setCursor({ year: cursor.year, month });
                  setPanel("days");
                }}
                className={cn(cell, "capitalize", mark(isSelected, isCurrent))}
              >
                {name}
              </button>
            );
          })}
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-2">
          {Array.from({ length: 12 }, (_, index) => {
            const year = startYear + index;
            return (
              <button
                key={year}
                type="button"
                disabled={!yearAllowed(year)}
                aria-pressed={selected?.year === year}
                onClick={() => {
                  setCursor({ year, month: cursor.month });
                  setPanel("months");
                }}
                className={cn(cell, "tabular-nums", mark(selected?.year === year, now.getFullYear() === year))}
              >
                {year}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
