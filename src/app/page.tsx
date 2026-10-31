"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import { useDevice } from "@/contexts/DeviceContext";

// Entrada do app. A interação difere por BUILD, não por viewport:
//   • Web (navegador, incl. mobile) → vai direto ao login.
//   • APK nativo → passa pela tela de transição (`/start`) e então ao login.
// O corte usa `isNative` (só o build APK roda nativo). Espera `resolved` porque
// antes disso o DeviceContext ainda reporta o default de SSR (isNative=false).
export default function Page() {
  const router = useRouter();
  const { isNative, resolved } = useDevice();

  useEffect(() => {
    if (!resolved) {
      return;
    }
    router.replace(isNative ? "/start" : "/login");
  }, [resolved, isNative, router]);

  return null;
}
