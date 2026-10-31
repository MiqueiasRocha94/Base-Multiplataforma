// Transição de abertura do APK: a tela /start mostra o logo no centro e o login o
// leva do centro até a posição dele (AuthShell). O sinal é estado de módulo —
// vale para a navegação client-side seguinte, sem parâmetro na URL — e é
// encerrado pelo login quando a animação termina.

/** Altura do logo no centro da /start; o login parte deste tamanho. */
export const START_LOGO_HEIGHT_PX = 96;

/** Curva e duração do movimento do logo até o login. */
export const LOGO_MOVE = { duration: 700, easing: "cubic-bezier(0.22, 1, 0.36, 1)" };

let pending = false;

export function requestLoginIntro() {
  pending = true;
}

export function loginIntroPending() {
  return pending;
}

export function finishLoginIntro() {
  pending = false;
}

export function prefersReducedMotion() {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}
