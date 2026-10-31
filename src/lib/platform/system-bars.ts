import { SystemBars, SystemBarsStyle, SystemBarType } from "@capacitor/core";

import { isNativePlatform } from "@/lib/platform/capacitor";

/**
 * Barras do SO no app nativo (Capacitor 8, edge-to-edge): o app desenha por baixo
 * da barra de status e da de navegação, que ficam transparentes. O fundo delas é o
 * que a página pinta ali (header/footer, via `--app-safe-*`); aqui só se escolhe a
 * cor dos ícones — claros sobre fundo escuro, escuros sobre fundo claro.
 */

type Rgb = [number, number, number];

/** Cor computada: `rgb()/rgba()` (0–255) ou `color(srgb …)` (0–1, ex.: `color-mix`). */
export function parseRgb(color: string): { rgb: Rgb; alpha: number } | null {
  const srgb = /^color\(srgb\s+([^)]+)\)$/.exec(color.trim());
  const match = srgb ?? /^rgba?\(([^)]+)\)$/.exec(color.trim());
  if (!match) {
    return null;
  }
  const parts = match[1].split(/[\s,/]+/).filter(Boolean).map(Number);
  if (parts.length < 3 || parts.some(Number.isNaN)) {
    return null;
  }
  const scale = srgb ? 255 : 1;
  return { rgb: [parts[0] * scale, parts[1] * scale, parts[2] * scale], alpha: parts[3] ?? 1 };
}

/** Luminância relativa (WCAG) de uma cor sRGB 0–255. */
export function relativeLuminance([r, g, b]: Rgb): number {
  const channel = (value: number) => {
    const c = value / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

/** Estilo das barras para um fundo: `Dark` = ícones claros (fundo escuro). */
export function systemBarsStyleFor(background: Rgb): SystemBarsStyle {
  return relativeLuminance(background) < 0.4 ? SystemBarsStyle.Dark : SystemBarsStyle.Light;
}

/** Primeiro fundo opaco a partir do elemento no ponto, subindo até o <html>. */
function backgroundAt(x: number, y: number): Rgb | null {
  let element: Element | null = document.elementFromPoint(x, y);
  while (element) {
    const parsed = parseRgb(getComputedStyle(element).backgroundColor);
    if (parsed && parsed.alpha > 0.5) {
      return parsed.rgb;
    }
    element = element.parentElement;
  }
  return null;
}

const lastApplied: Partial<Record<SystemBarType, SystemBarsStyle>> = {};

function applyStyle(bar: SystemBarType, background: Rgb | null) {
  const style = background ? systemBarsStyleFor(background) : SystemBarsStyle.Default;
  if (lastApplied[bar] === style) {
    return;
  }
  lastApplied[bar] = style;
  void SystemBars.setStyle({ style, bar });
}

function syncSystemBars() {
  const x = window.innerWidth / 2;
  applyStyle(SystemBarType.StatusBar, backgroundAt(x, 1));
  applyStyle(SystemBarType.NavigationBar, backgroundAt(x, window.innerHeight - 1));
}

/**
 * Mantém a cor dos ícones das barras de acordo com o que está sob elas: amostra o
 * fundo no topo e na base da tela a cada mudança do DOM (tema, marca, header/footer,
 * overlays). Só no app nativo; na web as barras são do navegador.
 */
export function subscribeSystemBarsSync(): () => void {
  if (!isNativePlatform()) {
    return () => undefined;
  }
  let frame = 0;
  const schedule = () => {
    if (frame === 0) {
      frame = window.requestAnimationFrame(() => {
        frame = 0;
        syncSystemBars();
      });
    }
  };
  const observer = new MutationObserver(schedule);
  observer.observe(document.documentElement, { attributes: true, childList: true, subtree: true });
  window.addEventListener("resize", schedule);
  schedule();
  return () => {
    observer.disconnect();
    window.removeEventListener("resize", schedule);
    if (frame !== 0) {
      window.cancelAnimationFrame(frame);
    }
  };
}
