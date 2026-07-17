import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadAppEnv, normalizeAppEnv } from "./app-env.mjs";

const target = process.argv[2] ?? "web";
const shouldSyncCapacitor = process.argv.includes("--sync");
const envArg = process.argv.find((arg) => arg.startsWith("--env="));
const appEnv = normalizeAppEnv(envArg?.slice("--env=".length), "production");

const isMobileTarget = target === "mobile";
const currentDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(currentDir, "..");
const nextBin = path.join(projectRoot, "node_modules", "next", "dist", "bin", "next");
const capacitorBin = path.join(projectRoot, "node_modules", "@capacitor", "cli", "bin", "capacitor");

// O catch-all de 404 (src/app/[...notFound]) torna a navegacao para rotas
// inexistentes client-side (sem flash) na web, mas e uma rota dinamica
// incompativel com `output: export`. No alvo mobile ele e removido
// temporariamente (o 404 vem do 404.html da not-found).
const catchAllDir = path.join(projectRoot, "src", "app", "[...notFound]");
// Fora de src/app para o Next nao tratar o backup como rota durante o build.
const catchAllBackup = path.join(projectRoot, ".notfound-catchall.disabled");

loadAppEnv(appEnv);

if (appEnv === "homolog" || appEnv === "production") {
  run([path.join(projectRoot, "scripts", "validate-build-env.mjs"), appEnv]);
}

function run(args, env = process.env) {
  const result = spawnSync(process.execPath, args, {
    stdio: "inherit",
    shell: false,
    env,
    cwd: projectRoot,
  });

  if (result.error) {
    throw result.error;
  }

  return typeof result.status === "number" ? result.status : 0;
}

// Limpa o cache do Next para nao reaproveitar tipos gerados que ainda
// referenciam o catch-all removido (causaria falha no type-check do export).
// Resiliente: se .next for um mount point (volume Docker) nao da para remover o
// diretorio (EBUSY), entao esvazia o conteudo.
function clearNextCache() {
  const nextDir = path.join(projectRoot, ".next");
  if (!fs.existsSync(nextDir)) {
    return;
  }
  try {
    fs.rmSync(nextDir, { recursive: true, force: true });
  } catch (error) {
    if (error?.code !== "EBUSY" && error?.code !== "ENOTEMPTY" && error?.code !== "EPERM") {
      throw error;
    }
    for (const entry of fs.readdirSync(nextDir)) {
      fs.rmSync(path.join(nextDir, entry), { recursive: true, force: true });
    }
  }
}

function disableCatchAllForExport() {
  if (!isMobileTarget || !fs.existsSync(catchAllDir)) {
    return false;
  }

  // Limpa o .next ANTES de mexer no catch-all: se algo falhar aqui, o catch-all
  // nao fica renomeado/perdido (o restore so cobre o try principal do build).
  clearNextCache();
  fs.rmSync(catchAllBackup, { recursive: true, force: true });
  fs.renameSync(catchAllDir, catchAllBackup);
  return true;
}

function restoreCatchAll(disabled) {
  if (disabled && fs.existsSync(catchAllBackup)) {
    fs.rmSync(catchAllDir, { recursive: true, force: true });
    fs.renameSync(catchAllBackup, catchAllDir);
  }
}

const catchAllDisabled = disableCatchAllForExport();
let exitStatus = 0;

try {
  exitStatus = run([nextBin, "build"], {
    ...process.env,
    APP_ENV: appEnv,
    NEXT_PUBLIC_APP_ENV: appEnv,
    NEXT_BUILD_TARGET: isMobileTarget ? "mobile" : "web",
  });

  if (exitStatus === 0 && isMobileTarget && shouldSyncCapacitor) {
    exitStatus = run([capacitorBin, "sync"]);
  }
} finally {
  restoreCatchAll(catchAllDisabled);
}

if (exitStatus !== 0) {
  process.exit(exitStatus);
}
