"use client";

import { useEffect } from "react";
import { LucideTriangleAlert } from "lucide-react";

import { StatusScreen } from "@/components/status-screen";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
// @dev-only:start
import { useDevice } from "@/contexts/DeviceContext";
import { errorDiagnostics } from "@/dev-tools/runtime";
import { useDeveloperMode } from "@/dev-tools/ui";
// @dev-only:end

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const { session } = useAuth();
  const { dictionary } = useLanguage();
  const home = session ? "/portal/home" : "/login";

  useEffect(() => {
    console.error("Erro capturado:", error);
  }, [error]);

  // Fora de dev fica a mensagem tratada, sem detalhe técnico.
  let diagnostics = null as { code: string; origin: string; title: string; description: string } | null;
  // @dev-only:start
  // Modo desenvolvedor: o card mostra o erro real e a origem (backend/front).
  const { developerModeEnabled } = useDeveloperMode();
  const { view, isNative } = useDevice();
  const front = isNative ? "app mobile" : view === "mobile" ? "web mobile" : "web";
  if (developerModeEnabled) {
    diagnostics = errorDiagnostics(error, front);
  }
  // @dev-only:end

  return (
    <StatusScreen
      code={diagnostics?.code ?? "500"}
      tone="error"
      icon={<LucideTriangleAlert className="size-8" />}
      meta={diagnostics?.origin}
      title={diagnostics?.title ?? dictionary.error.title}
      description={diagnostics?.description || dictionary.error.description}
      digest={error.digest}
      actions={[
        { label: dictionary.error.back, href: home, variant: "outline" },
        { label: dictionary.error.retry, onClick: () => reset() },
      ]}
    />
  );
}
