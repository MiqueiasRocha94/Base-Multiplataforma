import { isNativePlatform } from "@/lib/platform/capacitor";

export async function requestLocalNotificationPermission() {
  if (!isNativePlatform()) {
    return { display: "granted" as const };
  }

  const { LocalNotifications } = await import("@capacitor/local-notifications");
  return LocalNotifications.requestPermissions();
}

export async function requestPushNotificationPermission() {
  if (!isNativePlatform()) {
    return { receive: "granted" as const };
  }

  const { PushNotifications } = await import("@capacitor/push-notifications");
  return PushNotifications.requestPermissions();
}
