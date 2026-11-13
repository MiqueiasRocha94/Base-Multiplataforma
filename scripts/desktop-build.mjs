// Build do app desktop (Tauri 2, src-tauri/): Windows x64 (instalador NSIS) e
// Linux x64 (.deb e .AppImage), sempre pelo container de toolchain
// (docker/<ambiente>/desktop/docker-compose.yml) — sem Rust na máquina.
//
//   node scripts/desktop-build.mjs [--env=homolog] [--debug] [--platform=windows|linux|all] [--exe-only]
//
// Padrão: só Windows. --exe-only gera só o .exe do Windows (sem instalador NSIS),
// o caminho rápido do dia a dia; produção gera só instalador. Fora de produção o
// release usa LTO thin.
//
// No host, só a compilação vai para o container. Dentro dele (scripts/docker-desktop.mjs,
// DESKTOP_IN_CONTAINER=1) o pipeline inteiro roda ali e a compilação é local.
//
// Pipeline: env → identidade da marca (scripts/desktop-apps.json) → export do Next
// (build-target.mjs desktop, que valida o env e verifica o `out/` em homolog/prod)
// → ícones e config do Tauri da marca → compilação no container → instaladores
// nomeados em builds/desktop/.
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

import { loadAppEnv, normalizeAppEnv, projectRoot } from "./app-env.mjs";
import { appIconSource } from "./mobile-app.mjs";

const DESKTOP_APPS = JSON.parse(fs.readFileSync(path.join(projectRoot, "scripts", "desktop-apps.json"), "utf8"));
const TAURI_DIR = path.join(projectRoot, "src-tauri");
const BUILD_DIR = path.join(projectRoot, "builds", "desktop");
const STAGING_DIR = path.join(BUILD_DIR, ".staging");
const WINDOWS_TARGET = "x86_64-pc-windows-msvc";
const CRATE_NAME = "base-desktop";
const PLATFORMS = ["windows", "linux"];
// Marca + hash do ícone de origem dos ícones gerados: sem mudança, não regera
// (ícones novos fazem o build.rs do Tauri recompilar o app).
const ICON_STAMP = path.join(TAURI_DIR, "icons", ".source");

function argValue(name) {
  return process.argv.find((arg) => arg.startsWith(`--${name}=`))?.slice(name.length + 3);
}

function run(command, args, options = {}) {
  const result = spawnSync(command, args, { stdio: "inherit", cwd: projectRoot, ...options });
  if (result.error) {
    throw result.error;
  }
  if (typeof result.status === "number" && result.status !== 0) {
    process.exit(result.status);
  }
}

function sanitizeFileNamePart(value) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[<>:"/\\|?*\x00-\x1F]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function formatBuildTimestamp(date = new Date()) {
  const pad = (value) => String(value).padStart(2, "0");
  return `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}-${pad(date.getHours())}${pad(date.getMinutes())}`;
}

/**
 * App da marca para o ambiente. Produção exige a marca explícita
 * (NEXT_PUBLIC_BRAND); fora dela o identificador ganha o sufixo do ambiente,
 * para o app de teste conviver com o publicado na mesma máquina.
 */
function resolveDesktopApp({ brand, appEnv, appVersion }) {
  const requested = String(brand ?? "").trim().toLowerCase();
  if (!requested && appEnv === "production") {
    throw new Error("[desktop-build] build de produção exige NEXT_PUBLIC_BRAND (marca do app)");
  }
  const brandId = requested || DESKTOP_APPS.defaultBrand;
  const app = DESKTOP_APPS.apps[brandId];
  if (!app) {
    throw new Error(`[desktop-build] marca desconhecida "${brandId}". Marcas: ${Object.keys(DESKTOP_APPS.apps).join(", ")}`);
  }
  return {
    brand: brandId,
    identifier: appEnv === "production" ? app.appId : `${app.appId}.${appEnv}`,
    name: app.name,
    version: DESKTOP_APPS.nativeVersion,
    appVersion,
  };
}

