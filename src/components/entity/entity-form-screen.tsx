"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { LucidePencil, LucideTrash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { DynamicForm } from "@/components/ui/dynamic-form";
import { ImageField } from "@/components/ui/image-field";
import { ImageGallery } from "@/components/ui/image-gallery";
import { ImageViewer } from "@/components/ui/image-viewer";
import { ScreenLayout } from "@/components/layout/screen-layout";
import { LoadErrorScreen } from "@/components/load-error-screen";
import { useLanguage } from "@/contexts/LanguageContext";
import type { ModuleRecord } from "@/core/contracts";
import { useEntity } from "@/core/entity-runtime";
import {
  buildFormFields,
  buildZodSchema,
  fieldLabel,
  fileFields,
  formValuesToRecord,
  loadRelationOptions,
  recordToFormValues,
} from "@/core/module-engine";
import { useOperationError } from "@/hooks/use-operation-error";
import { requestConfirm } from "@/lib/confirm";
import { toast } from "@/lib/toast";
import { providerDaEntidade } from "@/services/entidades";
import type { DynamicFormValues, DynamicSelectOption, FormValue } from "@/types/dynamic-form";
import type { FileItem } from "@/types/file-item";

export type EntityFormScreenProps = {
  /** Url da entidade no Entity Runtime (ex.: "persons"). */
  url: string;
  /** Rota da lista (ex.: "/portal/persons") — usada em voltar/cancelar/apos salvar. */
  basePath: string;
  /**
   * Rotulos da entidade — precisa de formCreate/formEdit/formView/confirmDelete/
   * cancel/save/close/edit/delete/empty. `dictionary.<entidade>` encaixa direto.
   */
  labels: Record<string, string>;
};

/** Valor de um campo de arquivo: `file` → um item; `files` → lista. */
type FileValue = FileItem | FileItem[] | null;

/**
 * Tela de FORMULARIO generica (view/edit/new) da base de entidade. O id vem por
 * `?id=` (rota estatica, compativel com `output: export`); ausencia = criar.
 * Dirigida por contrato via `useEntity` + `module-engine`, sem service por
 * entidade. Customizacao de UMA entidade vive no `page.tsx` da rota (ver docs/modulos-entidade.md).
 * Imagens tambem vem do contrato: campo `file` → foto, `files` → galeria.
 */
