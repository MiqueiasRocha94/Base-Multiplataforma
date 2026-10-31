"use client";

import { useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";

import { TARGET_PATH } from "@/config/routes";
import { useLanguage } from "@/contexts/LanguageContext";
import { EXIT_CONFIRM_WINDOW_MS, exitApp, resolveBackAction, subscribeBackButton } from "@/lib/platform/back-button";
import { toast } from "@/lib/toast";

/** Raiz do app para o voltar: a home do portal ou qualquer rota fora do portal (login, start). */
function isRootPath(pathname: string) {
  const path = pathname.replace(/\/+$/, "") || "/";
  return path === TARGET_PATH || !path.startsWith("/portal");
}

/**
 * Política do voltar do sistema (Android): volta o histórico — que fecha as
 * camadas empilhadas (DateField, SelectOne, confirmação…) e volta a rota —; na
 * raiz, pede um segundo toque para sair. Montado uma vez no AppStructure; sem UI.
 * Ver docs/plataforma-nativa.md → "Voltar do sistema".
 */
export function SystemBackHandler() {
  const router = useRouter();
  const pathname = usePathname();
  const { dictionary } = useLanguage();
  const lastPressAt = useRef<number | null>(null);
  const latest = useRef({ pathname, exitHint: dictionary.common.pressBackAgainToExit });

  useEffect(() => {
    latest.current = { pathname, exitHint: dictionary.common.pressBackAgainToExit };
  }, [pathname, dictionary]);

  useEffect(
    () =>
      subscribeBackButton(({ canGoBack }) => {
        const now = Date.now();
        const action = resolveBackAction({
          canGoBack,
          atRoot: isRootPath(latest.current.pathname),
          now,
          lastPressAt: lastPressAt.current,
        });
        lastPressAt.current = action === "exit-hint" ? now : null;

        if (action === "history") window.history.back();
        else if (action === "home") router.replace(TARGET_PATH);
        else if (action === "exit-hint") toast.info(latest.current.exitHint, EXIT_CONFIRM_WINDOW_MS);
        else void exitApp();
      }),
    [router],
  );

  return null;
}