/** Origens da API do ambiente, liberadas no `connect-src` da CSP do app. */
function apiOrigins(env) {
  const origins = new Set();
  for (const name of ["NEXT_PUBLIC_ACESSO_API_URL", "NEXT_PUBLIC_API_BASE_URL"]) {
    const value = (env[name] ?? "").trim();
    if (!value) continue;
    try {
      origins.add(new URL(value).origin);
    } catch {
      throw new Error(`[desktop-build] ${name} não é uma URL válida`);
    }
  }
  return [...origins];
}

/** Config do Tauri da marca/ambiente, mesclada sobre src-tauri/tauri.conf.json (`--config`). */
function writeBuildConfig(app) {
  const base = JSON.parse(fs.readFileSync(path.join(TAURI_DIR, "tauri.conf.json"), "utf8"));
  const csp = { ...base.app.security.csp };
  const origins = apiOrigins(process.env);
  if (origins.length) {
    csp["connect-src"] = `${csp["connect-src"]} ${origins.join(" ")}`;
  }
  const config = {
    productName: app.name,
    version: app.version,
    identifier: app.identifier,
    app: {
      windows: [{ ...base.app.windows[0], title: app.name }],
      security: { csp },
    },
  };
  const content = `${JSON.stringify(config, null, 2)}\n`;
  const file = path.join(TAURI_DIR, "tauri.build.json");
  // Reescrever sem mudança faria o build.rs do Tauri recompilar o app.
  if (!fs.existsSync(file) || fs.readFileSync(file, "utf8") !== content) {
    fs.writeFileSync(file, content);
  }
}

/**
 * Ícone da marca em PNG 1024 px: fonte do `cargo tauri icon` (todos os tamanhos e o .ico).
 * Retorna o stamp a gravar após o `cargo tauri icon`, ou false quando os ícones gerados
 * já são desta marca e deste ícone de origem.
 */
