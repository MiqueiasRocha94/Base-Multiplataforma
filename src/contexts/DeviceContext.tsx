"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";

import { getPlatform, isDesktopViewport, isNativePlatform } from "@/lib/platform/capacitor";
import { isBiometricAuthAvailable, requestBiometricAuth } from "@/lib/platform/biometrics";
import { dismissKeyboard, subscribeDismissKeyboardOnSubmit } from "@/lib/platform/keyboard";
import { subscribeSystemBarsSync } from "@/lib/platform/system-bars";
import { applyOrientationPolicy } from "@/lib/platform/orientation";
import { detectDeviceType, getDeviceInfo, getLoginDeviceId, type DeviceInfo, type DeviceType } from "@/lib/platform/device-info";
import { subscribeToAppVisibility } from "@/lib/platform/app-visibility";
import {
  initializePushNotifications,
  subscribeDeviceNotifications,
  subscribePushToken,
  type DeviceNotification,
} from "@/lib/platform/push-notifications";
import { generateFileId, type FileItem } from "@/types/file-item";

/** Duas views: o tablet alterna entre elas pela orientação (retrato mobile, paisagem desktop). */
export type DeviceView = "mobile" | "desktop";
export type { DeviceInfo, DeviceType };

// Detecção de dispositivo (parte "estado" do contexto).
type DeviceState = {
  /** Classe FÍSICA do aparelho (phone/tablet/desktop) — não depende da janela. */
  deviceType: DeviceType;
  /**
   * Aparelho de TOQUE (celular ou tablet): recursos que dependem do teclado
   * virtual/dedo, não do layout (ex.: editor do input). O tablet deitado tem a
   * view `desktop`, mas comportamento de toque.
   */
  isTouch: boolean;
  isNative: boolean;
  /** Aparelho físico é celular (atalho de `deviceType`). */
  isPhone: boolean;
  /** Aparelho físico é tablet (a view dele varia com a orientação). */
  isTablet: boolean;
  platform: string;
  view: DeviceView;
};

// Contexto = detecção + portão único de recursos do dispositivo. Cada recurso
// decide o caminho por plataforma/permissão, delegando para `@/lib/platform/*`.
type DeviceContextValue = DeviceState & {
  /**
   * `false` até o dispositivo real ser resolvido após a montagem. Antes disso o
   * estado é o default de SSR (`isNative: false`, `view: "desktop"`), então
   * decisões de fluxo que dependem de apk × web (ex.: a tela de entrada) devem
   * esperar por `resolved` para não agir sobre o valor determinístico do SSR.
   */
  resolved: boolean;
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
  /** Dados do aparelho (marca, modelo, SO, físico/emulador). */
  getDeviceInfo: () => Promise<DeviceInfo>;
  /** `deviceid` do login (`marca|modelo|plataforma|SO|execução|token`, formato do base-expo). */
  getLoginDeviceId: () => Promise<string>;
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
  deviceType: "desktop",
  isTouch: false,
  isNative: false,
  isPhone: false,
  isTablet: false,
  platform: "web",
  view: "desktop",
};

/**
 * View (apresentação) — regra ÚNICA, web e nativo:
 *   `desktop` = paisagem E largura ≥ DESKTOP_MIN_WIDTH (1024); o resto é `mobile`.
 * - celular: sempre `mobile` (retrato ~360–430, deitado até ~932). No nativo
 *   ainda fica travado em retrato (`applyOrientationPolicy`);
 * - tablet: retrato (744–1024) = `mobile`; paisagem (≥ 1024) = `desktop`;
 * - desktop: sempre paisagem = `desktop`; janela estreita/retrato = `mobile`.
 * O comportamento de toque (`isTouch`) vem do APARELHO, não da view.
 * A rotação/redimensionamento dispara `resize`, então a view acompanha.
 */
function resolveDeviceState(): DeviceState {
  const native = isNativePlatform();
  const deviceType = detectDeviceType();
  const platform = native ? getPlatform() : "web";
  const view: DeviceView = isDesktopViewport() ? "desktop" : "mobile";

  return {
    deviceType,
    isTouch: deviceType !== "desktop",
    isNative: native,
    isPhone: deviceType === "phone",
    isTablet: deviceType === "tablet",
    platform,
    view,
  };
}

function sameDeviceState(a: DeviceState, b: DeviceState): boolean {
  return (
    a.deviceType === b.deviceType &&
    a.isTouch === b.isTouch &&
    a.isNative === b.isNative &&
    a.isPhone === b.isPhone &&
    a.isTablet === b.isTablet &&
    a.platform === b.platform &&
    a.view === b.view
  );
}

export function DeviceProvider({ children }: { children: React.ReactNode }) {
  const [deviceState, setDeviceState] = useState<DeviceState>(SSR_DEVICE_STATE);
  const [resolved, setResolved] = useState(false);

  useEffect(() => {
    // Só troca o estado quando o dispositivo realmente muda: resolveDeviceState
    // devolve um objeto novo a cada chamada, então sem esta comparação todo
    // evento de resize re-renderizaria a árvore inteira (o valor é consumido no
    // topo do app). O resize é coalescido via rAF para não disparar por frame.
    let frame = 0;

    const updateDeviceState = () => {
      const next = resolveDeviceState();
      setDeviceState((current) => (sameDeviceState(current, next) ? current : next));
      setResolved(true);
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

  // Nativo: celular trava em retrato; tablet gira livre (depende do APARELHO,
  // não da view — um tablet em janela estreita continua podendo girar).
  useEffect(() => {
    if (resolved) {
      void applyOrientationPolicy(deviceState.deviceType);
    }
  }, [deviceState.deviceType, resolved]);

  // Aparelho de toque: enviar um formulário (botão, Enter/"Ir") fecha o teclado
  // virtual. No desktop o foco fica onde está (sem teclado para recolher).
  useEffect(() => {
    if (resolved && deviceState.isTouch) {
      return subscribeDismissKeyboardOnSubmit();
    }
  }, [deviceState.isTouch, resolved]);

  // App nativo: ícones das barras do SO acompanham o fundo sob elas (header,
  // footer, overlays), conforme tema e marca. Na web as barras são do navegador.
  useEffect(() => subscribeSystemBarsSync(), []);

  // Aparelho de toque: trocar de página fecha o teclado virtual. O campo focado
  // da página anterior é desmontado sem blur e o teclado ficaria aberto na nova.
  const pathname = usePathname();
  useEffect(() => {
    if (resolved && deviceState.isTouch) {
      dismissKeyboard();
    }
  }, [pathname, deviceState.isTouch, resolved]);

  // Publica a view em `<html data-view>` — FONTE ÚNICA da apresentação por
  // device no CSS (variantes `mobile:`/`desktop:` e regras de
  // `[data-region]` em globals.css). No <html> para os portais herdarem também.
  // Só após resolver: antes disso o estado é o default determinístico do SSR.
  useEffect(() => {
    if (resolved) {
      document.documentElement.dataset.view = deviceState.view;
    }
  }, [deviceState.view, resolved]);

  const value = useMemo<DeviceContextValue>(
    () => ({
      ...deviceState,
      resolved,
      pickImage: pickImageResource,
      isBiometricAvailable: isBiometricAuthAvailable,
      authenticateBiometric: authenticateBiometricResource,
      subscribeAppVisibility: subscribeToAppVisibility,
      registerPush: initializePushNotifications,
      subscribeNotifications: subscribeDeviceNotifications,
      subscribePushToken,
      getDeviceInfo,
      getLoginDeviceId,
    }),
    [deviceState, resolved],
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
