#!/usr/bin/env node
// Verificação dos artefatos distribuídos (docs/ferramentas-dev.md → "Fora dos
// artefatos"): falha se encontrar conteúdo exclusivo de desenvolvimento ou, quando
// o app é gerado sem ela, da atualização remota (docs/ambiente-e-build.md →
// "Atualização remota do app").
//
//   node scripts/verify-dist.mjs dist/web          → build web (standalone montado)
//   node scripts/verify-dist.mjs out               → export do mobile
//   node scripts/verify-dist.mjs builds/apk/x.apk  → APK (descompactado: tar no Windows, unzip no resto)
//   ... --keep-app-update                          → artefato mobile gerado com APP_UPDATE_ENABLED=true
//
// Três verificações, que se completam (busca textual sozinha não prova ausência):
//   1. arquivos: caminho de pasta/rota de dev, source map, `.env*`, pacote só de dev;
//   2. traces e manifests do Next (`*.nft.json`, `*manifest*.json`,
//      `required-server-files.json`): nenhum módulo/rota de dev incluído;
//   3. texto: identificadores proibidos em todo arquivo do app (inclui binários
//      do APK: dex, recursos), gerados do próprio código removido + lista fixa.
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { APP_UPDATE_PACKAGE, APP_UPDATE_PART, DEV_ONLY_PACKAGES, DEV_PART, walkSource } from "./dev-only.mjs";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

// Sempre proibidos, além dos derivados do código de dev.
const FIXED_IDENTIFIERS = [
  "dev-tools",
  "dev-backend",
  "@dev-only",
  "src/dev-",
  "demo.local",
  "dpop-dev",
  "dev.whitelabel",
  "developer_mode_settings",
  "developerMode",
  "DeveloperMode",
  "developerPanel",
  "systemPanel",
  "quickAccess",
  "captchaDisabled",
  "mockedData",
  "ignoreTls",
  "NEXT_PUBLIC_DEVELOPER_MODE",
  "NEXT_PUBLIC_SYSTEM_PANEL_ENABLED",
  "NEXT_PUBLIC_DEV_QUICK",
  "1x00000000000000000000AA",
  "allowedDevOrigins",
  "/portal/demo400",
  "/portal/demo500",
  ...DEV_ONLY_PACKAGES,
];

// Proibidos quando o app é gerado sem a atualização remota (e sempre na web):
// módulo, marcador, plugin nativo (classe Java `io.capawesome...liveupdate`) e as
// variáveis do recurso.
const APP_UPDATE_FIXED_IDENTIFIERS = [
  "@app-update",
  "src/app-update",
  "LiveUpdate",
  "liveupdate",
  "NEXT_PUBLIC_APP_UPDATE",
  APP_UPDATE_PACKAGE,
];

// Falso positivo conhecido, por arquivo (regex do caminho relativo) e identificador.
// Toda entrada precisa de motivo. Vazio enquanto não houver caso real.
const ALLOWLIST = [];

// Achados propositais: conteúdo da base que fica no artefato para demonstrar que a
// verificação funciona. Aparecem na saída como PROPOSITAL, com o motivo, e não
// reprovam. Com `context`, só vale quando toda ocorrência do identificador no arquivo
// faz parte desse trecho (o mesmo texto em outro lugar continua reprovando).
// Produto que remover o conteúdo apaga a entrada.
export const INTENTIONAL = [
  {
    label: "tela de demonstração",
    detail: "tela de demonstração",
    reason: "telas de exemplo da base (analytics, audit, persons) mantidas para demonstrar a detecção",
  },
  {
    label: "texto \"Modo desenvolvedor\" na home",
    detail: "Modo desenvolvedor",
    context: "Modo desenvolvedor adaptado do Expo",
    reason: "card da home (src/lib/mock-data.ts) cita o recurso de propósito",
  },
];

// Exportações de configuração de rota do Next: aparecem em todo build, não identificam código de dev.
const NEXT_ROUTE_EXPORTS = new Set([
  "default",
  "dynamic",
  "dynamicParams",
  "revalidate",
  "fetchCache",
  "runtime",
  "preferredRegion",
  "maxDuration",
  "metadata",
  "viewport",
  "generateMetadata",
  "generateStaticParams",
  "generateViewport",
]);

const TEXT_LIMIT = 64 * 1024 * 1024;

/** Nomes exportados pela parte (≥ 6 caracteres) que o resto do código não define. */
function partExportNames(part) {
  const exportRe = /export\s+(?:async\s+)?(?:function|const|let|class|type|interface)\s+([A-Za-z_$][\w$]*)/g;
  const listRe = /export\s*\{([^}]*)\}/g;
  const collect = (files) => {
    const names = new Set();
    for (const file of files) {
      const text = readFileSync(file, "utf8");
      for (const [, name] of text.matchAll(exportRe)) names.add(name);
      for (const [, list] of text.matchAll(listRe)) {
        for (const item of list.split(",")) {
          const name = item.replace(/^\s*type\s+/, "").split(/\s+as\s+/).pop()?.trim();
          if (name) names.add(name);
        }
      }
    }
    return names;
  };
  const partFiles = part.paths.flatMap((p) => walkSource(path.join(projectRoot, p)));
  const productFiles = walkSource(path.join(projectRoot, "src")).filter(
    (file) => !part.paths.some((p) => path.relative(projectRoot, file).split(path.sep).join("/").startsWith(`${p}/`)),
  );
  const product = collect(productFiles);
  return [...collect(partFiles)].filter((name) => name.length >= 6 && !product.has(name) && !NEXT_ROUTE_EXPORTS.has(name));
}

