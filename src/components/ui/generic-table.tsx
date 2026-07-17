"use client";

import * as React from "react";
import { LucideChevronLeft, LucideChevronRight, LucideDownload, LucideEye, LucideInfo, LucidePlus, LucideSettings2, LucideSlidersHorizontal, LucideX } from "lucide-react";

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
import type { ListQuery } from "@/types/list-query";

import { Card, CardContent, CardHeaderSplit } from "./card";

const DAY_MS = 86_400_000;
const LIMIT_OPTIONS = [10, 25, 50, 100, 250, 500];
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
};

/** Configuracao de filtro/paginacao (espelha `ListFilterConfig` do Expo). */
export type ListFilterConfig<T> = {
  fields: FilterField[];
  predicate: (item: T, values: FilterValues) => boolean;
  /** `true`/`false` força; 'auto' (padrão) habilita acima de `autoThreshold`. */
  enabled?: boolean | "auto";
  autoThreshold?: number;
  /** Inclui os básicos (limite/pular/data). Padrão: true. */
  basic?: boolean;
  /** Necessário para o filtro básico de data: extrai o timestamp do item. */
  dateOf?: (item: T) => number;
};

export type GenericTableLabels = {
  filters: string;
  filtersActive: string;
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
    customFrom: "De (AAAA-MM-DD)",
    customTo: "Até (AAAA-MM-DD)",
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
  labels?: Partial<GenericTableLabels>;
};

const TONE_CLASS: Record<CardStatusTone, string> = {
  success: "bg-[color:color-mix(in_srgb,var(--color-success)_16%,transparent)] text-[color:var(--color-success)]",
  danger: "bg-[color:color-mix(in_srgb,var(--color-error)_16%,transparent)] text-[color:var(--color-error)]",
  warning: "bg-[color:color-mix(in_srgb,var(--color-secondary)_24%,transparent)] text-text",
  neutral: "bg-[color:var(--color-surface-strong)] text-text-muted",
};

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
  const hasFooter = Boolean(onDetails) || hasActions;
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

  return (
    <div className={cn("relative overflow-hidden rounded-xl border border-border bg-surface", className)}>
      {/* Header: título à esquerda, id à direita (estrutura CardHeaderSplit). */}
      <CardHeaderSplit
        className="bg-primary px-4 py-2.5"
        left={<span className="block truncate text-sm font-bold text-white">{titleColumn?.render(item, index)}</span>}
        right={<span className="text-xs font-bold text-white">{rowId}</span>}
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

      {hasFooter ? (
        <div className="flex items-stretch border-t border-border bg-[color:var(--color-surface-strong)]/40">
          {hasActions ? (
            <button
              type="button"
              onClick={openActions}
              aria-label={actionsLabel}
              className="flex items-center justify-center border-r border-border px-4 py-2.5 text-primary transition hover:bg-[color:var(--color-surface-strong)]"
            >
              <LucideSettings2 className="size-4" />
            </button>
          ) : null}
          {onDetails ? (
            <button
              type="button"
              onClick={() => onDetails(item)}
              className="flex flex-1 items-center justify-center gap-1.5 py-2.5 text-[13px] font-bold text-primary transition hover:bg-[color:var(--color-surface-strong)]"
            >
              <LucideInfo className="size-4" />
              {detailsLabel}
            </button>
          ) : null}
        </div>
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
    const fields: FilterField[] = [
      {
        key: "__limit",
        label: resolved.limit,
        kind: "select",
        flex: 5,
        placeholder: resolved.all,
        options: [...LIMIT_OPTIONS.map((n) => ({ id: String(n), label: String(n) })), { id: "all", label: resolved.all }],
      },
    ];
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
    fields.push({ key: "__offset", label: resolved.skip, kind: "number", placeholder: "0", flex: 2 });
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

  const filterEnabled = React.useMemo(() => {
    if (!filter) {
      return false;
    }
    if (serverMode) return true;
    if (filter.enabled === true) return true;
    if (filter.enabled === false) return false;
    return data.length > (filter.autoThreshold ?? 5);
  }, [filter, data.length, serverMode]);

  const filtered = React.useMemo(() => {
    if (!filter || !filterEnabled) {
      return data;
    }

    let result = data.filter((item) => filter.predicate(item, values));

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
  }, [datePresets, filter, filterEnabled, data, values, serverMode, resolved]);

  const summaryParts = React.useMemo(() => {
    const parts: string[] = [];
    if (values.__limit?.trim() && values.__limit !== resolved.all) parts.push(`${resolved.limit}: ${values.__limit}`);
    if (values.__offset?.trim() && values.__offset.trim() !== "0") parts.push(`${resolved.skip}: ${values.__offset}`);
    if (values.__date?.trim() && values.__date !== resolved.all) parts.push(`${resolved.date}: ${values.__date}`);
    filter?.fields.forEach((field) => {
      if (values[field.key]?.trim()) {
        parts.push(`${field.label}: ${values[field.key]}`);
      }
    });
    return parts;
  }, [filter, resolved, values]);

  const hasChrome = Boolean(filter || onCreate || onExport);

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
        <div className={cn("grid gap-3", className)}>
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
      return list;
    }

    const FILTER_BAR_HEIGHT = 52;

    return (
      <div className="relative">
        <div style={{ paddingBottom: filterEnabled ? FILTER_BAR_HEIGHT + 16 : 0 }}>{list}</div>

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
                {summaryParts.length > 0 ? summaryParts.join("  ·  ") : resolved.tapToFilter}
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
  const desktopTable =
    filtered.length === 0 ? (
      emptyState
    ) : (
      <div className={cn("overflow-hidden rounded-[var(--radius-2xl)] border border-border bg-surface shadow-[var(--shadow-soft)]", className)}>
        <div className="overflow-x-auto">
          <table className={cn("min-w-full border-collapse", tableClassName)}>
            {caption ? <caption className="px-6 py-4 text-left text-sm text-text-muted">{caption}</caption> : null}
            <thead className="bg-[color:var(--color-surface-strong)]/60">
              <tr>
                {columns.map((column) => (
                  <th
                    key={column.key}
                    scope="col"
                    className={cn(
                      "px-6 py-4 text-left text-xs font-semibold uppercase tracking-[0.18em] text-text-muted",
                      column.headerClassName,
                    )}
                  >
                    {column.header}
                  </th>
                ))}
                {getRowActions || onRowDetails ? <th scope="col" className="px-6 py-4" /> : null}
              </tr>
            </thead>
            <tbody>
              {filtered.map((item, index) => {
                const resolvedRowClassName = resolveClassName(rowClassName, item, index);
                const rowActions = getRowActions?.(item) ?? [];

                return (
                  <tr key={getRowKey(item, index)} className={cn("border-t border-border/60 align-top", resolvedRowClassName)}>
                    {columns.map((column) => (
                      <td key={column.key} className={cn("px-6 py-4 text-sm text-text", column.className)}>
                        {column.render(item, index)}
                      </td>
                    ))}
                    {getRowActions || onRowDetails ? (
                      <td className="px-6 py-4 text-right text-sm">
                        {/* Coluna de ações: só ícones, com tooltip (title) da descrição. */}
                        <div className="flex items-center justify-end gap-2">
                          {onRowDetails ? (
                            <button
                              type="button"
                              onClick={() => onRowDetails(item)}
                              title={resolved.details}
                              aria-label={resolved.details}
                              className="inline-flex size-9 items-center justify-center rounded-full border border-border text-primary transition hover:bg-[color:var(--color-surface-strong)]"
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
                                action.icon ? "size-9" : "px-3 py-1.5 text-xs font-semibold",
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
