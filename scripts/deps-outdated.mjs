// Dependências desatualizadas (docs/ambiente-e-build.md → "Dependências desatualizadas").
//
// Sugere, para cada pacote do `npm outdated`, a versão estável mais nova que roda no
// Node do projeto (`.nvmrc`, conferido pelo `engines.node` publicado no registro do npm),
// e avisa quando há LTS do Node mais nova que a do projeto. Só sugere: não instala nada
// nem altera o `package.json`.
//
// Uso: npm run deps:check
// Código de saída: 0 sem sugestão, 2 com sugestão, 1 em erro (rede, npm ou JSON inválido).
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { projectRoot } from "./app-env.mjs";

const NPM_REGISTRY = "https://registry.npmjs.org";
const NODE_RELEASES = "https://nodejs.org/dist/index.json";

/** Versão estável: só `x.y.z` numérico (descarta alfa, beta, RC, canary, nightly). */
export function isStable(version) {
  return /^\d+\.\d+\.\d+$/.test(version);
}

/** Compara versões `x.y.z` segmento a segmento. */
export function compareVersions(a, b) {
  const x = a.split(".").map(Number);
  const y = b.split(".").map(Number);
  for (let i = 0; i < 3; i++) {
    const diff = (x[i] || 0) - (y[i] || 0);
    if (diff !== 0) return diff;
  }
  return 0;
}

/** Tipo de salto entre a versão atual e a sugerida (em `0.y.z`, trocar `y` é major). */
export function jumpType(current, next) {
  const [a, b] = [current.split(".").map(Number), next.split(".").map(Number)];
  if (a[0] !== b[0] || (a[0] === 0 && a[1] !== b[1])) return "major";
  if (a[1] !== b[1]) return "minor";
  return "patch";
}

// Versão parcial de um range (`22`, `22.x`, `20.19`, `*`): segmentos ausentes ou curinga viram null.
function parsePartial(text) {
  const match = /^v?(\d+|[xX*])(?:\.(\d+|[xX*]))?(?:\.(\d+|[xX*]))?(?:-[\w.]+)?$/.exec(text);
  if (!match) return null;
  const parts = match.slice(1).map((part) => (part === undefined || /^[xX*]$/.test(part) ? null : Number(part)));
  // Depois de um curinga, o resto também é curinga.
  const firstWildcard = parts.indexOf(null);
  return firstWildcard === -1 ? parts : parts.map((part, i) => (i < firstWildcard ? part : null));
}

const asVersion = (parts) => parts.map((part) => part ?? 0).join(".");

// Menor versão acima da parcial (`22` → `23.0.0`, `20.19` → `20.20.0`).
function bumpPartial(parts) {
  const last = parts.findLastIndex((part) => part !== null);
  if (last === -1) return null;
  return parts.map((part, i) => (i < last ? part : i === last ? part + 1 : 0)).join(".");
}

// Um comparador do range em pares [operador, versão completa]; null se não reconhecido.
function expandComparator(token) {
  const match = /^(>=|<=|>|<|=|\^|~)?(.+)$/.exec(token);
  if (!match) return null;
  const [, op = "", raw] = match;
  const parts = parsePartial(raw);
  if (!parts) return null;
  if (parts[0] === null) return [];
  const floor = asVersion(parts);
  const isPartial = parts.includes(null);

  switch (op) {
    case ">=":
      return [[">=", floor]];
    case ">":
      return isPartial ? [[">=", bumpPartial(parts)]] : [[">", floor]];
    case "<":
      return [["<", floor]];
    case "<=":
      return isPartial ? [["<", bumpPartial(parts)]] : [["<=", floor]];
    case "^": {
      const pivot = parts[0] !== 0 || parts[1] === null ? 0 : parts[1] !== 0 || parts[2] === null ? 1 : 2;
      return [[">=", floor], ["<", bumpPartial(parts.map((part, i) => (i <= pivot ? part : null)))]];
    }
    case "~":
      return [[">=", floor], ["<", bumpPartial(parts.map((part, i) => (i <= (parts[1] === null ? 0 : 1) ? part : null)))]];
    default:
      return isPartial ? [[">=", floor], ["<", bumpPartial(parts)]] : [["=", floor]];
  }
}

const TEST = {
  ">=": (diff) => diff >= 0,
  ">": (diff) => diff > 0,
  "<": (diff) => diff < 0,
  "<=": (diff) => diff <= 0,
  "=": (diff) => diff === 0,
};

/**
 * A versão do Node atende o `engines.node`? `true`/`false`, ou `null` quando o range
 * tem sintaxe não reconhecida (o pacote aparece como "não verificado").
 * Sem `engines.node`, não há restrição.
 */
