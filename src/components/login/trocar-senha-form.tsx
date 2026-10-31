"use client";

import { useId, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { DynamicForm } from "@/components/ui/dynamic-form";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { HttpError } from "@/lib/http";
import { dismissKeyboard } from "@/lib/platform/keyboard";
import type { ProximaTela } from "@/types/acesso";
import type { DynamicFormField, DynamicFormValues, FormValue } from "@/types/dynamic-form";

const EMPTY: DynamicFormValues = { senhaAntiga: "", senha: "", confirmacao: "" };

/**
 * Formulario da troca de senha de ACESSO (`POST /auth/senha`, corpo
 * `{senhaAntiga, senha}`) — o mesmo para a senha expirada e para a troca
 * voluntaria. A confirmacao e so validacao do app. A resposta traz token novo
 * (gravado pelo `AuthContext`); `onDone` recebe a proxima tela.
 *
 * `actions`: `inline` (telas `minimal`, sem footer — ex.: senha expirada) ou
 * `chrome` (dentro do portal): o submit vira `type="action"` (segunda barra no
 * mobile / barra de acoes do MainContent no web) e o cancelar vira `type="back"`
 * (saida = navegacao: celula da navbar no mobile). Fora do <form>, o submit
 * liga pelo atributo `form`.
 */
export function TrocarSenhaForm({
  cancelLabel,
  onCancel,
  onDone,
  actions = "inline",
}: {
  cancelLabel: string;
  onCancel: () => void;
  onDone: (tela: ProximaTela) => void;
  actions?: "inline" | "chrome";
}) {
  const formId = useId();
  const router = useRouter();
  const { dictionary } = useLanguage();
  const { changePassword } = useAuth();

  const t = dictionary.senha;

  const [values, setValues] = useState<DynamicFormValues>(EMPTY);
  const [errors, setErrors] = useState<Record<string, string | undefined>>({});
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const fields: DynamicFormField[] = [
    { key: "senhaAntiga", label: t.currentPassword, kind: "password", placeholder: t.currentPassword, icon: "lock" },
    { key: "senha", label: t.newPassword, kind: "password", placeholder: t.newPassword, icon: "lock" },
    { key: "confirmacao", label: t.confirmPassword, kind: "password", placeholder: t.confirmPassword, icon: "lock" },
  ];

  const onChange = (key: string, value: FormValue) => {
    setValues((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: undefined }));
    setError(null);
  };

  const submit = () => {
    const senhaAntiga = String(values.senhaAntiga ?? "");
    const senha = String(values.senha ?? "");
    const confirmacao = String(values.confirmacao ?? "");

    const nextErrors: Record<string, string | undefined> = {};
    if (!senhaAntiga) {
      nextErrors.senhaAntiga = t.currentRequired;
    }
    if (senha.length < 8 || !/[a-z]/i.test(senha) || !/\d/.test(senha)) {
      nextErrors.senha = t.ruleHint;
    }
    if (confirmacao !== senha) {
      nextErrors.confirmacao = t.mismatch;
    }
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    startTransition(async () => {
      try {
        const tela = await changePassword(senhaAntiga, senha);
        setValues(EMPTY);
        dismissKeyboard(); // sai da tela: remover o campo focado não fecha o teclado
        onDone(tela);
      } catch (caught) {
        if (caught instanceof HttpError && caught.status === 401) {
          router.replace("/login");
          return;
        }
        // 400 = senha atual incorreta ou nova fora da regra (a `message` diz qual).
        setError(caught instanceof HttpError && caught.status < 500 ? caught.message : t.error);
      }
    });
  };

  // `w-full` sempre: dentro da barra de ações quem dimensiona é a região
  // (`[data-region="actions"]` em globals.css), sem condicional por device.
  const chrome = actions === "chrome";
  const cancelButton = (
    // Cancelar é SAÍDA (navegação): no chrome vira `back` — célula da navbar.
    <Button type={chrome ? "back" : "none"} variant="outline" className="w-full" onClick={onCancel}>
      {cancelLabel}
    </Button>
  );
  const submitButton = (
    <Button
      type={chrome ? "action" : "none"}
      variant={chrome ? "success" : "default"}
      htmlType="submit"
      form={formId}
      className="w-full"
      loading={isPending}
    >
      {t.submit}
    </Button>
  );

  return (
    <form
      id={formId}
      className="grid gap-5"
      onSubmit={(event) => {
        event.preventDefault();
        submit();
      }}
    >
      <DynamicForm fields={fields} values={values} mode="write" errors={errors} hideLabels onChange={onChange} />

      <p className="text-center text-xs leading-5 text-text-muted">{t.ruleHint}</p>

      {error ? <p role="alert" className="text-center text-sm text-error">{error}</p> : null}

      {chrome ? (
        <>
          {cancelButton}
          {submitButton}
        </>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {cancelButton}
          {submitButton}
        </div>
      )}
    </form>
  );
}
