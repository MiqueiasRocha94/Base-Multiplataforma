#!/usr/bin/env node
// Atualização remota NO DESENVOLVIMENTO (docs/ambiente-e-build.md → "Atualização no
// desenvolvimento"): o APK debug consulta o `npm run dev` pelo IP da rede e recebe
// um pacote novo sempre que os fontes mudam, sem reinstalar.
//
//   node scripts/app-update-dev.mjs status  → JSON do canal; fontes mudados disparam
//                                             o build do pacote em segundo plano
//   node scripts/app-update-dev.mjs build   → gera o pacote (chamado pelo status)
//
// Quem chama: a rota src/app/api/dev/app-update (só existe no `npm run dev`) e o
// android-build.mjs (registra o que o APK debug instalado já tem).
// NÃO FAÇA: publicar este pacote (é de build de desenvolvimento, com o código de dev)
// nem usar a chave de desenvolvimento em homologação/produção.
import { spawn, spawnSync } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { loadAppEnv, projectRoot, resolveDevHostIp } from "./app-env.mjs";
import { buildManifest, signBundle, zipDirectory } from "./app-update-bundle.mjs";
import { resolveAppUpdateKey } from "./app-update-signing.mjs";
import { appUpdateChannelFor, resolveMobileApp } from "./mobile-app.mjs";

/** Saída do canal de desenvolvimento (fora de dist/app-updates: nunca vai para imagem). */
export const DEV_UPDATE_DIR = path.join(projectRoot, "dist", "app-update-dev");
/** Caminho das rotas no `npm run dev`. */
export const DEV_UPDATE_ROUTE = "/api/dev/app-update";
export const DEV_BUNDLE_FILE = "bundle.zip";

const STATE_FILE = "state.json";
const APK_FILE = "apk.json";
const MANIFEST_FILE = "manifest.json";
// Cópia de build própria: não colide com um `mobile:debug` rodando ao mesmo tempo.
const BUILD_SOURCE_DIR = path.join(projectRoot, ".dist-build-dev", "source");

// O que entra no pacote: mudou algum destes, o pacote do APK fica velho.
const WATCHED = ["src", "public", "next.config.ts", "package.json", ".env", "postcss.config.mjs"];

/** Versão do pacote de dev: `MAJOR.MINOR.<AAMMDDhhmmss>`, sempre maior que a anterior. */
export function devUpdateVersion(appVersion, date = new Date()) {
  const [major, minor] = appVersion.split(".");
  const two = (value) => String(value).padStart(2, "0");
  const stamp = `${two(date.getFullYear() % 100)}${two(date.getMonth() + 1)}${two(date.getDate())}${two(date.getHours())}${two(date.getMinutes())}${two(date.getSeconds())}`;
  return `${major}.${minor}.${Number(stamp)}`;
}

/** URL do manifesto que o APK debug consulta: IP da rede + porta do `npm run dev`. */
export function devManifestUrl(env = process.env) {
  const host = resolveDevHostIp(env);
  if (!host) throw new Error("[app-update-dev] sem IP de rede: conecte a máquina ou defina DEV_HOST_IP.");
  return `http://${host}:${env.PORT || 3000}${DEV_UPDATE_ROUTE}/manifest`;
}

function walk(dir, out) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else out.push(full);
  }
}

/** Resumo dos fontes (caminho, tamanho e data de cada arquivo). */
export function sourceFingerprint(root = projectRoot) {
  const files = [];
  for (const entry of WATCHED) {
    const full = path.join(root, entry);
    if (!fs.existsSync(full)) continue;
    if (fs.statSync(full).isDirectory()) walk(full, files);
    else files.push(full);
  }
  const hash = crypto.createHash("sha256");
  for (const file of files.sort()) {
    const { size, mtimeMs } = fs.statSync(file);
    hash.update(`${path.relative(root, file)}|${size}|${mtimeMs}\n`);
  }
  return hash.digest("hex");
}

function readJson(file) {
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch (error) {
    if (error?.code === "ENOENT") return null;
    throw error;
  }
}

