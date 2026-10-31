#!/usr/bin/env node
// Reconstrói a versão semântica a partir do histórico do git (docs/ambiente-e-build.md → "Release").
// Só leitura: não cria tag.
//
// Regra:
//   - release = cada dia em que o branch de produção (first-parent) mudou;
//   - o bump do dia é o maior tipo entre os commits que entraram naquele dia;
//   - commits convencionais seguem o .releaserc.json (feat = minor; fix/perf/refactor/docs/ci/chore/build = patch;
//     "!" ou BREAKING CHANGE = major); os fora do padrão são classificados por palavra-chave em português:
//     adição/inclusão/implementação/criação = minor, o resto = patch;
//   - fase beta (0.y.z): da primeira release (0.1.0) até antes do marco; quebra de compatibilidade sobe o minor;
//   - 1.0.0 = primeira release cujo commit contém o marco (`--marco <commit>`). Sem marco, tudo é fase beta.
//
// Uso:
//   node scripts/release/calcular-versao-historico.mjs [--prod master] [--marco <commit>] [--markdown]
import { execFileSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const args = process.argv.slice(2);
const option = (name, fallback) => {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : fallback;
};
const PROD = option("--prod", "master");
const MARCO = option("--marco", null);
const MARKDOWN = args.includes("--markdown");

const git = (...params) =>
  execFileSync("git", ["-c", "i18n.logOutputEncoding=UTF-8", ...params], { encoding: "utf8", maxBuffer: 1 << 28 });
const isAncestor = (a, b) => {
  try {
    execFileSync("git", ["merge-base", "--is-ancestor", a, b]);
    return true;
  } catch {
    return false;
  }
};

const withoutAccents = (text) =>
  text.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/�/g, "?").toLowerCase().trim();

const LEVELS = ["nenhum", "patch", "minor", "major"];
const CONVENTIONAL = /^([a-z]+)(\([^)]*\))?(!)?:\s/;
const PATCH_TYPES = ["fix", "perf", "refactor", "docs", "ci", "chore", "hotfix", "build"];
const FEATURE_PT = /^(-\s*)?(adicion|adi..?o\b|adicao|inclu|implement|cria|criad|nov[oa]s?\b|add\b|nova funcionalidade|finalizada adicao)/;

export function classify(subject, body) {
  const match = subject.match(CONVENTIONAL);
  if (match) {
    if (match[3] || /BREAKING CHANGE/.test(body)) return 3;
    if (match[1] === "feat") return 2;
    return PATCH_TYPES.includes(match[1]) ? 1 : 0;
  }
  const normalized = withoutAccents(subject);
  if (/^merge\b/.test(normalized)) return 0;
  // algum item do assunto (separado por " - ") começa com palavra de funcionalidade nova
  const items = normalized.split(/\s+-\s+|^-\s*/).filter(Boolean);
  return items.some((item) => FEATURE_PT.test(item)) ? 2 : 1;
}

/** Próxima versão; na fase beta (0.y.z) não existe major: quebra de compatibilidade sobe o minor. */
export function bump(version, level, { stable = false, marco = false } = {}) {
  if (marco) return [1, 0, 0];
  if (!version) return [0, 1, 0];
  const [major, minor, patch] = version;
  if (level === 3 && stable) return [major + 1, 0, 0];
  if (level >= 2) return [major, minor + 1, 0];
  return [major, minor, patch + 1];
}

const SEP = "\x1f";
const END = "\x1e";
function commits(range) {
  return git("log", "--no-merges", `--format=%H${SEP}%s${SEP}%b${END}`, ...range)
    .split(END)
    .map((record) => record.trim())
    .filter(Boolean)
    .map((record) => {
      const [hash, subject, body] = record.split(SEP);
      return { hash, level: classify(subject, body || "") };
    });
}

function main() {
  // first-parent do branch de produção, do mais antigo para o mais novo, agrupado por dia
  const days = new Map();
  for (const line of git("log", "--first-parent", "--reverse", `--format=%H %P${SEP}%cd`, "--date=short", PROD).trim().split("\n")) {
    const [ids, day] = line.split(SEP);
    const [hash, ...parents] = ids.split(" ");
    const brought = parents.length > 1 ? commits([`${parents[0]}..${hash}`]) : commits(["-1", hash]);
    if (!days.has(day)) days.set(day, { last: hash, commits: [] });
    const entry = days.get(day);
    entry.last = hash;
    entry.commits.push(...brought);
  }

  let version = null;
  let stable = false;
  const releases = [];
  for (const [day, entry] of days) {
    const level = Math.max(0, ...entry.commits.map((commit) => commit.level));
    if (!level) continue;
    const marco = Boolean(MARCO) && !stable && isAncestor(MARCO, entry.last);
    if (marco) stable = true;
    version = bump(version, level, { stable, marco });
    releases.push({
      day,
      version: version.join("."),
      phase: stable ? "estável" : "beta",
      marco,
      level: marco ? "marco" : LEVELS[level],
      commits: entry.commits.length,
      minor: entry.commits.filter((commit) => commit.level === 2).length,
      patch: entry.commits.filter((commit) => commit.level === 1).length,
      commit: entry.last,
    });
  }

  if (!MARKDOWN) {
    console.log(JSON.stringify({ prod: PROD, marco: MARCO, current: version?.join(".") ?? null, releases }, null, 2));
    return;
  }

  console.log("| Data | Versão | Bump | Commits (minor / patch) | Commit |");
  console.log("|------|--------|------|-------------------------|--------|");
  for (const release of [...releases].reverse()) {
    const label = release.marco ? `**${release.version}** 🚀` : release.version;
    console.log(`| ${release.day} | ${label} | ${release.level} | ${release.commits} (${release.minor} / ${release.patch}) | \`${release.commit.slice(0, 7)}\` |`);
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main();
}
