import { isNativePlatform } from "@/lib/platform/capacitor";
import type { DeviceType } from "@/lib/platform/device-info";

/**
 * Orientação da tela no app nativo, por tipo de APARELHO:
 * - celular → trava em retrato (o layout mobile é pensado para uso vertical);
 * - tablet  → livre (alterna entre retrato e paisagem).
 * Web: não faz nada (o navegador/usuário decide). Plugin `@capacitor/screen-orientation`
 * com import lazy, no mesmo padrão dos demais recursos nativos.
 */
export async function applyOrientationPolicy(deviceType: DeviceType): Promise<void> {
  if (!isNativePlatform() || deviceType === "desktop") {
    return;
  }

  try {
    const { ScreenOrientation } = await import("@capacitor/screen-orientation");
    if (deviceType === "phone") {
      await ScreenOrientation.lock({ orientation: "portrait" });
    } else {
      await ScreenOrientation.unlock();
    }
  } catch {
    // Plugin ausente (APK antigo sem `cap sync`) ou recusa do SO: segue sem travar.
  }
}
