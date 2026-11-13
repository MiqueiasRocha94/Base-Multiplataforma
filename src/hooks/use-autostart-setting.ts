"use client";

import { useEffect, useState } from "react";

import { isAutostartEnabled, isDesktopApp, setAutostartEnabled } from "@/lib/platform/desktop";

/**
 * "Iniciar com o sistema" como opção das Configurações. `offerable`: só no app
 * desktop — fora dele nada aparece. O estado vem do SO (a entrada pode ter sido
 * removida por fora do app), lido ao montar.
 */
export function useAutostartSetting() {
  const [offerable, setOfferable] = useState(false);
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    if (!isDesktopApp()) {
      return;
    }
    let cancelled = false;
    void isAutostartEnabled().then((result) => {
      if (!cancelled) {
        setOfferable(true);
        setEnabled(result);
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  /** Grava no SO; em falha o estado exibido não muda e o erro sobe para a tela. */
  const setAutostart = async (next: boolean) => {
    await setAutostartEnabled(next);
    setEnabled(next);
  };

  return { offerable, enabled, setAutostart };
}
