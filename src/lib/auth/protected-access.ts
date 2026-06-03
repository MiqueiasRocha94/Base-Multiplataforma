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
  const enabled = getBiometricPreference(session.email);
  return available && enabled ? "biometric" : "none";
}

export async function hasSavedProtectedSession(): Promise<boolean> {
  const session = getSession();
  if (!session?.accessToken?.trim()) {
    return false;
  }

  const mode = await resolveProtectedAccessMode();
  return mode === "web-session" || mode === "biometric";
}
