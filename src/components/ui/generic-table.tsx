"use client";

import * as React from "react";
import { LucideArrowDown, LucideArrowUp, LucideArrowUpDown, LucideChevronDown, LucideChevronLeft, LucideChevronUp, LucideColumns3, LucideGripVertical, LucideChevronRight, LucideDownload, LucideEye, LucideInfo, LucidePlus, LucideSettings2, LucideSlidersHorizontal, LucideX } from "lucide-react";

import { useDevice } from "@/contexts/DeviceContext";
import { useNavigation } from "@/contexts/NavigationContext";
import { useSystemContext } from "@/contexts/SystemContext";
import { cn } from "@/lib/utils";
import {
  FilterModal,
  type FilterField,
  type FilterModalLabels,
  type FilterValues,
} from "@/components/ui/filter-modal";
import type { ListQuery, ListSort } from "@/types/list-query";

import { Card, CardContent, CardHeaderSplit } from "./card";

const DAY_MS = 86_400_000;
const LIMIT_OPTIONS = [10, 25, 50, 100, 250, 500];
/**
 * Coluna de ações da tabela desktop: fixa à direita na rolagem horizontal, com
 * fundo opaco (cobre as colunas que passam por baixo) e uma borda de separação.
 */
const STICKY_ACTIONS =
  "sticky right-0 z-10 bg-surface shadow-[inset_1px_0_0_var(--color-border)] [thead_&]:z-30 [thead_&]:bg-[color:color-mix(in_srgb,var(--color-surface-strong)_60%,var(--color-surface))]";

/** Cabeçalho da tabela desktop (real e espelho preso ao topo): fundo opaco + borda. */
const THEAD_CLASS =
  "[&_th]:border-b [&_th]:border-border [&_th]:bg-[color:color-mix(in_srgb,var(--color-surface-strong)_60%,var(--color-surface))]";

/** Máximo de ações por página no painel de ações do card mobile (grid 3×2). */
const ACTIONS_PER_PAGE = 6;

function chunkActions<T>(actions: RowAction<T>[], size: number): RowAction<T>[][] {
  const pages: RowAction<T>[][] = [];
  for (let i = 0; i < actions.length; i += size) {
    pages.push(actions.slice(i, i + size));
  }
  return pages;
}

type MobilePriority = "primary" | "secondary" | "meta";
/** Papel do campo no card mobile (estilo Expo). Tem prioridade sobre `mobilePriority`. */
type MobileRole = "title" | "badge" | "meta" | "field";

export type CardStatusTone = "success" | "danger" | "warning" | "neutral";
export type RowStatus = { label: string; tone: CardStatusTone };
export type RowAction<T> = {
  id: string;
  label: string;
  icon?: React.ReactNode;
  destructive?: boolean;
  onSelect: (item: T) => void;
};

type ClassNameResolver<T> = string | ((item: T, index: number) => string | undefined);

export type GenericTableColumn<T> = {
  key: string;
  header: React.ReactNode;
  render: (item: T, index: number) => React.ReactNode;
  className?: string;
  headerClassName?: string;
  mobileLabel?: React.ReactNode;
  mobilePriority?: MobilePriority;
  mobileRole?: MobileRole;
  hideOnMobile?: boolean;
  /** Torna a coluna ordenável (desktop); é o nome do campo enviado em `onSortChange`. */
  sortKey?: string;
  /** Valor comparado na ordenação local (sem `onSortChange`). */
  sortValue?: (item: T) => string | number | null | undefined;
  /** Começa oculta (desktop): o usuário a exibe pelo seletor "Colunas". */
  defaultHidden?: boolean;
  /** Campo que a API só devolve sob pedido — exibir a coluna avisa `onVisibleColumnsChange`. */
  additional?: boolean;
};

/** Configuracao de filtro/paginacao (espelha `ListFilterConfig` do Expo). */
export type ListFilterConfig<T> = {
  fields: FilterField[];
  predicate: (item: T, values: FilterValues) => boolean;
  /** `true`/`false` força; 'auto' (padrão) habilita acima de `autoThreshold`. */
  enabled?: boolean | "auto";
  autoThreshold?: number;
  /** Inclui os básicos (limite/pular/data). Padrão: true. `"date"` = só Data (a tela pagina). */
  basic?: boolean | "date";
  /** Necessário para o filtro básico de data: extrai o timestamp do item. */
  dateOf?: (item: T) => number;
};

export type GenericTableLabels = {
  filters: string;
  filtersActive: string;
  /** Seletor de colunas (desktop): exibir/ocultar e mudar a posição. */
  columns: string;
  showAllColumns: string;
  resetColumns: string;
  moveColumnUp: string;
  moveColumnDown: string;
  tapToFilter: string;
  add: string;
  export: string;
  details: string;
  actions: string;
  close: string;
  limit: string;
  skip: string;
  date: string;
  all: string;
  last7: string;
  last15: string;
  last30: string;
  custom: string;
  modal: FilterModalLabels;
};

const DEFAULT_LABELS: GenericTableLabels = {
  filters: "Filtros ativos",
  filtersActive: "Filtros",
  columns: "Colunas",
  showAllColumns: "Mostrar todas",
  resetColumns: "Restaurar padrão",
  moveColumnUp: "Mover para cima",
  moveColumnDown: "Mover para baixo",
  tapToFilter: "Toque para filtrar",
  add: "Adicionar",
  export: "Exportar",
  details: "VER DETALHES",
  actions: "Ações",
  close: "Fechar",
  limit: "Limite",
  skip: "Pular",
  date: "Data",
  all: "Todos",
  last7: "Últimos 7 dias",
  last15: "Últimos 15 dias",
  last30: "Últimos 30 dias",
  custom: "Personalizado",
  modal: {
    title: "Filtros",
    close: "Fechar",
    clear: "Limpar",
    apply: "Aplicar",
    all: "Todos",
    customFrom: "De",
    customTo: "Até",
  },
};

