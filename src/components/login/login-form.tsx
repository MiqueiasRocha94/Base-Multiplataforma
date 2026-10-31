"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Fingerprint } from "lucide-react";

import { Button } from "@/components/ui/button";
import { DynamicForm } from "@/components/ui/dynamic-form";
import { Turnstile } from "@/components/Turnstile";
import { useAuth } from "@/contexts/AuthContext";
import { useDevice } from "@/contexts/DeviceContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useCaptchaRequired } from "@/hooks/use-captcha-required";
import { caminhoDaTela } from "@/lib/auth/acesso";
import { clearProfileBlockedNotice, hasProfileBlockedNotice } from "@/lib/auth/mobile-release";
import { loginSchema } from "@/lib/auth/login.schema";
import { HttpError } from "@/lib/http";
import { dismissKeyboard } from "@/lib/platform/keyboard";
import type { DynamicFormField, DynamicFormValues, FormValue } from "@/types/dynamic-form";
// @dev-only:start
import { QuickAccess } from "@/dev-tools/ui";
// @dev-only:end

/**
 * Formulário de login (view do modo `form`). Autocontido: cuida do próprio
 * estado, validação e chamada de `signIn` (`POST /auth/login`). A navegação
 * pós-login fica aqui (e não no efeito do orquestrador) para o apk nativo não
 * cair na re-checagem de biometria logo após autenticar. O destino vem da
 * resposta: troca de senha expirada ou home.
 */
export function LoginForm({
  onForgotPassword,
  onUseBiometric,
}: {
  onForgotPassword: () => void;
  /** Acesso salvo mantido ("Outro usuário"): atalho de volta à biometria. */
  onUseBiometric?: () => void;
}) {
  const router = useRouter();
  const { dictionary } = useLanguage();
  const { isNative } = useDevice();
  const captchaRequired = useCaptchaRequired();
  const { signIn } = useAuth();

  const t = dictionary.login;

  const [values, setValues] = useState<DynamicFormValues>({ login: "", password: "", biometricOptIn: false });
  const [errors, setErrors] = useState<Record<string, string | undefined>>({});
  // Perfil ainda não publicado no app: o gate encerrou a sessão e o aviso abre o formulário.
  const [error, setError] = useState<string | null>(() => (hasProfileBlockedNotice() ? t.profileUnavailable : null));
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  // Token do Turnstile e de uso unico: remonta o widget apos cada envio.
  const [captchaKey, setCaptchaKey] = useState(0);
  const [isPending, startTransition] = useTransition();

  const fields = useMemo<DynamicFormField[]>(() => {
    const base: DynamicFormField[] = [
      { key: "login", label: t.loginPlaceholder, kind: "text", placeholder: t.loginPlaceholder, icon: "user" },
      { key: "password", label: t.password, kind: "password", placeholder: "******", icon: "lock" },
    ];
    if (isNative) {
      base.push({ key: "biometricOptIn", label: t.biometricOptIn, kind: "switch" });
    }
    return base;
  }, [t, isNative]);

  const onChange = (key: string, value: FormValue) => {
    setValues((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: undefined }));
  };

  const submit = () => {
    setError(null);
    const parsed = loginSchema.safeParse({ login: values.login, password: values.password });
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

    // Verificação anti-bot: regra única em `useCaptchaRequired` (só web; o dev
    // tool pode desligar). Sem captcha exigido, o gate é ignorado.
    if (captchaRequired && !turnstileToken) {
      setError(t.captcha);
      return;
    }

    enter(parsed.data.login, parsed.data.password, values.biometricOptIn === true, turnstileToken ?? undefined);
  };

  // Sem reenvio automático: senha errada conta tentativa e pode bloquear a conta.
  const enter = (login: string, senha: string, biometric: boolean, captcha?: string) => {
    clearProfileBlockedNotice();
    startTransition(async () => {
      try {
        const tela = await signIn(login, senha, biometric, captcha);
        // Sai da tela com o teclado recolhido: o campo focado vai ser desmontado e
        // remover um elemento focado NÃO dispara blur (o teclado ficaria aberto).
        dismissKeyboard();
        router.push(caminhoDaTela(tela));
      } catch (caught) {
        // 400/401 do login trazem o motivo (senha errada, conta bloqueada...).
        setError(caught instanceof HttpError && caught.status < 500 ? caught.message : t.error);
        if (captcha) {
          setTurnstileToken(null);
          setCaptchaKey((key) => key + 1);
        }
      }
    });
  };

  // @dev-only:start
  // Acesso rápido de dev contra a API: mesmo caminho do formulário, captcha incluído.
  const quickSignInApi = (login: string, password: string) => {
    setError(null);
    if (captchaRequired && !turnstileToken) {
      setError(t.captcha);
      return;
    }
    enter(login, password, false, turnstileToken ?? undefined);
  };
  // @dev-only:end

  return (
    <form
      className="grid gap-5"
      onSubmit={(event) => {
        event.preventDefault();
        submit();
      }}
    >
      <h1 className="text-center text-3xl font-semibold tracking-tight text-primary">{t.title}</h1>

      <DynamicForm fields={fields} values={values} mode="write" errors={errors} hideLabels onChange={onChange} />

      <div className="flex items-center justify-end gap-3 text-sm">
        <button type="button" onClick={onForgotPassword} className="font-medium text-primary transition hover:underline">
          {t.forgotPassword}
        </button>
      </div>

      {/* @dev-only:start */}
      <QuickAccess onDemo={(login) => enter(login, "demo", false)} onApi={quickSignInApi} />
      {/* @dev-only:end */}

      {error ? <p className="text-center text-sm text-error">{error}</p> : null}

      {/* Captcha = verificação anti-bot do login (`useCaptchaRequired`: só web,
          desligável no dev tool). Fica junto do submit porque é parte do gate
          de envio, não decoração. */}
      {captchaRequired ? (
        <div className="flex justify-center">
          <Turnstile key={captchaKey} onToken={setTurnstileToken} />
        </div>
      ) : null}

      <div className="flex gap-3">
        <Button htmlType="submit" className="w-full flex-1" loading={isPending}>
          {t.submit}
        </Button>
        {onUseBiometric ? (
          <Button variant="outline" size="icon" aria-label={t.useBiometric} onClick={onUseBiometric}>
            <Fingerprint className="size-5" />
          </Button>
        ) : null}
      </div>
    </form>
  );
}
