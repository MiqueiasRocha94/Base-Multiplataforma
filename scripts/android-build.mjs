import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

import { loadAppEnv, normalizeAppEnv, projectRoot } from "./app-env.mjs";
import { resolveSigningConfig, signReleaseApk } from "./android-signing.mjs";

function hasFlag(flag) {
  return process.argv.includes(flag);
}

function sanitizeFileNamePart(value) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[<>:"/\\|?*\x00-\x1F]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function formatBuildTimestamp(date = new Date()) {
  const year = String(date.getFullYear());
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");

  return `${year}${month}${day}-${hours}${minutes}`;
}

function run(command, args, options = {}) {
  // Node >=20.12/22/24 recusa executar .bat/.cmd com shell:false (EINVAL,
  // CVE-2024-27980). O gradlew.bat (Windows) precisa de shell:true; os demais
  // comandos (node.exe) continuam com shell:false.
  const useShell = options.shell ?? /\.(bat|cmd)$/i.test(command);
  const result = spawnSync(command, args, {
    stdio: "inherit",
    shell: useShell,
    cwd: options.cwd ?? projectRoot,
    env: options.env ?? process.env,
  });

  if (typeof result.status === "number" && result.status !== 0) {
    process.exit(result.status);
  }

  if (result.error) {
    throw result.error;
  }
}

function getGradleCommand() {
  return process.platform === "win32" ? "gradlew.bat" : "./gradlew";
}

function getProjectDisplayName() {
  return sanitizeFileNamePart(process.env.NEXT_PUBLIC_APP_NAME || "app") || "app";
}

function createNamedApkArtifact(appEnvironment) {
  const releaseDirectory = path.join(projectRoot, "android", "app", "build", "outputs", "apk", "release");
  const sourceApkPath = path.join(releaseDirectory, "app-release.apk");

  if (!fs.existsSync(sourceApkPath)) {
    throw new Error(`[android-build] APK nao encontrado em ${sourceApkPath}`);
  }

  const buildDirectory = path.join(projectRoot, "builds", "apk");
  fs.mkdirSync(buildDirectory, { recursive: true });

  const appName = getProjectDisplayName();
  const environmentSuffix = appEnvironment === "production" ? "prod" : appEnvironment;
  const timestamp = formatBuildTimestamp();
  const targetFileName = `${appName}-${environmentSuffix}-${timestamp}.apk`;
  const targetApkPath = path.join(buildDirectory, targetFileName);

  fs.copyFileSync(sourceApkPath, targetApkPath);
  console.log(`[android-build] APK copiado para ${targetApkPath}`);

  return targetApkPath;
}

const envArg = process.argv.find((arg) => arg.startsWith("--env="));
const requestedEnv = envArg?.slice("--env=".length);
const variant = hasFlag("--debug") ? "debug" : "release";
const appEnv = normalizeAppEnv(requestedEnv, variant === "debug" ? "development" : "homolog");

const { loadedFiles } = loadAppEnv(appEnv);

// Resolve a assinatura ANTES do build: producao sem keystore falha em segundos,
// em vez de so descobrir depois dos ~8 min de gradle. (homolog gera automatico.)
let signingConfig = null;
if (variant === "release") {
  run(process.execPath, [path.join(projectRoot, "scripts", "validate-build-env.mjs"), appEnv]);
  signingConfig = resolveSigningConfig(appEnv);
}

run(process.execPath, [path.join(projectRoot, "scripts", "build-target.mjs"), "mobile", `--env=${appEnv}`, "--sync"]);

const androidDirectory = path.join(projectRoot, "android");

if (!fs.existsSync(androidDirectory)) {
  throw new Error("[android-build] Pasta android nao encontrada. Rode o sync do Capacitor antes de gerar APK.");
}

const gradleTask = variant === "debug" ? "assembleDebug" : "assembleRelease";
run(getGradleCommand(), [gradleTask], { cwd: androidDirectory });

if (variant === "release") {
  // Alinha + assina (apksigner) o APK unsigned -> app-release.apk.
  signReleaseApk(process.env.ANDROID_SDK_ROOT || process.env.ANDROID_HOME, signingConfig);
  createNamedApkArtifact(appEnv);
}

if (loadedFiles.length > 0) {
  console.log(`[android-build] Arquivos de ambiente utilizados: ${loadedFiles.join(", ")}`);
}
