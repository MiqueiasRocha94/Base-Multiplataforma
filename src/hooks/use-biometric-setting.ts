"use client";

import { useEffect, useState } from "react";

import { useAuth } from "@/contexts/AuthContext";
import { useDevice } from "@/contexts/DeviceContext";

/**
 * Biometria do login atual como opção da conta (Configurações e indicação no
 * menu). `offerable`: app nativo com biometria no aparelho — fora disso nada
 * aparece. `enable` confirma a digital antes de ligar; desligar não pede.
 */
export function useBiometricSetting() {
  const { isNative, isBiometricAvailable, authenticateBiometric } = useDevice();
  const { biometricEnabled, setBiometricEnabled } = useAuth();
  const [available, setAvailable] = useState(false);

  useEffect(() => {
    if (!isNative) {
      return;
    }
    let cancelled = false;
    void isBiometricAvailable().then((result) => {
      if (!cancelled) {
        setAvailable(result);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [isNative, isBiometricAvailable]);

  const offerable = isNative && available;

  /** Liga após confirmar a biometria; devolve `false` se a confirmação falhou. */
  const enable = async (reason: string) => {
    const confirmed = await authenticateBiometric(reason);
    if (confirmed) {
      setBiometricEnabled(true);
    }
    return confirmed;
  };

  return {
    offerable,
    enabled: biometricEnabled,
    /** Indicação no menu: dá para ligar e ainda não está ligada. */
    pending: offerable && !biometricEnabled,
    enable,
    disable: () => setBiometricEnabled(false),
  };
}
