// Assinatura de APK release (homolog/producao) via apksigner — pos-build, sem
// editar o android/app/build.gradle (que e regeravel pelo Capacitor).
//
// Config por ambiente, resolvida nesta ordem:
//   1) variaveis de ambiente (CI): ANDROID_KEYSTORE_FILE/_PASSWORD/_KEY_ALIAS/_KEY_PASSWORD
//   2) arquivo .secrets/android-signing.<env>.env (gitignored); em producao, um por
//      marca: .secrets/android-signing.production.<marca>.env — cada marca e um app
//      na loja e so atualiza assinado com a chave dele
//   3) fallback: homolog GERA um keystore automatico; producao FALHA (exige o seu).
import { spawnSync } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

import { projectRoot } from "./app-env.mjs";

const SECRETS_DIR = path.join(projectRoot, ".secrets");
const REQUIRED_KEYS = [
  "ANDROID_KEYSTORE_FILE",
  "ANDROID_KEYSTORE_PASSWORD",
  "ANDROID_KEY_ALIAS",
  "ANDROID_KEY_PASSWORD",
];

function signingEnvFile(appEnv, brand) {
  const scope = appEnv === "production" ? `${appEnv}.${brand}` : appEnv;
  return path.join(SECRETS_DIR, `android-signing.${scope}.env`);
}

function parseEnvFile(file) {
  const out = {};
  if (!fs.existsSync(file)) {
    return out;
  }
  for (const raw of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) {
      continue;
    }
    const separator = line.indexOf("=");
    if (separator <= 0) {
      continue;
    }
    let value = line.slice(separator + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    out[line.slice(0, separator).trim()] = value;
  }
  return out;
}

function resolveKeystorePath(file) {
  return path.isAbsolute(file) ? file : path.join(projectRoot, file);
}

function run(command, args) {
  // Node >=20.12 recusa .bat/.cmd com shell:false (EINVAL); apksigner.bat precisa.
  const useShell = /\.(bat|cmd)$/i.test(command);
  const result = spawnSync(command, args, { stdio: "inherit", shell: useShell, cwd: projectRoot });
  if (typeof result.status === "number" && result.status !== 0) {
    process.exit(result.status);
  }
  if (result.error) {
    throw result.error;
  }
}

function readConfig(appEnv, brand) {
  const fromFile = parseEnvFile(signingEnvFile(appEnv, brand));
  const fromEnv = {};
  for (const key of REQUIRED_KEYS) {
    if (process.env[key]) {
      fromEnv[key] = process.env[key];
    }
  }
  const merged = { ...fromFile, ...fromEnv };
  return REQUIRED_KEYS.every((key) => merged[key]) ? merged : null;
}

function keytoolBin() {
  const javaHome = process.env.JAVA_HOME;
  if (javaHome) {
    const bin = path.join(javaHome, "bin", process.platform === "win32" ? "keytool.exe" : "keytool");
    if (fs.existsSync(bin)) {
      return bin;
    }
  }
  return "keytool";
}

function writeSigningEnvFile(appEnv, config) {
  fs.mkdirSync(SECRETS_DIR, { recursive: true });
  const body = `${REQUIRED_KEYS.map((key) => `${key}=${config[key]}`).join("\n")}\n`;
  fs.writeFileSync(signingEnvFile(appEnv), body, { mode: 0o600 });
}

function generateKeystore(appEnv) {
  fs.mkdirSync(SECRETS_DIR, { recursive: true });
  const keystoreFile = `.secrets/release-${appEnv}.jks`;
  const password = crypto.randomBytes(24).toString("base64url");
  const config = {
    ANDROID_KEYSTORE_FILE: keystoreFile,
    ANDROID_KEYSTORE_PASSWORD: password,
    ANDROID_KEY_ALIAS: "release",
    ANDROID_KEY_PASSWORD: password,
  };
  const appName = process.env.NEXT_PUBLIC_APP_NAME || "App";

  console.log(`[sign] gerando keystore automatico (${appEnv}) em ${keystoreFile}`);
  run(keytoolBin(), [
    "-genkeypair",
    "-v",
    "-keystore", resolveKeystorePath(keystoreFile),
    "-alias", config.ANDROID_KEY_ALIAS,
    "-keyalg", "RSA",
    "-keysize", "2048",
    "-validity", "10000",
    "-storepass", password,
    "-keypass", password,
    "-dname", `CN=${appName}, OU=Dev, O=Dev, C=BR`,
  ]);
  writeSigningEnvFile(appEnv, config);
  return config;
}

