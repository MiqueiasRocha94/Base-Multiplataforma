"use client";

import { useCallback, useMemo, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import {
  LucideActivity,
  LucideArchive,
  LucideArchiveRestore,
  LucideBan,
  LucideChevronLeft,
  LucideChevronRight,
  LucideCircleCheck,
  LucideClipboard,
  LucideCopy,
  LucideCopyPlus,
  LucideFileDown,
  LucideFilePlus,
  LucideFileSpreadsheet,
  LucideFileText,
  LucideFolderOpen,
  LucideHistory,
  LucideLink,
  LucideLock,
  LucideLockOpen,
  LucideMail,
  LucideMessageSquarePlus,
  LucidePaperclip,
  LucidePencil,
  LucidePlus,
  LucidePower,
  LucidePrinter,
  LucideRotateCcw,
  LucideShare2,
  LucideStar,
  LucideThumbsDown,
  LucideThumbsUp,
  LucideTrash2,
  LucideUnlink,
  LucideUserCog,
} from "lucide-react";

import { LoadErrorScreen } from "@/components/load-error-screen";
import { ScreenFooter } from "@/components/layout/screen-footer";
import { ScreenZones } from "@/components/layout/screen-zones";
import { Button } from "@/components/ui/button";
import type { FilterValues } from "@/components/ui/filter-modal";
import {
  GenericTable,
  type GenericTableLabels,
  type ListFilterConfig,
  type RowAction,
} from "@/components/ui/generic-table";
import { SelectOne } from "@/components/ui/select-one";
import type { ModuleRecord } from "@/core/contracts";
import { useEntity } from "@/core/entity-runtime";
import {
  buildCsv,
  buildDateOf,
  buildFilterFields,
  buildPredicate,
  buildQueryFilters,
  buildRowStatus,
  buildTableColumns,
  downloadCsv,
  fieldLabel,
  getRecordId,
} from "@/core/module-engine";
import { useBaixarArquivo } from "@/hooks/use-baixar-arquivo";
import { useOperationError } from "@/hooks/use-operation-error";
import { useAuth } from "@/contexts/AuthContext";
import { useDevice } from "@/contexts/DeviceContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { resolveAvailableActions } from "@/lib/actions/resolve-actions";
import type { ActionDef } from "@/lib/actions/types";
import { requestConfirm } from "@/lib/confirm";
import { toast } from "@/lib/toast";
import { cn } from "@/lib/utils";
import { providerDaEntidade } from "@/services/entidades";
import type { ArquivoBaixado } from "@/types/api";
import { EMPTY_LIST_QUERY, type ListQuery, type ListSort } from "@/types/list-query";

// Icones por id de acao (todo o catalogo, inclusive as de estado/fluxo). O
// vocabulario de ids e compartilhado por qualquer entidade, entao o mapa mora na
// base — cada entidade so decide QUAIS acoes registra (actionsCatalog).
const ACTION_ICONS: Record<string, ReactNode> = {
  edit: <LucidePencil className="size-4" />,
  "copy-id": <LucideClipboard className="size-4" />,
  share: <LucideShare2 className="size-4" />,
  print: <LucidePrinter className="size-4" />,
  "export-pdf": <LucideFileText className="size-4" />,
  "send-email": <LucideMail className="size-4" />,
  duplicate: <LucideCopy className="size-4" />,
  "clone-deep": <LucideCopyPlus className="size-4" />,
  "create-related": <LucideFilePlus className="size-4" />,
  activate: <LucideCircleCheck className="size-4" />,
  deactivate: <LucidePower className="size-4" />,
  audit: <LucideHistory className="size-4" />,
  "export-row": <LucideFileDown className="size-4" />,
  favorite: <LucideStar className="size-4" />,
  archive: <LucideArchive className="size-4" />,
  restore: <LucideArchiveRestore className="size-4" />,
  block: <LucideLock className="size-4" />,
  unblock: <LucideLockOpen className="size-4" />,
  approve: <LucideThumbsUp className="size-4" />,
  reject: <LucideThumbsDown className="size-4" />,
  cancel: <LucideBan className="size-4" />,
  reopen: <LucideRotateCcw className="size-4" />,
  "change-status": <LucideActivity className="size-4" />,
  "change-owner": <LucideUserCog className="size-4" />,
  link: <LucideLink className="size-4" />,
  unlink: <LucideUnlink className="size-4" />,
  attach: <LucidePaperclip className="size-4" />,
  "manage-attachments": <LucideFolderOpen className="size-4" />,
  comment: <LucideMessageSquarePlus className="size-4" />,
  report: <LucideFileSpreadsheet className="size-4" />,
  delete: <LucideTrash2 className="size-4" />,
};

/** Tamanhos de página do desktop (paginação no rodapé), até 500. */
const PAGE_SIZES = [10, 20, 30, 50, 100, 250, 500];

/**
 * Opções de "Por página" pelo total: cada tamanho aparece enquanto o anterior
 * ainda não cobre o total (19 → 10, 20; 120 → 10…250). O escolhido sempre fica.
 */
function pageSizeOptions(total: number, current: number): number[] {
  const options = PAGE_SIZES.filter((size, index) => index === 0 || PAGE_SIZES[index - 1] < total);
  return options.includes(current) ? options : [...options, current].sort((a, b) => a - b);
}
/** Tamanho do GET inicial: decide se a lista veio inteira (filtro local) ou não (filtro na API). */
const INITIAL_SIZE = 10;

export type EntityListScreenProps = {
  /** Url da entidade no Entity Runtime (ex.: "persons", "/private/pedidos"). */
  url: string;
  /** Base das rotas da entidade (ex.: "/portal/persons") para detail/new/edit. */
  basePath: string;
  /** Rota da criação quando fica fora da lista (ex.: em outro módulo). Default: `${basePath}/new`. */
  createPath?: string;
  /** Catalogo de acoes (RBAC aplicado so na EXIBICAO via resolveAvailableActions). */
  actionsCatalog: ActionDef[];
  /**
   * Rotulos da entidade — precisa de title/subtitle/empty/confirmDelete/demoAction
   * e um rotulo por `labelKey` de acao; `create` (opcional) troca o "Adicionar".
   * `dictionary.<entidade>` encaixa direto.
   */
  labels: Record<string, string>;
  /** Nome do CSV de uma linha. Default: `${url}-${id}.csv`. */
  csvRowName?: (id: string) => string;
  /** Nome do CSV da lista. Default: `${url}-${Date.now()}.csv`. */
  csvListName?: () => string;
  /** Handlers de acoes de linha proprias da entidade (id do catalogo → acao). */
  rowHandlers?: Record<string, (record: ModuleRecord) => void>;
  /** Acoes de linha que baixam um documento gerado no backend (PDF/CSV). */
  rowDownloads?: Record<string, (record: ModuleRecord) => Promise<ArquivoBaixado>>;
  /**
   * Exportacao da lista gerada no BACKEND; sem ela, CSV local do `module-engine`.
   * Recebe os filtros aplicados, ja no formato da API (enum → codigo), e as
   * colunas adicionais exibidas (`addColumn`), que entram depois das fixas.
   */
  exportFile?: (filters: Record<string, string>, addColumns: string[]) => Promise<ArquivoBaixado>;
};

/**
 * Tela de LISTA generica (base de entidade). Dirigida por contrato via
 * `useEntity` + `module-engine` — sem service por entidade. O `page.tsx` da rota
 * so injeta `url`, `basePath`, o catalogo de acoes, os rotulos e, quando a
 * entidade tem, handlers/documentos proprios (ver docs/modulos-entidade.md).
 *
 * Colunas, filtros e acoes vem do CONTRATO (o backend decide). Regra da lista:
 * o GET inicial pede 10; se trouxe tudo, filtro e ordenacao sao locais; senao,
 * cada filtro/ordenacao/pagina e um novo GET com os parametros. Desktop: colunas
 * com ordenacao composta e paginacao no rodape (Voltar · paginacao · acoes).
 */
export function EntityListScreen({
  url,
  basePath,
  createPath,
  actionsCatalog,
  labels,
  csvRowName,
  csvListName,
  rowHandlers,
  rowDownloads,
  exportFile,
}: EntityListScreenProps) {
  const router = useRouter();
  const { dictionary } = useLanguage();
  const { user } = useAuth();
  const { view } = useDevice();
  const isMobile = view === "mobile";
  const actionLabel = useCallback((key: string) => labels[key] ?? key, [labels]);
  const rowCsvName = useCallback((id: string) => csvRowName?.(id) ?? `${url}-${id}.csv`, [csvRowName, url]);
  const listCsvName = useCallback(() => csvListName?.() ?? `${url}-${Date.now()}.csv`, [csvListName, url]);
  // Rotas `/private` vêm de outra raiz, com token: provider injetado pelo service.
  const provider = useMemo(() => providerDaEntidade(url), [url]);
  const newPath = createPath ?? `${basePath}/new`;

  const { operationError, clearError, reportError } = useOperationError();
  const runOperation = useCallback(async (operation: () => Promise<unknown>) => {
    clearError();
    try { await operation(); } catch (error) { reportError(error); }
  }, [clearError, reportError]);
  const { baixando, erro: downloadError, baixar } = useBaixarArquivo();

  const createLabel = labels.create;
  const tableLabels = useMemo<Partial<GenericTableLabels>>(() => {
    const table = dictionary.table;
    return {
      filters: table.filters,
      filtersActive: table.filtersActive,
      columns: table.columns,
      showAllColumns: table.showAllColumns,
      resetColumns: table.resetColumns,
      moveColumnUp: table.moveColumnUp,
      moveColumnDown: table.moveColumnDown,
      tapToFilter: table.tapToFilter,
      // Rótulo próprio da criação na entidade (ex.: "Solicitar"); sem ele, "Adicionar".
      add: createLabel ?? table.add,
      export: table.export,
      details: table.details,
      actions: table.actions,
      close: table.close,
      limit: table.limit,
      skip: table.skip,
      date: table.date,
      all: table.all,
      last7: table.last7,
      last15: table.last15,
      last30: table.last30,
      custom: table.custom,
      modal: {
        title: table.filtersTitle,
        close: table.close,
        clear: table.clear,
        apply: table.apply,
        all: table.all,
        customFrom: table.customFrom,
        customTo: table.customTo,
      },
    };
  }, [dictionary.table, createLabel]);

  // ---- consulta: filtros/ordenacao aplicados e paginacao --------------------
  // O GET inicial (sem filtro) decide o modo; os valores aplicados chegam do
  // GenericTable. `apiFilters` = valores ja convertidos para a API (enum → codigo).
  const [initial, setInitial] = useState<{ count: number; total: number } | null>(null);
  const [applied, setApplied] = useState<{ values: FilterValues; apiFilters: Record<string, string> }>({ values: {}, apiFilters: {} });
  const [basics, setBasics] = useState<ListQuery>(EMPTY_LIST_QUERY);
  const [sort, setSort] = useState<ListSort>([]);
  // Colunas adicionais exibidas pelo usuário: a API só devolve o campo sob pedido.
  const [addColumns, setAddColumns] = useState<string[]>([]);
  const [size, setSize] = useState(String(PAGE_SIZES[0]));
  // Contrato com filtros obrigatorios (`ui.requiredFilters`): a lista e sempre da API.
  const [requiresFilters, setRequiresFilters] = useState(false);
  // Lista inicial veio inteira → filtro/ordenacao locais (sem API).
  const serverMode = requiresFilters || (initial != null && initial.count < initial.total);

  // Desktop: a pagina pertence ao tamanho e ao filtro — trocar qualquer um volta a primeira.
  const pagingKey = JSON.stringify([size, view, serverMode ? [applied.values, basics, sort] : null]);
  const [paging, setPaging] = useState({ key: pagingKey, page: 0 });
  const page = paging.key === pagingKey ? paging.page : 0;
  const goTo = (next: number) => setPaging({ key: pagingKey, page: next });

  // Mobile: Limite → tamanho ("Todos" = total), Pular → deslocamento. Desktop: o seletor e a pagina.
  const mobileLimit = Number.parseInt(applied.values.__limit ?? "", 10);
  const limit = !isMobile
    ? Number(size)
    : !serverMode
      ? INITIAL_SIZE
      : mobileLimit > 0
        ? mobileLimit
        : applied.values.__limit === tableLabels.all
          ? Math.max(initial?.total ?? 0, 1)
          : INITIAL_SIZE;
  // Texto: valores iguais (ex.: re-emissao do filtro) nao refazem o GET.
  const queryKey = JSON.stringify({
    limit,
    offset: !isMobile ? page * limit : serverMode ? basics.offset : 0,
    dateFrom: serverMode ? basics.dateFrom : null,
    dateTo: serverMode ? basics.dateTo : null,
    ...(serverMode ? { filters: applied.apiFilters, sort } : {}),
    // Nos dois modos: a lista local também precisa do campo para mostrar a coluna.
    ...(addColumns.length > 0 ? { addColumns } : {}),
  } satisfies ListQuery);
  const query = useMemo<ListQuery>(() => JSON.parse(queryKey), [queryKey]);

  // Contrato (schema/ui/permissions) + dados vem do Entity Runtime e dirigem a
  // tabela, filtros e acoes — sem service especifico da entidade.
  const { items, schema, ui, actions, pagination, missingFilters, loading, error: loadError, remove, create, update, refresh } = useEntity({
    url,
    query,
    provider,
  });

  const total = pagination?.total ?? 0;
  const sizeOptions = useMemo(
    () => pageSizeOptions(total, limit).map((option) => ({ id: String(option), label: String(option) })),
    [total, limit],
  );

  // 1ª resposta = lista inicial (padrao "estado anterior" do React, sem efeito).
  if (initial == null && pagination != null && !loading) {
    setInitial({ count: items.length, total: pagination.total });
  }
  if (!requiresFilters && (ui?.requiredFilters?.length ?? 0) > 0) {
    setRequiresFilters(true);
  }
  // Sem os filtros obrigatorios nao ha GET: a lista pede que o usuario os informe.
  const missingMessage = useMemo(() => {
    if (!schema || missingFilters.length === 0) {
      return null;
    }
    const names = missingFilters.map((name) => {
      const field = schema.fields.find((item) => item.name === name);
      return field ? fieldLabel(field) : name;
    });
    return `Informe ${names.join(" e ")} nos filtros para consultar.`;
  }, [schema, missingFilters]);

  const onFilterChange = useCallback(
    (values: FilterValues) => setApplied({ values, apiFilters: schema && ui ? buildQueryFilters(values, schema, ui) : {} }),
    [schema, ui],
  );

  // Ordenacao pela API: so as colunas que o contrato declara aceitas (`ui.sortable`).
  const columns = useMemo(
    () => (schema && ui ? buildTableColumns(ui, schema, { serverSort: serverMode }) : []),
    [schema, ui, serverMode],
  );
  const getRowStatus = useMemo(() => (schema ? buildRowStatus(schema) : undefined), [schema]);
  const onVisibleColumnsChange = useCallback(
    (keys: string[]) =>
      setAddColumns(columns.filter((column) => column.additional && keys.includes(column.key)).map((column) => column.key)),
    [columns],
  );

  const filter = useMemo<ListFilterConfig<ModuleRecord> | undefined>(() => {
    if (!schema || !ui) {
      return undefined;
    }
    const localPredicate = buildPredicate(schema, ui);
    return {
      enabled: true,
      // Desktop pagina pelo rodape: dos basicos, so a Data.
      basic: isMobile ? true : "date",
      dateOf: buildDateOf(schema),
      fields: buildFilterFields(ui, schema),
      // Modo servidor: a API ja filtrou — o predicado deixa passar o que ela devolveu.
      predicate: serverMode ? () => true : localPredicate,
    };
  }, [schema, ui, isMobile, serverMode]);

  // Handlers REAIS por id. Acoes sem handler (estado/fluxo, sem backend nesta
  // base) caem no placeholder honesto `demo`. A DISPONIBILIDADE de cada acao,
  // porem, e decidida so por `resolveAvailableActions(actionsCatalog, user)` e,
  // por linha, pela flag que o backend envia (`recordFlag`).
  const handlers = useMemo<Record<string, (record: ModuleRecord) => void>>(() => {
    if (!schema) {
      return {};
    }
    const map: Record<string, (record: ModuleRecord) => void> = {
      edit: (record) => router.push(`${basePath}/detail?id=${getRecordId(record, schema)}&mode=edit`),
      "copy-id": (record) => void navigator.clipboard?.writeText(getRecordId(record, schema)),
      share: (record) => {
        const shareUrl = `${window.location.origin}${basePath}/detail?id=${getRecordId(record, schema)}`;
        if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
          void navigator.share({ title: labels.title, url: shareUrl }).catch(() => undefined);
        } else {
          void navigator.clipboard?.writeText(shareUrl);
        }
      },
      print: () => {
        if (typeof window !== "undefined") {
          window.print();
        }
      },
      // Sem lib de PDF na base: usa o "imprimir -> salvar como PDF" do navegador.
      "export-pdf": () => {
        if (typeof window !== "undefined") {
          window.print();
        }
      },
      "send-email": (record) => {
        const email = String(record.email ?? "");
        if (typeof window !== "undefined") {
          window.location.href = `mailto:${email}?subject=${encodeURIComponent(String(record.name ?? labels.title))}`;
        }
      },
      duplicate: (record) => {
        const copy = { ...record };
        delete copy[schema.primaryKey];
        delete copy.createdAt;
        delete copy.updatedAt;
        void runOperation(async () => { await create(copy); await refresh(); });
      },
      "clone-deep": (record) => {
        const copy = { ...record };
        delete copy[schema.primaryKey];
        delete copy.createdAt;
        delete copy.updatedAt;
        void runOperation(async () => { await create(copy); await refresh(); });
      },
      "create-related": () => router.push(newPath),
      activate: (record) => void runOperation(async () => { await update(getRecordId(record, schema), { active: true }); await refresh(); }),
      deactivate: (record) => void runOperation(async () => { await update(getRecordId(record, schema), { active: false }); await refresh(); }),
      audit: (record) => router.push(`/portal/audit?entity=${url}&record=${getRecordId(record, schema)}`),
      "export-row": (record) => {
        if (!ui) {
          return;
        }
        void downloadCsv(rowCsvName(getRecordId(record, schema)), buildCsv([record], ui, schema));
      },
      delete: (record) => {
        void requestConfirm({ message: labels.confirmDelete, confirmLabel: labels.delete, cancelLabel: labels.cancel, destructive: true }).then(
          (confirmed) => {
            if (confirmed) {
              void runOperation(async () => {
                await remove(getRecordId(record, schema));
                toast.success(labels.deleted ?? dictionary.common.deleted);
              });
            }
          },
        );
      },
    };
    // Proprios da entidade (injetados pelo page.tsx): acoes e documentos do backend.
    for (const [id, fetchFile] of Object.entries(rowDownloads ?? {})) {
      map[id] = (record) => void baixar(`${id}-${getRecordId(record, schema)}`, () => fetchFile(record));
    }
    return { ...map, ...rowHandlers };
  }, [schema, ui, router, create, update, remove, refresh, labels, basePath, newPath, url, rowCsvName, runOperation, rowHandlers, rowDownloads, baixar, dictionary]);

  const getRowActions = useCallback((record: ModuleRecord): RowAction<ModuleRecord>[] => {
    if (!schema) {
      return [];
    }

    // UNICO filtro de perfil: as acoes que o usuario logado pode ver. Por linha,
    // so a flag do backend (`recordFlag`) — o front nao deduz a regra.
    const available = resolveAvailableActions(actionsCatalog, user).filter(
      (action) => !action.recordFlag || record[action.recordFlag] === true,
    );

    // Placeholder para acoes de estado/fluxo sem backend nesta base.
    const demo = (label: string) => () => {
      if (typeof window !== "undefined") {
        window.alert(`${label} — ${labels.demoAction}`);
      }
    };

    return available.map((action) => {
      const label = actionLabel(action.labelKey);
      const onSelect = handlers[action.id] ?? demo(label);
      return {
        id: action.id,
        label,
        icon: ACTION_ICONS[action.id],
        destructive: action.id === "delete",
        onSelect,
      };
    });
  }, [schema, user, handlers, actionLabel, labels, actionsCatalog]);

  const onExport = useMemo(() => {
    // Sem os filtros obrigatorios nao ha lista — nem o que exportar (a API daria 400).
    if (!actions?.export || !schema || !ui || missingFilters.length > 0) {
      return undefined;
    }
    // PDF/CSV e do backend quando a entidade o oferece; senao, CSV local do contrato.
    if (exportFile) {
      return () => void baixar("export", () => exportFile(applied.apiFilters, addColumns));
    }
    return () => void downloadCsv(listCsvName(), buildCsv(items, ui, schema));
  }, [actions, items, schema, ui, listCsvName, exportFile, baixar, applied.apiFilters, addColumns, missingFilters]);
  const onCreate = actions?.create ? () => router.push(newPath) : undefined;

  const goBack = () => {
    if (window.history.length > 1) router.back();
    else router.push("/portal/home");
  };

  const table = schema ? (
    <GenericTable<ModuleRecord>
      data={items}
      columns={columns}
      getRowKey={(record) => getRecordId(record, schema)}
      emptyMessage={loading ? "…" : (missingMessage ?? labels.empty)}
      labels={tableLabels}
      filter={filter}
      getRowStatus={getRowStatus}
      getRowActions={getRowActions}
      onRowDetails={(record) => router.push(`${basePath}/detail?id=${getRecordId(record, schema)}`)}
      // Mobile: FABs; desktop: botoes `type="action"` no rodape.
      onCreate={isMobile ? onCreate : undefined}
      onExport={isMobile && baixando == null ? onExport : undefined}
      // Sempre: a exportacao do backend leva os filtros aplicados, mesmo com a lista local.
      onFilterChange={onFilterChange}
      // Lista inicial incompleta → modo servidor (filtros, basicos e ordenacao vao a API).
      onQueryChange={serverMode ? setBasics : undefined}
      onSortChange={serverMode ? setSort : undefined}
      onVisibleColumnsChange={onVisibleColumnsChange}
    />
  ) : (
    <p className="py-8 text-center text-sm text-text-muted">{loadError ? null : "…"}</p>
  );

  const errorMessage = operationError ?? downloadError ?? loadError?.message;
  const errorBlock = errorMessage ? (
    <div role="alert" className="text-danger">
      <p>{errorMessage}</p>
      {loadError || operationError ? (
        <button type="button" className="underline" disabled={loading} onClick={() => void runOperation(refresh)}>Tentar novamente</button>
      ) : null}
    </div>
  ) : null;

  // Sem contrato não há tela: a falha de carga vira a tela de status (padrão 400/500).
  if (!schema && loadError) {
    return <LoadErrorScreen error={loadError} onRetry={() => void refresh()} />;
  }

  // Mobile: zonas de ergonomia — avisos na LEITURA, cards no ALCANCE do polegar.
  if (isMobile) {
    return (
      // Sem recuo lateral próprio: o respiro do MainContent (mobile px-2 / wide
      // px-4) basta — cards aproveitam a largura.
      <ScreenZones className="py-1" top={errorBlock ?? undefined}>
        {table}
      </ScreenZones>
    );
  }

  const pages = Math.max(1, Math.ceil(total / limit));

  return (
    // Sem card/titulo proprios: o breadcrumb do MainContent ja nomeia a tela.
    <section className="grid gap-4">
      {errorBlock}
      {/* Montada durante os GETs: a tabela preserva filtro e ordenacao aplicados. */}
      <div aria-busy={loading} className={cn("transition-opacity", loading && "pointer-events-none opacity-60")}>
        {table}
      </div>

      {/* Rodape do MainContent: Voltar · total e paginacao · acoes. */}
      <ScreenFooter>
        <span className="mr-2 whitespace-nowrap">Total de registros: {total}</span>
        <span className="whitespace-nowrap text-xs">Por página</span>
        <div className="w-20">
          <SelectOne
            value={size}
            options={sizeOptions}
            onChange={setSize}
            title="Registros por página"
            ariaLabel="Registros por página"
          />
        </div>
        <Button variant="outline" size="icon" aria-label="Página anterior" disabled={loading || page === 0} onClick={() => goTo(page - 1)}>
          <LucideChevronLeft className="size-4" />
        </Button>
        <span className="min-w-16 whitespace-nowrap text-center text-xs">{`${Math.min(page + 1, pages)} de ${pages}`}</span>
        <Button variant="outline" size="icon" aria-label="Próxima página" disabled={loading || page + 1 >= pages} onClick={() => goTo(page + 1)}>
          <LucideChevronRight className="size-4" />
        </Button>
      </ScreenFooter>

      <Button type="back" variant="outline" onClick={goBack}>
        Voltar
      </Button>
      {onCreate ? (
        <Button type="action" onClick={onCreate}>
          <LucidePlus aria-hidden="true" className="size-4" />
          {tableLabels.add}
        </Button>
      ) : null}
      {onExport ? (
        <Button type="action" variant="outline" loading={baixando === "export"} disabled={baixando != null} onClick={onExport}>
          <LucideFileSpreadsheet aria-hidden="true" className="size-4" />
          {tableLabels.export}
        </Button>
      ) : null}
    </section>
  );
}
