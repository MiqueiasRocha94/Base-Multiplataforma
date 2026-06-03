import { Capacitor } from "@capacitor/core";

export function isNativePlatform() {
  return Capacitor.isNativePlatform();
}

export function getPlatform() {
  return Capacitor.getPlatform();
}

export function isPluginAvailable(name: string) {
  return Capacitor.isPluginAvailable(name);
}

export function isMobileViewport() {
  if (typeof window === "undefined") {
    return false;
  }

  return window.matchMedia("(max-width: 767px)").matches;
}

export function isTabletViewport() {
  if (typeof window === "undefined") {
    return false;
  }

  return window.matchMedia("(min-width: 768px) and (max-width: 1024px)").matches;
}