export function EntityFormScreen({ url, basePath, labels }: EntityFormScreenProps) {
  const router = useRouter();
  const { dictionary } = useLanguage();
  const search = useSearchParams();

  // O id vem por query param (?id=...) e nao por segmento de path: rota estatica,
  // compativel com `output: export` (mobile) — ver detail/new. Ausencia = criar.
  const id = search.get("id") ?? undefined;
  const isExisting = Boolean(id);

  // Entity Runtime: contrato (cobre deep-link / form sem passar pela lista) +
  // operacoes CRUD — sem service especifico da entidade. `actions` ja reflete a
  // autorizacao do usuario logado (via entity-policy no use-entity).
  // Rotas `/private` vêm de outra raiz, com token: provider injetado pelo service.
  const provider = useMemo(() => providerDaEntidade(url), [url]);
  const { schema, actions, error: loadError, invalidate, findById, create, update, remove } = useEntity({ url, list: false, provider });

  const { operationError, clearError, reportError } = useOperationError();
  const [retryCount, setRetryCount] = useState(0);

  const canCreate = actions?.create ?? false;
  const canEdit = actions?.edit ?? false;
  const canDelete = actions?.delete ?? false;

  const [values, setValues] = useState<DynamicFormValues>({});
  const [record, setRecord] = useState<ModuleRecord | null>(null);
  const [files, setFiles] = useState<Record<string, FileValue>>({});
  const [viewerFile, setViewerFile] = useState<FileItem | null>(null);
  const [mode, setMode] = useState<"read" | "write">(!isExisting || search.get("mode") === "edit" ? "write" : "read");
  const [errors, setErrors] = useState<Record<string, string | undefined>>({});
  const [isLoading, setIsLoading] = useState(isExisting);
  const [isSaving, setIsSaving] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [relationOptions, setRelationOptions] = useState<Record<string, DynamicSelectOption[]>>({});

  // Opcoes dos campos de relacionamento (carregadas da entidade alvo).
  useEffect(() => {
    if (!schema) {
      return;
    }
    let active = true;
    const relations = schema.fields.filter((field) => field.relationship);
    void Promise.all(
      relations.map(async (field) => [field.name, await loadRelationOptions(field.relationship!)] as const),
    ).then((entries) => {
      if (active) setRelationOptions(Object.fromEntries(entries));
    }).catch((error) => {
      if (active) reportError(error);
    });
    return () => {
      active = false;
    };
  }, [schema, retryCount, reportError]);

  const load = useCallback(async () => {
    if (!id) {
      return;
    }
    setIsLoading(true);
    setNotFound(false);
    clearError();
    try {
      const found = await findById(id);
      if (found) {
        setRecord(found);
      } else {
        setNotFound(true);
      }
    } catch (error) {
      reportError(error);
    } finally {
      setIsLoading(false);
    }
  }, [id, findById, clearError, reportError]);

  useEffect(() => {
    if (isExisting) {
      // Carregamento assincrono do registro (findById); os setState ocorrem apos o await.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      void load();
    }
  }, [isExisting, load]);

  // Campos de arquivo do contrato (`file` = foto, `files` = galeria), fora do DynamicForm.
  const fileFieldList = useMemo(() => (schema ? fileFields(schema) : []), [schema]);

  // Mapeia (registro carregado | defaults do schema) -> valores do formulario e
  // dos campos de arquivo.
  useEffect(() => {
    if (!schema) {
      return;
    }
    const source = isExisting ? record : null;
    /* eslint-disable react-hooks/set-state-in-effect */
    setValues(recordToFormValues(source, schema));
    setFiles(
      Object.fromEntries(
        fileFieldList.map((field) => [
          field.name,
          field.type === "files"
            ? ((source?.[field.name] as FileItem[] | undefined) ?? [])
            : ((source?.[field.name] as FileItem | null | undefined) ?? null),
        ]),
      ),
    );
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [schema, isExisting, record, fileFieldList]);

  const setFile = (name: string, value: FileValue) => setFiles((current) => ({ ...current, [name]: value }));

  // Visualizador de arquivo como nivel de navegacao: abrir empilha um estado no
  // historico; o botao voltar (ou o back do sistema) fecha o reader.
  const openViewer = useCallback((file: FileItem) => {
    setViewerFile(file);
    if (typeof window !== "undefined") {
      window.history.pushState({ __viewer: true }, "");
    }
  }, []);

  const closeViewer = useCallback(() => {
    if (typeof window !== "undefined" && (window.history.state as { __viewer?: boolean } | null)?.__viewer) {
      window.history.back();
      return;
    }
    setViewerFile(null);
  }, []);

  useEffect(() => {
    const onPop = () => setViewerFile(null);
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  // Autorizacao do formulario. Sem a permissao correspondente, o usuario nao
  // escreve: criar sem `create` volta para a lista; abrir edicao (deep-link
  // ?mode=edit) sem `update` cai para somente-visualizacao.
  useEffect(() => {
    if (!actions) {
      return;
    }
    if (!isExisting && !actions.create) {
      router.replace(basePath);
      return;
    }
    if (isExisting && mode === "write" && !actions.edit) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setMode("read");
    }
  }, [actions, isExisting, mode, router, basePath]);

  const zodSchema = useMemo(() => (schema ? buildZodSchema(schema) : null), [schema]);
  const formFields = useMemo(() => {
    if (!schema) {
      return [];
    }
    return buildFormFields(schema).map((field) =>
      relationOptions[field.key] ? { ...field, options: relationOptions[field.key] } : field,
    );
  }, [schema, relationOptions]);

  const title = !isExisting ? labels.formCreate : mode === "write" ? labels.formEdit : labels.formView;
  const isWrite = mode === "write";
  const ready = !isLoading && Boolean(schema) && !notFound;

  const onChange = (key: string, value: FormValue) => {
    setValues((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: undefined }));
  };

  const onSave = async () => {
    clearError();
    if (!zodSchema || !schema) {
      return;
    }
    // Defesa: nunca persiste sem a permissao (create para novo, update para edicao).
    if (isExisting ? !canEdit : !canCreate) {
      return;
    }
    const base = formValuesToRecord(values, schema);
    const parsed = zodSchema.safeParse(base);
    if (!parsed.success) {
      const nextErrors: Record<string, string | undefined> = {};
      for (const issue of parsed.error.issues) {
        const key = String(issue.path[0] ?? "");
        if (key && !nextErrors[key]) {
          nextErrors[key] = issue.message;
        }
      }
      setErrors(nextErrors);
      return;
    }

    setErrors({});
    setIsSaving(true);
    // Só os campos de arquivo editáveis que o contrato declara vão no corpo.
    const input = {
      ...base,
      ...Object.fromEntries(
        fileFieldList.filter((field) => !field.readOnly).map((field) => [field.name, files[field.name] ?? null]),
      ),
    };
    try {
      if (isExisting && id) {
        await update(id, input);
        setRecord({ ...(record ?? {}), ...input });
        setMode("read");
      } else {
        await create(input);
        router.push(basePath);
      }
      toast.success(labels.saved ?? dictionary.common.saved);
    } catch (error) {
      reportError(error);
    } finally {
      setIsSaving(false);
    }
  };

  const onCancel = () => {
    if (isExisting) {
      setErrors({});
      setMode("read");
      void load();
      return;
    }
    router.push(basePath);
  };

  const onDelete = async () => {
    if (!id || !(await requestConfirm({ message: labels.confirmDelete, confirmLabel: labels.delete, cancelLabel: labels.cancel, destructive: true }))) {
      return;
    }
    clearError();
    try {
      await remove(id);
      router.push(basePath);
      toast.success(labels.deleted ?? dictionary.common.deleted);
    } catch (error) {
      reportError(error);
    }
  };

  // Excluir demanda atencao: capturado pela regiao de TOPO (header mobile /
  // topo do MainContent no web), longe do polegar, evitando toque acidental.
  const deleteButton =
    ready && mode === "read" && isExisting && canDelete ? (
      <Button
        type="destructive"
        variant="ghost"
        size="sm"
        style={{ color: "var(--color-danger)", borderRadius: "9999px" }}
        onClick={() => void onDelete()}
      >
        <LucideTrash2 className="size-4" />
        {labels.delete}
      </Button>
    ) : null;

  // Acoes rotineiras capturadas pelas regioes tipadas: OPERACOES (salvar,
  // editar) em `action` — segunda barra no mobile / rodape do MainContent no
  // web; a SAIDA (fechar, cancelar) e navegacao, `back` — celula da navbar no
  // mobile. A ordem no JSX define a ordem na barra: secundaria antes da primaria.
  const actionButtons = ready ? (
    isWrite ? (
      <>
        <Button type="back" variant="outline" disabled={isSaving} onClick={onCancel}>
          {labels.cancel}
        </Button>
        <Button type="action" variant="success" loading={isSaving} disabled={isSaving} onClick={() => void onSave()}>
          {labels.save}
        </Button>
      </>
    ) : (
      <>
        <Button type="back" variant="outline" onClick={() => router.push(basePath)}>
          {labels.close}
        </Button>
        {canEdit ? (
          <Button type="action" variant="warning" onClick={() => setMode("write")}>
            <LucidePencil className="size-4" />
            {labels.edit}
          </Button>
        ) : null}
      </>
    )
  ) : null;

  // Sem contrato não há formulário: a falha de carga vira a tela de status (padrão 400/500).
  if (!schema && loadError) {
    return (
      <LoadErrorScreen
        error={loadError}
        onRetry={() => {
          invalidate();
          setRetryCount((count) => count + 1);
          void load();
        }}
      />
    );
  }

  return (
    <ScreenLayout title={title} onBack={() => router.push(basePath)} backLabel={labels.cancel}>
      {loadError || operationError ? (
        <div role="alert" className="px-4 py-3 text-danger">
          <p>{operationError ?? loadError?.message}</p>
          <button type="button" className="underline" onClick={() => {
            clearError();
            if (!schema) invalidate();
            setRetryCount((count) => count + 1);
            void load();
          }}>Tentar novamente</button>
        </div>
      ) : null}
      {deleteButton}
      {actionButtons}
      <section className="mx-auto grid w-full max-w-2xl gap-5 px-4 py-6 desktop:lg:max-w-4xl wide:max-w-4xl">
        {!ready ? (
          <p className="py-8 text-center text-sm text-text-muted">{notFound ? labels.empty : loadError || operationError ? null : "…"}</p>
        ) : (
          <>
            {/* Foto(s) antes dos campos; galeria(s) depois — na ordem do contrato. */}
            {fileFieldList
              .filter((field) => field.type === "file")
              .map((field) => (
                <ImageField
                  key={field.name}
                  label={fieldLabel(field)}
                  value={(files[field.name] as FileItem | null | undefined) ?? null}
                  editable={isWrite && !field.readOnly}
                  onChange={(value) => setFile(field.name, value)}
                  onView={openViewer}
                />
              ))}
            <DynamicForm fields={formFields} values={values} mode={mode} errors={errors} onChange={onChange} columns="adaptive" />
            {fileFieldList
              .filter((field) => field.type === "files")
              .map((field) => (
                <ImageGallery
                  key={field.name}
                  label={fieldLabel(field)}
                  items={(files[field.name] as FileItem[] | undefined) ?? []}
                  editable={isWrite && !field.readOnly}
                  onChange={(value) => setFile(field.name, value)}
                  onView={openViewer}
                />
              ))}
          </>
        )}
      </section>

      <ImageViewer file={viewerFile} onClose={closeViewer} closeLabel={labels.close} />
    </ScreenLayout>
  );
}
