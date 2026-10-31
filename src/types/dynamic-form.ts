export type DynamicFormMode = "read" | "write";
// Identificador livre do formulario (sem dominio): usado apenas como rotulo/agrupador.
export type DynamicFormType = string;

export type FieldKind = "text" | "email" | "phone" | "number" | "password" | "switch" | "select";

// Icone opcional exibido a esquerda do campo (login e telas de credencial).
export type DynamicFieldIcon = "user" | "lock" | "mail" | "phone";

// Inclui `string[]` para suportar campos `select` de multipla escolha.
export type FormValue = string | number | boolean | null | undefined | string[];

export type DynamicSelectOption = {
  id: string | number;
  label: string;
};

export type DynamicFormField = {
  key: string;
  label: string;
  placeholder?: string;
  rule?: string;
  kind?: FieldKind;
  // Mascara de entrada (ex.: "(99) 99999-9999"). 9=digito, A=letra, *=alfanumerico.
  mask?: string;
  // Opcoes embutidas para selects dirigidos por dados.
  options?: DynamicSelectOption[];
  // Icone a esquerda do input (kinds de texto/senha). Ignorado por switch/select.
  icon?: DynamicFieldIcon;
};

export type DynamicFormValues = Record<string, FormValue>;

// eslint-disable-next-line no-restricted-syntax -- D06 (desvio conhecido): valor de runtime em types/; corrige movendo para lib/
export function emptyDynamicFormValues(): DynamicFormValues {
  return {};
}
