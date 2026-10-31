"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

import { useBrand } from "@/contexts/BrandContext";
import { useDevice } from "@/contexts/DeviceContext";

import { START_LOGO_HEIGHT_PX, prefersReducedMotion, requestLoginIntro } from "./login-intro";

const TARGET_PATH = "/login";
// Logo aparece (fade + leve zoom) e fica no centro antes de seguir para o login.
const APPEAR_MS = 500;
const HOLD_MS = 700;

/**
 * Tela de transição de entrada — EXCLUSIVA do APK: o logo da marca aparece no
 * centro e o login o leva até a posição dele (AuthShell + login-intro). No web
 * ela não existe como destino: num navegador segue direto para o login. O corte
 * usa `isNative` e espera `resolved` (antes disso o DeviceContext reporta o
 * default de SSR).
 */
export function StartTransition() {
  const router = useRouter();
  const { brand } = useBrand();
  const { isNative, resolved } = useDevice();
  const logoRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    if (!resolved) return;
    if (!isNative) {
      router.replace(TARGET_PATH);
      return;
    }
    const reduced = prefersReducedMotion();
    if (!reduced) {
      logoRef.current?.animate(
        [
          { opacity: 0, transform: "scale(0.92)" },
          { opacity: 1, transform: "scale(1)" },
        ],
        { duration: APPEAR_MS, easing: "ease-out", fill: "backwards" },
      );
    }
    const timer = window.setTimeout(() => {
      if (!reduced) requestLoginIntro();
      router.replace(TARGET_PATH);
    }, APPEAR_MS + HOLD_MS);
    return () => window.clearTimeout(timer);
  }, [resolved, isNative, router]);

  if (!resolved || !isNative) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[1500] flex items-center justify-center bg-background">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img ref={logoRef} src={brand.logo} alt={brand.name} style={{ height: START_LOGO_HEIGHT_PX }} className="w-auto" />
    </div>
  );
}
