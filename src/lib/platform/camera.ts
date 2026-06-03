import { isNativePlatform } from "@/lib/platform/capacitor";

export async function pickCameraPhoto() {
  if (!isNativePlatform()) {
    return null;
  }

  const { Camera, CameraResultType, CameraSource } = await import("@capacitor/camera");

  return Camera.getPhoto({
    quality: 90,
    resultType: CameraResultType.DataUrl,
    source: CameraSource.Prompt,
  });
}
