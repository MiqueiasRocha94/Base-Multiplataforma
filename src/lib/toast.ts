/**
 * Aviso rápido (toast): sucesso, erro ou informação que some sozinho. Estado em
 * módulo (sem context): qualquer tela chama `toast.success(...)` e o `<Toaster />`,
 * montado uma vez no AppStructure, exibe — inclusive depois de trocar de rota.
 * Ver docs/componentes-ui.md → "Catálogo".
 */

export type ToastTone = "success" | "error" | "info";

export type ToastItem = {
  id: number;
  tone: ToastTone;
  message: string;
};

/** Tempo na tela antes de sumir sozinho. */
export const TOAST_DURATION_MS = 4000;
/** Avisos simultâneos; o mais antigo sai quando chega um além do limite. */
export const TOAST_MAX_VISIBLE = 3;

type Listener = () => void;

const listeners = new Set<Listener>();
const timers = new Map<number, ReturnType<typeof setTimeout>>();
let items: ToastItem[] = [];
let nextId = 1;

function emit() {
  listeners.forEach((listener) => listener());
}

export function dismissToast(id: number) {
  const timer = timers.get(id);
  if (timer) {
    clearTimeout(timer);
    timers.delete(id);
  }
  if (!items.some((item) => item.id === id)) {
    return;
  }
  items = items.filter((item) => item.id !== id);
  emit();
}

function show(tone: ToastTone, message: string, durationMs = TOAST_DURATION_MS): number {
  const id = nextId++;
  const overflow = items.length + 1 - TOAST_MAX_VISIBLE;
  for (const item of items.slice(0, Math.max(overflow, 0))) {
    dismissToast(item.id);
  }
  items = [...items, { id, tone, message }];
  timers.set(id, setTimeout(() => dismissToast(id), durationMs));
  emit();
  return id;
}

export const toast = {
  success: (message: string, durationMs?: number) => show("success", message, durationMs),
  error: (message: string, durationMs?: number) => show("error", message, durationMs),
  info: (message: string, durationMs?: number) => show("info", message, durationMs),
};

export function subscribeToasts(listener: Listener) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getToasts(): ToastItem[] {
  return items;
}

const noToasts: ToastItem[] = [];

export function getServerToasts(): ToastItem[] {
  return noToasts;
}
