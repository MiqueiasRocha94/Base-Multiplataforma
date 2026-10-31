"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { LucideArrowLeft, LucideBell, LucideBellOff, LucideBellRing, LucideX } from "lucide-react";

import { useDevice } from "@/contexts/DeviceContext";
import { cn } from "@/lib/utils";
import { isActiveToken, type DeviceNotification, type DeviceNotificationType } from "@/lib/platform/push-notifications";

const TONE: Record<DeviceNotificationType, string> = {
  info: "var(--color-primary)",
  success: "var(--color-success, #16a34a)",
  warning: "var(--color-warning, #d97706)",
  danger: "var(--color-danger, #dc2626)",
};

// Dropdown ancorado (web/tablet): mesma mecânica do AccountMenu — portal p/ body,
// alinhado pela borda com mais espaço no viewport.
type DropdownPosition = { align: "left" | "right"; left: number; right: number; top: number };
const DROPDOWN_WIDTH = 360; // w-90
const VIEWPORT_MARGIN = 8;

/**
 * Botao de notificacoes: o DEFAULT da posicao de "botao especial" (region "top").
 * NAO é um botao tipado — ele nao registra presenca nem toma prioridade: é o
 * fallback que a `Header` (header.end, mobile) e o `MainContent` (topo, web)
 * renderizam quando a pagina NAO montou nenhum botao especial.
 *
 * ADAPTATIVO: no mobile o painel é um sheet full-screen (polegar/safe-area); no
 * web/tablet é um dropdown ancorado no sino — NÃO o takeover mobile.
 *
 * `tone` só ajusta a cor do icone conforme a superficie onde é montado.
 */
