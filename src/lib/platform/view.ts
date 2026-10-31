/**
 * Regra da VIEW (apresentação), sem dependências — importável no servidor
 * (script pré-pintura do layout raiz) e no cliente (DeviceContext).
 *
 * Ponto de virada (px CSS). Menor desktop real: 1280×720 a 125% = 1024.
 * Tablet em retrato vai até 1024 e celular deitado até ~932, então a
 * ORIENTAÇÃO separa o tablet: retrato = mobile, paisagem ≥ 1024 = desktop.
 */
export const DESKTOP_MIN_WIDTH = 1024;

/** Media query da view desktop: paisagem E largura ≥ `DESKTOP_MIN_WIDTH`. O resto é mobile. */
export const DESKTOP_VIEW_QUERY = `(min-width: ${DESKTOP_MIN_WIDTH}px) and (orientation: landscape)`;

/**
 * Script inline do `<head>`: publica `<html data-view>` ANTES da primeira
 * pintura, para as variantes `mobile:`/`desktop:`/`wide:` já valerem no HTML
 * do SSR (sem piscar o layout errado até a hidratação). Depois o DeviceProvider
 * assume e mantém o atributo atualizado (resize/rotação).
 */
export const VIEW_BOOTSTRAP_SCRIPT = `try{document.documentElement.dataset.view=matchMedia(${JSON.stringify(DESKTOP_VIEW_QUERY)}).matches?"desktop":"mobile"}catch(e){}`;
