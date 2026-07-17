import { z } from "zod";

import type { FilterField } from "@/components/ui/filter-modal";
import type { GenericTableColumn, RowStatus } from "@/components/ui/generic-table";
import type { DynamicFormField, DynamicFormValues, FieldKind } from "@/types/dynamic-form";
import type {
  EntityField,
  EntitySchema,
  ModulePermissions,
  ModuleRecord,
  ModuleUi,
} from "@/core/contracts";

/**
 * Motor do modulo schema-driven: a partir do contrato padronizado
 * (`schema` + `ui`) gera colunas de tabela, filtros, formulario, validacao Zod e
 * CSV, e resolve as acoes disponiveis — sem configuracao hardcoded por entidade.
 */

function fieldMap(schema: EntitySchema): Map<string, EntityField> {
  return new Map(schema.fields.map((field) => [field.name, field]));
}

/** Rotulo amigavel do campo (cai no proprio `name` quando ausente). */
export function fieldLabel(field: EntityField): string {
  return field.label ?? field.name;
}

/** Texto exibido de um valor: usa `enum` (incl. booleanos rotulados) quando houver. */
export function displayValue(record: ModuleRecord, field: EntityField): string {
  const value = record[field.name];
  if (field.enum && field.enum.length > 0) {
    const option = field.enum.find((entry) => entry.value === value);
    if (option) return option.label;
  }
  if (field.type === "boolean") return value ? "Sim" : "Nao";
  if (value == null) return "";
  if ((field.type === "date" || field.type === "datetime") && typeof value === "number") {
    return new Date(value).toLocaleDateString();
  }
  return String(value);
}

/** Chave primaria (id) de um registro como string. */
export function getRecordId(record: ModuleRecord, schema: EntitySchema): string {
  return String(record[schema.primaryKey] ?? "");
}

// ---- listagem -------------------------------------------------------------

function columnMobileRole(field: EntityField): GenericTableColumn<ModuleRecord>["mobileRole"] {
  if (field.type === "boolean" || field.type === "enum" || field.type === "relation") {
    return "badge";
  }
  if (field.type === "date" || field.type === "datetime") {
    return "meta";
  }
  return "field";
}

/** Gera as colunas da tabela (web) / campos do card (mobile) a partir de `ui.columns` + `schema`. */
export function buildTableColumns(ui: ModuleUi, schema: EntitySchema): GenericTableColumn<ModuleRecord>[] {
  const byName = fieldMap(schema);
  const pk = schema.primaryKey;
  const titleField = schema.fields.find(
    (field) => !field.hidden && field.name !== pk && (field.type === "string" || field.type === "text"),
  );

  const columns: GenericTableColumn<ModuleRecord>[] = [];

  if (titleField) {
    columns.push({
      key: titleField.name,
      header: fieldLabel(titleField),
      mobileRole: "title",
      render: (record) => displayValue(record, titleField),
    });
  }

  for (const name of ui.columns) {
    const field = byName.get(name);
    if (!field || field.hidden || field.name === titleField?.name) {
      continue;
    }
    columns.push({
      key: field.name,
      header: fieldLabel(field),
      mobileLabel: fieldLabel(field),
      mobileRole: columnMobileRole(field),
      render: (record) => displayValue(record, field),
    });
  }

  return columns;
}

/** Status da linha (pill) derivado do primeiro campo booleano do schema. */
export function buildRowStatus(schema: EntitySchema): ((record: ModuleRecord) => RowStatus) | undefined {
  const boolField = schema.fields.find((field) => !field.hidden && field.type === "boolean");
  if (!boolField) {
    return undefined;
  }
  return (record) => {
    const on = Boolean(record[boolField.name]);
    const label = boolField.enum?.find((entry) => entry.value === on)?.label ?? (on ? "Sim" : "Nao");
    return { label, tone: on ? "success" : "danger" };
  };
}

