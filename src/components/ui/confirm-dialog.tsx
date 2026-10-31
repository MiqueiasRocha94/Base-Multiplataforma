"use client";

import { useEffect, useId, useRef, useSyncExternalStore } from "react";

import { Button } from "@/components/ui/button";
import { useLanguage } from "@/contexts/LanguageContext";
import {
  getConfirmRequest,
  getServerConfirmRequest,
  settleConfirm,
  subscribeConfirm,
  type ConfirmRequest,
} from "@/lib/confirm";

/**
 * Exibe o pedido de `requestConfirm` (lib/confirm). Montado uma vez no AppStructure.
 * Desktop: diálogo centralizado; mobile: folha ancorada embaixo (zona do polegar).
 */
export function ConfirmHost() {
  const request = useSyncExternalStore(subscribeConfirm, getConfirmRequest, getServerConfirmRequest);
  return request ? <ConfirmDialog key={request.id} request={request} /> : null;
}

const HISTORY_KEY = "__confirm";

function isOwnHistoryEntry() {
  return Boolean((window.history.state as Record<string, unknown> | null)?.[HISTORY_KEY]);
}

function ConfirmDialog({ request }: { request: ConfirmRequest }) {
  const { dictionary } = useLanguage();
  const titleId = useId();
  const messageId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);
  // Resposta escolhida enquanto o estado do histórico é desempilhado.
  const chosen = useRef<boolean | null>(null);

  // Nível de navegação, como as demais camadas: abrir empilha um estado no
  // histórico e o voltar do sistema cancela. A resposta só sai depois do
  // `popstate`, para a tela poder navegar sem a volta pendente desfazer a rota.
  useEffect(() => {
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    // Guarda contra empilhar duas vezes (efeito repetido do StrictMode em dev).
    if (!isOwnHistoryEntry()) {
      window.history.pushState({ [HISTORY_KEY]: true }, "");
    }
    cancelRef.current?.focus();

    const onPop = () => settleConfirm(chosen.current ?? false);
    window.addEventListener("popstate", onPop);
    return () => {
      window.removeEventListener("popstate", onPop);
      previousFocus?.focus();
    };
  }, []);

  const choose = (confirmed: boolean) => {
    if (chosen.current !== null) {
      return;
    }
    chosen.current = confirmed;
    if (isOwnHistoryEntry()) {
      window.history.back();
      return;
    }
    settleConfirm(confirmed);
  };

  const onKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === "Escape") {
      event.preventDefault();
      choose(false);
      return;
    }
    if (event.key !== "Tab" || !panelRef.current) {
      return;
    }
    // Foco preso no diálogo: Tab circula só entre os botões dele.
    const buttons = Array.from(panelRef.current.querySelectorAll<HTMLButtonElement>("button:not([disabled])"));
    const first = buttons[0];
    const last = buttons.at(-1);
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last?.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first?.focus();
    }
  };

  return (
    <div
      className="fixed inset-0 z-[1400] flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm mobile:items-end mobile:p-0 wide:items-center wide:p-4"
      onClick={() => choose(false)}
      onKeyDown={onKeyDown}
    >
      <div
        ref={panelRef}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={request.title ? titleId : undefined}
        aria-describedby={messageId}
        onClick={(event) => event.stopPropagation()}
        className="flex w-full max-w-md flex-col gap-5 rounded-[var(--radius-2xl)] border border-border bg-surface p-5 shadow-[var(--shadow-soft)] mobile:max-w-none mobile:rounded-b-none mobile:pb-[calc(var(--app-safe-bottom)+1.25rem)] wide:max-w-md wide:rounded-b-[var(--radius-2xl)] wide:pb-5"
      >
        <div className="grid gap-2">
          {request.title ? (
            <p id={titleId} className="text-base font-bold text-text">
              {request.title}
            </p>
          ) : null}
          <p id={messageId} className="text-sm text-text-muted">
            {request.message}
          </p>
        </div>
        <div className="flex flex-col-reverse gap-3 wide:flex-row wide:justify-end desktop:flex-row desktop:justify-end">
          <Button ref={cancelRef} variant="outline" onClick={() => choose(false)}>
            {request.cancelLabel ?? dictionary.common.cancel}
          </Button>
          <Button variant={request.destructive ? "danger" : "default"} onClick={() => choose(true)}>
            {request.confirmLabel ?? dictionary.common.confirm}
          </Button>
        </div>
      </div>
    </div>
  );
}
