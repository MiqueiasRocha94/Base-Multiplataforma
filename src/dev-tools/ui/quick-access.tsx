"use client";

import { Button } from "@/components/ui/button";
import { DEMO_USER_EMAILS } from "@/dev-backend/demo-users";

import { apiQuickLogin } from "../runtime/quick-login";
import { useDeveloperMode } from "./developer-mode-context";
import { useDevDictionary } from "./use-dev-dictionary";

type QuickAccessProps = {
  /** Usuário do dev-backend (sem API configurada), senha `demo`. */
  onDemo: (login: string) => void;
  /** Credenciais do `.env.development.local` contra a API (captcha incluído). */
  onApi: (login: string, password: string) => void;
};

/**
 * Botões "Entrar como …" do login, com o modo desenvolvedor e a flag
 * `quickAccessEnabled` (docs/ferramentas-dev.md → "Acesso rápido").
 */
export function QuickAccess({ onDemo, onApi }: QuickAccessProps) {
  const { developerModeEnabled, settings } = useDeveloperMode();
  const t = useDevDictionary().login;

  if (!developerModeEnabled || !settings.quickAccessEnabled) {
    return null;
  }

  const credenciais = apiQuickLogin();

  return (
    <div className="grid gap-3 rounded-[var(--radius-xl)] border border-dashed border-border bg-[color:var(--color-surface-strong)] p-4">
      <p className="text-sm font-semibold">{t.quickAccessTitle}</p>
      <div className="grid gap-3 sm:grid-cols-2">
        <Button variant="outline" className="w-full" onClick={() => onDemo(DEMO_USER_EMAILS.comum)}>
          {t.quickAccessComum}
        </Button>
        <Button variant="outline" className="w-full" onClick={() => onDemo(DEMO_USER_EMAILS.analista)}>
          {t.quickAccessAnalista}
        </Button>
        <Button variant="outline" className="w-full" onClick={() => onDemo(DEMO_USER_EMAILS.admin)}>
          {t.quickAccessAdmin}
        </Button>
        {credenciais ? (
          <Button variant="outline" className="w-full" onClick={() => onApi(credenciais.login, credenciais.password)}>
            {t.quickAccessApi}
          </Button>
        ) : null}
      </div>
    </div>
  );
}
