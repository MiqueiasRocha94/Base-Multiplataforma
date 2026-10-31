"use client";

import { useDevice } from "@/contexts/DeviceContext";
// @dev-only:start
import { useDeveloperMode } from "@/dev-tools/ui";
// @dev-only:end

/**
 * Captcha (Turnstile) exigido nas telas de auth? Fonte única da regra: só no
 * build web (no apk nativo não existe). Em dev, o modo desenvolvedor pode
 * desligar (`captchaDisabled`).
 */
export function useCaptchaRequired(): boolean {
  const { isNative } = useDevice();
  // @dev-only:start
  const { developerModeEnabled, settings } = useDeveloperMode();
  if (developerModeEnabled && settings.captchaDisabled) {
    return false;
  }
  // @dev-only:end
  return !isNative;
}
