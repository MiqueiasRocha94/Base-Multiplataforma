#!/usr/bin/env node
// Regenera a "Arvore completa" de docs/mapa-src.md a partir do disco.
// As descrições (`<-- ...`) escritas à mão são preservadas por caminho; rotas
// recebem descrição automática; arquivo novo sem descrição fica marcado
// `<-- (descrever)` para alguém completar no próprio doc.
//
//   node scripts/gen-src-map.mjs          → reescreve a árvore e os totais
//   node scripts/gen-src-map.mjs --check  → exit 1 se o doc não bate com o disco
import { readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1")), "..");
const DOC = path.join(ROOT, "docs", "mapa-src.md");
const CHECK = process.argv.includes("--check");
const TODO = "(descrever)";

const doc = readFileSync(DOC, "utf8").replace(/\r\n/g, "\n");
const blockRe = /(## Arvore completa\n\n```text\n)([\s\S]*?)(\n```)/;
const block = doc.match(blockRe);
if (!block) throw new Error("docs/mapa-src.md: bloco ```text de \"## Arvore completa\" não encontrado.");

// --- descrições existentes, por caminho --------------------------------------
const known = new Map();
const stack = [];
for (const line of block[2].split("\n")) {
  const m = line.match(/^([│├└─\s]*)(\S.*?)(?:\s{2,}<--\s*(.*))?$/u);
  if (!m) continue;
  const depth = Math.round([...m[1]].length / 4);
  const name = m[2].replace(/\/$/, "");
  stack.length = depth;
  stack.push(name);
  if (m[3]) known.set(stack.join("/"), m[3].trim());
}

// --- árvore a partir do disco -------------------------------------------------
const routeOf = (parts) => {
  const segs = parts.slice(2, -1).filter((p) => !/^\(.*\)$/.test(p));
  return "/" + segs.join("/");
};
function describe(rel, isDir) {
  const parts = rel.split("/"); // ["src", "app", ...]
  const inApp = parts[1] === "app" && parts.length > 2;
  const name = parts[parts.length - 1];
  const manual = known.has(rel) && known.get(rel) !== TODO ? known.get(rel) : null;
  // page.tsx: texto automático (se a rota mudar, acompanha), salvo descrição própria.
  if (inApp && !isDir && name === "page.tsx") {
    return manual && !manual.startsWith("Entrada da rota") ? manual : `Entrada da rota ${routeOf(parts)}`;
  }
  if (manual) return manual;
  if (inApp && isDir && !/^[([]/.test(name)) return `Segmento de rota: ${name}`;
  return TODO;
}

let dirs = 0;
let files = 0;
const lines = [`src/    <-- ${describe("src", true)}`];
function walk(dirAbs, rel, prefix) {
  const entries = readdirSync(dirAbs)
    .map((n) => ({ n, dir: statSync(path.join(dirAbs, n)).isDirectory() }))
    .sort((a, b) => (a.dir === b.dir ? a.n.localeCompare(b.n, "en") : a.dir ? -1 : 1));
  entries.forEach(({ n, dir }, i) => {
    const last = i === entries.length - 1;
    const r = `${rel}/${n}`;
    if (dir) dirs++;
    else files++;
    lines.push(`${prefix}${last ? "└── " : "├── "}${n}${dir ? "/" : ""}    <-- ${describe(r, dir)}`);
    if (dir) walk(path.join(dirAbs, n), r, prefix + (last ? "    " : "│   "));
  });
}
walk(path.join(ROOT, "src"), "src", "");

const tree = lines.join("\n");
const missing = lines.filter((l) => l.endsWith(TODO)).length;
let next = doc.replace(blockRe, `$1${tree}$3`);
next = next.replace(
  /^Inventario da estrutura existente[^\n]*?\*\*\d+ pastas e \d+ arquivos\*\*[^.]*\./m,
  `Inventario gerado por \`npm run docs:src-map\` a partir do disco: **${dirs} pastas e ${files} arquivos**, sem contar a propria pasta \`src/\`.`,
);

if (CHECK) {
  if (next !== doc) {
    console.error("docs/mapa-src.md desatualizado em relação a src/ — rode `npm run docs:src-map` e descreva os itens `(descrever)`.");
    process.exit(1);
  }
  if (missing) console.warn(`docs/mapa-src.md: ${missing} item(ns) com ${TODO}.`);
  console.log("docs/mapa-src.md em dia.");
} else {
  writeFileSync(DOC, next);
  console.log(`docs/mapa-src.md regenerado: ${dirs} pastas, ${files} arquivos; ${missing} item(ns) com ${TODO}.`);
}
