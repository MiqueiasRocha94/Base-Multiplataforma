"use client";

import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { DynamicForm } from "@/components/ui/dynamic-form";
import { Turnstile } from "@/components/Turnstile";
import { useLanguage } from "@/contexts/LanguageContext";
import { useCaptchaRequired } from "@/hooks/use-captcha-required";
import { HttpError } from "@/lib/http";
import { esqueciSenha } from "@/services/acesso";
import type { DynamicFormField, DynamicFormValues, FormValue } from "@/types/dynamic-form";

/**
 * View do modo `recover`: pede login + e-mail cadastrado e chama
 * `POST /auth/esqueci-senha` (sem token). 204 → a senha nova (já expirada)
 * vai para o e-mail; o login com ela cai na troca de senha. Autocontida (estado
 * próprio + gate de captcha). "Voltar" retorna ao form de login via `onBack` —
 * não é rota própria (o conteúdo não justifica).
 *
 * E-mail errado conta tentativa inválida (mesmo contador do login): sem reenvio
 * automático; 403 (conta bloqueada) trava o envio.
 */
export function RecoverPasswordForm({ onBack }: { onBack: () => void }) {
  const { dictionary } = useLanguage();
  const captchaRequired = useCaptchaRequired();

  const t = dictionary.login;

  const [values, setValues] = useState<DynamicFormValues>({ login: "", email: "" });
  const [blocked, setBlocked] = useState(false);
  const [errors, setErrors] = useState<Record<string, string | undefined>>({});
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  // Token do Turnstile e de uso unico: remonta o widget apos cada envio.
  const [captchaKey, setCaptchaKey] = useState(0);
  const [isPending, startTransition] = useTransition();

  const fields: DynamicFormField[] = [
    { key: "login", label: "Login", kind: "text", placeholder: "Digite seu login", icon: "user" },
    { key: "email", label: "E-mail", kind: "email", placeholder: "E-mail cadastrado", icon: "mail" },
  ];

  const onChange = (key: string, value: FormValue) => {
    setValues((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: undefined }));
    setError(null);
    setSuccess(null);
  };

  const submit = () => {
    setError(null);
    setSuccess(null);

    const login = String(values.login ?? "").trim();
    const email = String(values.email ?? "").trim();
    const nextErrors: Record<string, string | undefined> = {};
    if (!login) {
      nextErrors.login = "Informe seu login.";
    }
    if (!email) {
      nextErrors.email = "Informe o e-mail cadastrado.";
    }
    if (nextErrors.login || nextErrors.email) {
      setErrors(nextErrors);
      return;
    }

    // Mesmo gate do login (`useCaptchaRequired`).
    if (captchaRequired && !turnstileToken) {
      setError(t.captcha);
      return;
    }

    const captcha = turnstileToken ?? undefined;
    if (captcha) {
      setTurnstileToken(null);
      setCaptchaKey((key) => key + 1);
    }

    startTransition(async () => {
      try {
        await esqueciSenha(login, email, captcha);
        setValues({ login: "", email: "" });
        setSuccess("Enviamos uma nova senha para o seu e-mail. Entre com ela para cadastrar uma senha definitiva.");
      } catch (caught) {
        if (caught instanceof HttpError && caught.status === 403) {
          setBlocked(true);
        }
        // 400 `Informações inválidas.` · 403 conta bloqueada · 409 falha no envio.
        setError(
          caught instanceof HttpError && caught.status < 500
            ? caught.message
            : "Não foi possível solicitar a recuperação da senha.",
        );
      }
    });
  };

  return (
    <form
      className="grid gap-5"
      onSubmit={(event) => {
        event.preventDefault();
        submit();
      }}
    >
      <div className="space-y-2 text-center">
        <h1 className="text-2xl font-semibold tracking-tight text-text">Esqueceu sua senha?</h1>
        <p className="text-sm text-text-muted">Digite seu login e o e-mail cadastrado.</p>
      </div>

      <DynamicForm fields={fields} values={values} mode="write" errors={errors} hideLabels onChange={onChange} />

      <p className="text-center text-xs leading-5 text-text-muted">
        Uma nova senha será enviada para o e-mail cadastrado. Sem e-mail cadastrado, procure o administrador do sistema.
      </p>

      {error ? <p className="text-center text-sm text-error">{error}</p> : null}
      {success ? <p className="text-center text-sm text-success">{success}</p> : null}

      {/* Captcha = verificação anti-bot (`useCaptchaRequired`: só web,
          desligável no dev tool). */}
      {captchaRequired ? (
        <div className="flex justify-center">
          <Turnstile key={captchaKey} onToken={setTurnstileToken} />
        </div>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2">
        <Button variant="outline" className="w-full" onClick={onBack}>
          Voltar
        </Button>
        <Button htmlType="submit" className="w-full" loading={isPending} disabled={blocked}>
          Nova senha
        </Button>
      </div>
    </form>
  );
}
