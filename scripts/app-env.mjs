import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const currentDir = path.dirname(fileURLToPath(import.meta.url));
export const projectRoot = path.resolve(currentDir, "..");

function parseEnvFile(content) {
  const values = {};

  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();

    if (!line || line.startsWith("#")) {
      continue;
    }

    const normalizedLine = line.startsWith("export ") ? line.slice(7) : line;
    const separatorIndex = normalizedLine.indexOf("=");

    if (separatorIndex <= 0) {
      continue;
    }

    const key = normalizedLine.slice(0, separatorIndex).trim();
    let value = normalizedLine.slice(separatorIndex + 1).trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    values[key] = value.replace(/\\n/g, "\n");
  }

  return values;
}

export function normalizeAppEnv(input, fallback = "development") {
  const value = String(input ?? "").trim().toLowerCase();

  if (!value) {
    return fallback;
  }

  if (value === "development" || value === "dev" || value === "default") {
    return "development";
  }

  if (value === "homolog" || value === "hml" || value === "release") {
    return "homolog";
  }

  if (value === "production" || value === "prod") {
    return "production";
  }

  return fallback;
}

/**
 * Um arquivo por ambiente, sem herança: `.env` é só o de desenvolvimento. Os
 * modelos versionados são `.env.example` e `.env.<ambiente>.example`.
 */
export function getAppEnvFiles(appEnv) {
  switch (appEnv) {
    case "homolog":
      return [".env.homolog"];
    case "production":
      return [".env.production"];
    case "development":
    default:
      return [".env"];
  }
}

/** IPv4 da máquina na rede (sem loopback). */
export function lanAddresses() {
  return Object.values(os.networkInterfaces())
    .flat()
    .filter((iface) => iface && iface.family === "IPv4" && !iface.internal)
    .map((iface) => iface.address);
}

// Redes domésticas/escritório antes de VPN e das redes virtuais (Docker, WSL, Hyper-V).
const LAN_PREFERENCE = [/^192\.168\./, /^10\./, /^172\.(1[6-9]|2\d|3[01])\./];

/** IP pelo qual o celular/APK alcança esta máquina; `DEV_HOST_IP` força um valor. */
export function resolveDevHostIp(env = process.env, addresses = lanAddresses()) {
  const forced = (env.DEV_HOST_IP ?? "").trim();
  if (forced) return forced;
  for (const pattern of LAN_PREFERENCE) {
    const match = addresses.find((address) => pattern.test(address));
    if (match) return match;
  }
  return addresses[0] ?? null;
}

const LOCAL_URL = /^(https?:\/\/)(localhost|127\.0\.0\.1)(?=[:/]|$)/i;

/**
 * Desenvolvimento: troca `localhost`/`127.0.0.1` das URLs `NEXT_PUBLIC_*` pelo IP
 * da rede (mantém porta e caminho), para o APK debug e o celular alcançarem a API
 * sem editar o `.env`. Devolve o IP usado, ou `null` se nada mudou.
 */
export function applyLanHostToLocalUrls(env = process.env, hostIp = resolveDevHostIp(env)) {
  if (!hostIp) return null;
  let replaced = false;
  for (const [key, value] of Object.entries(env)) {
    if (key.startsWith("NEXT_PUBLIC_") && typeof value === "string" && LOCAL_URL.test(value.trim())) {
      env[key] = value.trim().replace(LOCAL_URL, `$1${hostIp}`);
      replaced = true;
    }
  }
  return replaced ? hostIp : null;
}

export function loadAppEnv(appEnv) {
  const resolvedAppEnv = normalizeAppEnv(appEnv);
  const protectedKeys = new Set(Object.keys(process.env));
  const loadedFiles = [];

  for (const relativeFile of getAppEnvFiles(resolvedAppEnv)) {
    const absoluteFile = path.join(projectRoot, relativeFile);

    if (!fs.existsSync(absoluteFile)) {
      continue;
    }

    const parsed = parseEnvFile(fs.readFileSync(absoluteFile, "utf8"));

    for (const [key, value] of Object.entries(parsed)) {
      if (protectedKeys.has(key)) {
        continue;
      }

      process.env[key] = value;
    }

    loadedFiles.push(relativeFile);
  }

  process.env.APP_ENV = resolvedAppEnv;
  process.env.NEXT_PUBLIC_APP_ENV = resolvedAppEnv;

  if (resolvedAppEnv === "development") {
    const hostIp = applyLanHostToLocalUrls(process.env);
    if (hostIp) console.log(`[env] desenvolvimento: localhost → ${hostIp} (IP da rede; DEV_HOST_IP força outro)`);
  }

  return {
    appEnv: resolvedAppEnv,
    loadedFiles,
  };
}
