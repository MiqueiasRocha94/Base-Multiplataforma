/**
 * Monta o objeto `labels` (Record<string,string>) que `EntityListScreen` e
 * `EntityFormScreen` consomem, sem precisar de chaves i18n dedicadas por entidade.
 *
 * Terreno da migração: os rótulos ficam aqui em pt-BR (o `page.tsx` da entidade
 * injeta title/subtitle). Quando for internacionalizar, troque por `dictionary.<x>`
 * — o contrato dos screens é o mesmo (ver docs/estrutura-projeto.md "Regra de colocação").
 */
export function entityLabels(base: {
  title: string;
  subtitle: string;
  empty?: string;
  /** rótulo do botão de criação na lista (default "Adicionar", do i18n). */
  create?: string;
  /** rótulos extras por labelKey de ação (id do catálogo → texto). */
  actions?: Record<string, string>;
}): Record<string, string> {
  return {
    title: base.title,
    subtitle: base.subtitle,
    empty: base.empty ?? "Nada por aqui ainda.",
    ...(base.create ? { create: base.create } : {}),
    confirmDelete: "Confirmar esta ação?",
    demoAction: "ação de demonstração (sem backend real nesta base)",
    formCreate: "Novo registro",
    formEdit: "Editar",
    formView: "Detalhe",
    cancel: "Cancelar",
    save: "Salvar",
    close: "Fechar",
    edit: "Editar",
    delete: "Excluir",
    ...(base.actions ?? {}),
  };
}
