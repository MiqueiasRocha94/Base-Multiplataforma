import { getBiometricPreference, getSession } from "@/lib/auth/session";
import { isBiometricAuthAvailable } from "@/lib/platform/biometrics";
import { isNativePlatform } from "@/lib/platform/capacitor";

export type ProtectedAccessMode = "biometric" | "web-session" | "none";

export async function resolveProtectedAccessMode(): Promise<ProtectedAccessMode> {
  if (!isNativePlatform()) {
    return "web-session";
  }

  const session = getSession();
  if (!session) {
    return "none";
  }

  const available = await isBiometricAuthAvailable();
  const enabled = getBiometricPreference(session.login);
  return available && enabled ? "biometric" : "none";
}

// "Sair" do menu com biometria ligada volta ao login mantendo a sessão: nessa
// volta a tela de biometria não pede a digital sozinha (a pessoa toca para
// entrar). Estado de módulo — vale para a navegação client-side seguinte.
let skipBiometricAutoPrompt = false;

export function skipBiometricAutoPromptOnce() {
  skipBiometricAutoPrompt = true;
}

export function biometricAutoPromptSkipped() {
  return skipBiometricAutoPrompt;
}

export function clearBiometricAutoPromptSkip() {
  skipBiometricAutoPrompt = false;
}

export async function hasSavedProtectedSession(): Promise<boolean> {
  const session = getSession();
  if (!session?.accessToken?.trim()) {
    return false;
  }

  const mode = await resolveProtectedAccessMode();
  return mode === "web-session" || mode === "biometric";
}
