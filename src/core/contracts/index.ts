/**
 * Contratos canonicos da arquitetura orientada a contrato (Entity Runtime).
 *
 * A definicao da entidade (estatica, cacheavel) e os dados (resultado de uma
 * consulta, com paginacao) sao SEPARADOS:
 *
 *   GET /{entity}/contract  -> EntityContract  (version, permissions, schema, ui, relations)
 *   GET /{entity}           -> DataResponse<T> ({ data, pagination })
 *
 * Fonte unica dos tipos estruturais da entidade (schema, ui, campos, permissoes).
 */

// ---- schema ---------------------------------------------------------------

export type FieldType =
  | "uuid"
  | "string"
  | "text"
  | "email"
  | "phone"
  | "integer"
  | "number"
  | "decimal"
  | "boolean"
  | "date"
  | "datetime"
  | "enum"
  | "relation";

/** Relacionamento com outra entidade (para selects dirigidos por dados). */
export type FieldRelationship = {
  /** Entidade alvo (ex.: "departments" ou "/api/v1/departments"). */
  entity: string;
  /** Campo do alvo exibido ao usuario. */
  labelField?: string;
  /** Campo do alvo usado como valor (padrao: primaryKey do alvo). */
  valueField?: string;
};

export type FieldEnumOption = { value: string | number | boolean; label: string };

/** Validacoes adicionais alem das derivadas do tipo/tamanho. */
export type FieldValidation = {
  /** Regex (string) aplicada ao valor. */
  pattern?: string;
  /** Mensagem custom para required/pattern. */
  message?: string;
};

export type EntityField = {
  name: string;
  type: FieldType;
  /** Rotulo amigavel; se ausente, o frontend humaniza `name`. */
  label?: string;
  /** Texto de exemplo exibido no campo (placeholder). Vem da API. */
  placeholder?: string;
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  /** Casas totais (number/decimal). */
  precision?: number;
  /** Casas decimais (number/decimal). */
  scale?: number;
  /** Valor padrao do campo. */
  default?: unknown;
  readOnly?: boolean;
  /** Nao exibido em formulario/tabela. */
  hidden?: boolean;
  /** Mascara de entrada/exibicao (ex.: "cpf", "999.999.999-99"). */
  mask?: string;
  relationship?: FieldRelationship;
  /** Opcoes para `type: 'enum'`. */
  enum?: FieldEnumOption[];
  validations?: FieldValidation;
};

export type EntitySchema = {
  primaryKey: string;
  fields: EntityField[];
};

// ---- ui -------------------------------------------------------------------

export type UiSortDirection = "ASC" | "DESC";

export type ModuleUiActions = {
  create: boolean;
  edit: boolean;
  delete: boolean;
  view: boolean;
  export?: boolean;
};

export type ModuleUi = {
  /** Campos exibidos como colunas da listagem. */
  columns: string[];
  /** Campos pesquisaveis (filtros). */
  filters: string[];
  /** Ordenacao padrao. */
  sort?: { field: string; direction: UiSortDirection };
  actions: ModuleUiActions;
};

// ---- permissoes -----------------------------------------------------------

/** Permissoes do usuario sobre a entidade (cruzadas com `ui.actions`). */
export type ModulePermissions = {
  create: boolean;
  update: boolean;
  delete: boolean;
  view: boolean;
  export: boolean;
};

// ---- registro generico ----------------------------------------------------

export type ModuleRecord = Record<string, unknown>;

// ---- contrato e dados -----------------------------------------------------

/** Metadata estatica do contrato (versao). Paginacao NUNCA mora aqui. */
export type EntityMetadata = {
  version: string;
};

/**
 * Definicao estatica da entidade. Pode ser cacheada durante o ciclo da app e
 * invalidada quando `version` muda. Alimenta a listagem, o formulario dinamico,
 * filtros, validacoes, acoes, permissoes e relacionamentos.
 */
export type EntityContract = {
  version: string;
  permissions: ModulePermissions;
  schema: EntitySchema;
  ui: ModuleUi;
  /** Relacionamentos declarados (opcional; tambem inferiveis pelos campos `relation`). */
  relations?: Record<string, FieldRelationship>;
};

/** Paginacao pertence aos DADOS (muda a cada consulta), nunca ao contrato. */
export type EntityPagination = {
  page: number;
  size: number;
  total: number;
};

/** Resultado de uma consulta de dados: pagina atual + paginacao. */
export type DataResponse<T = unknown> = {
  data: T[];
  pagination: EntityPagination;
};
