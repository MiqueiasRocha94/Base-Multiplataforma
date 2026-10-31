/**
 * Sinal leve para abrir o AccountMenu programaticamente entre componentes que
 * não compartilham árvore. Ex.: a tela Profile (mobile-only) redireciona para a
 * Home no desktop/tablet e pede a abertura do menu da conta.
 *
 * Evita `useSearchParams` (que exigiria Suspense no `output: export` mobile —
 * ver docs/estrutura-projeto.md rotas estáticas por ?id=) e mantém o AccountMenu como dono do seu próprio
 * estado `open`: aqui só há um canal de notificação.
 */

type Listener = () => void;

const listeners = new Set<Listener>();
// Pedido feito quando ainda não há AccountMenu montado (ex.: reload direto em
// /portal/profile no desktop): fica pendente até o próximo assinante montar.
let pending = false;

export function requestOpenAccountMenu() {
  if (listeners.size > 0) {
    listeners.forEach((listener) => listener());
    return;
  }
  pending = true;
}

export function subscribeOpenAccountMenu(listener: Listener) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Consome (uma única vez) um pedido feito antes de haver assinantes. */
export function consumePendingAccountMenuOpen() {
  const value = pending;
  pending = false;
  return value;
}