/** Gera os campos de filtro a partir de `ui.filters` + `schema`. */
export function buildFilterFields(ui: ModuleUi, schema: EntitySchema): FilterField[] {
  const byName = fieldMap(schema);
  return ui.filters
    .map((name) => byName.get(name))
    .filter((field): field is EntityField => field != null && !field.hidden)
    .map((field) => {
      // Enum/boolean filtram por igualdade sobre o LABEL exibido (displayValue),
      // por isso a opcao usa o proprio label como id.
      if (field.enum && field.enum.length > 0) {
        return {
          key: field.name,
          label: fieldLabel(field),
          kind: "select" as const,
          options: field.enum.map((entry) => ({ id: entry.label, label: entry.label })),
        };
      }
      if (field.type === "boolean") {
        return {
          key: field.name,
          label: fieldLabel(field),
          kind: "select" as const,
          options: [
            { id: "Sim", label: "Sim" },
            { id: "Nao", label: "Nao" },
          ],
        };
      }
      if (field.type === "integer" || field.type === "number" || field.type === "decimal") {
        return { key: field.name, label: fieldLabel(field), kind: "number" as const };
      }
      return { key: field.name, label: fieldLabel(field), kind: "text" as const };
    });
}

/** Predicado generico de filtro client-side (enum/boolean por igualdade; texto por inclusao). */
export function buildPredicate(schema: EntitySchema, ui: ModuleUi) {
  const byName = fieldMap(schema);
  return (record: ModuleRecord, values: Record<string, string>): boolean => {
    for (const name of ui.filters) {
      const raw = (values[name] ?? "").trim();
      if (!raw) continue;
      const field = byName.get(name);
      if (!field) continue;

      const isExact = Boolean(field.enum) || field.type === "enum" || field.type === "relation" || field.type === "boolean";
      if (isExact) {
        if (displayValue(record, field) !== raw) return false;
      } else {
        const value = record[name];
        if (value == null || !String(value).toLowerCase().includes(raw.toLowerCase())) return false;
      }
    }
    return true;
  };
}

// ---- formulario -----------------------------------------------------------

function toFormKind(field: EntityField): FieldKind {
  switch (field.type) {
    case "email":
      return "email";
    case "phone":
      return "phone";
    case "integer":
    case "number":
    case "decimal":
      return "number";
    case "boolean":
      return "switch";
    case "enum":
    case "relation":
      return "select";
    default:
      return "text";
  }
}

/**
 * Gera os campos do formulario a partir do `schema`. Oculta a chave primaria e
 * campos `hidden`; enum (nao-boolean) vira select com opcoes.
 */
export function buildFormFields(schema: EntitySchema): DynamicFormField[] {
  return schema.fields
    .filter((field) => !field.hidden && field.name !== schema.primaryKey)
    .map((field) => ({
      key: field.name,
      label: fieldLabel(field),
      kind: toFormKind(field),
      placeholder: field.placeholder,
      mask: field.mask,
      options:
        field.type !== "boolean" && field.enum
          ? field.enum.map((entry) => ({ id: String(entry.value), label: entry.label }))
          : undefined,
    }));
}

// ---- mappers valor<->entidade (genericos, dirigidos pelo schema) ----------

/** Campo renderizado como select em espaco de label (enum/relation com opcoes). */
function isLabeledSelect(field: EntityField): boolean {
  return (field.type === "enum" || field.type === "relation") && Boolean(field.enum);
}

/**
 * Converte um registro da entidade nos valores do formulario. Selects rotulados
 * (enum) sao expostos pelo LABEL; demais campos passam direto. Sem `record`, usa
 * `field.default`.
 */
export function recordToFormValues(record: ModuleRecord | null, schema: EntitySchema): DynamicFormValues {
  const values: DynamicFormValues = {};
  for (const field of schema.fields) {
    if (field.hidden || field.name === schema.primaryKey) {
      continue;
    }
    const raw = record ? record[field.name] : field.default;
    if (field.type === "boolean") {
      values[field.name] = typeof raw === "boolean" ? raw : Boolean(field.default ?? false);
    } else if (isLabeledSelect(field)) {
      const option = field.enum!.find((entry) => entry.value === raw);
      values[field.name] = option ? option.label : raw != null ? String(raw) : "";
    } else {
      values[field.name] = raw == null ? "" : typeof raw === "number" ? raw : String(raw);
    }
  }
  return values;
}

/**
 * Converte os valores do formulario de volta para o registro da entidade
 * (editaveis apenas: ignora PK, `hidden` e `readOnly`). Selects rotulados voltam
 * para o VALOR do enum; numeros sao coeridos; textos sao trimados.
 */
