import fs from "node:fs";
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

export function getAppEnvFiles(appEnv) {
  switch (appEnv) {
    case "homolog":
      return [".env", ".env.homolog"];
    case "production":
      return [".env", ".env.production"];
    case "development":
    default:
      return [".env"];
  }
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

  return {
    appEnv: resolvedAppEnv,
    loadedFiles,
  };
}
