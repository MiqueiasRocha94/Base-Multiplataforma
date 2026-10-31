import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadAppEnv, normalizeAppEnv } from "./app-env.mjs";
import { appUpdateEnabled } from "./dev-only.mjs";
import { appUpdateChannelFor, resolveMobileApp } from "./mobile-app.mjs";
import { stripExportIncompatible, stripUnreleasedPages } from "./mobile-release.mjs";
import { DIST_SOURCE_STAMP, copyBuildSource, prepareDistSource } from "./prepare-dist-source.mjs";
import { verifyDist } from "./verify-dist.mjs";

const target = process.argv[2] ?? "web";
const shouldSyncCapacitor = process.argv.includes("--sync");
const envArg = process.argv.find((arg) => arg.startsWith("--env="));
const appEnv = normalizeAppEnv(envArg?.slice("--env=".length), "production");

const isMobileTarget = target === "mobile";
const currentDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(currentDir, "..");
const nextBin = path.join(projectRoot, "node_modules", "next", "dist", "bin", "next");
const capacitorBin = path.join(projectRoot, "node_modules", "@capacitor", "cli", "bin", "capacitor");

// Homologação e produção compilam uma entrada SEM o código de desenvolvimento
// (docs/ferramentas-dev.md → "Fora dos artefatos"). Desenvolvimento compila os
// fontes como estão, com as ferramentas de dev.
const isDistBuild = appEnv === "homolog" || appEnv === "production";

/** Saída montada do build web de homologação/produção (servida por `npm run start`). */
const DIST_WEB_DIR = path.join(projectRoot, "dist", "web");

// Alvo mobile de homologação/produção: só as páginas publicadas no app
// (src/config/mobile-release.json — docs/ambiente-e-build.md → "Páginas publicadas
// no app") entram, sempre numa cópia dos fontes; o APK debug leva todas. O catch-all de 404 (src/app/[...notFound], rota dinâmica
// incompatível com `output: export`) fica fora da lista: o 404 do app vem do
// 404.html da not-found.

loadAppEnv(appEnv);

// Atualização remota (docs/ambiente-e-build.md → "Atualização remota do app"):
// só no app mobile gerado com APP_UPDATE_ENABLED=true; senão sai da entrada de
// build como o código de dev. Ligada, exige o endereço do manifesto.
const keepAppUpdate = isMobileTarget && appUpdateEnabled(process.env);
const appUpdateUrl = (process.env.NEXT_PUBLIC_APP_UPDATE_URL ?? "").trim();
if (keepAppUpdate && !/^https?:\/\//.test(appUpdateUrl)) {
  console.error("[build] APP_UPDATE_ENABLED=true exige NEXT_PUBLIC_APP_UPDATE_URL (URL do manifest.json do canal).");
  process.exit(1);
}
const appVersion = JSON.parse(fs.readFileSync(path.join(projectRoot, "package.json"), "utf8")).version;
// Desenvolvimento: o APK debug e cada pacote do `npm run dev` levam uma versão própria
// (scripts/app-update-dev.mjs), para o pacote novo ser sempre maior que o instalado.
const appUpdateVersion = (appEnv === "development" && process.env.APP_UPDATE_VERSION?.trim()) || appVersion;
// Canal do pacote (marca × ambiente): o app só aceita manifesto do próprio canal.
const appUpdateChannel = keepAppUpdate
  ? appUpdateChannelFor(resolveMobileApp({ brand: process.env.NEXT_PUBLIC_BRAND, appEnv }).brand, appEnv)
  : "";

if (isDistBuild && run([path.join(projectRoot, "scripts", "validate-build-env.mjs"), appEnv]) !== 0) {
  process.exit(1);
}

function run(args, env = process.env, cwd = projectRoot) {
  const result = spawnSync(process.execPath, args, {
    stdio: "inherit",
    shell: false,
    env,
    cwd,
  });

  if (result.error) {
    throw result.error;
  }

  return typeof result.status === "number" ? result.status : 0;
}

// Apaga uma pasta (ex.: `.next`, para nao reaproveitar tipos gerados de outro
// build). Resiliente: se for um mount point (volume
// Docker) nao da para remover o diretorio (EBUSY), entao esvazia o conteudo.
function clearDir(dir) {
  if (!fs.existsSync(dir)) {
    return;
  }
  try {
    fs.rmSync(dir, { recursive: true, force: true });
  } catch (error) {
    if (error?.code !== "EBUSY" && error?.code !== "ENOTEMPTY" && error?.code !== "EPERM") {
      throw error;
    }
    for (const entry of fs.readdirSync(dir)) {
      fs.rmSync(path.join(dir, entry), { recursive: true, force: true });
    }
  }
}

/**
 * Build de desenvolvimento: web com os fontes como estão; mobile (APK debug) numa
 * cópia com todas as páginas, menos o que o export não aceita, com `out/` copiado
 * de volta para o projeto. O pacote do `npm run dev` (app-update-dev.mjs) usa
 * cópia e saída próprias (`BUILD_SOURCE_DIR`, `MOBILE_OUT_DIR`).
 */
function buildDevelopment() {
  if (!isMobileTarget) {
    return run([nextBin, "build"], buildEnv());
  }
  const { root, cleanup } = copyBuildSource(process.env.BUILD_SOURCE_DIR || undefined);
  try {
    stripExportIncompatible(root);
    const status = run([nextBin, "build"], buildEnv({ NEXT_BUILD_ROOT: projectRoot }), root);
    if (status === 0) {
      replaceDir(path.join(root, "out"), process.env.MOBILE_OUT_DIR || path.join(projectRoot, "out"));
    }
    return status;
  } finally {
    cleanup();
  }
}

