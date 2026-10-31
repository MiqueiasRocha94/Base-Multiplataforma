/**
 * Confirmação do design system, no lugar do `window.confirm`: `await requestConfirm({...})`
 * devolve `true` (confirmou) ou `false` (cancelou, Esc, fundo ou voltar). Estado em
 * módulo (sem context); o `<ConfirmHost />`, montado uma vez no AppStructure, exibe.
 * Ver docs/componentes-ui.md → "Catálogo".
 */

export type ConfirmOptions = {
  message: string;
  title?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** Ação destrutiva (excluir, descartar): botão de confirmar em `danger`. */
  destructive?: boolean;
};

export type ConfirmRequest = ConfirmOptions & { id: number };

type Listener = () => void;

const listeners = new Set<Listener>();
let current: ConfirmRequest | null = null;
let resolveCurrent: ((confirmed: boolean) => void) | null = null;
let nextId = 1;

function emit() {
  listeners.forEach((listener) => listener());
}

/** Responde o pedido aberto; sem pedido (ou já respondido), não faz nada. */
export function settleConfirm(confirmed: boolean) {
  const resolve = resolveCurrent;
  if (!resolve) {
    return;
  }
  current = null;
  resolveCurrent = null;
  emit();
  resolve(confirmed);
}

/** Um pedido por vez: um novo cancela o que estiver aberto. */
export function requestConfirm(options: ConfirmOptions): Promise<boolean> {
  settleConfirm(false);
  return new Promise<boolean>((resolve) => {
    current = { ...options, id: nextId++ };
    resolveCurrent = resolve;
    emit();
  });
}

export function subscribeConfirm(listener: Listener) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getConfirmRequest(): ConfirmRequest | null {
  return current;
}

export function getServerConfirmRequest(): ConfirmRequest | null {
  return null;
}