export type GenericTableProps<T> = {
  columns: GenericTableColumn<T>[];
  data: T[];
  getRowKey: (item: T, index: number) => React.Key;
  caption?: React.ReactNode;
  emptyMessage?: React.ReactNode;
  className?: string;
  tableClassName?: string;
  rowClassName?: ClassNameResolver<T>;
  cardClassName?: ClassNameResolver<T>;
  // --- chrome de tela (opcionais; ausentes = comportamento simples) ---
  getRowStatus?: (item: T) => RowStatus | null;
  onRowDetails?: (item: T) => void;
  getRowActions?: (item: T) => RowAction<T>[];
  filter?: ListFilterConfig<T>;
  onCreate?: () => void;
  onExport?: () => void;
  /** Modo servidor: o pai já aplicou data/offset/limite e busca por `ListQuery`. */
  onQueryChange?: (query: ListQuery) => void;
  /** Modo cliente: avisa os valores aplicados no filtro (ex.: a tela completar `data` antes de filtrar). */
  onFilterChange?: (values: FilterValues) => void;
  /** Ordenação no servidor: emite os critérios (desktop) e não ordena localmente. */
  onSortChange?: (sort: ListSort) => void;
  /** Avisa as colunas visíveis quando o usuário muda o seletor (ex.: pedir colunas adicionais à API). */
  onVisibleColumnsChange?: (keys: string[]) => void;
  labels?: Partial<GenericTableLabels>;
};

/** Clique no cabeçalho: sem critério → asc → desc → sai (os demais critérios ficam). */
function nextSort(sort: ListSort, key: string): ListSort {
  const current = sort.find((entry) => entry.key === key);
  if (!current) return [...sort, { key, direction: "asc" }];
  if (current.direction === "asc") return sort.map((entry) => (entry.key === key ? { key, direction: "desc" } : entry));
  return sort.filter((entry) => entry.key !== key);
}

function compareValues(a: string | number | null | undefined, b: string | number | null | undefined) {
  if (a == null || b == null) return a == null ? (b == null ? 0 : 1) : -1;
  return typeof a === "number" && typeof b === "number" ? a - b : String(a).localeCompare(String(b), "pt-BR", { numeric: true });
}

const TONE_CLASS: Record<CardStatusTone, string> = {
  success: "bg-[color:color-mix(in_srgb,var(--color-success)_16%,transparent)] text-[color:var(--color-success)]",
  danger: "bg-[color:color-mix(in_srgb,var(--color-error)_16%,transparent)] text-[color:var(--color-error)]",
  warning: "bg-[color:color-mix(in_srgb,var(--color-secondary)_24%,transparent)] text-text",
  neutral: "bg-[color:var(--color-surface-strong)] text-text-muted",
};

/**
 * Lista mobile na zona do polegar, sem inverter a ordem (mesmo princípio dos
 * resultados da gaveta do Menu). O ASSENTAR junto à navegação quando sobra
 * espaço é do layout (`ScreenZones`, zona de alcance — CSS). Aqui fica só o que
 * CSS não faz: com mais cards que a tela, abrir rolado até o FIM (a cada troca
 * de dados/filtro). Fora do scroll do MainContent não faz nada.
 */
function useStickToEnd(ref: React.RefObject<HTMLDivElement | null>, enabled: boolean, contentKey: unknown) {
  React.useLayoutEffect(() => {
    const element = ref.current;
    const scroller = element?.closest<HTMLElement>('[data-layout-scroll="content"]');
    if (!enabled || !element || !scroller) {
      return;
    }
    // "Grudado no fim" (como um chat): enquanto a rolagem está no fim, mudanças
    // de tamanho (footer de ações montando, fontes, cards) a mantêm no fim. Se o
    // usuário rola para cima, solta — e nada força de volta.
    let atEnd = true;
    // Posição que NÓS pusemos: o evento `scroll` é assíncrono e pode chegar
    // depois de a área encolher (ex.: footer montou) — não é o usuário soltando.
    let ownTop = -1;
    const toEnd = () => {
      scroller.scrollTop = scroller.scrollHeight;
      ownTop = scroller.scrollTop;
    };
    const onScroll = () => {
      if (Math.abs(scroller.scrollTop - ownTop) < 2) {
        return;
      }
      atEnd = scroller.scrollTop >= scroller.scrollHeight - scroller.clientHeight - 2;
    };
    const onResize = () => {
      if (atEnd) toEnd();
    };
    toEnd();
    scroller.addEventListener("scroll", onScroll, { passive: true });
    const observer = new ResizeObserver(onResize);
    observer.observe(scroller);
    if (element.firstElementChild) observer.observe(element.firstElementChild);
    // Reforço: as regiões do shell (ex.: footer de ações) montam logo após a
    // lista; re-assenta uma vez caso o ResizeObserver não chegue a tempo.
    const settle = window.setTimeout(onResize, 150);
    return () => {
      window.clearTimeout(settle);
      scroller.removeEventListener("scroll", onScroll);
      observer.disconnect();
    };
  }, [ref, enabled, contentKey]);
}

/**
 * Colunas da tabela (desktop): botão ao lado de "Filtros" que abre a lista de
 * colunas NA ORDEM da tabela — marcar exibe/oculta, arrastar (ou as setas, pelo
 * teclado) muda a posição. A última coluna visível não pode ser desmarcada.
 * "Restaurar padrão" volta à ordem e às ocultas do contrato. Fecha no clique fora
 * e no Esc.
 */