/**
 * Resolve a config de assinatura para o ambiente (gera para homolog; exige para
 * producao, com a chave da marca).
 */
export function resolveSigningConfig(appEnv, brand) {
  const existing = readConfig(appEnv, brand);
  if (existing) {
    const keystore = resolveKeystorePath(existing.ANDROID_KEYSTORE_FILE);
    if (!fs.existsSync(keystore)) {
      throw new Error(`[sign] keystore configurado nao encontrado: ${existing.ANDROID_KEYSTORE_FILE} (ambiente ${appEnv})`);
    }
    return existing;
  }

  if (appEnv === "production") {
    throw new Error(
      `[sign] Build de PRODUCAO exige o keystore do app publicado da marca "${brand}". Crie ` +
        `.secrets/android-signing.production.${brand}.env (mesmas chaves de ` +
        ".secrets/android-signing.production.env.example) ou defina as variaveis ANDROID_KEYSTORE_FILE, " +
        "ANDROID_KEYSTORE_PASSWORD, ANDROID_KEY_ALIAS e ANDROID_KEY_PASSWORD. Producao nunca usa keystore auto-gerado.",
    );
  }

  return generateKeystore(appEnv);
}

function findBuildTool(sdkRoot, tool) {
  const buildToolsDir = path.join(sdkRoot, "build-tools");
  if (!fs.existsSync(buildToolsDir)) {
    throw new Error(`[sign] build-tools nao encontrado em ${buildToolsDir}`);
  }
  const versions = fs
    .readdirSync(buildToolsDir)
    .filter((entry) => fs.statSync(path.join(buildToolsDir, entry)).isDirectory())
    .sort();
  const latest = versions[versions.length - 1];
  if (!latest) {
    throw new Error(`[sign] nenhuma versao de build-tools instalada em ${buildToolsDir}`);
  }
  // zipalign e binario; apksigner e script (.bat no Windows).
  const fileName = tool === "apksigner" && process.platform === "win32" ? "apksigner.bat" : tool;
  const candidate = path.join(buildToolsDir, latest, fileName);
  const withExe = process.platform === "win32" ? `${candidate}.exe` : candidate;
  if (fs.existsSync(candidate)) {
    return candidate;
  }
  if (fs.existsSync(withExe)) {
    return withExe;
  }
  throw new Error(`[sign] ${tool} nao encontrado em build-tools/${latest}`);
}

/** Alinha e assina o app-release-unsigned.apk, produzindo app-release.apk. */
export function signReleaseApk(sdkRoot, config) {
  if (!sdkRoot) {
    throw new Error("[sign] ANDROID_HOME/ANDROID_SDK_ROOT nao definido");
  }
  const releaseDir = path.join(projectRoot, "android", "app", "build", "outputs", "apk", "release");
  const unsigned = path.join(releaseDir, "app-release-unsigned.apk");
  const signed = path.join(releaseDir, "app-release.apk");
  const aligned = path.join(releaseDir, "app-release-aligned.apk");

  if (!fs.existsSync(unsigned)) {
    if (fs.existsSync(signed)) {
      return signed; // gradle ja assinou (config propria no build.gradle)
    }
    throw new Error(`[sign] APK nao assinado nao encontrado: ${unsigned}`);
  }

  const zipalign = findBuildTool(sdkRoot, "zipalign");
  const apksigner = findBuildTool(sdkRoot, "apksigner");
  const keystore = resolveKeystorePath(config.ANDROID_KEYSTORE_FILE);

  fs.rmSync(aligned, { force: true });
  run(zipalign, ["-p", "-f", "4", unsigned, aligned]);

  fs.rmSync(signed, { force: true });
  run(apksigner, [
    "sign",
    "--ks", keystore,
    "--ks-pass", `pass:${config.ANDROID_KEYSTORE_PASSWORD}`,
    "--ks-key-alias", config.ANDROID_KEY_ALIAS,
    "--key-pass", `pass:${config.ANDROID_KEY_PASSWORD}`,
    "--out", signed,
    aligned,
  ]);
  fs.rmSync(aligned, { force: true });

  console.log(`[sign] APK assinado: ${signed}`);
  return signed;
}
