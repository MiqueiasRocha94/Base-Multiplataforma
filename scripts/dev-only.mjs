// Partes removíveis da entrada de build e como saem dos artefatos:
//   - código de desenvolvimento: sai sempre de homologação/produção
//     (docs/ferramentas-dev.md → "Fora dos artefatos");
//   - atualização remota do app: sai da web sempre e do mobile quando o app é
//     gerado sem `APP_UPDATE_ENABLED=true` (docs/ambiente-e-build.md →
//     "Atualização remota do app").
// Fonte única para o preparo da cópia limpa (prepare-dist-source.mjs), para o
// check:arch e para a verificação dos artefatos (verify-dist.mjs).
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";

/** Pastas/arquivos removidos inteiros da cópia de build. */
export const DEV_ONLY_PATHS = [
  "src/dev-tools",
  "src/dev-backend",
  // Demos das telas de erro com texto aleatório (faker): só servem em dev.
  "src/app/(Portal)/portal/demo400",
  "src/app/(Portal)/portal/demo500",
  // Canal de atualização do APK debug servido pelo `npm run dev` (scripts/app-update-dev.mjs).
  "src/app/api/dev",
];

/**
 * Fora da entrada de build sem ser código de dev: diagramas da documentação do
 * projeto (docs/*.md), que citam a arquitetura interna e o app não usa.
 */
export const NOT_DISTRIBUTED_PATHS = ["public/docs"];

/** Imports que só podem aparecer dentro de região marcada (fora das pastas acima). */
export const DEV_ONLY_IMPORTS = ["@/dev-tools", "@/dev-backend"];

/** Pacotes usados só pelo código de dev: não podem ser importados na cópia limpa. */
export const DEV_ONLY_PACKAGES = ["@noble/curves", "@noble/hashes", "@faker-js/faker"];

/** Plugin nativo da atualização remota (fica fora do APK quando o recurso está desligado). */
export const APP_UPDATE_PACKAGE = "@capawesome/capacitor-live-update";

/**
 * Cada parte: marcador das regiões (`// @<marker>:start` … `// @<marker>:end`),
 * pastas removidas inteiras, imports e pacotes permitidos só dentro delas ou das regiões.
 */
export const DEV_PART = {
  id: "dev",
  marker: "dev-only",
  paths: DEV_ONLY_PATHS,
  imports: DEV_ONLY_IMPORTS,
  packages: DEV_ONLY_PACKAGES,
  doc: 'docs/ferramentas-dev.md "Fora dos artefatos"',
};

export const APP_UPDATE_PART = {
  id: "app-update",
  marker: "app-update",
  paths: ["src/app-update"],
  imports: ["@/app-update"],
  packages: [APP_UPDATE_PACKAGE],
  doc: 'docs/ambiente-e-build.md "Atualização remota do app"',
};

export const REMOVABLE_PARTS = [DEV_PART, APP_UPDATE_PART];

/** Atualização remota ligada na geração do app (`APP_UPDATE_ENABLED=true`). */
export function appUpdateEnabled(env = process.env) {
  return String(env.APP_UPDATE_ENABLED ?? "").trim().toLowerCase() === "true";
}

const regionCache = new Map();

// Região em linhas inteiras: `// @<marker>:start` (ou `{/* @<marker>:start */}`
// em JSX) até a linha do `@<marker>:end`, inclusive. Região dentro da linha:
// `/* @<marker>:start */ … /* @<marker>:end */`.
function regionPatterns(marker) {
  if (!regionCache.has(marker)) {
    const comment = String.raw`[ \t]*(?:\/\/|\{\/\*|\/\*)[ \t]*@${marker}`;
    regionCache.set(marker, {
      line: new RegExp(String.raw`^${comment}:start\b[^\n]*\n[\s\S]*?^${comment}:end\b[^\n]*(?:\n|$)`, "gm"),
      inline: new RegExp(String.raw`\/\*[ \t]*@${marker}:start[ \t]*\*\/[\s\S]*?\/\*[ \t]*@${marker}:end[ \t]*\*\/`, "g"),
    });
  }
  return regionCache.get(marker);
}

/** Remove as regiões da parte. Marcadores sem par ficam no texto (e são acusados). */
export function stripRegions(source, part = DEV_PART) {
  const { line, inline } = regionPatterns(part.marker);
  return source.replace(line, "").replace(inline, "");
}

export function stripDevRegions(source) {
  return stripRegions(source, DEV_PART);
}

/** Erros de marcação da parte: par desbalanceado ou aninhado. */
export function markerErrors(source, part = DEV_PART) {
  const tag = `@${part.marker}`;
  const errors = [];
  let open = false;
  for (const match of source.matchAll(new RegExp(`${tag}:(start|end)\\b`, "g"))) {
    const isStart = match[1] === "start";
    if (isStart && open) errors.push(`${tag}:start aninhado (feche a região anterior)`);
    if (!isStart && !open) errors.push(`${tag}:end sem ${tag}:start`);
    open = isStart;
  }
  if (open) errors.push(`${tag}:start sem ${tag}:end`);
  return errors;
}

const IMPORT_SPEC = /(?:from\s+|import\s*\(\s*|import\s+)["']([^"']+)["']/g;

/** Imports da parte que sobram no texto (use no texto JÁ sem as regiões). */
export function importsIn(source, part = DEV_PART) {
  const found = [];
  const matches = (list, spec) => list.some((mod) => spec === mod || spec.startsWith(`${mod}/`));
  for (const [, spec] of source.matchAll(IMPORT_SPEC)) {
    if (matches(part.imports, spec) || matches(part.packages, spec)) found.push(spec);
  }
  return found;
}

export function devImportsIn(source) {
  return importsIn(source, DEV_PART);
}

export function isPartPath(relPath, part) {
  const rel = relPath.split(path.sep).join("/");
  return part.paths.some((p) => rel === p || rel.startsWith(`${p}/`));
}

export function isDevOnlyPath(relPath) {
  return isPartPath(relPath, DEV_PART);
}

/** Arquivos de código (para marcadores e imports). */
export function walkSource(dir, out = []) {
  if (!existsSync(dir)) return out;
  for (const name of readdirSync(dir)) {
    const full = path.join(dir, name);
    if (statSync(full).isDirectory()) walkSource(full, out);
    else if (/\.(m?[jt]sx?)$/.test(name)) out.push(full);
  }
  return out;
}

export function readText(file) {
  return readFileSync(file, "utf8");
}