function jsonStrings(dir, out = new Set()) {
  if (!existsSync(dir)) return out;
  const visit = (value) => {
    if (typeof value === "string") out.add(value);
    else if (value && typeof value === "object") Object.values(value).forEach(visit);
  };
  for (const file of walkFiles(dir)) {
    if (file.endsWith(".json")) visit(JSON.parse(readFileSync(file, "utf8")));
  }
  return out;
}

/**
 * Textos das traduções da parte (≥ 12 caracteres, para não pegar "Fechar"), menos
 * os que o produto também usa (ex.: "Acesso rapido" do selo mobile).
 */
function partLocaleTexts(localesDir) {
  const product = [...jsonStrings(path.join(projectRoot, "public", "locales"))];
  return [...jsonStrings(path.join(projectRoot, localesDir))].filter(
    (text) => text.length >= 12 && !product.some((value) => value.includes(text)),
  );
}

/**
 * Listas salvas pelo preparo da entrada (prepare-dist-source.mjs) ANTES de apagar
 * as partes — no Docker a remoção é no próprio contexto e os fontes removidos já
 * não existem quando o artefato é verificado.
 */
export const FORBIDDEN_SNAPSHOT = path.join(projectRoot, ".dist-build", "forbidden-identifiers.json");

/** Identificadores de cada parte removível: `{ dev, appUpdate }`. */
export function forbiddenIdentifierSets() {
  if (!existsSync(path.join(projectRoot, "src", "dev-tools")) && existsSync(FORBIDDEN_SNAPSHOT)) {
    return JSON.parse(readFileSync(FORBIDDEN_SNAPSHOT, "utf8"));
  }
  return {
    dev: [...new Set([...FIXED_IDENTIFIERS, ...partExportNames(DEV_PART), ...partLocaleTexts("src/dev-tools/locales")])],
    appUpdate: [
      ...new Set([
        ...APP_UPDATE_FIXED_IDENTIFIERS,
        ...partExportNames(APP_UPDATE_PART),
        ...partLocaleTexts("src/app-update/locales"),
      ]),
    ],
  };
}

/** Proibidos no artefato: dev sempre; atualização remota quando o app não a mantém. */
export function forbiddenIdentifiers({ keepAppUpdate = false } = {}) {
  const sets = forbiddenIdentifierSets();
  return [...new Set([...sets.dev, ...(keepAppUpdate ? [] : sets.appUpdate)])];
}

function walkFiles(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const full = path.join(dir, name);
    if (statSync(full).isDirectory()) walkFiles(full, out);
    else out.push(full);
  }
  return out;
}

const relTo = (root, file) => path.relative(root, file).split(path.sep).join("/");
const allowed = (rel, identifier) => ALLOWLIST.some((entry) => entry.file.test(rel) && entry.identifier === identifier);

/** Entrada de INTENTIONAL que cobre o achado, ou undefined. */
export function intentionalEntry(detail, content = "") {
  return INTENTIONAL.find(
    (entry) => entry.detail === detail && (!entry.context || !content.split(entry.context).join("").includes(detail)),
  );
}

function unzipApk(apk) {
  const dir = path.join(projectRoot, ".dist-build", "verify-apk");
  rmSync(dir, { recursive: true, force: true });
  mkdirSync(dir, { recursive: true });
  // Windows: o tar do sistema (bsdtar) abre zip; Linux/macOS: unzip.
  const windowsTar = path.join(process.env.SystemRoot ?? "C:\\Windows", "System32", "tar.exe");
  const [command, args] = process.platform === "win32" ? [windowsTar, ["-xf", apk, "-C", dir]] : ["unzip", ["-q", "-o", apk, "-d", dir]];
  const result = spawnSync(command, args, { stdio: "inherit" });
  if (result.status !== 0) throw new Error(`[verify-dist] não foi possível descompactar ${apk} (${command}).`);
  return dir;
}

/**
 * Verifica um artefato (pasta ou .apk). Devolve `{ ok, report }` e imprime o
 * relatório; `ok === false` quando houver qualquer achado.
 */
