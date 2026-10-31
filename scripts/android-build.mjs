import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

import { loadAppEnv, normalizeAppEnv, projectRoot } from "./app-env.mjs";
import { resolveSigningConfig, signReleaseApk } from "./android-signing.mjs";
import { devManifestUrl, devUpdateVersion, recordDebugApk, sourceFingerprint } from "./app-update-dev.mjs";
import { resolveAppUpdateKey } from "./app-update-signing.mjs";
import { appUpdateEnabled } from "./dev-only.mjs";
import { applyAndroidIcon, applyAndroidIdentity, applyAndroidNotificationIcon, resolveMobileApp } from "./mobile-app.mjs";
import { verifyDist } from "./verify-dist.mjs";

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

function createNamedApkArtifact(appEnvironment, variantName, app) {
  // Release: app-release.apk (ja alinhado/assinado). Debug: app-debug.apk (saida
  // do assembleDebug, assinado com a debug key). Ambos viram artefato nomeado em
  // builds/apk/ para nao precisar cavar o diretorio do Gradle.
  const sourceApkName = variantName === "debug" ? "app-debug.apk" : "app-release.apk";
  const variantDirectory = path.join(projectRoot, "android", "app", "build", "outputs", "apk", variantName);
  const sourceApkPath = path.join(variantDirectory, sourceApkName);

  if (!fs.existsSync(sourceApkPath)) {
    throw new Error(`[android-build] APK nao encontrado em ${sourceApkPath}`);
  }

  const buildDirectory = path.join(projectRoot, "builds", "apk");
  fs.mkdirSync(buildDirectory, { recursive: true });

  // Debug carrega o sufixo "debug"; release usa o ambiente (prod/homolog).
  const environmentSuffix =
    variantName === "debug" ? "debug" : appEnvironment === "production" ? "prod" : appEnvironment;
  const timestamp = formatBuildTimestamp();
  // Nativo (loja) e aplicação no nome: o mesmo nativo roda pacotes de aplicação diferentes.
  const versions = `n${app.versionName}-a${app.appVersion}`;
  const targetFileName = `${sanitizeFileNamePart(app.name) || "app"}-${environmentSuffix}-${versions}-${timestamp}.apk`;
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

// App da marca (applicationId, nome, versao nativa da loja + versao da aplicacao do
// package.json): resolvido antes do build para falhar cedo (marca ausente em
// producao, versao fora do esquema).
const { version: appVersion } = JSON.parse(fs.readFileSync(path.join(projectRoot, "package.json"), "utf8"));
const mobileApp = resolveMobileApp({ brand: process.env.NEXT_PUBLIC_BRAND, appEnv, appVersion });

// Resolve a assinatura ANTES do build: producao sem keystore falha em segundos,
// em vez de so descobrir depois dos ~8 min de gradle. (homolog gera automatico.)
let signingConfig = null;
if (variant === "release") {
  run(process.execPath, [path.join(projectRoot, "scripts", "validate-build-env.mjs"), appEnv]);
  signingConfig = resolveSigningConfig(appEnv, mobileApp.brand);
}

// APK debug: atualização remota ligada por padrão, servida pelo `npm run dev` no IP
// da rede (docs/ambiente-e-build.md → "Atualização no desenvolvimento").
// `APP_UPDATE_ENABLED=false` desliga.
let devChannelFingerprint = null;
if (variant === "debug" && appEnv === "development" && process.env.APP_UPDATE_ENABLED === undefined) {
  process.env.APP_UPDATE_ENABLED = "true";
  process.env.NEXT_PUBLIC_APP_UPDATE_URL ||= devManifestUrl();
  process.env.APP_UPDATE_VERSION = devUpdateVersion(appVersion);
  devChannelFingerprint = sourceFingerprint();
  console.log(`[android-build] atualização pelo npm run dev: ${process.env.NEXT_PUBLIC_APP_UPDATE_URL}`);
}

// Atualização remota (opcional, docs/ambiente-e-build.md → "Atualização remota do
// app"): ligada, a chave pública dos pacotes do canal vai para o plugin no `cap
// sync`; desligada, o capacitor.config.ts deixa o plugin fora do APK.
const keepAppUpdate = appUpdateEnabled(process.env);
if (keepAppUpdate) {
  process.env.APP_UPDATE_PUBLIC_KEY = resolveAppUpdateKey(appEnv, mobileApp.brand).publicKeyPem;
}

run(process.execPath, [path.join(projectRoot, "scripts", "build-target.mjs"), "mobile", `--env=${appEnv}`, "--sync"]);

const androidDirectory = path.join(projectRoot, "android");

if (!fs.existsSync(androidDirectory)) {
  throw new Error("[android-build] Pasta android nao encontrada. Rode o sync do Capacitor antes de gerar APK.");
}

applyAndroidIdentity(androidDirectory, mobileApp);
await applyAndroidIcon(androidDirectory, mobileApp.brand);
await applyAndroidNotificationIcon(androidDirectory, mobileApp.brand);

// Release (homolog/produção) com `clean`: nada de asset/intermediário de um build
// anterior (de dev) reaproveitado pelo Gradle.
const gradleTasks = variant === "debug" ? ["assembleDebug"] : ["clean", "assembleRelease"];
run(getGradleCommand(), gradleTasks, { cwd: androidDirectory });

if (variant === "release") {
  // Alinha + assina (apksigner) o APK unsigned -> app-release.apk.
  signReleaseApk(process.env.ANDROID_SDK_ROOT || process.env.ANDROID_HOME, signingConfig);
}

// Copia o APK nomeado para builds/apk/ em qualquer variant (release e debug).
const apkPath = createNamedApkArtifact(appEnv, variant, mobileApp);

// Release: o APK distribuído não pode ter conteúdo de dev (docs/ferramentas-dev.md
// → "Fora dos artefatos"). Falhou → o APK sai de builds/apk.
if (variant === "release" && !verifyDist(apkPath, { keepAppUpdate }).ok) {
  fs.rmSync(apkPath, { force: true });
  throw new Error("[android-build] APK com conteúdo de desenvolvimento — removido de builds/apk.");
}

// O canal do `npm run dev` passa a comparar os fontes com os deste APK.
if (devChannelFingerprint) {
  recordDebugApk({ version: process.env.APP_UPDATE_VERSION, brand: mobileApp.brand, fingerprint: devChannelFingerprint });
}

if (loadedFiles.length > 0) {
  console.log(`[android-build] Arquivos de ambiente utilizados: ${loadedFiles.join(", ")}`);
}
