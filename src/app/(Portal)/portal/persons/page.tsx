"use client";

import { useCallback, useMemo, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import {
  LucideActivity,
  LucideArchive,
  LucideArchiveRestore,
  LucideBan,
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

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  GenericTable,
  type GenericTableLabels,
  type ListFilterConfig,
  type RowAction,
} from "@/components/ui/generic-table";
import type { ModuleRecord } from "@/core/contracts";
import { useEntity } from "@/core/entity-runtime";
import {
  buildCsv,
  buildFilterFields,
  buildPredicate,
  buildRowStatus,
  buildTableColumns,
  downloadCsv,
  getRecordId,
} from "@/core/module-engine";
import { useAuth } from "@/contexts/AuthContext";
import { useDevice } from "@/contexts/DeviceContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { PERSON_ACTIONS } from "@/lib/actions/registry";
import { resolveAvailableActions } from "@/lib/actions/resolve-actions";
import { EMPTY_LIST_QUERY, type ListQuery } from "@/types/list-query";

const ENTITY_URL = "persons";

// Icones por id de acao (todo o catalogo, inclusive as de estado/fluxo).
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

export default function PersonsListPage() {
  const router = useRouter();
  const { dictionary } = useLanguage();
  const { user } = useAuth();
  const { view } = useDevice();
  const isMobile = view === "mobile";
  const t = dictionary.persons;
  const actionLabel = useCallback((key: string) => (t as Record<string, string>)[key] ?? key, [t]);

  const [query, setQuery] = useState<ListQuery>(EMPTY_LIST_QUERY);
  // Contrato (schema/ui/permissions) + dados vem do Entity Runtime e dirigem a
  // tabela, filtros e acoes — sem service especifico de Pessoa.
  const { items, schema, ui, actions, loading, remove, create, update, refresh } = useEntity({ url: ENTITY_URL, query });

  const columns = useMemo(() => (schema && ui ? buildTableColumns(ui, schema) : []), [schema, ui]);
  const getRowStatus = useMemo(() => (schema ? buildRowStatus(schema) : undefined), [schema]);

  const tableLabels = useMemo<Partial<GenericTableLabels>>(() => {
    const table = dictionary.table;
    return {
      filters: table.filters,
      filtersActive: table.filtersActive,
      tapToFilter: table.tapToFilter,
      add: table.add,
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
  }, [dictionary.table]);

  const filter = useMemo<ListFilterConfig<ModuleRecord> | undefined>(() => {
    if (!schema || !ui) {
      return undefined;
    }
    return {
      enabled: true,
      dateOf: (record) => Number(record.createdAt ?? 0),
      fields: buildFilterFields(ui, schema),
      predicate: buildPredicate(schema, ui),
    };
  }, [schema, ui]);

  // Handlers REAIS por id. Acoes sem handler (estado/fluxo, sem backend nesta
  // base) caem no placeholder honesto `demo`. A DISPONIBILIDADE de cada acao,
  // porem, e decidida so por `resolveAvailableActions(registry, user)`.
  const handlers = useMemo<Record<string, (record: ModuleRecord) => void>>(() => {
    if (!schema) {
      return {};
    }
    const map: Record<string, (record: ModuleRecord) => void> = {
      edit: (record) => router.push(`/portal/persons/detail?id=${getRecordId(record, schema)}&mode=edit`),
      "copy-id": (record) => void navigator.clipboard?.writeText(getRecordId(record, schema)),
      share: (record) => {
        const url = `${window.location.origin}/portal/persons/detail?id=${getRecordId(record, schema)}`;
        if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
          void navigator.share({ title: t.title, url }).catch(() => undefined);
        } else {
          void navigator.clipboard?.writeText(url);
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
          window.location.href = `mailto:${email}?subject=${encodeURIComponent(String(record.name ?? t.title))}`;
        }
      },
      duplicate: (record) => {
        const copy = { ...record };
        delete copy[schema.primaryKey];
        delete copy.createdAt;
        delete copy.updatedAt;
        void create(copy).then(() => refresh());
      },
      "clone-deep": (record) => {
        const copy = { ...record };
        delete copy[schema.primaryKey];
        delete copy.createdAt;
        delete copy.updatedAt;
        void create(copy).then(() => refresh());
      },
      "create-related": () => router.push("/portal/persons/new"),
      activate: (record) => void update(getRecordId(record, schema), { active: true }).then(() => refresh()),
      deactivate: (record) => void update(getRecordId(record, schema), { active: false }).then(() => refresh()),
      audit: (record) => router.push(`/portal/audit?entity=${ENTITY_URL}&record=${getRecordId(record, schema)}`),
      "export-row": (record) => {
        if (!ui) {
          return;
        }
        void downloadCsv(`pessoa-${getRecordId(record, schema)}.csv`, buildCsv([record], ui, schema));
      },
      delete: (record) => {
        if (typeof window !== "undefined" && window.confirm(t.confirmDelete)) {
          void remove(getRecordId(record, schema));
        }
      },
    };
    return map;
  }, [schema, ui, router, create, update, remove, refresh, t]);

  const getRowActions = useCallback((): RowAction<ModuleRecord>[] => {
    if (!schema) {
      return [];
    }

    // UNICO filtro: as acoes que o usuario logado tem permissao de ver. O
    // catalogo (PERSON_ACTIONS) permanece intacto; aqui so decidimos exibicao.
    const available = resolveAvailableActions(PERSON_ACTIONS, user);

    // Placeholder para acoes de estado/fluxo sem backend nesta base.
    const demo = (label: string) => () => {
      if (typeof window !== "undefined") {
        window.alert(`${label} — ${t.demoAction}`);
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
  }, [schema, user, handlers, actionLabel, t]);

  const onExport = useMemo(() => {
    if (!actions?.export || !schema || !ui) {
      return undefined;
    }
    return () => void downloadCsv(`pessoas-${Date.now()}.csv`, buildCsv(items, ui, schema));
  }, [actions, items, schema, ui]);

  const table = schema ? (
    <GenericTable<ModuleRecord>
      data={items}
      columns={columns}
      getRowKey={(record) => getRecordId(record, schema)}
      emptyMessage={loading ? "…" : t.empty}
      labels={tableLabels}
      filter={filter}
      getRowStatus={getRowStatus}
      getRowActions={getRowActions}
      onRowDetails={(record) => router.push(`/portal/persons/detail?id=${getRecordId(record, schema)}`)}
      onCreate={actions?.create ? () => router.push("/portal/persons/new") : undefined}
      onExport={onExport}
      onQueryChange={setQuery}
    />
  ) : (
    <p className="py-8 text-center text-sm text-text-muted">…</p>
  );

  return (
    <section className={isMobile ? "grid gap-4 px-4 py-4" : "grid gap-6 py-8"}>
      {isMobile ? (
        <>{table}</>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-3xl">{t.title}</CardTitle>
            <CardDescription>{t.subtitle}</CardDescription>
          </CardHeader>
          <CardContent>{table}</CardContent>
        </Card>
      )}
    </section>
  );
}
