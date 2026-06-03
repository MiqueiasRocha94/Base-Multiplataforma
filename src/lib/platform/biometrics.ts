import { isNativePlatform } from "@/lib/platform/capacitor";

export async function isBiometricAuthAvailable() {
  if (!isNativePlatform()) {
    return false;
  }

  const { BiometricAuth } = await import("@aparajita/capacitor-biometric-auth");
  const result = await BiometricAuth.checkBiometry();
  return result.isAvailable;
}

export type BiometricAuthResult = {
  authenticated: boolean;
};

export async function requestBiometricAuth(reason: string): Promise<BiometricAuthResult> {
  if (!isNativePlatform()) {
    return { authenticated: false };
  }

  const { BiometricAuth } = await import("@aparajita/capacitor-biometric-auth");
  const result = await BiometricAuth.authenticate({
    reason,
    cancelTitle: "Cancelar",
    allowDeviceCredential: true,
  });

  return { authenticated: Boolean(result) };
}