function ColumnPicker<T>({
  labels,
  columns,
  hidden,
  onToggle,
  onMove,
  onShowAll,
  onReset,
}: {
  labels: { title: string; showAll: string; reset: string; moveUp: string; moveDown: string };
  /** Já na ordem atual da tabela. */
  columns: GenericTableColumn<T>[];
  hidden: ReadonlySet<string>;
  onToggle: (key: string) => void;
  onMove: (key: string, toIndex: number) => void;
  onShowAll: () => void;
  onReset: () => void;
}) {
  const [open, setOpen] = React.useState(false);
  const [dragging, setDragging] = React.useState<string | null>(null);
  const rootRef = React.useRef<HTMLDivElement>(null);
  const listId = React.useId();
  const visibleCount = columns.length - hidden.size;
  const arrowClass =
    "inline-flex size-6 items-center justify-center rounded text-text-muted transition hover:bg-[color:var(--color-surface-strong)] hover:text-text disabled:opacity-30";

  React.useEffect(() => {
    if (!open) return;
    const onPointer = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={listId}
        onClick={() => setOpen((current) => !current)}
        className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-4 py-2 text-sm font-semibold text-text transition hover:bg-[color:var(--color-surface-strong)]"
      >
        <LucideColumns3 className="size-4" />
        {labels.title}
        {hidden.size > 0 ? (
          <span className="inline-flex min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-xs font-bold text-white">
            {visibleCount}/{columns.length}
          </span>
        ) : null}
      </button>
      {open ? (
        <div
          id={listId}
          className="absolute left-0 top-full z-30 mt-2 grid min-w-72 gap-1 rounded-[var(--radius-xl)] border border-border bg-surface p-2 shadow-[var(--shadow-soft)]"
        >
          <ul className="grid max-h-[60vh] gap-0.5 overflow-y-auto">
            {columns.map((column, index) => {
              const checked = !hidden.has(column.key);
              const locked = checked && visibleCount === 1;
              const name = column.mobileLabel ?? column.header;
              return (
                <li
                  key={column.key}
                  draggable
                  onDragStart={(event) => {
                    event.dataTransfer.effectAllowed = "move";
                    setDragging(column.key);
                  }}
                  onDragOver={(event) => {
                    if (dragging == null) return;
                    event.preventDefault();
                    if (dragging !== column.key) onMove(dragging, index);
                  }}
                  onDragEnd={() => setDragging(null)}
                  className={cn(
                    "flex items-center gap-1 rounded-lg px-1 py-0.5 text-sm text-text",
                    dragging === column.key ? "bg-[color:var(--color-surface-strong)] opacity-70" : "hover:bg-[color:var(--color-surface-strong)]",
                  )}
                >
                  <LucideGripVertical className="size-4 shrink-0 cursor-grab text-text-muted" aria-hidden="true" />
                  <label className={cn("flex min-w-0 flex-1 items-center gap-2 py-1", locked ? "opacity-60" : "cursor-pointer")}>
                    <input
                      type="checkbox"
                      checked={checked}
                      disabled={locked}
                      onChange={() => onToggle(column.key)}
                      className="size-4 accent-[color:var(--color-primary)]"
                    />
                    <span className="min-w-0 flex-1 truncate">{name}</span>
                  </label>
                  <button type="button" className={arrowClass} disabled={index === 0} onClick={() => onMove(column.key, index - 1)} aria-label={labels.moveUp}>
                    <LucideChevronUp className="size-4" />
                  </button>
                  <button
                    type="button"
                    className={arrowClass}
                    disabled={index === columns.length - 1}
                    onClick={() => onMove(column.key, index + 1)}
                    aria-label={labels.moveDown}
                  >
                    <LucideChevronDown className="size-4" />
                  </button>
                </li>
              );
            })}
          </ul>
          <div className="mt-1 flex items-center justify-between gap-2 border-t border-border pt-2">
            <button
              type="button"
              onClick={onReset}
              className="rounded-lg px-2 py-1.5 text-left text-xs font-semibold text-text-muted hover:bg-[color:var(--color-surface-strong)] hover:text-text"
            >
              {labels.reset}
            </button>
            {hidden.size > 0 ? (
              <button
                type="button"
                onClick={onShowAll}
                className="rounded-lg px-2 py-1.5 text-left text-xs font-semibold text-primary hover:bg-[color:var(--color-surface-strong)]"
              >
                {labels.showAll}
              </button>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}

/**
 * Barra de rolagem HORIZONTAL da tabela, presa ao pé da área visível (`sticky
 * bottom-0` na rolagem da página) enquanto a tabela aparece. Espelha `target`
 * nos dois sentidos; só existe quando o conteúdo é mais largo que o quadro.
 */
function HorizontalScrollbar({ target }: { target: HTMLDivElement | null }) {
  const barRef = React.useRef<HTMLDivElement>(null);
  const [size, setSize] = React.useState({ content: 0, viewport: 0 });

  React.useEffect(() => {
    if (!target) return;
    const measure = () => setSize({ content: target.scrollWidth, viewport: target.clientWidth });
    const syncBar = () => {
      if (barRef.current && barRef.current.scrollLeft !== target.scrollLeft) barRef.current.scrollLeft = target.scrollLeft;
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(target);
    if (target.firstElementChild) observer.observe(target.firstElementChild);
    target.addEventListener("scroll", syncBar, { passive: true });
    return () => {
      observer.disconnect();
      target.removeEventListener("scroll", syncBar);
    };
  }, [target]);

  if (!target || size.content <= size.viewport + 1) return null;
  return (
    <div
      ref={barRef}
      onScroll={(event) => {
        const left = event.currentTarget.scrollLeft;
        if (target.scrollLeft !== left) target.scrollTo({ left });
      }}
      // `-bottom-6`: o sticky respeita o padding da rolagem (MainContent desktop =
      // py-6); compensa para a barra encostar no fim da área visível, sem linhas
      // aparecendo por baixo dela.
      className="sticky -bottom-6 z-20 overflow-x-auto border-t border-border bg-surface"
    >
      <div style={{ width: size.content, height: 1 }} />
    </div>
  );
}

function resolveClassName<T>(value: ClassNameResolver<T> | undefined, item: T, index: number) {
  return typeof value === "function" ? value(item, index) : value;
}

/**
 * Classifica as colunas para o card mobile. O header mostra só o título
 * (esquerda) e o id (direita); badge e demais campos vão para o corpo.
 */
function groupCardColumns<T>(columns: GenericTableColumn<T>[]) {
  const visible = columns.filter((column) => !column.hideOnMobile);
  const titleColumn =
    visible.find((column) => column.mobileRole === "title") ??
    visible.find((column) => column.mobilePriority === "primary") ??
    visible[0];
  const badgeColumn = visible.find((column) => column.mobileRole === "badge");
  const bodyColumns = visible.filter((column) => column !== titleColumn && column !== badgeColumn);

  return { titleColumn, badgeColumn, bodyColumns };
}

/** Card de lista no estilo Expo: header colorido + label/valor + status + rodapé. */
function MobileEntityCard<T>({
  item,
  index,
  rowId,
  columns,
  status,
  actions,
  onDetails,
  detailsLabel,
  actionsLabel,
  closeLabel,
  className,
}: {
  item: T;
  index: number;
  rowId: React.ReactNode;
  columns: GenericTableColumn<T>[];
  status: RowStatus | null;
  actions: RowAction<T>[];
  onDetails?: (item: T) => void;
  detailsLabel: string;
  actionsLabel: string;
  closeLabel: string;
  className?: string;
}) {
  const [showActions, setShowActions] = React.useState(false);
  const [actionsPage, setActionsPage] = React.useState(0);
  const actionsScrollRef = React.useRef<HTMLDivElement>(null);
  const { titleColumn, badgeColumn, bodyColumns } = groupCardColumns(columns);
  const hasActions = actions.length > 0;
  const hasBody = Boolean(badgeColumn) || bodyColumns.length > 0;

  // Painel de ações paginado: no máximo ACTIONS_PER_PAGE por página.
  const actionPages = React.useMemo(() => chunkActions(actions, ACTIONS_PER_PAGE), [actions]);
  const actionsPageCount = actionPages.length;

  const openActions = () => {
    setActionsPage(0);
    setShowActions(true);
  };

  const goToActionsPage = (page: number) => {
    const el = actionsScrollRef.current;
    if (!el) {
      return;
    }
    const next = Math.max(0, Math.min(actionsPageCount - 1, page));
    el.scrollTo({ left: next * el.clientWidth, behavior: "smooth" });
  };

  // O card QUASE INTEIRO (header + corpo + status) é o alvo da ação principal
  // (`onDetails`: ver detalhes / "Acessar"...) — alvo grande na zona do polegar.
  // O rodapé fica só para as AÇÕES secundárias. Contêiner com role="button" (não
  // <button>: o conteúdo tem blocos); o nome acessível leva o rótulo da ação.
  const openDetails = onDetails ? () => onDetails(item) : undefined;

  return (
    <div className={cn("relative overflow-hidden rounded-xl border border-border bg-surface", className)}>
      <div
        role={openDetails ? "button" : undefined}
        tabIndex={openDetails ? 0 : undefined}
        onClick={openDetails}
        onKeyDown={
          openDetails
            ? (event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  openDetails();
                }
              }
            : undefined
        }
        className={cn(
          openDetails &&
            "cursor-pointer transition active:bg-[color:var(--color-surface-strong)] focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-primary",
        )}
      >
      {/* Header: título à esquerda, id (+ seta, quando clicável) à direita. */}
      <CardHeaderSplit
        // Card só com título: alvo de toque de ~48px (mínimo recomendado).
        className={cn("bg-primary px-4", hasBody || status ? "py-2.5" : "py-3.5")}
        left={<span className="block truncate text-sm font-bold text-white">{titleColumn?.render(item, index)}</span>}
        right={
          <span className="flex items-center gap-1 text-xs font-bold text-white">
            {rowId}
            {openDetails ? <LucideChevronRight className="size-4" aria-hidden="true" /> : null}
            {openDetails ? <span className="sr-only">{detailsLabel}</span> : null}
          </span>
        }
      />

      {hasBody ? (
        <div className="grid gap-1.5 px-4 py-3">
          {badgeColumn ? (
            <span className="inline-flex w-fit rounded-full bg-[color:var(--color-surface-strong)] px-2 py-0.5 text-[11px] font-extrabold uppercase tracking-[0.08em] text-primary">
              {badgeColumn.render(item, index)}
            </span>
          ) : null}
          {bodyColumns.map((column) => (
            <div key={column.key} className="flex items-start gap-3">
              <span className="w-28 shrink-0 text-[13px] font-bold text-primary">{column.mobileLabel ?? column.header}</span>
              <span className={cn("min-w-0 flex-1 text-sm text-text", column.className)}>{column.render(item, index)}</span>
            </div>
          ))}
        </div>
      ) : null}

      {status ? (
        <div className={cn("flex items-start gap-2 px-4 py-2 text-sm", TONE_CLASS[status.tone])}>
          <LucideInfo className="mt-0.5 size-4 shrink-0" />
          <span className="flex-1">{status.label}</span>
        </div>
      ) : null}

      </div>

      {/* Rodapé = AÇÕES secundárias (a principal é o toque no card). */}
      {hasActions ? (
        <button
          type="button"
          onClick={openActions}
          className="flex w-full items-center justify-center gap-1.5 border-t border-border bg-[color:var(--color-surface-strong)]/40 py-2.5 text-[13px] font-bold text-primary transition hover:bg-[color:var(--color-surface-strong)]"
        >
          <LucideSettings2 className="size-4" />
          {actionsLabel}
        </button>
      ) : null}

      {showActions && hasActions ? (
        <div className="absolute inset-0 flex flex-col gap-3 overflow-y-auto bg-surface p-4">
          <div className="flex shrink-0 items-center justify-between">
            <p className="text-base font-extrabold text-text">{actionsLabel}</p>
            <button type="button" onClick={() => setShowActions(false)} aria-label={closeLabel} className="inline-flex size-9 shrink-0 items-center justify-center rounded-full border border-border text-text-muted transition hover:bg-[color:var(--color-surface-strong)]">
              <LucideX className="size-4" />
            </button>
          </div>

          {/* Carrossel: no máximo 6 ações por página (ícone + título). Acima disso,
              pagina na horizontal — swipe ou chevron (piscando quando há mais). A
              altura acompanha o conteúdo (não estica), para não vazar do card. */}
          <div className="relative">
            <div
              ref={actionsScrollRef}
              onScroll={(event) => {
                const el = event.currentTarget;
                if (el.clientWidth > 0) {
                  setActionsPage(Math.round(el.scrollLeft / el.clientWidth));
                }
              }}
              className="flex snap-x snap-mandatory overflow-x-auto overflow-y-hidden [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            >
              {actionPages.map((page, pageIndex) => (
                <div
                  key={pageIndex}
                  className="grid w-full shrink-0 snap-start auto-rows-min grid-cols-3 gap-2"
                >
                  {page.map((action) => (
                    <button
                      key={action.id}
                      type="button"
                      onClick={() => {
                        setShowActions(false);
                        action.onSelect(item);
                      }}
                      className={cn(
                        "flex flex-col items-center justify-center gap-1.5 rounded-xl border px-2 py-3 text-xs font-bold transition",
                        action.destructive
                          ? "border-[color:var(--color-error)] text-[color:var(--color-error)] hover:bg-[color:color-mix(in_srgb,var(--color-error)_10%,transparent)]"
                          : "border-border text-text hover:bg-[color:var(--color-surface-strong)]",
                      )}
                    >
                      {action.icon}
                      <span className="w-full truncate text-center">{action.label}</span>
                    </button>
                  ))}
                </div>
              ))}
            </div>

            {actionsPageCount > 1 && actionsPage > 0 ? (
              <button
                type="button"
                aria-label="Ações anteriores"
                onClick={() => goToActionsPage(actionsPage - 1)}
                className="absolute left-0 top-1/2 inline-flex size-9 -translate-y-1/2 items-center justify-center rounded-full border border-border bg-surface text-text-muted shadow-[var(--shadow-soft)] transition hover:bg-[color:var(--color-surface-strong)]"
              >
                <LucideChevronLeft className="size-4" />
              </button>
            ) : null}

            {actionsPageCount > 1 && actionsPage < actionsPageCount - 1 ? (
              <button
                type="button"
                aria-label="Mais ações"
                onClick={() => goToActionsPage(actionsPage + 1)}
                className="absolute right-0 top-1/2 inline-flex size-9 -translate-y-1/2 animate-pulse items-center justify-center rounded-full border border-primary bg-surface text-primary shadow-[var(--shadow-soft)] transition hover:bg-[color:var(--color-surface-strong)]"
              >
                <LucideChevronRight className="size-4" />
              </button>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}

export function GenericTable<T>({
  columns,
  data,
  getRowKey,
  caption,
  emptyMessage = "Nenhum registro encontrado.",
  className,
  tableClassName,
  rowClassName,
  cardClassName,
  getRowStatus,
  onRowDetails,
  getRowActions,
  filter,
  onCreate,
  onExport,
  onQueryChange,
  onFilterChange,
  onSortChange,
  onVisibleColumnsChange,
  labels,
}: GenericTableProps<T>) {
  const { view } = useDevice();
  const mobileView = view === "mobile";
  const { placement } = useNavigation();
  const { footerHeight } = useSystemContext();
  // Altura ocupada pelo footer/nav inferior no mobile, para fixar a barra de
  // filtro logo acima dele e os FABs acima da barra (igual ao base Expo).
  const mobileFooterOffset = mobileView && placement === "footer" ? Math.max(footerHeight, 70) : 0;
  const resolved = React.useMemo<GenericTableLabels>(
    () => ({ ...DEFAULT_LABELS, ...labels, modal: { ...DEFAULT_LABELS.modal, ...labels?.modal } }),
    [labels],
  );

  const [values, setValues] = React.useState<FilterValues>({});
  const [filterOpen, setFilterOpen] = React.useState(false);
  const [sort, setSort] = React.useState<ListSort>([]);
  // Colunas ocultas (desktop): começa pelas `defaultHidden` do contrato; o usuário
  // muda pelo seletor. Sempre sobra ao menos uma visível.
  const [hiddenColumns, setHiddenColumns] = React.useState<ReadonlySet<string>>(
    () => new Set(columns.filter((column) => column.defaultHidden).map((column) => column.key)),
  );
  // Ordem das colunas (desktop), mudada pelo seletor (arrastar ou setas).
  const [columnOrder, setColumnOrder] = React.useState<string[]>(() => columns.map((column) => column.key));
  // Área de rolagem horizontal da tabela desktop (a barra própria a acompanha).
  const [tableScrollEl, setTableScrollEl] = React.useState<HTMLDivElement | null>(null);
  // Cabeçalho espelho preso ao topo: larguras medidas do cabeçalho real.
  const [headerMetrics, setHeaderMetrics] = React.useState<{ table: number; cells: number[] } | null>(null);
  const mirrorHeadRef = React.useRef<HTMLDivElement>(null);
  const headerLayoutKey = `${columnOrder.join(",")}|${[...hiddenColumns].join(",")}`;

  React.useEffect(() => {
    const table = tableScrollEl?.querySelector("table");
    const cells = table?.tHead?.rows[0]?.cells;
    // Sem tabela montada (lista vazia, mobile), o espelho nem é renderizado.
    if (!tableScrollEl || !table || !cells) return;
    const measure = () => {
      const next = { table: table.offsetWidth, cells: Array.from(cells, (cell) => cell.getBoundingClientRect().width) };
      setHeaderMetrics((current) =>
        current && current.table === next.table && current.cells.join() === next.cells.join() ? current : next,
      );
    };
    const syncScroll = () => mirrorHeadRef.current?.scrollTo({ left: tableScrollEl.scrollLeft });
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(table);
    Array.from(cells, (cell) => observer.observe(cell));
    tableScrollEl.addEventListener("scroll", syncScroll, { passive: true });
    return () => {
      observer.disconnect();
      tableScrollEl.removeEventListener("scroll", syncScroll);
    };
  }, [tableScrollEl, headerLayoutKey]);
  const serverMode = Boolean(onQueryChange);

  const datePresets = React.useMemo(
    () => [
      { id: "all", days: 0, label: resolved.all },
      { id: "7", days: 7, label: resolved.last7 },
      { id: "15", days: 15, label: resolved.last15 },
      { id: "30", days: 30, label: resolved.last30 },
      { id: "custom", days: -1, label: resolved.custom },
    ],
    [resolved],
  );

  const basicFields = React.useMemo<FilterField[]>(() => {
    if (!filter || filter.basic === false) {
      return [];
    }
    const paging = filter.basic !== "date";
    const fields: FilterField[] = paging
      ? [
          {
            key: "__limit",
            label: resolved.limit,
            kind: "select",
            flex: 5,
            placeholder: resolved.all,
            options: [...LIMIT_OPTIONS.map((n) => ({ id: String(n), label: String(n) })), { id: "all", label: resolved.all }],
          },
        ]
      : [];
    if (filter.dateOf) {
      fields.push({
        key: "__date",
        label: resolved.date,
        kind: "date-range",
        flex: 5,
        placeholder: resolved.all,
        options: datePresets.map((preset) => ({ id: preset.id, label: preset.label })),
      });
    }
    if (paging) {
      fields.push({ key: "__offset", label: resolved.skip, kind: "number", placeholder: "0", flex: 2 });
    }
    return fields;
  }, [datePresets, filter, resolved]);

  // Modo servidor: emite a ListQuery (limite/offset/data) ao alterar os básicos.
  React.useEffect(() => {
    if (!onQueryChange) {
      return;
    }
    const limitLabel = values.__limit?.trim();
    const limit = !limitLabel || limitLabel === resolved.all ? null : Number.parseInt(limitLabel, 10) || null;
    const offsetValue = Number.parseInt(values.__offset ?? "", 10);
    const offset = Number.isFinite(offsetValue) && offsetValue > 0 ? offsetValue : 0;

    const preset = datePresets.find((entry) => entry.label === values.__date);
    let dateFrom: number | null = null;
    let dateTo: number | null = null;
    if (preset?.id === "custom") {
      const parsedFrom = Date.parse((values.__dateFrom ?? "").trim());
      const parsedTo = Date.parse((values.__dateTo ?? "").trim());
      if (!Number.isNaN(parsedFrom)) dateFrom = parsedFrom;
      if (!Number.isNaN(parsedTo)) dateTo = parsedTo + DAY_MS - 1;
    } else if (preset && preset.days > 0) {
      dateFrom = Date.now() - preset.days * DAY_MS;
    }

    onQueryChange({ limit, offset, dateFrom, dateTo });
  }, [onQueryChange, values, datePresets, resolved]);

  React.useEffect(() => {
    onFilterChange?.(values);
  }, [onFilterChange, values]);

  React.useEffect(() => {
    onSortChange?.(sort);
  }, [onSortChange, sort]);

  const filterEnabled = React.useMemo(() => {
    if (!filter) {
      return false;
    }
    if (serverMode) return true;
    if (filter.enabled === true) return true;
    if (filter.enabled === false) return false;
    return data.length > (filter.autoThreshold ?? 5);
  }, [filter, data.length, serverMode]);

  // Ordenação local (sem `onSortChange`): antes de pular/limitar, como no servidor.
  const sorted = React.useMemo(() => {
    const criteria = onSortChange
      ? []
      : sort.flatMap((entry) => {
          const valueOf = columns.find((column) => column.sortKey === entry.key)?.sortValue;
          return valueOf ? [{ valueOf, sign: entry.direction === "desc" ? -1 : 1 }] : [];
        });
    if (criteria.length === 0) return data;
    return [...data].sort((a, b) => {
      for (const { valueOf, sign } of criteria) {
        const comparison = compareValues(valueOf(a), valueOf(b));
        if (comparison !== 0) return comparison * sign;
      }
      return 0;
    });
  }, [columns, data, onSortChange, sort]);

  const filtered = React.useMemo(() => {
    if (!filter || !filterEnabled) {
      return sorted;
    }

    let result = sorted.filter((item) => filter.predicate(item, values));

    if (serverMode) {
      return result;
    }

    if (filter.dateOf && values.__date?.trim()) {
      const preset = datePresets.find((entry) => entry.label === values.__date);
      const dateOf = filter.dateOf;
      let from: number | null = null;
      let to: number | null = null;

      if (preset?.id === "custom") {
        const parsedFrom = Date.parse((values.__dateFrom ?? "").trim());
        const parsedTo = Date.parse((values.__dateTo ?? "").trim());
        if (!Number.isNaN(parsedFrom)) from = parsedFrom;
        if (!Number.isNaN(parsedTo)) to = parsedTo + DAY_MS - 1;
      } else if (preset && preset.days > 0) {
        // Janela relativa "últimos N dias" depende do tempo atual (uso intencional).
        // eslint-disable-next-line react-hooks/purity
        from = Date.now() - preset.days * DAY_MS;
      }

      if (from !== null) result = result.filter((item) => dateOf(item) >= (from as number));
      if (to !== null) result = result.filter((item) => dateOf(item) <= (to as number));
    }

    const offset = Number.parseInt(values.__offset ?? "", 10);
    if (Number.isFinite(offset) && offset > 0) {
      result = result.slice(offset);
    }

    const limitLabel = values.__limit?.trim();
    const limit = !limitLabel || limitLabel === resolved.all ? NaN : Number.parseInt(limitLabel, 10);
    if (Number.isFinite(limit) && limit > 0) {
      result = result.slice(0, limit);
    }

    return result;
  }, [datePresets, filter, filterEnabled, sorted, values, serverMode, resolved]);

  const summaryEntries = React.useMemo(() => {
    const entries: { label: string; value: string }[] = [];
    if (values.__limit?.trim() && values.__limit !== resolved.all) entries.push({ label: resolved.limit, value: values.__limit });
    if (values.__offset?.trim() && values.__offset.trim() !== "0") entries.push({ label: resolved.skip, value: values.__offset });
    if (values.__date?.trim() && values.__date !== resolved.all) entries.push({ label: resolved.date, value: values.__date });
    filter?.fields.forEach((field) => {
      if (values[field.key]?.trim()) {
        entries.push({ label: field.label, value: values[field.key] });
      }
    });
    return entries;
  }, [filter, resolved, values]);
  const summaryParts = summaryEntries.map((entry) => `${entry.label}: ${entry.value}`);
  // Barra mobile: um filtro → "Campo: valor"; vários → só os nomes ("Campo, Campo").
  const summaryText =
    summaryEntries.length === 1 ? summaryParts[0] : summaryEntries.map((entry) => entry.label).join(", ");

  const hasChrome = Boolean(filter || onCreate || onExport);

  // Mobile: lista longa abre no fim, perto da navegação (zona do polegar).
  const anchorRef = React.useRef<HTMLDivElement>(null);
  useStickToEnd(anchorRef, mobileView, filtered);

  const emptyState = (
    <Card className={cn("border-dashed", className)}>
      <CardContent className="p-6 text-sm text-text-muted">{emptyMessage}</CardContent>
    </Card>
  );

  // ---------------------------------------------------------------- MOBILE ----
  if (mobileView) {
    const list =
      filtered.length === 0 ? (
        emptyState
      ) : (
        <div className={cn("grid gap-3 wide:grid-cols-2 wide:items-start", className)}>
          {filtered.map((item, index) => (
            <MobileEntityCard
              key={getRowKey(item, index)}
              item={item}
              index={index}
              rowId={String(getRowKey(item, index))}
              columns={columns}
              status={getRowStatus?.(item) ?? null}
              actions={getRowActions?.(item) ?? []}
              onDetails={onRowDetails}
              detailsLabel={resolved.details}
              actionsLabel={resolved.actions}
              closeLabel={resolved.close}
              className={resolveClassName(cardClassName, item, index)}
            />
          ))}
        </div>
      );

    if (!hasChrome) {
      return <div ref={anchorRef}>{list}</div>;
    }

    const FILTER_BAR_HEIGHT = 52;

    return (
      <div className="relative">
        <div ref={anchorRef}>
          <div style={{ paddingBottom: filterEnabled ? FILTER_BAR_HEIGHT + 16 : 0 }}>{list}</div>
        </div>

        <div
          className="pointer-events-none fixed right-5 z-[80] flex flex-col items-end gap-3"
          style={{ bottom: mobileFooterOffset + (filterEnabled ? FILTER_BAR_HEIGHT : 0) + 16 }}
        >
          {onExport ? (
            <button
              type="button"
              onClick={onExport}
              aria-label={resolved.export}
              className="pointer-events-auto inline-flex size-12 items-center justify-center rounded-full bg-secondary text-text shadow-[var(--shadow-soft)] transition active:scale-95"
            >
              <LucideDownload className="size-5" />
            </button>
          ) : null}
          {onCreate ? (
            <button
              type="button"
              onClick={onCreate}
              aria-label={resolved.add}
              className="pointer-events-auto inline-flex size-14 items-center justify-center rounded-full bg-primary text-white shadow-[var(--shadow-soft)] transition active:scale-95"
            >
              <LucidePlus className="size-6" />
            </button>
          ) : null}
        </div>

        {filterEnabled ? (
          <button
            type="button"
            onClick={() => setFilterOpen(true)}
            style={{ bottom: mobileFooterOffset }}
            className="fixed inset-x-0 z-[70] flex w-full items-center gap-2.5 bg-primary-strong px-4 py-2.5 text-left text-on-primary-strong"
          >
            <LucideSlidersHorizontal className="size-4 shrink-0" />
            <span className="min-w-0 flex-1">
              <span className="block text-[11px] font-extrabold uppercase tracking-[0.04em]">{resolved.filters}</span>
              <span className="block truncate text-[13px] font-semibold">
                {summaryParts.length > 0 ? summaryText : resolved.tapToFilter}
              </span>
            </span>
            {summaryParts.length > 0 ? (
              <span
                role="button"
                tabIndex={0}
                onClick={(event) => {
                  event.stopPropagation();
                  setValues({});
                }}
                className="inline-flex size-7 items-center justify-center rounded-full transition hover:bg-white/15"
              >
                <LucideX className="size-4" />
              </span>
            ) : null}
          </button>
        ) : null}

        {filter ? (
          <FilterModal
            open={filterOpen}
            basicFields={basicFields}
            entityFields={filter.fields}
            values={values}
            labels={resolved.modal}
            onApply={setValues}
            onClose={() => setFilterOpen(false)}
          />
        ) : null}
      </div>
    );
  }

  // --------------------------------------------------------------- DESKTOP ----
  // Ordem escolhida pelo usuário; colunas novas (fora da ordem salva) vão ao fim.
  const byKey = new Map(columns.map((column) => [column.key, column]));
  const orderedColumns = [
    ...columnOrder.flatMap((key) => byKey.get(key) ?? []),
    ...columns.filter((column) => !columnOrder.includes(column.key)),
  ];
  const visibleColumns = orderedColumns.filter((column) => !hiddenColumns.has(column.key));
  const applyHidden = (next: ReadonlySet<string>) => {
    setHiddenColumns(next);
    onVisibleColumnsChange?.(columns.filter((column) => !next.has(column.key)).map((column) => column.key));
  };
  const moveColumn = (key: string, toIndex: number) => {
    const keys = orderedColumns.map((column) => column.key).filter((current) => current !== key);
    keys.splice(Math.max(0, Math.min(keys.length, toIndex)), 0, key);
    setColumnOrder(keys);
  };
  // Padrão do contrato: ordem original e só as `defaultHidden` ocultas.
  const resetColumns = () => {
    setColumnOrder(columns.map((column) => column.key));
    applyHidden(new Set(columns.filter((column) => column.defaultHidden).map((column) => column.key)));
  };
  const toggleColumn = (key: string) => {
    const next = new Set(hiddenColumns);
    if (next.has(key)) next.delete(key);
    else if (columns.length - next.size > 1) next.add(key);
    applyHidden(next);
  };

  const hasActionsColumn = Boolean(getRowActions || onRowDetails);
  /**
   * Linha do cabeçalho. `widths` = espelho preso ao topo: mesmas larguras medidas
   * da tabela real; fica fora da ordem de tabulação e oculto para leitores de tela
   * (o cabeçalho real, embaixo dele, continua o acessível).
   */
  const headerRow = (widths: number[] | null) => {
    const sized = (index: number) =>
      widths ? { width: widths[index], minWidth: widths[index], maxWidth: widths[index] } : undefined;
    return (
      <tr>
        {visibleColumns.map((column, index) => {
          const sortKey = column.sortKey;
          const position = sortKey ? sort.findIndex((entry) => entry.key === sortKey) : -1;
          const direction = position >= 0 ? sort[position].direction : null;
          return (
            <th
              key={column.key}
              scope="col"
              style={sized(index)}
              aria-sort={!widths && position === 0 ? (direction === "asc" ? "ascending" : "descending") : undefined}
              className={cn(
                "px-2 py-2.5 text-left align-bottom text-[11px] font-semibold uppercase tracking-[0.04em] text-text-muted first:pl-4",
                column.headerClassName,
              )}
            >
              {sortKey ? (
                // Ordenação composta: cada clique acrescenta/inverte/retira a
                // coluna; o número diz a prioridade quando há mais de uma.
                // Inline (não flex): o rótulo quebra por palavra e o ícone
                // acompanha a última — a coluna não alarga por causa dele.
                <button
                  type="button"
                  tabIndex={widths ? -1 : undefined}
                  onClick={() => setSort((current) => nextSort(current, sortKey))}
                  className={cn(
                    "uppercase tracking-[inherit] [text-align:inherit] transition hover:text-text",
                    direction && "text-primary",
                  )}
                >
                  {column.header}
                  {direction === "asc" ? (
                    <LucideArrowUp className="ml-0.5 inline size-3 align-[-1px]" aria-hidden="true" />
                  ) : direction === "desc" ? (
                    <LucideArrowDown className="ml-0.5 inline size-3 align-[-1px]" aria-hidden="true" />
                  ) : (
                    <LucideArrowUpDown className="ml-0.5 inline size-3 align-[-1px] opacity-40" aria-hidden="true" />
                  )}
                  {position >= 0 && sort.length > 1 ? (
                    <span className="ml-0.5 inline-flex size-3.5 items-center justify-center rounded-full bg-primary align-[-2px] text-[9px] font-bold tracking-normal text-white">
                      {position + 1}
                    </span>
                  ) : null}
                </button>
              ) : (
                column.header
              )}
            </th>
          );
        })}
        {hasActionsColumn ? (
          <th scope="col" style={sized(visibleColumns.length)} className={cn("w-px px-2 py-2.5 pr-4", STICKY_ACTIONS)}>
            <span className="sr-only">{resolved.actions}</span>
          </th>
        ) : null}
      </tr>
    );
  };

  const desktopTable =
    filtered.length === 0 ? (
      emptyState
    ) : (
      // Só a rolagem HORIZONTAL é da tabela; a vertical é da página (MainContent).
      // A barra horizontal é própria (`HorizontalScrollbar`), presa ao pé da área
      // visível enquanto a tabela aparece — fica à vista sem ir ao fim das linhas.
      // Coluna de ações fixa à direita. Cada coluna ocupa a largura do conteúdo
      // (`min-w-max`); com poucas colunas, a tabela ocupa a largura toda.
      // `overflow-clip` (não `hidden`) recorta os cantos sem virar área de rolagem,
      // para a barra `sticky` seguir a rolagem da página. `contain: inline-size`:
      // a largura do quadro vem do espaço disponível, não da tabela — senão a
      // tabela larga alargaria o quadro e os ancestrais (grid/flex).
      <div
        className={cn(
          "overflow-clip rounded-[var(--radius-2xl)] border border-border bg-surface shadow-[var(--shadow-soft)] [contain:inline-size]",
          className,
        )}
      >
        {/* Cabeçalho preso ao topo ao rolar a página: espelho sobreposto ao real
            (bloco `sticky` de altura 0), com as larguras medidas e a mesma rolagem
            horizontal. `-top-6` compensa o padding da rolagem (MainContent py-6). */}
        {headerMetrics ? (
          <div className="sticky -top-6 z-20 h-0">
            <div ref={mirrorHeadRef} aria-hidden="true" className="overflow-hidden">
              <table
                className={cn("border-separate border-spacing-0", tableClassName)}
                style={{ width: headerMetrics.table, minWidth: headerMetrics.table }}
              >
                <thead className={THEAD_CLASS}>{headerRow(headerMetrics.cells)}</thead>
              </table>
            </div>
          </div>
        ) : null}
        <div
          ref={setTableScrollEl}
          className="overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          <table className={cn("w-full min-w-max border-separate border-spacing-0", tableClassName)}>
            {caption ? <caption className="px-6 py-4 text-left text-sm text-text-muted">{caption}</caption> : null}
            <thead className={THEAD_CLASS}>{headerRow(null)}</thead>
            <tbody>
              {filtered.map((item, index) => {
                const resolvedRowClassName = resolveClassName(rowClassName, item, index);
                const rowActions = getRowActions?.(item) ?? [];

                return (
                  <tr
                    key={getRowKey(item, index)}
                    className={cn("align-top [&:not(:first-child)>td]:border-t [&>td]:border-border/60", resolvedRowClassName)}
                  >
                    {visibleColumns.map((column) => (
                      <td key={column.key} className={cn("px-2 py-2.5 text-sm text-text first:pl-4", column.className)}>
                        {column.render(item, index)}
                      </td>
                    ))}
                    {getRowActions || onRowDetails ? (
                      <td className={cn("w-px whitespace-nowrap px-2 py-1.5 pr-4 text-right text-sm", STICKY_ACTIONS)}>
                        {/* Coluna de ações: só ícones, com tooltip (title) da descrição.
                            Sempre visível: fixa à direita na rolagem horizontal,
                            largura exata dos ícones (`w-px` + nowrap). */}
                        <div className="flex items-center justify-end gap-1">
                          {onRowDetails ? (
                            <button
                              type="button"
                              onClick={() => onRowDetails(item)}
                              title={resolved.details}
                              aria-label={resolved.details}
                              className="inline-flex size-8 items-center justify-center rounded-full border border-border text-primary transition hover:bg-[color:var(--color-surface-strong)]"
                            >
                              <LucideEye className="size-4" />
                            </button>
                          ) : null}
                          {rowActions.map((action) => (
                            <button
                              key={action.id}
                              type="button"
                              onClick={() => action.onSelect(item)}
                              title={action.label}
                              aria-label={action.label}
                              className={cn(
                                "inline-flex items-center justify-center rounded-full border transition",
                                // Sem ícone, mantém o rótulo (fallback): pill de texto.
                                action.icon ? "size-8" : "px-3 py-1.5 text-xs font-semibold",
                                action.destructive
                                  ? "border-[color:var(--color-error)] text-[color:var(--color-error)] hover:bg-[color:color-mix(in_srgb,var(--color-error)_10%,transparent)]"
                                  : "border-border text-text hover:bg-[color:var(--color-surface-strong)]",
                              )}
                            >
                              {action.icon ?? action.label}
                            </button>
                          ))}
                        </div>
                      </td>
                    ) : null}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <HorizontalScrollbar target={tableScrollEl} />
      </div>
    );

  if (!hasChrome) {
    return desktopTable;
  }

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center gap-3">
        {filterEnabled ? (
          <button
            type="button"
            onClick={() => setFilterOpen(true)}
            className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-4 py-2 text-sm font-semibold text-text transition hover:bg-[color:var(--color-surface-strong)]"
          >
            <LucideSlidersHorizontal className="size-4" />
            {resolved.filtersActive}
            {summaryParts.length > 0 ? (
              <span className="inline-flex min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-xs font-bold text-white">
                {summaryParts.length}
              </span>
            ) : null}
          </button>
        ) : null}

        <ColumnPicker
          labels={{
            title: resolved.columns,
            showAll: resolved.showAllColumns,
            reset: resolved.resetColumns,
            moveUp: resolved.moveColumnUp,
            moveDown: resolved.moveColumnDown,
          }}
          columns={orderedColumns}
          hidden={hiddenColumns}
          onToggle={toggleColumn}
          onMove={moveColumn}
          onShowAll={() => applyHidden(new Set())}
          onReset={resetColumns}
        />

        {summaryParts.length > 0 ? (
          <div className="flex flex-wrap items-center gap-2">
            {summaryParts.map((part) => (
              <span key={part} className="rounded-full bg-[color:var(--color-surface-strong)] px-3 py-1 text-xs font-medium text-text-muted">
                {part}
              </span>
            ))}
            <button type="button" onClick={() => setValues({})} className="text-xs font-semibold text-primary underline-offset-2 hover:underline">
              {resolved.modal.clear}
            </button>
          </div>
        ) : null}

        <div className="ml-auto flex items-center gap-2">
          {onExport ? (
            <button
              type="button"
              onClick={onExport}
              className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-4 py-2 text-sm font-semibold text-text transition hover:bg-[color:var(--color-surface-strong)]"
            >
              <LucideDownload className="size-4" />
              {resolved.export}
            </button>
          ) : null}
          {onCreate ? (
            <button
              type="button"
              onClick={onCreate}
              className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-white transition hover:bg-primary-strong"
            >
              <LucidePlus className="size-4" />
              {resolved.add}
            </button>
          ) : null}
        </div>
      </div>

      {desktopTable}

      {filter ? (
        <FilterModal
          open={filterOpen}
          basicFields={basicFields}
          entityFields={filter.fields}
          values={values}
          labels={resolved.modal}
          onApply={setValues}
          onClose={() => setFilterOpen(false)}
        />
      ) : null}
    </div>
  );
}
