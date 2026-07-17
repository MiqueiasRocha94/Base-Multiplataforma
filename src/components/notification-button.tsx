"use client";

import { useCallback, useEffect, useState } from "react";
import { LucideBell, LucideBellOff, LucideBellRing } from "lucide-react";

import { useDevice } from "@/contexts/DeviceContext";
import { isActiveToken, type DeviceNotification, type DeviceNotificationType } from "@/lib/platform/push-notifications";

const TONE: Record<DeviceNotificationType, string> = {
  info: "var(--color-primary)",
  success: "var(--color-success, #16a34a)",
  warning: "var(--color-warning, #d97706)",
  danger: "var(--color-danger, #dc2626)",
};

/**
 * Botao de notificacoes do header (default do "special button"). Porta o
 * NotificationButton da base mobile: sino com contador e um painel com o estado
 * do push (token) e a lista de notificacoes recebidas.
 */
export function NotificationButton() {
  const { registerPush, subscribeNotifications, subscribePushToken } = useDevice();
  const [open, setOpen] = useState(false);
  const [enabling, setEnabling] = useState(false);
  const [items, setItems] = useState<DeviceNotification[]>([]);
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => subscribeNotifications(setItems), [subscribeNotifications]);
  useEffect(() => subscribePushToken(setToken), [subscribePushToken]);

  const onEnable = useCallback(async () => {
    setEnabling(true);
    try {
      setToken(await registerPush());
    } finally {
      setEnabling(false);
    }
  }, [registerPush]);

  const active = isActiveToken(token);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Notificações"
        className="relative inline-flex size-9 items-center justify-center rounded-full text-[color:var(--color-header-foreground)] transition hover:bg-[color:var(--color-surface-strong)]"
      >
        <LucideBell className="size-5" />
        {items.length > 0 ? (
          <span className="absolute -right-0.5 -top-0.5 inline-flex min-w-4 items-center justify-center rounded-full bg-danger px-1 text-[10px] font-bold text-white">
            {items.length > 99 ? "99+" : items.length}
          </span>
        ) : null}
      </button>

      {open ? (
        <div className="fixed inset-0 z-[1200] flex flex-col bg-[color:var(--color-background)]">
          <div className="flex items-center justify-between gap-3 bg-primary px-4 py-3 text-white pt-[max(env(safe-area-inset-top),0.75rem)]">
            <span className="text-base font-medium">Notificações</span>
            <button type="button" onClick={() => setOpen(false)} className="text-sm font-semibold">
              Fechar
            </button>
          </div>

          <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4">
            <div className="grid gap-2 rounded-xl border border-border bg-surface p-4">
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
          </div>
        </div>
      ) : null}
    </>
  );
}
