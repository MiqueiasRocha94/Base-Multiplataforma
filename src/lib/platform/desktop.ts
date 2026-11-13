/**
 * App desktop (Tauri, `src-tauri/`). Fora dele — web e app mobile — tudo aqui é
 * no-op e a API do Tauri nem é carregada (import lazy, chunk à parte).
 * O Capacitor não enxerga o Tauri: `isNativePlatform()` continua `false` no
 * desktop e os demais wrappers seguem o caminho web.
 */
export function isDesktopApp() {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}

/** Iniciar com o sistema (Windows/Linux): estado atual da entrada do SO. */
export async function isAutostartEnabled() {
  if (!isDesktopApp()) {
    return false;
  }
  const { isEnabled } = await import("@tauri-apps/plugin-autostart");
  return isEnabled();
}

/** Liga/desliga o iniciar com o sistema; desligar remove a entrada do SO. */
export async function setAutostartEnabled(enabled: boolean) {
  if (!isDesktopApp()) {
    return;
  }
  const { disable, enable } = await import("@tauri-apps/plugin-autostart");
  await (enabled ? enable() : disable());
}

/** Rótulos do menu da bandeja no idioma do app (`src-tauri/src/tray.rs`). */
export async function setTrayLabels(open: string, quit: string) {
  if (!isDesktopApp()) {
    return;
  }
  const { invoke } = await import("@tauri-apps/api/core");
  await invoke("set_tray_labels", { open, quit });
}