function writeJson(file, value) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`);
}

function processAlive(pid) {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    // Sem o processo (ESRCH): o build anterior terminou ou caiu.
    return false;
  }
}

/** Registra o que o APK debug recém-gerado já tem (android-build.mjs). */
export function recordDebugApk({ version, brand, fingerprint }, dir = DEV_UPDATE_DIR) {
  writeJson(path.join(dir, APK_FILE), { version, brand, fingerprint });
}

/**
 * Estado do canal. `startBuild` dispara o build quando os fontes mudaram desde o
 * APK ou o último pacote. Estados: `current` (nada novo), `building`, `ready`
 * (manifesto) e `failed` (o build destes fontes falhou; tenta de novo quando mudarem).
 */
export function devUpdateStatus({ dir = DEV_UPDATE_DIR, fingerprint = sourceFingerprint(), startBuild = launchBuild } = {}) {
  const state = readJson(path.join(dir, STATE_FILE));
  if (state?.building && processAlive(state.pid)) return { state: "building" };

  const apk = readJson(path.join(dir, APK_FILE));
  const manifest = readJson(path.join(dir, MANIFEST_FILE));
  if (manifest?.fingerprint === fingerprint) return { state: "ready", manifest };
  if (apk?.fingerprint === fingerprint) return { state: "current" };
  if (state?.fingerprint === fingerprint && state.error) return { state: "failed", error: state.error };
  if (!apk) return { state: "failed", error: "nenhum APK debug com atualização remota gerado nesta máquina (npm run mobile:debug)" };

  const pid = startBuild(dir);
  writeJson(path.join(dir, STATE_FILE), { building: true, pid, fingerprint });
  return { state: "building" };
}

/**
 * Ambiente do build sem o que o `next dev` (pai da rota) deixa no processo:
 * `NODE_ENV=development` e as variáveis internas do Next quebram o `next build`.
 */
export function buildProcessEnv(env = process.env) {
  return Object.fromEntries(
    Object.entries(env).filter(([name]) => name !== "NODE_ENV" && !/^(__NEXT|NEXT_PRIVATE_|NEXT_RUNTIME|TURBOPACK)/.test(name)),
  );
}

function launchBuild(dir) {
  fs.mkdirSync(dir, { recursive: true });
  // Saída do build em arquivo: o processo segue sozinho, fora da requisição.
  const log = fs.openSync(path.join(dir, "build.log"), "w");
  const child = spawn(process.execPath, [fileURLToPath(import.meta.url), "build", `--dir=${dir}`], {
    cwd: projectRoot,
    detached: true,
    stdio: ["ignore", log, log],
    windowsHide: true,
    env: buildProcessEnv(),
  });
  child.unref();
  fs.closeSync(log);
  return child.pid;
}

/** Build mobile de desenvolvimento → zip assinado + manifesto obrigatório (aplica na hora). */
function buildDevBundle(dir) {
  const fingerprint = sourceFingerprint();
  const statePath = path.join(dir, STATE_FILE);
  try {
    loadAppEnv("development");
    const apk = readJson(path.join(dir, APK_FILE));
    const { version: appVersion } = JSON.parse(fs.readFileSync(path.join(projectRoot, "package.json"), "utf8"));
    // Mesma marca do APK instalado: o app só aceita o próprio canal.
    const app = resolveMobileApp({ brand: apk?.brand ?? process.env.NEXT_PUBLIC_BRAND, appEnv: "development", appVersion });
    const version = devUpdateVersion(appVersion);
    const outDir = path.join(dir, "out");

    const build = spawnSync(process.execPath, [path.join(projectRoot, "scripts", "build-target.mjs"), "mobile", "--env=development"], {
      cwd: projectRoot,
      stdio: "inherit",
      env: {
        ...process.env,
        NEXT_PUBLIC_BRAND: app.brand,
        APP_UPDATE_ENABLED: "true",
        NEXT_PUBLIC_APP_UPDATE_URL: devManifestUrl(),
        APP_UPDATE_VERSION: version,
        MOBILE_OUT_DIR: outDir,
        BUILD_SOURCE_DIR,
      },
    });
    if (build.status !== 0) throw new Error(`build mobile falhou (código ${build.status})`);

    const bundle = zipDirectory(outDir);
    fs.rmSync(outDir, { recursive: true, force: true });
    const manifest = {
      ...buildManifest({
        channel: appUpdateChannelFor(app.brand, "development"),
        version,
        minNativeVersion: app.versionName,
        mandatory: true,
        bundleFile: `bundle?v=${version}`,
        ...signBundle(bundle, resolveAppUpdateKey("development", app.brand).privateKey),
      }),
      fingerprint,
    };
    fs.writeFileSync(path.join(dir, DEV_BUNDLE_FILE), bundle);
    writeJson(path.join(dir, MANIFEST_FILE), manifest);
    writeJson(statePath, { building: false, fingerprint });
    console.log(`[app-update-dev] pacote ${version} pronto (${manifest.channel})`);
  } catch (error) {
    writeJson(statePath, { building: false, fingerprint, error: error instanceof Error ? error.message : String(error) });
    throw error;
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const command = process.argv[2];
  const dir = process.argv.find((arg) => arg.startsWith("--dir="))?.slice("--dir=".length) ?? DEV_UPDATE_DIR;
  try {
    if (command === "status") process.stdout.write(JSON.stringify(devUpdateStatus({ dir })));
    else if (command === "build") buildDevBundle(dir);
    else throw new Error("uso: app-update-dev.mjs status|build");
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  }
}
