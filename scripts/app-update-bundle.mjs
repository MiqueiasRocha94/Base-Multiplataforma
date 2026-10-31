#!/usr/bin/env node
// Gera o pacote da atualização remota de um canal (marca × ambiente): faz o build
// mobile de homologação/produção COM a atualização remota, compacta o `out/`,
// assina e escreve o manifesto. Saída em dist/app-updates/, servida pelo container
// web do mesmo canal em /app-updates/ (docker/web.Dockerfile).
//
//   APP_UPDATE_ENABLED=true NEXT_PUBLIC_BRAND=<marca> node scripts/app-update-bundle.mjs --env=<homolog|production> [--mandatory]
//   (atalho: npm run app-update:bundle -- --env=homolog)
//   node scripts/app-update-bundle.mjs --check --env=<...>  → confere se o pacote em
//     dist/app-updates/ é do canal e da versão do build (usado pela imagem web)
//
// Recurso opcional. Como usar e regras: docs/ambiente-e-build.md → "Atualização
// remota do app"; requisitos: .agents/specs/atualizacao-remota-app.md.
// NÃO FAÇA:
//   - pacote de build de desenvolvimento, ou com código nativo/qualquer coisa além
//     do `out/` (HTML/CSS/JS e assets);
//   - publicar por pacote perfil ou recurso que não passou pela revisão da loja;
//   - pacote sem assinatura ou com chave diferente da que está no APK do canal;
//   - `--mandatory` por rotina: só correção crítica (aplica na hora, com aviso).
// Políticas das lojas:
//   https://developer.apple.com/app-store/review/guidelines/ (2.5.2, 2.5.19, 2.3.1)
//   https://developer.apple.com/support/terms/apple-developer-program-license-agreement/ (3.3.1 B)
//   https://support.google.com/googleplay/android-developer/answer/9888379
import crypto from "node:crypto";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { zipSync } from "fflate";

import { loadAppEnv, normalizeAppEnv, projectRoot } from "./app-env.mjs";
import { resolveAppUpdateKey } from "./app-update-signing.mjs";
import { appUpdateEnabled } from "./dev-only.mjs";
import { appUpdateChannelFor, resolveMobileApp } from "./mobile-app.mjs";

export const APP_UPDATE_OUT_DIR = path.join(projectRoot, "dist", "app-updates");

/** Arquivos de `dir` em um zip, com o `index.html` na raiz (formato que o plugin lê). */
export function zipDirectory(dir) {
  const files = {};
  const visit = (current) => {
    for (const name of fs.readdirSync(current).sort()) {
      const full = path.join(current, name);
      if (fs.statSync(full).isDirectory()) visit(full);
      else files[path.relative(dir, full).split(path.sep).join("/")] = fs.readFileSync(full);
    }
  };
  visit(dir);
  if (!files["index.html"]) throw new Error(`[app-update] ${dir} sem index.html na raiz`);
  // mtime fixo: o mesmo conteúdo gera o mesmo zip (e o mesmo checksum).
  return Buffer.from(zipSync(files, { level: 9, mtime: new Date("2000-01-01T00:00:00Z") }));
}

/** SHA-256 em hex e assinatura RSA-SHA256 em base64 do pacote, como o plugin confere. */
export function signBundle(bundle, privateKey) {
  return {
    checksum: crypto.createHash("sha256").update(bundle).digest("hex"),
    signature: crypto.sign("sha256", bundle, privateKey).toString("base64"),
  };
}

export function buildManifest({ channel, version, minNativeVersion, mandatory, bundleFile, checksum, signature }) {
  return {
    schema: 1,
    channel,
    version,
    minNativeVersion,
    mandatory,
    bundle: { url: bundleFile, checksum, signature },
  };
}

/** Erros do pacote publicado em `dir` para o canal e a versão esperados (vazio = ok). */
export function publishedBundleErrors(dir, { channel, version }) {
  const manifestFile = path.join(dir, "manifest.json");
  if (!fs.existsSync(manifestFile)) return [`${manifestFile} ausente`];
  const manifest = JSON.parse(fs.readFileSync(manifestFile, "utf8"));
  const errors = [];
  if (manifest.channel !== channel) errors.push(`canal "${manifest.channel}" diferente do build ("${channel}")`);
  if (manifest.version !== version) errors.push(`versão ${manifest.version} diferente do build (${version})`);
  if (!fs.existsSync(path.join(dir, String(manifest.bundle?.url)))) errors.push(`pacote ${manifest.bundle?.url} ausente`);
  if (!manifest.bundle?.signature) errors.push("pacote sem assinatura");
  return errors;
}

function main() {
  const envArg = process.argv.find((arg) => arg.startsWith("--env="));
  const appEnv = normalizeAppEnv(envArg?.slice("--env=".length), "homolog");
  if (appEnv !== "homolog" && appEnv !== "production") {
    throw new Error("[app-update] pacote só sai de homologação ou produção (--env=homolog|production).");
  }
  loadAppEnv(appEnv);

  const { version } = JSON.parse(fs.readFileSync(path.join(projectRoot, "package.json"), "utf8"));
  const app = resolveMobileApp({ brand: process.env.NEXT_PUBLIC_BRAND, appEnv, appVersion: version });

  if (process.argv.includes("--check")) {
    const errors = publishedBundleErrors(APP_UPDATE_OUT_DIR, { channel: appUpdateChannelFor(app.brand, appEnv), version });
    if (errors.length) throw new Error(`[app-update] pacote em dist/app-updates não publicável: ${errors.join("; ")}.`);
    console.log(`[app-update] pacote ${version} do canal ${appUpdateChannelFor(app.brand, appEnv)} publicado em /app-updates/`);
    return;
  }

  if (!appUpdateEnabled(process.env)) {
    throw new Error("[app-update] APP_UPDATE_ENABLED=true é obrigatório para gerar o pacote.");
  }
  // Chave antes do build: produção sem a chave da marca falha em segundos.
  const { privateKey } = resolveAppUpdateKey(appEnv, app.brand);

  // Build mobile com a atualização remota; o build-target verifica o `out/`.
  if (!process.argv.includes("--skip-build")) {
    const build = spawnSync(process.execPath, [path.join(projectRoot, "scripts", "build-target.mjs"), "mobile", `--env=${appEnv}`], {
      stdio: "inherit",
      env: process.env,
      cwd: projectRoot,
    });
    if (build.status !== 0) process.exit(build.status ?? 1);
  }

  const bundle = zipDirectory(path.join(projectRoot, "out"));
  const bundleFile = `bundle-${version}.zip`;
  const manifest = buildManifest({
    channel: appUpdateChannelFor(app.brand, appEnv),
    version,
    minNativeVersion: app.versionName,
    mandatory: process.argv.includes("--mandatory") || String(process.env.APP_UPDATE_MANDATORY).toLowerCase() === "true",
    bundleFile,
    ...signBundle(bundle, privateKey),
  });

  fs.rmSync(APP_UPDATE_OUT_DIR, { recursive: true, force: true });
  fs.mkdirSync(APP_UPDATE_OUT_DIR, { recursive: true });
  fs.writeFileSync(path.join(APP_UPDATE_OUT_DIR, bundleFile), bundle);
  fs.writeFileSync(path.join(APP_UPDATE_OUT_DIR, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`);
  console.log(
    `[app-update] ${manifest.channel} ${version} (nativo mínimo ${manifest.minNativeVersion}${manifest.mandatory ? ", obrigatório" : ""}) → ${path.relative(projectRoot, APP_UPDATE_OUT_DIR)}`,
  );
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    main();
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  }
}
