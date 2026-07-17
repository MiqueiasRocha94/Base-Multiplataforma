"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";

import { getPlatform, isMobileViewport, isNativePlatform, isTabletViewport } from "@/lib/platform/capacitor";
import { isBiometricAuthAvailable, requestBiometricAuth } from "@/lib/platform/biometrics";
import { subscribeToAppVisibility } from "@/lib/platform/app-visibility";
import {
  initializePushNotifications,
  subscribeDeviceNotifications,
  subscribePushToken,
  type DeviceNotification,
} from "@/lib/platform/push-notifications";
import { generateFileId, type FileItem } from "@/types/file-item";

export type DeviceView = "mobile" | "desktop" | "tablet";

// Detecção de dispositivo (parte "estado" do contexto).
type DeviceState = {
  isNative: boolean;
  isPhone: boolean;
  isTablet: boolean;
  platform: string;
  view: DeviceView;
};

// Contexto = detecção + portão único de recursos do dispositivo. Cada recurso
// decide o caminho por plataforma/permissão, delegando para `@/lib/platform/*`.
type DeviceContextValue = DeviceState & {
  /** Captura/seleção de imagem: câmera nativa (Prompt) × explorador de arquivos (web). */
  pickImage: () => Promise<FileItem | null>;
  /** Biometria disponível no aparelho (sempre false na web). */
  isBiometricAvailable: () => Promise<boolean>;
  /** Solicita autenticação biométrica; retorna se autenticou. */
  authenticateBiometric: (reason: string) => Promise<boolean>;
  /** Assina mudanças de visibilidade do app (foreground/background). */
  subscribeAppVisibility: (handler: (visible: boolean) => void) => () => void;
  /** Registra push e retorna o token (ou um "motivo" na web/sem permissão). */
  registerPush: () => Promise<string | null>;
  /** Assina a lista de notificações recebidas. */
  subscribeNotifications: (listener: (items: DeviceNotification[]) => void) => () => void;
  /** Assina o token de push corrente. */
  subscribePushToken: (listener: (token: string | null) => void) => () => void;
};

// --- Recursos do dispositivo (funções estáveis, decidem web × nativo) ---

function pickImageFromFileSystem(): Promise<FileItem | null> {
  return new Promise((resolve) => {
    if (typeof document === "undefined") {
      resolve(null);
      return;
    }
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) {
        resolve(null);
        return;
      }
      const reader = new FileReader();
      reader.onload = () =>
        resolve({ id: generateFileId(), name: file.name, uri: String(reader.result), mimeType: file.type || "image/*" });
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(file);
    };
    // Suportado nos browsers modernos: usuário fechou o seletor sem escolher.
    input.oncancel = () => resolve(null);
    input.click();
  });
}

async function pickImageResource(): Promise<FileItem | null> {
  if (isNativePlatform()) {
    const { Camera, CameraResultType, CameraSource } = await import("@capacitor/camera");
    const photo = await Camera.getPhoto({ quality: 90, resultType: CameraResultType.DataUrl, source: CameraSource.Prompt });
    if (!photo.dataUrl) {
      return null;
    }
    const format = photo.format ?? "jpeg";
    return { id: generateFileId(), name: `foto-${Date.now()}.${format}`, uri: photo.dataUrl, mimeType: `image/${format}` };
  }
  return pickImageFromFileSystem();
}

async function authenticateBiometricResource(reason: string): Promise<boolean> {
  const result = await requestBiometricAuth(reason);
  return result.authenticated;
}

const DeviceContext = createContext<DeviceContextValue | null>(null);

// Estado usado no SSR e na primeira renderização do cliente. Precisa ser
// determinístico (sem ler window/matchMedia) para o HTML do servidor bater com
// a hidratação. O dispositivo real é resolvido após a montagem, no useEffect.
const SSR_DEVICE_STATE: DeviceState = {
  isNative: false,
  isPhone: false,
  isTablet: false,
  platform: "web",
  view: "desktop",
};

function resolveDeviceState(): DeviceState {
  const native = isNativePlatform();
  const phoneViewport = isMobileViewport();
  const tabletViewport = isTabletViewport();
  const platform = native ? getPlatform() : "web";
  const nativeMobilePlatform = native && (platform === "android" || platform === "ios");

  let view: DeviceView = "desktop";

  if (phoneViewport) {
    view = "mobile";
  } else if (tabletViewport || nativeMobilePlatform) {
    view = "tablet";
  }

  const isPhone = view === "mobile";
  const isTablet = view === "tablet";

  return {
    isNative: native,
    isPhone,
    isTablet,
    platform,
    view,
  };
}

function sameDeviceState(a: DeviceState, b: DeviceState): boolean {
  return (
    a.isNative === b.isNative &&
    a.isPhone === b.isPhone &&
    a.isTablet === b.isTablet &&
    a.platform === b.platform &&
    a.view === b.view
  );
}

export function DeviceProvider({ children }: { children: React.ReactNode }) {
  const [deviceState, setDeviceState] = useState<DeviceState>(SSR_DEVICE_STATE);

  useEffect(() => {
    // Só troca o estado quando o dispositivo realmente muda: resolveDeviceState
    // devolve um objeto novo a cada chamada, então sem esta comparação todo
    // evento de resize re-renderizaria a árvore inteira (o valor é consumido no
    // topo do app). O resize é coalescido via rAF para não disparar por frame.
    let frame = 0;

    const updateDeviceState = () => {
      const next = resolveDeviceState();
      setDeviceState((current) => (sameDeviceState(current, next) ? current : next));
    };

    const onResize = () => {
      if (frame !== 0) {
        return;
      }
      frame = window.requestAnimationFrame(() => {
        frame = 0;
        updateDeviceState();
      });
    };

    updateDeviceState();
    window.addEventListener("resize", onResize);

    return () => {
      if (frame !== 0) {
        window.cancelAnimationFrame(frame);
      }
      window.removeEventListener("resize", onResize);
    };
  }, []);

  const value = useMemo<DeviceContextValue>(
    () => ({
      ...deviceState,
      pickImage: pickImageResource,
      isBiometricAvailable: isBiometricAuthAvailable,
      authenticateBiometric: authenticateBiometricResource,
      subscribeAppVisibility: subscribeToAppVisibility,
      registerPush: initializePushNotifications,
      subscribeNotifications: subscribeDeviceNotifications,
      subscribePushToken,
    }),
    [deviceState],
  );

  return <DeviceContext.Provider value={value}>{children}</DeviceContext.Provider>;
}

export function useDevice() {
  const context = useContext(DeviceContext);

  if (!context) {
    throw new Error("useDevice must be used within DeviceProvider.");
  }

  return context;
}
