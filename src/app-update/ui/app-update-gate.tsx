"use client";

import { useEffect, useState } from "react";

import {
  appUpdateActive,
  applyAppUpdateNow,
  confirmAppStart,
  findAppUpdate,
  prepareAppUpdate, /* @dev-only:start */ onAppUpdateCheckRequest, /* @dev-only:end */
} from "@/app-update/runtime";
import { Loading } from "@/components/loading";

import { useAppUpdateDictionary } from "./use-app-update-dictionary";

type CheckResult = "none" | "applying" | "failed";

/**
 * Ciclo da atualização remota na abertura do app (docs/ambiente-e-build.md →
 * "Atualização remota do app"): confirma o pacote atual, consulta o canal e
 * deixa o pacote novo para a próxima abertura. Pacote obrigatório é aplicado na
 * hora, com aviso em tela cheia. Sem rede ou com falha, segue no pacote atual.
 */
export function AppUpdateGate() {
  const dictionary = useAppUpdateDictionary();
  const [applying, setApplying] = useState(false);

  useEffect(() => {
    if (!appUpdateActive()) return;
    let cancelled = false;
    let inFlight: Promise<CheckResult> | null = null;
    const runCheck = async (): Promise<CheckResult> => {
      try {
        const update = await findAppUpdate();
        if (!update || cancelled) return "none";
        if (update.mandatory) setApplying(true);
        await prepareAppUpdate(update);
        if (update.mandatory && !cancelled) await applyAppUpdateNow();
        return "applying";
      } catch (error) {
        // Atualização é melhor esforço: o app segue no pacote atual e tenta na próxima abertura.
        console.warn("[app-update] atualização não aplicada:", error);
        setApplying(false);
        return "failed";
      }
    };
    // Uma verificação por vez (abertura e pedido do painel de dev não se sobrepõem).
    const check = () => {
      inFlight ??= runCheck().finally(() => {
        inFlight = null;
      });
      return inFlight;
    };
    const run = async () => {
      try {
        await confirmAppStart();
      } catch (error) {
        console.warn("[app-update] abertura não confirmada:", error);
        return;
      }
      await check();
    };
    void run();
    // @dev-only:start
    // APK debug: além da abertura, verifica quando o botão do painel de dev pede
    // (docs/ambiente-e-build.md → "Atualização no desenvolvimento").
    const stopListening = onAppUpdateCheckRequest(check);
    // @dev-only:end
    return () => {
      cancelled = true;
      // @dev-only:start
      stopListening();
      // @dev-only:end
    };
  }, []);

  return applying ? <Loading fullScreen message={dictionary.applying} /> : null;
}