export function verifyDist(
  target,
  { keepAppUpdate = false, identifiers = forbiddenIdentifiers({ keepAppUpdate }), quiet = false } = {},
) {
  const isApk = target.endsWith(".apk");
  const root = isApk ? unzipApk(target) : target;
  const findings = [];
  const stats = { files: 0, appFiles: 0, traces: 0, manifests: 0, identifiers: identifiers.length };

  try {
    const files = walkFiles(root);
    stats.files = files.length;

    for (const file of files) {
      const rel = relTo(root, file);
      // node_modules do standalone: só o próprio Next e as dependências do produto,
      // copiadas como estão — conferidas pelo nome do pacote, não pelo texto.
      const inNodeModules = rel.includes("node_modules/");

      // 1. Arquivos e pastas.
      if (rel.endsWith(".map")) findings.push({ kind: "arquivo", rel, detail: "source map" });
      if (/(^|\/)\.env/.test(rel)) findings.push({ kind: "arquivo", rel, detail: "arquivo de ambiente (.env)" });
      if (/(^|\/)(dev-tools|dev-backend|demo400|demo500)(\/|$)/.test(rel)) findings.push({ kind: "arquivo", rel, detail: "caminho de dev" });
      for (const pkg of DEV_ONLY_PACKAGES) {
        if (rel.includes(`node_modules/${pkg}/`)) findings.push({ kind: "arquivo", rel, detail: `pacote só de dev ${pkg}` });
      }
      if (!keepAppUpdate && /(^|\/)(app-update|liveupdate)(\/|$)/.test(rel)) {
        findings.push({ kind: "arquivo", rel, detail: "atualização remota em artefato gerado sem ela" });
      }
      if (inNodeModules) continue;
      // Telas de exemplo da base: detectadas e marcadas como propositais (INTENTIONAL).
      if (/(^|\/)portal\/(analytics|audit|persons)(\/|\.|$)/.test(rel)) {
        findings.push({ kind: "arquivo", rel, detail: "tela de demonstração", intentional: intentionalEntry("tela de demonstração") });
      }

      stats.appFiles += 1;
      if (rel.endsWith(".nft.json")) stats.traces += 1;
      if (/manifest.*\.json$|required-server-files\.json$/.test(rel)) stats.manifests += 1;

      // 2 e 3. Traces/manifests e conteúdo: busca dos identificadores no texto
      // (em binários, nos bytes como latin1 — strings do dex/recursos aparecem).
      if (statSync(file).size > TEXT_LIMIT) {
        findings.push({ kind: "limite", rel, detail: "arquivo maior que o limite da busca" });
        continue;
      }
      const content = readFileSync(file).toString("latin1");
      const contentUtf8 = Buffer.from(content, "latin1").toString("utf8");
      for (const identifier of identifiers) {
        if ((content.includes(identifier) || contentUtf8.includes(identifier)) && !allowed(rel, identifier)) {
          const kind = rel.endsWith(".nft.json") || /manifest|required-server-files/.test(rel) ? "trace/manifest" : "texto";
          findings.push({ kind, rel, detail: identifier, intentional: intentionalEntry(identifier, contentUtf8) });
        }
      }
    }
  } finally {
    if (isApk) {
      rmSync(path.join(projectRoot, ".dist-build", "verify-apk"), { recursive: true, force: true });
      // Sem outro uso em andamento (cópia de build), não deixa a pasta vazia para trás.
      const distBuild = path.join(projectRoot, ".dist-build");
      if (existsSync(distBuild) && readdirSync(distBuild).length === 0) rmSync(distBuild, { recursive: true, force: true });
    }
  }

  const intentional = findings.filter((finding) => finding.intentional);
  const failures = findings.filter((finding) => !finding.intentional);

  if (!quiet) {
    const label = relTo(projectRoot, path.resolve(target)) || target;
    console.log(`[verify-dist] ${label}: ${stats.files} arquivos (${stats.appFiles} do app, ${stats.traces} traces, ${stats.manifests} manifests), ${stats.identifiers} identificadores proibidos.`);
    for (const entry of INTENTIONAL) {
      const hits = intentional.filter((finding) => finding.intentional === entry);
      if (hits.length > 0) {
        console.log(`[verify-dist] PROPOSITAL ${entry.label}: ${hits.length} ocorrência(s) (ex.: ${hits[0].rel}) — ${entry.reason}.`);
      }
    }
    const demo = intentional.length > 0 ? ` (${intentional.length} achado(s) proposital(is) de demonstração)` : "";
    if (failures.length === 0) {
      console.log(`[verify-dist] OK — nenhum conteúdo exclusivo de desenvolvimento${keepAppUpdate ? "" : " nem da atualização remota"}${demo}.`);
    } else {
      for (const finding of failures.slice(0, 200)) {
        console.error(`[verify-dist] ERRO ${finding.kind}: ${finding.rel} — ${finding.detail}`);
      }
      if (failures.length > 200) console.error(`[verify-dist] … e mais ${failures.length - 200}.`);
      console.error(`[verify-dist] FALHOU: ${failures.length} achado(s)${demo}.`);
    }
  }
  return { ok: failures.length === 0, findings: failures, intentional, stats };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const target = process.argv[2];
  if (!target || !existsSync(target)) {
    console.error("uso: node scripts/verify-dist.mjs <pasta|arquivo.apk>");
    process.exit(2);
  }
  const keepAppUpdate = process.argv.includes("--keep-app-update");
  process.exit(verifyDist(path.resolve(target), { keepAppUpdate }).ok ? 0 : 1);
}