export function formValuesToRecord(values: DynamicFormValues, schema: EntitySchema): ModuleRecord {
  const out: ModuleRecord = {};
  for (const field of schema.fields) {
    if (field.hidden || field.readOnly || field.name === schema.primaryKey) {
      continue;
    }
    const value = values[field.name];
    if (field.type === "boolean") {
      out[field.name] = Boolean(value);
    } else if (isLabeledSelect(field)) {
      const option = field.enum!.find((entry) => entry.label === value);
      out[field.name] = option ? option.value : value;
    } else if (field.type === "integer" || field.type === "number" || field.type === "decimal") {
      out[field.name] = value === "" || value == null ? undefined : Number(value);
    } else {
      out[field.name] = typeof value === "string" ? value.trim() : value;
    }
  }
  return out;
}

// ---- validacao (Zod) ------------------------------------------------------

function fieldToZod(field: EntityField): z.ZodTypeAny {
  switch (field.type) {
    case "boolean":
      return z.boolean();

    case "enum":
    case "relation": {
      const values = (field.enum ?? []).map((entry) => String(entry.value));
      const base = values.length > 0 ? z.enum(values as [string, ...string[]]) : z.string();
      return field.required ? base : base.optional();
    }

    case "integer":
    case "number":
    case "decimal": {
      const base = z.number({ error: "Informe um numero valido." });
      return field.required ? base : base.optional();
    }

    case "email": {
      const base = z.string().trim().email(field.validations?.message ?? "Informe um e-mail valido.");
      return field.required ? base : z.union([z.literal(""), base]).optional();
    }

    default: {
      let base = z.string().trim();
      if (field.maxLength != null) {
        base = base.max(field.maxLength, `Maximo ${field.maxLength} caracteres.`);
      }
      const min = field.required ? Math.max(1, field.minLength ?? 1) : field.minLength;
      if (min != null) {
        const message = field.required && field.minLength == null ? "Campo obrigatorio." : `Minimo ${min} caracteres.`;
        base = base.min(min, message);
      }
      if (field.validations?.pattern) {
        base = base.regex(new RegExp(field.validations.pattern), field.validations?.message ?? "Valor invalido.");
      }
      return field.required ? base : base.optional();
    }
  }
}

/**
 * Gera o schema Zod de validacao a partir do `schema` da entidade. Ignora a
 * chave primaria, campos `hidden` e `readOnly` (nao sao editaveis no formulario).
 */
export function buildZodSchema(schema: EntitySchema): z.ZodType {
  const shape: Record<string, z.ZodTypeAny> = {};
  for (const field of schema.fields) {
    if (field.hidden || field.readOnly || field.name === schema.primaryKey) {
      continue;
    }
    shape[field.name] = fieldToZod(field);
  }
  return z.object(shape);
}

// ---- exportar -------------------------------------------------------------

function csvCell(value: string): string {
  return `"${value.replace(/"/g, '""')}"`;
}

/** Gera CSV a partir de `ui.columns` + `schema` (chave primaria + colunas). */
export function buildCsv(records: ModuleRecord[], ui: ModuleUi, schema: EntitySchema): string {
  const byName = fieldMap(schema);
  const columns = ui.columns
    .map((name) => byName.get(name))
    .filter((field): field is EntityField => field != null);

  const header = [schema.primaryKey, ...columns.map(fieldLabel)];
  const rows = records.map((record) => [
    String(record[schema.primaryKey] ?? ""),
    ...columns.map((field) => displayValue(record, field)),
  ]);

  return [header, ...rows].map((cells) => cells.map(csvCell).join(",")).join("\n");
}

export type ModuleActionFlags = {
  create: boolean;
  edit: boolean;
  delete: boolean;
  view: boolean;
  export: boolean;
};

/** Acao disponivel = permissao do usuario (contrato) E habilitada na ui. */
export function resolveActions(permissions: ModulePermissions, ui: ModuleUi): ModuleActionFlags {
  const actions = ui.actions;
  return {
    create: permissions.create && actions.create,
    edit: permissions.update && actions.edit,
    delete: permissions.delete && actions.delete,
    view: permissions.view && actions.view,
    export: (permissions.export ?? false) && (actions.export ?? false),
  };
}