async function writeIconSource(brand) {
  const source = appIconSource(brand);
  const stamp = `${brand}:${crypto.createHash("sha256").update(fs.readFileSync(source)).digest("hex")}`;
  const iconsDir = path.join(TAURI_DIR, "icons");
  if (fs.existsSync(path.join(iconsDir, "icon.ico")) && fs.existsSync(ICON_STAMP) && fs.readFileSync(ICON_STAMP, "utf8") === stamp) {
    return false;
  }
  const { default: sharp } = await import("sharp");
  fs.rmSync(iconsDir, { recursive: true, force: true });
  fs.mkdirSync(iconsDir, { recursive: true });
  await sharp(source)
    .resize(1024, 1024, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toFile(path.join(iconsDir, "app-icon.png"));
  return stamp;
}

/** Comando do container: ícones, build de cada sistema e cópia dos artefatos para o staging. */
function containerScript({ platforms, debug, exeOnly, fullLto, iconStamp }) {
  const profile = debug ? "debug" : "release";
  const flag = debug ? " --debug" : "";
  const steps = ["set -e", "cd /src/src-tauri"];
  if (!fullLto) {
    // Link do release com LTO completo e 1 codegen unit é single-thread e pesado em RAM.
    steps.push("export CARGO_PROFILE_RELEASE_LTO=thin CARGO_PROFILE_RELEASE_CODEGEN_UNITS=16");
  }
  if (iconStamp) {
    // Stamp só depois do `cargo tauri icon`: se ele falhar, a próxima execução regera.
    steps.push("cargo tauri icon icons/app-icon.png -o icons", `printf '%s' '${iconStamp}' > icons/.source`);
  }
  steps.push("rm -rf /src/builds/desktop/.staging", "mkdir -p /src/builds/desktop/.staging");
  if (platforms.includes("windows") && exeOnly) {
    steps.push(
      `cargo tauri build${flag} --config tauri.build.json --runner cargo-xwin --target ${WINDOWS_TARGET} --no-bundle`,
      `cp /target/${WINDOWS_TARGET}/${profile}/${CRATE_NAME}.exe /src/builds/desktop/.staging/`,
    );
  } else if (platforms.includes("windows")) {
    const bundle = `/target/${WINDOWS_TARGET}/${profile}/bundle/nsis`;
    steps.push(
      `rm -rf ${bundle}`,
      `cargo tauri build${flag} --config tauri.build.json --runner cargo-xwin --target ${WINDOWS_TARGET} --bundles nsis`,
      `cp ${bundle}/*.exe /src/builds/desktop/.staging/`,
    );
  }
  if (platforms.includes("linux")) {
    const bundle = `/target/${profile}/bundle`;
    steps.push(
      `rm -rf ${bundle}/deb ${bundle}/appimage`,
      `cargo tauri build${flag} --config tauri.build.json --bundles deb,appimage`,
      `cp ${bundle}/deb/*.deb ${bundle}/appimage/*.AppImage /src/builds/desktop/.staging/`,
    );
  }
  return steps.join(" && ");
}

/** Instaladores do staging → builds/desktop/<Nome>-<ambiente>-n<nativa>-a<aplicação>-<data>.<ext>. */
function publishArtifacts(app, environmentSuffix, exeOnly) {
  const base = `${sanitizeFileNamePart(app.name) || "app"}-${environmentSuffix}-n${app.version}-a${app.appVersion}-${formatBuildTimestamp()}`;
  const published = [];
  for (const file of fs.readdirSync(STAGING_DIR)) {
    const ext = path.extname(file);
    const kind = ext === ".exe" ? (exeOnly ? "windows" : "windows-setup") : "linux";
    const target = path.join(BUILD_DIR, `${base}-${kind}${ext}`);
    fs.renameSync(path.join(STAGING_DIR, file), target);
    published.push(target);
  }
  fs.rmSync(STAGING_DIR, { recursive: true, force: true });
  return published;
}

async function main() {
  const debug = process.argv.includes("--debug");
  const appEnv = normalizeAppEnv(argValue("env"), debug ? "development" : "homolog");
  const exeOnly = process.argv.includes("--exe-only");
  const platformArg = argValue("platform") ?? "windows";
  const platforms = platformArg === "all" ? PLATFORMS : [platformArg];
  if (!platforms.every((platform) => PLATFORMS.includes(platform))) {
    throw new Error(`[desktop-build] --platform inválido "${platformArg}". Use windows | linux | all.`);
  }
  if (exeOnly && platformArg !== "windows") {
    throw new Error("[desktop-build] --exe-only gera só o .exe do Windows: use com --platform=windows.");
  }
  if (exeOnly && appEnv === "production") {
    throw new Error("[desktop-build] produção gera só o instalador: --exe-only não vale com --env=production.");
  }

  const { loadedFiles } = loadAppEnv(appEnv);
  const { version: appVersion } = JSON.parse(fs.readFileSync(path.join(projectRoot, "package.json"), "utf8"));
  // Antes do export: falha cedo (marca ausente em produção).
  const app = resolveDesktopApp({ brand: process.env.NEXT_PUBLIC_BRAND, appEnv, appVersion });

  run(process.execPath, [path.join(projectRoot, "scripts", "build-target.mjs"), "desktop", `--env=${appEnv}`]);

  writeBuildConfig(app);
  const iconStamp = await writeIconSource(app.brand);
  const script = containerScript({ platforms, debug, exeOnly, fullLto: appEnv === "production", iconStamp });
  if (process.env.DESKTOP_IN_CONTAINER === "1") {
    run("sh", ["-c", script], { cwd: TAURI_DIR });
  } else {
    // Serviço linux para "all": a imagem dele também compila o Windows.
    const service = platforms.includes("linux") ? "linux" : "windows";
    // Compose do ambiente (docker/develop|homolog|production/desktop): mesma imagem e caches.
    const composeDir = appEnv === "development" ? "develop" : appEnv;
    const composeFile = path.join(projectRoot, "docker", composeDir, "desktop", "docker-compose.yml");
    run("docker", ["compose", "-f", composeFile, "run", "--rm", "--entrypoint", "sh", service, "-c", script]);
  }

  const environmentSuffix = debug ? "debug" : appEnv === "production" ? "prod" : appEnv;
  for (const file of publishArtifacts(app, environmentSuffix, exeOnly)) {
    console.log(`[desktop-build] ${path.relative(projectRoot, file)}`);
  }
  if (loadedFiles.length > 0) {
    console.log(`[desktop-build] Arquivos de ambiente utilizados: ${loadedFiles.join(", ")}`);
  }
}

await main();
