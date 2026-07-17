import { isNativePlatform } from "@/lib/platform/capacitor";
import { getStorageItem, setStorageItem, storageKeys } from "@/lib/platform/storage";

/**
 * Notificacoes de dispositivo — porta a logica do NotificationButton da base
 * mobile para Capacitor. Registra o push (token), assina as notificacoes
 * recebidas e persiste tudo localmente. Na web, o push nativo nao esta
 * disponivel: guarda um "motivo" no lugar do token (mesma convencao do expo).
 */
export type DeviceNotificationType = "info" | "success" | "warning" | "danger";
export type DeviceNotification = {
  id: string;
  title: string;
  message: string;
  type: DeviceNotificationType;
  createdAt: number;
};

const MAX_NOTIFICATIONS = 30;

let isInitialized = false;
let cached: DeviceNotification[] = [];
const notificationListeners = new Set<(items: DeviceNotification[]) => void>();
const tokenListeners = new Set<(token: string | null) => void>();

/** Heuristica: um token "real" tem maiusculas/brackets/ponto ou e longo; os
 * "motivos" (web-unsupported, not-allowed-*, push-error) sao kebab curtos. */
export function isActiveToken(value: string | null): boolean {
  if (!value) {
    return false;
  }
  return /[A-Z[\]:._]/.test(value) || value.length > 40;
}

function loadCached() {
  if (cached.length > 0) {
    return;
  }
  const raw = getStorageItem(storageKeys.deviceNotifications);
  if (!raw) {
    return;
  }
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      cached = parsed as DeviceNotification[];
    }
  } catch {
    cached = [];
  }
}

function emitNotifications() {
  notificationListeners.forEach((listener) => listener(cached));
}

function setToken(value: string | null) {
  if (value != null) {
    setStorageItem(storageKeys.pushDeviceToken, value);
  }
  tokenListeners.forEach((listener) => listener(value));
}

function resolveType(title: string, message: string): DeviceNotificationType {
  const text = `${title} ${message}`.toLowerCase();
  if (/reprov|erro|falha|negad/.test(text)) return "danger";
  if (/aprov|conclu|finaliz/.test(text)) return "success";
  if (/alerta|pendente|atencao|renov/.test(text)) return "warning";
  return "info";
}

function appendNotification(id: string, title: string, message: string) {
  loadCached();
  if (cached.some((item) => item.id === id)) {
    return;
  }
  const entry: DeviceNotification = {
    id,
    title: title || "Nova notificacao",
    message: message || "Voce recebeu uma nova notificacao.",
    type: resolveType(title, message),
    createdAt: Date.now(),
  };
  cached = [entry, ...cached].slice(0, MAX_NOTIFICATIONS);
  setStorageItem(storageKeys.deviceNotifications, JSON.stringify(cached));
  emitNotifications();
}

export function getStoredPushDeviceToken(): string | null {
  return getStorageItem(storageKeys.pushDeviceToken);
}

export function subscribeDeviceNotifications(listener: (items: DeviceNotification[]) => void): () => void {
  loadCached();
  notificationListeners.add(listener);
  listener(cached);
  return () => {
    notificationListeners.delete(listener);
  };
}

export function subscribePushToken(listener: (token: string | null) => void): () => void {
  tokenListeners.add(listener);
  listener(getStoredPushDeviceToken());
  return () => {
    tokenListeners.delete(listener);
  };
}

export async function initializePushNotifications(): Promise<string | null> {
  if (isInitialized) {
    return getStoredPushDeviceToken();
  }
  isInitialized = true;
  loadCached();

  if (!isNativePlatform()) {
    const reason = "web-unsupported";
    setToken(reason);
    return reason;
  }

  try {
    const { PushNotifications } = await import("@capacitor/push-notifications");
    const permission = await PushNotifications.requestPermissions();
    if (permission.receive !== "granted") {
      const reason = `not-allowed-${String(permission.receive || "unknown").toLowerCase()}`;
      setToken(reason);
      return reason;
    }

    await PushNotifications.addListener("registration", (token) => setToken(token.value));
    await PushNotifications.addListener("registrationError", () => setToken("push-error"));
    await PushNotifications.addListener("pushNotificationReceived", (notification) =>
      appendNotification(notification.id ?? String(Date.now()), notification.title ?? "", notification.body ?? ""),
    );
    await PushNotifications.addListener("pushNotificationActionPerformed", (action) =>
      appendNotification(
        action.notification.id ?? String(Date.now()),
        action.notification.title ?? "",
        action.notification.body ?? "",
      ),
    );

    await PushNotifications.register();
    // O token chega de forma assincrona pelo evento 'registration'.
    return getStoredPushDeviceToken();
  } catch {
    const reason = "push-error";
    setToken(reason);
    return reason;
  }
}
