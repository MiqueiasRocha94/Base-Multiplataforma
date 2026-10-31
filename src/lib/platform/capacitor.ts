import { Capacitor } from "@capacitor/core";

import { DESKTOP_VIEW_QUERY } from "@/lib/platform/view";

export function isNativePlatform() {
  return Capacitor.isNativePlatform();
}

export function getPlatform() {
  return Capacitor.getPlatform();
}

export function isPluginAvailable(name: string) {
  return Capacitor.isPluginAvailable(name);
}

export { DESKTOP_MIN_WIDTH } from "@/lib/platform/view";

/** Janela de desktop: paisagem E largura ≥ `DESKTOP_MIN_WIDTH`. O resto é mobile. */
export function isDesktopViewport() {
  if (typeof window === "undefined") {
    return true;
  }

  return window.matchMedia(DESKTOP_VIEW_QUERY).matches;
}