export function satisfiesNode(version, range) {
  if (range === undefined || range === null || range.trim() === "") return true;
  let unknown = false;
  for (const alternative of range.split("||")) {
    const text = alternative.trim();
    const hyphen = /^(\S+)\s+-\s+(\S+)$/.exec(text);
    const tokens = hyphen
      ? [`>=${hyphen[1]}`, `<=${hyphen[2]}`]
      : text.replace(/(>=|<=|>|<|=|\^|~)\s+/g, "$1").split(/\s+/).filter(Boolean);
    const comparators = tokens.map(expandComparator);
    if (comparators.some((comparator) => comparator === null)) {
      unknown = true;
      continue;
    }
    if (comparators.flat().every(([op, bound]) => TEST[op](compareVersions(version, bound)))) return true;
  }
  return unknown ? null : false;
}

/**
 * Sugestão para um pacote: a versão estável mais nova acima da atual que roda no Node
 * do projeto, e a mais nova de todas quando ela exige outro Node.
 */
export function suggestVersion(current, versions, nodeVersion) {
  const newer = Object.entries(versions)
    .filter(([version]) => isStable(version) && compareVersions(version, current) > 0)
    .sort(([a], [b]) => compareVersions(b, a));
  if (newer.length === 0) return null;

  const [newest, newestManifest] = newer[0];
  const newestNode = newestManifest.engines?.node;
  const newestFits = satisfiesNode(nodeVersion, newestNode);
  const compatible = newer.find(([, manifest]) => satisfiesNode(nodeVersion, manifest.engines?.node) !== false);
  return {
    version: compatible?.[0] ?? null,
    unverified: compatible ? satisfiesNode(nodeVersion, compatible[1].engines?.node) === null : false,
    blocked: newestFits === false ? { version: newest, node: newestNode } : null,
  };
}

/** Última versão do Node da major do `.nvmrc` e última LTS, a partir de `index.json`. */
export function nodeTargets(releases, nvmrcMajor) {
  const versions = releases.map((release) => ({ version: release.version.replace(/^v/, ""), lts: release.lts }));
  const sameMajor = versions.find(({ version }) => Number(version.split(".")[0]) === nvmrcMajor);
  const latestLts = versions.find(({ lts }) => lts);
  return { project: sameMajor?.version ?? `${nvmrcMajor}.0.0`, latestLts: latestLts?.version ?? null };
}

async function fetchJson(url, headers = {}) {
  const response = await fetch(url, { headers });
  if (!response.ok) throw new Error(`${url} respondeu ${response.status}`);
  return response.json();
}

function readOutdated(root) {
  // Comando fixo numa string só: no Windows o npm é um .cmd e exige shell.
  const result = spawnSync("npm outdated --json", { cwd: root, encoding: "utf8", shell: true });
  // `npm outdated` sai com 1 quando há pacote desatualizado; outro código é erro.
  if (result.error || (result.status !== 0 && result.status !== 1)) {
    throw new Error(`npm outdated falhou: ${result.error?.message ?? result.stderr.trim()}`);
  }
  return result.stdout.trim() ? JSON.parse(result.stdout) : {};
}

async function main() {
  const nvmrcMajor = Number(fs.readFileSync(path.join(projectRoot, ".nvmrc"), "utf8").trim().replace(/^v/, "").split(".")[0]);
  const outdated = readOutdated(projectRoot);
  const { project: nodeVersion, latestLts } = nodeTargets(await fetchJson(NODE_RELEASES), nvmrcMajor);

  const rows = await Promise.all(
    Object.entries(outdated).map(async ([name, info]) => {
      // Metadados resumidos do registro: versões com `engines`, sem o manifesto completo.
      const meta = await fetchJson(`${NPM_REGISTRY}/${name.replace("/", "%2F")}`, {
        Accept: "application/vnd.npm.install-v1+json",
      });
      return { name, current: info.current, suggestion: suggestVersion(info.current, meta.versions, nodeVersion) };
    }),
  );

  const suggestions = rows.filter(({ suggestion }) => suggestion && (suggestion.version || suggestion.blocked));
  console.log(`[deps] Node do projeto: ${nodeVersion} (.nvmrc ${nvmrcMajor}).`);

  if (suggestions.length === 0) {
    console.log("[deps] Nenhuma atualização de dependência.");
  } else {
    console.log("[deps] Atualizações disponíveis:");
    for (const { name, current, suggestion } of suggestions) {
      const parts = [];
      if (suggestion.version) {
        const note = suggestion.unverified ? ", engines não verificado" : "";
        parts.push(`${suggestion.version} (${jumpType(current, suggestion.version)}${note})`);
      }
      if (suggestion.blocked) parts.push(`${suggestion.blocked.version} exige Node ${suggestion.blocked.node}`);
      console.log(`[deps]   ${name} ${current} → ${parts.join("; ")}`);
    }
  }

  const newerLts = latestLts && Number(latestLts.split(".")[0]) > nvmrcMajor;
  if (newerLts) {
    console.log(`[deps] Node ${latestLts} (LTS) disponível: troque junto o .nvmrc, o engines e as imagens Docker.`);
  }

  return suggestions.length > 0 || newerLts ? 2 : 0;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().then(
    (code) => process.exit(code),
    (error) => {
      console.error(`[deps] Erro: ${error.message}`);
      process.exit(1);
    },
  );
}
