import { isNativePlatform } from "@/lib/platform/capacitor";

export async function pickFile() {
  if (!isNativePlatform()) {
    return null;
  }

  const { FilePicker } = await import("@capawesome/capacitor-file-picker");
  const result = await FilePicker.pickFiles({ limit: 1 });
  return result.files[0] ?? null;
}

export async function readTextFile(path: string) {
  const { Filesystem } = await import("@capacitor/filesystem");
  const result = await Filesystem.readFile({ path });
  return typeof result.data === "string" ? result.data : "";
}