export function NotificationButton({ tone = "surface" }: { tone?: "header" | "surface" }) {
  const { view, isNative, registerPush, subscribeNotifications, subscribePushToken } = useDevice();
  const isMobile = view === "mobile";
  const rootRef = useRef<HTMLDivElement | null>(null);
  const dropdownRef = useRef<HTMLDivElement | null>(null);
  const [open, setOpen] = useState(false);
  const [enabling, setEnabling] = useState(false);
  const [items, setItems] = useState<DeviceNotification[]>([]);
  const [token, setToken] = useState<string | null>(null);
  const [position, setPosition] = useState<DropdownPosition>({ align: "right", left: 0, right: 0, top: 0 });

  useEffect(() => subscribeNotifications(setItems), [subscribeNotifications]);
  useEffect(() => subscribePushToken(setToken), [subscribePushToken]);

  // Fechar ao clicar fora (só no dropdown web/tablet; o sheet mobile fecha no botão).
  useEffect(() => {
    if (!open || isMobile) {
      return;
    }
    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (rootRef.current?.contains(target) || dropdownRef.current?.contains(target)) {
        return;
      }
      setOpen(false);
    };
    window.addEventListener("mousedown", handlePointerDown);
    return () => window.removeEventListener("mousedown", handlePointerDown);
  }, [open, isMobile]);

  // Posiciona o dropdown ancorado ao sino (web/tablet): cresce para o lado com mais
  // espaço para não vazar da viewport.
  useLayoutEffect(() => {
    if (!open || isMobile || !rootRef.current) {
      return;
    }
    const updatePosition = () => {
      if (!rootRef.current) {
        return;
      }
      const rect = rootRef.current.getBoundingClientRect();
      const fitsToTheRight = rect.left + DROPDOWN_WIDTH + VIEWPORT_MARGIN <= window.innerWidth;
      setPosition(
        fitsToTheRight
          ? { align: "left", left: rect.left, right: 0, top: rect.bottom + 8 }
          : { align: "right", left: 0, right: window.innerWidth - rect.right, top: rect.bottom + 8 },
      );
    };
    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [open, isMobile]);

  const onEnable = useCallback(async () => {
    setEnabling(true);
    try {
      setToken(await registerPush());
    } finally {
      setEnabling(false);
    }
  }, [registerPush]);

  const active = isActiveToken(token);

  // Conteúdo compartilhado (status + lista) — reusado pelo sheet e pelo dropdown.
  const panelBody = (
    <>
      {/* Ativação de PUSH só no native: no web/PWA não há push (token
          "web-unsupported"), então o card de ativação não aparece. */}
      {isNative ? (
        <div className="grid gap-2 rounded-xl border border-border bg-background p-4">
          <div className="flex items-center gap-2">
            {active ? (
              <LucideBellRing className="size-5 text-[color:var(--color-primary)]" />
            ) : (
              <LucideBellOff className="size-5 text-text-muted" />
            )}
            <span className="text-sm font-semibold text-text">
              {active ? "Notificações ativas" : "Notificações inativas"}
            </span>
          </div>
          <p className="break-all text-xs text-text-muted">Push token: {token ?? "nao registrado"}</p>
          {!active ? (
            <button
              type="button"
              onClick={() => void onEnable()}
              disabled={enabling}
              className="mt-1 rounded-xl bg-primary py-2.5 text-sm font-semibold text-white transition hover:bg-primary-strong disabled:opacity-60"
            >
              {enabling ? "Ativando…" : "Ativar notificações"}
            </button>
          ) : null}
        </div>
      ) : null}

      {items.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-10 text-text-muted">
          <LucideBellOff className="size-9" />
          <span className="text-sm">Nenhuma notificação.</span>
        </div>
      ) : (
        items.map((item) => (
          <div key={item.id} className="flex gap-3 rounded-xl border border-border bg-surface p-3">
            <span className="mt-1.5 size-2.5 shrink-0 rounded-full" style={{ backgroundColor: TONE[item.type] }} />
            <div className="grid gap-0.5">
              <span className="text-sm font-semibold text-text">{item.title}</span>
              <span className="text-xs text-text-muted">{item.message}</span>
            </div>
          </div>
        ))
      )}
    </>
  );

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((current) => (isMobile ? true : !current))}
        aria-label="Notificações"
        className={cn(
          "relative inline-flex size-9 items-center justify-center rounded-full transition hover:bg-[color:var(--color-surface-strong)]",
          tone === "header" ? "text-[color:var(--color-header-foreground)]" : "text-[color:var(--color-text)]",
        )}
      >
        <LucideBell className="size-5" />
        {items.length > 0 ? (
          <span className="absolute -right-0.5 -top-0.5 inline-flex min-w-4 items-center justify-center rounded-full bg-danger px-1 text-[10px] font-bold text-white">
            {items.length > 99 ? "99+" : items.length}
          </span>
        ) : null}
      </button>

      {open && typeof document !== "undefined"
        ? isMobile
          ? createPortal(
              // Mobile: sheet full-screen (portal p/ body — o header tem backdrop-blur
              // que ancoraria o `fixed` no header em vez da viewport).
              <div className="fixed inset-0 z-[1200] flex flex-col bg-[color:var(--color-background)]">
                <div className="flex items-center gap-3 bg-primary px-4 py-3 text-white pt-[max(var(--app-safe-top),0.75rem)]">
                  <span className="text-base font-medium">Notificações</span>
                </div>

                <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4">{panelBody}</div>

                <div className="shrink-0 border-t border-border bg-surface p-4 pb-[max(var(--app-safe-bottom),1rem)]">
                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    className="flex w-full items-center justify-center gap-2 rounded-2xl bg-primary py-3 text-sm font-semibold text-on-primary transition hover:bg-primary-strong"
                  >
                    <LucideArrowLeft className="size-4" />
                    Voltar
                  </button>
                </div>
              </div>,
              document.body,
            )
          : createPortal(
              // Desktop: dropdown ancorado ao sino.
              <div
                ref={dropdownRef}
                className="fixed z-[1200] w-[360px] max-w-[calc(100vw-16px)] overflow-hidden rounded-[var(--radius-xl)] border border-border bg-surface shadow-[var(--shadow-soft)]"
                style={
                  position.align === "left"
                    ? { left: position.left, top: position.top }
                    : { right: position.right, top: position.top }
                }
              >
                <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
                  <span className="text-sm font-semibold text-text">Notificações</span>
                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    aria-label="Fechar"
                    className="inline-flex size-8 items-center justify-center rounded-full text-text-muted transition hover:bg-[color:var(--color-surface-strong)]"
                  >
                    <LucideX className="size-4" />
                  </button>
                </div>

                <div className="max-h-[min(70vh,32rem)] space-y-3 overflow-y-auto p-3">{panelBody}</div>
              </div>,
              document.body,
            )
        : null}
    </div>
  );
}
