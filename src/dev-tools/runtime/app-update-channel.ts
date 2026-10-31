import { spawnSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import path from "node:path";

/**
 * Canal de atualização do APK debug servido pelo `npm run dev`
 * (docs/ambiente-e-build.md → "Atualização no desenvolvimento"). Só servidor:
 * usado pelas rotas de src/app/api/dev/app-update; fora do barrel do runtime.
 * A lógica (resumo dos fontes, build do pacote) fica em scripts/app-update-dev.mjs.
 */
export type DevChannelStatus =
  | { state: "current" | "building" }
  | { state: "ready"; manifest: unknown }
  | { state: "failed"; error: string };

// Mesmo lugar de DEV_UPDATE_DIR/DEV_BUNDLE_FILE em scripts/app-update-dev.mjs.
const BUNDLE_FILE = path.join(process.cwd(), "dist", "app-update-dev", "bundle.zip");

/** Estado do canal; fontes mudados disparam o build do pacote em segundo plano. */
export function readDevChannelStatus(): DevChannelStatus {
  const result = spawnSync(process.execPath, [path.join(process.cwd(), "scripts", "app-update-dev.mjs"), "status"], {
    cwd: process.cwd(),
    encoding: "utf8",
    windowsHide: true,
  });
  if (result.status !== 0) {
    return { state: "failed", error: result.stderr.trim() || `status saiu com ${result.status}` };
  }
  return JSON.parse(result.stdout) as DevChannelStatus;
}

/** Pacote zip do canal (assinado), ou `null` se ainda não foi gerado. */
export async function readDevBundle(): Promise<Buffer | null> {
  try {
    return await readFile(BUNDLE_FILE);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw error;
  }
}
