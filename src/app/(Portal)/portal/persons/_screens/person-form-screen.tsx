"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { LucideArrowLeft, LucidePencil, LucideTrash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { DynamicForm } from "@/components/ui/dynamic-form";
import { ImageField } from "@/components/ui/image-field";
import { ImageGallery } from "@/components/ui/image-gallery";
import { ImageViewer } from "@/components/ui/image-viewer";
import { ScreenLayout } from "@/components/layout/screen-layout";
import type { ModuleRecord } from "@/core/contracts";
import { useEntity } from "@/core/entity-runtime";
import {
  buildFormFields,
  buildZodSchema,
  formValuesToRecord,
  loadRelationOptions,
  recordToFormValues,
} from "@/core/module-engine";
import { useDevice } from "@/contexts/DeviceContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { cn } from "@/lib/utils";
import type { DynamicFormValues, DynamicSelectOption, FormValue } from "@/types/dynamic-form";
import type { FileItem } from "@/types/file-item";

const ENTITY_URL = "persons";
const LIST_PATH = "/portal/persons";

export default function PersonFormScreen() {
  const router = useRouter();
  const search = useSearchParams();
  const { dictionary } = useLanguage();
  const { view } = useDevice();
  const isMobile = view === "mobile";
  const t = dictionary.persons;

  // O id vem por query param (?id=...) e nao por segmento de path: rota estatica,
  // compativel com `output: export` (mobile) — ver persons/detail. Ausencia = criar.
  const id = search.get("id") ?? undefined;
  const isExisting = Boolean(id);

  // Entity Runtime: contrato (cobre deep-link / form sem passar pela lista) +
  // operacoes CRUD — sem service especifico de Pessoa. `actions` ja reflete a
  // autorizacao do usuario logado (via entity-policy no use-entity).
  const { schema, actions, findById, create, update, remove } = useEntity({ url: ENTITY_URL, list: false });

  const canCreate = actions?.create ?? false;
  const canEdit = actions?.edit ?? false;
  const canDelete = actions?.delete ?? false;

  const [values, setValues] = useState<DynamicFormValues>({});
  const [record, setRecord] = useState<ModuleRecord | null>(null);
  const [photo, setPhoto] = useState<FileItem | null>(null);
  const [photos, setPhotos] = useState<FileItem[]>([]);
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
    });
    return () => {
      active = false;
    };
  }, [schema]);

  const load = useCallback(async () => {
    if (!id) {
      return;
    }
    setIsLoading(true);
    try {
      const found = await findById(id);
      if (found) {
        setRecord(found);
      } else {
        setNotFound(true);
      }
    } finally {
      setIsLoading(false);
    }
  }, [id, findById]);

  useEffect(() => {
    if (isExisting) {
      // Carregamento assincrono do registro (findById); os setState ocorrem apos o await.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      void load();
    }
  }, [isExisting, load]);

  // Mapeia (registro carregado | defaults do schema) -> valores do formulario e
  // separa os atributos de arquivo (photo/photos), que vivem fora do schema.
  useEffect(() => {
    if (!schema) {
      return;
    }
    /* eslint-disable react-hooks/set-state-in-effect */
    setValues(recordToFormValues(isExisting ? record : null, schema));
    setPhoto((record?.photo as FileItem | null | undefined) ?? null);
    setPhotos((record?.photos as FileItem[] | undefined) ?? []);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [schema, isExisting, record]);

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
      router.replace(LIST_PATH);
      return;
    }
    if (isExisting && mode === "write" && !actions.edit) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setMode("read");
    }
  }, [actions, isExisting, mode, router]);

  const zodSchema = useMemo(() => (schema ? buildZodSchema(schema) : null), [schema]);
  const formFields = useMemo(() => {
    if (!schema) {
      return [];
    }
    return buildFormFields(schema).map((field) =>
      relationOptions[field.key] ? { ...field, options: relationOptions[field.key] } : field,
    );
  }, [schema, relationOptions]);

  const title = !isExisting ? t.formCreate : mode === "write" ? t.formEdit : t.formView;
  const isWrite = mode === "write";
  const ready = !isLoading && Boolean(schema) && !notFound;

  const onChange = (key: string, value: FormValue) => {
    setValues((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: undefined }));
  };

  const onSave = async () => {
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
    const input = { ...base, photo, photos };
    try {
      if (isExisting && id) {
        await update(id, input);
        setRecord({ ...(record ?? {}), ...input });
        setMode("read");
      } else {
        await create(input);
        router.push(LIST_PATH);
      }
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
    router.push(LIST_PATH);
  };

  const onDelete = async () => {
    if (!id || typeof window === "undefined" || !window.confirm(t.confirmDelete)) {
      return;
    }
    await remove(id);
    router.push(LIST_PATH);
  };

  const header = (
    <div className="flex min-w-0 items-center gap-2">
      <button
        type="button"
        onClick={() => router.push(LIST_PATH)}
        aria-label={t.cancel}
        className="inline-flex size-9 shrink-0 items-center justify-center rounded-full text-text transition hover:bg-[color:var(--color-surface-strong)]"
      >
        <LucideArrowLeft className="size-4" />
      </button>
      <span className="truncate text-base font-medium text-text">{ title}</span>
    </div>
  );

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
        {t.delete}
      </Button>
    ) : null;

  // Acoes rotineiras (voltar, cancelar, salvar, editar) capturadas pela regiao
  // de ACOES (footer mobile / rodape fixo do MainContent no web). A ordem no
  // JSX define a ordem na barra: secundaria antes da primaria.
  const actionButtons = ready ? (
    isWrite ? (
      <>
        <Button type="action" variant="outline" disabled={isSaving} onClick={onCancel}>
          {t.cancel}
        </Button>
        <Button type="action" variant="success" loading={isSaving} disabled={isSaving} onClick={() => void onSave()}>
          {t.save}
        </Button>
      </>
    ) : (
      <>
        <Button type="action" variant="outline" onClick={() => router.push(LIST_PATH)}>
          {t.close}
        </Button>
        {canEdit ? (
          <Button type="action" variant="warning" onClick={() => setMode("write")}>
            <LucidePencil className="size-4" />
            {t.edit}
          </Button>
        ) : null}
      </>
    )
  ) : null;

  return (
    <ScreenLayout header={header}>
      {deleteButton}
      {actionButtons}
      <section className={cn("mx-auto grid w-full max-w-2xl gap-5 px-4 py-6", !isMobile && "lg:max-w-4xl")}>
        {!ready ? (
          <p className="py-8 text-center text-sm text-text-muted">{notFound ? t.empty : "…"}</p>
        ) : (
          <>
            <ImageField label="Foto de perfil" value={photo} editable={isWrite} onChange={setPhoto} onView={openViewer} />
            <DynamicForm fields={formFields} values={values} mode={mode} errors={errors} onChange={onChange} columns="adaptive" />
            <ImageGallery label="Galeria" items={photos} editable={isWrite} onChange={setPhotos} onView={openViewer} />
          </>
        )}
      </section>

      <ImageViewer file={viewerFile} onClose={closeViewer} closeLabel={t.close} />
    </ScreenLayout>
  );
}
