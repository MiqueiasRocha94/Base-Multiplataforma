import { getPlatform, isNativePlatform } from "@/lib/platform/capacitor";
import { getStoredPushDeviceToken, isActiveToken } from "@/lib/platform/push-notifications";
import { getStorageItem, setStorageItem, storageKeys } from "@/lib/platform/storage";

/**
 * Identificação do APARELHO (não da janela): tipo físico (phone/tablet/desktop)
 * e o `deviceid` enviado no login. Porte da base Expo
 * (`storage/device-fingerprint.ts` + `getLoginDeviceId`): no nativo usa o plugin
 * `@capacitor/device` (equivalente ao `expo-device`, import lazy); na web usa
 * User-Agent Client Hints / User-Agent + ponteiro e tamanho da TELA física.
 */

/** Classe física do aparelho — independe do tamanho da janela. */
export type DeviceType = "phone" | "tablet" | "desktop";

/** Lado menor da tela (px CSS) a partir do qual o aparelho de toque é tablet. */
const TABLET_MIN_SHORT_SIDE = 600;

type NavigatorWithUAData = Navigator & {
  userAgentData?: { mobile?: boolean; platform?: string; brands?: { brand: string; version: string }[] };
};

function screenShortSide(): number {
  return Math.min(window.screen.width, window.screen.height);
}

/**
 * Tipo físico do aparelho, síncrono (roda no resolve do DeviceContext).
 * Ordem: nativo (plataforma + tela) → UA de tablet → UA de celular → aparelho
 * de toque sem mouse (pela tela) → desktop.
 */
export function detectDeviceType(): DeviceType {
  if (typeof window === "undefined") {
    return "desktop";
  }

  const platform = isNativePlatform() ? getPlatform() : "web";
  if (platform === "android" || platform === "ios") {
    return screenShortSide() >= TABLET_MIN_SHORT_SIDE ? "tablet" : "phone";
  }

  const nav = navigator as NavigatorWithUAData;
  const ua = nav.userAgent;
  // iPadOS se apresenta como Mac; o toque denuncia.
  const iPad = /iPad/.test(ua) || (/Macintosh/.test(ua) && nav.maxTouchPoints > 1);
  if (iPad || (/Android/.test(ua) && !/Mobile/.test(ua)) || /Tablet|Silk|Kindle/.test(ua)) {
    return "tablet";
  }
  if (nav.userAgentData?.mobile === true || /Mobi|iPhone|iPod|Android.*Mobile|Windows Phone/.test(ua)) {
    return "phone";
  }

  const touchOnly = window.matchMedia("(pointer: coarse)").matches && !window.matchMedia("(hover: hover)").matches;
  if (touchOnly) {
    return screenShortSide() >= TABLET_MIN_SHORT_SIDE ? "tablet" : "phone";
  }

  return "desktop";
}

/** Dados do aparelho para identificação (mesmos segmentos do base-expo). */
export type DeviceInfo = {
  deviceType: DeviceType;
  /** android | ios | web */
  platform: string;
  brand: string;
  model: string;
  operatingSystem: string;
  osVersion: string;
  /** physical | emulator | browser */
  executionType: string;
};

function normalizeSegment(value: unknown, fallback: string): string {
  const normalized = String(value ?? "").trim().replace(/\|/g, "-");
  return normalized || fallback;
}

function parseWebOs(ua: string): { os: string; version: string } {
  const patterns: [string, RegExp][] = [
    ["windows", /Windows NT ([\d.]+)/],
    ["android", /Android ([\d.]+)/],
    ["ios", /(?:iPhone|iPad|iPod).*? OS ([\d_]+)/],
    ["macos", /Mac OS X ([\d_.]+)/],
    ["linux", /Linux/],
  ];
  for (const [os, pattern] of patterns) {
    const match = ua.match(pattern);
    if (match) {
      return { os, version: (match[1] ?? "").replace(/_/g, ".") };
    }
  }
  return { os: "unknown", version: "" };
}

function parseWebBrowser(nav: NavigatorWithUAData): string {
  const brand = nav.userAgentData?.brands?.find((item) => !/Not.?A.?Brand|Chromium/i.test(item.brand));
  if (brand) {
    return `${brand.brand} ${brand.version}`;
  }
  const match = nav.userAgent.match(/(Edg|OPR|Firefox|Chrome|Safari)\/([\d]+)/);
  return match ? `${match[1]} ${match[2]}` : "browser";
}

/** Informações do aparelho: nativo via `@capacitor/device`; web via UA. */
export async function getDeviceInfo(): Promise<DeviceInfo> {
  const deviceType = detectDeviceType();

  if (isNativePlatform()) {
    const { Device } = await import("@capacitor/device");
    const info = await Device.getInfo();
    return {
      deviceType,
      platform: info.platform,
      brand: normalizeSegment(info.manufacturer, "unknown-brand"),
      model: normalizeSegment(info.model || info.name, `${info.platform}-device`),
      operatingSystem: info.operatingSystem,
      osVersion: normalizeSegment(
        info.platform === "android" ? `so${info.osVersion}-sdk${info.androidSDKVersion ?? "unknown"}` : `so${info.osVersion}`,
        "unknown-os-version",
      ),
      executionType: info.isVirtual ? "emulator" : "physical",
    };
  }

  const nav = navigator as NavigatorWithUAData;
  const { os, version } = parseWebOs(nav.userAgent);
  return {
    deviceType,
    platform: "web",
    brand: normalizeSegment(parseWebBrowser(nav), "browser"),
    model: deviceType,
    operatingSystem: os,
    osVersion: `so${version || "unknown"}`,
    executionType: "browser",
  };
}

/** Id estável da instalação no navegador (web não tem push token/id de hardware). */
function getWebInstallId(): string {
  const stored = getStorageItem(storageKeys.deviceId);
  if (stored) {
    return stored;
  }
  const id = typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
  setStorageItem(storageKeys.deviceId, id);
  return id;
}

/**
 * `deviceid` do login — mesmo formato do base-expo:
 * `marca|modelo|plataforma|SO|execução|token`. O último segmento é o push token
 * (nativo) ou o id da instalação no navegador (web).
 */
export function buildLoginDeviceId(info: DeviceInfo, token: string): string {
  return [info.brand, info.model, info.platform, info.osVersion, info.executionType, normalizeSegment(token, "no-push-token")]
    .map((segment) => normalizeSegment(segment, "unknown"))
    .join("|");
}

export async function getLoginDeviceId(): Promise<string> {
  const info = await getDeviceInfo();
  if (info.platform === "web") {
    return buildLoginDeviceId(info, `web-${getWebInstallId()}`);
  }
  const pushToken = getStoredPushDeviceToken();
  return buildLoginDeviceId(info, isActiveToken(pushToken) && pushToken ? pushToken : "no-push-token");
}
