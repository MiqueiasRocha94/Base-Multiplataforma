"use client";

import { LucideCircleAlert, LucideTriangleAlert } from "lucide-react";

import { StatusScreen } from "@/components/status-screen";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
// @dev-only:start
import { useDevice } from "@/contexts/DeviceContext";
import { errorDiagnostics } from "@/dev-tools/runtime";
import { useDeveloperMode } from "@/dev-tools/ui";
// @dev-only:end
import { HttpError } from "@/lib/http";

export type LoadErrorScreenProps = {
  error: Error;
  onRetry: () => void;
};

/**
 * Falha ao CARREGAR a tela (sem o que mostrar, ex.: contrato da entidade não
 * veio): o mesmo `StatusScreen` das telas 400/500. 4xx em tom neutro com a
 * `message` da API; 404 = recurso ainda indisponível (rota planejada), sem o
 * texto técnico do servidor; 403 = sem permissão; sem status (rede) = erro geral.
 */
export function LoadErrorScreen({ error, onRetry }: LoadErrorScreenProps) {
  const { session } = useAuth();
  const { dictionary } = useLanguage();
  const home = session ? "/portal/home" : "/login";

  const status = error instanceof HttpError ? error.status : undefined;
  const clientError = status != null && status < 500;
  const message =
    status === 404
      ? { title: dictionary.error.unavailableTitle, description: dictionary.error.unavailableDescription }
      : status === 403
        ? { title: dictionary.unauthorized.title, description: dictionary.unauthorized.description }
        : clientError
          ? { title: dictionary.error.loadTitle, description: error.message }
          : { title: dictionary.error.title, description: dictionary.error.description };

  let diagnostics = null as { code: string; origin: string; title: string; description: string } | null;
  // @dev-only:start
  // Modo desenvolvedor: erro real e origem, como no card 500 (`app/error.tsx`).
  const { developerModeEnabled } = useDeveloperMode();
  const { view, isNative } = useDevice();
  const front = isNative ? "app mobile" : view === "mobile" ? "web mobile" : "web";
  if (developerModeEnabled) {
    diagnostics = errorDiagnostics(error, front);
  }
  // @dev-only:end

  return (
    <StatusScreen
      code={status != null ? String(status) : diagnostics?.code}
      tone={clientError ? "primary" : "error"}
      icon={clientError ? <LucideCircleAlert className="size-8" /> : <LucideTriangleAlert className="size-8" />}
      meta={diagnostics?.origin}
      title={message.title}
      description={diagnostics?.description || message.description}
      actions={[
        { label: dictionary.error.back, href: home, variant: "outline" },
        { label: dictionary.error.retry, onClick: onRetry },
      ]}
    />
  );
}