function buildEnv(extra = {}) {
  const env = {
    ...process.env,
    // O ambiente já veio só do arquivo dele (app-env.mjs): sem isso o `next build`
    // carregaria sozinho `.env.production`/`.env` presentes na raiz (ex.: na imagem Docker).
    __NEXT_PROCESSED_ENV: "true",
    APP_ENV: appEnv,
    NEXT_PUBLIC_APP_ENV: appEnv,
    NEXT_BUILD_TARGET: isMobileTarget ? "mobile" : "web",
    // O app lê o alvo para restringir menu e gate às páginas publicadas (src/lib/auth/mobile-release.ts).
    NEXT_PUBLIC_BUILD_TARGET: isMobileTarget ? "mobile" : "web",
    ...extra,
  };
  // As variáveis do recurso só chegam ao bundle quando ele é mantido.
  for (const name of Object.keys(env)) {
    if (name.startsWith("NEXT_PUBLIC_APP_UPDATE")) delete env[name];
  }
  if (keepAppUpdate) {
    Object.assign(env, {
      NEXT_PUBLIC_APP_UPDATE_ENABLED: "true",
      NEXT_PUBLIC_APP_UPDATE_URL: appUpdateUrl,
      NEXT_PUBLIC_APP_UPDATE_VERSION: appUpdateVersion,
      NEXT_PUBLIC_APP_UPDATE_CHANNEL: appUpdateChannel,
    });
  }
  return env;
}

// Fora do artefato: source maps e arquivos de ambiente (o standalone copia os
// `.env*` do projeto; as `NEXT_PUBLIC_*` já foram embutidas no build).
const notInArtifact = (source) => source.endsWith(".map") || /^\.env/.test(path.basename(source));

/** Copia `from` para `to` trocando o conteúdo (sem `.map` nem `.env*`). */
function replaceDir(from, to) {
  clearDir(to);
  fs.mkdirSync(to, { recursive: true });
  fs.cpSync(from, to, {
    recursive: true,
    filter: (source) => !notInArtifact(source),
  });
}

/**
 * Build de homologação/produção: na entrada limpa (cópia em .dist-build, ou o
 * próprio contexto quando a imagem Docker já removeu o código de dev), artefato
 * montado e verificado antes de qualquer sync/empacotamento.
 */
function buildDistribution() {
  const inPlace = fs.existsSync(path.join(projectRoot, DIST_SOURCE_STAMP));
  const { root, cleanup } = inPlace
    ? { root: projectRoot, cleanup: () => undefined }
    : prepareDistSource({ keepAppUpdate });

  try {
    if (isMobileTarget) {
      stripUnreleasedPages(root);
    }
    // `.next` novo: nada de cache de outro build ou do dev.
    clearDir(path.join(root, ".next"));
    const status = run(
      [nextBin, "build"],
      buildEnv({ NEXT_BUILD_ROOT: projectRoot, ...(isMobileTarget ? {} : { NEXT_OUTPUT_STANDALONE: "true" }) }),
      root,
    );
    if (status !== 0) {
      return status;
    }

    let artifact;
    if (isMobileTarget) {
      artifact = path.join(projectRoot, "out");
      if (root !== projectRoot) replaceDir(path.join(root, "out"), artifact);
    } else {
      // O standalone espelha o workspace (projeto): o app fica em `<cópia relativa>/`
      // e as dependências rastreadas em `node_modules/`. Desaninha para a raiz do
      // artefato. Standalone NÃO traz `public` nem `.next/static`: entram aqui.
      artifact = DIST_WEB_DIR;
      const standalone = path.join(root, ".next", "standalone");
      replaceDir(path.join(standalone, path.relative(projectRoot, root)), artifact);
      if (root !== projectRoot) {
        fs.cpSync(path.join(standalone, "node_modules"), path.join(artifact, "node_modules"), { recursive: true });
      }
      fs.cpSync(path.join(root, ".next", "static"), path.join(artifact, ".next", "static"), {
        recursive: true,
        filter: (source) => !notInArtifact(source),
      });
      fs.cpSync(path.join(root, "public"), path.join(artifact, "public"), { recursive: true });
      // package.json do app no artefato: só identificação (sem a lista de dependências de dev).
      const { name, version, private: isPrivate, type } = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));
      fs.writeFileSync(path.join(artifact, "package.json"), `${JSON.stringify({ name, version, private: isPrivate, type }, null, 2)}\n`);
    }

    if (!verifyDist(artifact, { keepAppUpdate }).ok) {
      return 1;
    }
    return 0;
  } finally {
    cleanup();
  }
}

let exitStatus = isDistBuild ? buildDistribution() : buildDevelopment();

if (exitStatus === 0 && isMobileTarget && shouldSyncCapacitor) {
  // Sem asset de um build anterior no projeto Android: o sync copia o `out/` atual.
  fs.rmSync(path.join(projectRoot, "android", "app", "src", "main", "assets", "public"), { recursive: true, force: true });
  exitStatus = run([capacitorBin, "sync"]);
}

if (exitStatus !== 0) {
  process.exit(exitStatus);
}
