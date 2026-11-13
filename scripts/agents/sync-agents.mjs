#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

// Gera a entrada de cada ferramenta de agente; a fonte unica e docs/ (rules de encaminhamento em .agents/rules/):
//   CLAUDE.md, GEMINI.md            -> so @imports (docs/README.md, docs/conduta-agentes.md)
//   AGENTS.md (Codex)               -> sem import: docs/conduta-agentes.md incorporado + indice das rules com glob
//   .github/copilot-instructions.md -> idem AGENTS.md
//   .cursor/rules/fonte-unica.mdc   -> alwaysApply com referencias @docs/README.md e @docs/conduta-agentes.md
//   .claude/rules/*.md (paths), .cursor/rules/*.mdc (globs), .github/instructions/*.instructions.md (applyTo)
//                                   -> cada rule de .agents/rules/ no formato da ferramenta
// Com o campo "kit" em .agents/recursos-kit.json (gravado na instalacao ou no reparo do Agent Docs Kit), as entradas
// ganham, logo abaixo do cabecalho, a linha "<!-- Agent Docs Kit <versao> — <modo> em <data> -->".
// Uso: node scripts/agents/sync-agents.mjs [--check]
//   --check: nao grava; falha (codigo 1) se algum gerado estiver defasado ou sobrando.
// Copia em ESM do gerador do agent-docs-kit (templates/common/scripts/agents/sync-agents.js).

const workspaceRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const rulesDir = path.join(workspaceRoot, ".agents", "rules");

const MARCA = "GERADO por npm run agents:sync a partir de docs/ e .agents/rules/ — não edite.";
const MARCA_MD = `<!-- ${MARCA} -->`;

const IMPORTS = ["@docs/README.md", "@docs/conduta-agentes.md"];

// Fonte incorporada onde a ferramenta nao aceita import.
const CONDUTA = "docs/conduta-agentes.md";

const RECURSOS_KIT = ".agents/recursos-kit.json";
const MODOS_KIT = ["instalação", "reparo"];

// Pastas onde cada rule vira um arquivo; arquivos com a MARCA que nao forem gerados sao removidos.
const PASTAS_RULES = [
  { dir: ".claude/rules", ext: ".md" },
  { dir: ".cursor/rules", ext: ".mdc" },
  { dir: ".github/instructions", ext: ".instructions.md" },
];

function ler(relativo) {
  return fs.readFileSync(path.join(workspaceRoot, relativo), "utf8").replace(/\r\n/g, "\n");
}

// Frontmatter simples: "description: texto" e "globs: [\"a\", \"b\"]" (array JSON) ou "globs:" seguido de
// linhas "  - \"a\"" (lista YAML).
function lerRule(arquivo) {
  const texto = fs.readFileSync(path.join(rulesDir, arquivo), "utf8").replace(/\r\n/g, "\n");
  const nome = arquivo.replace(/\.md$/, "");
  const m = texto.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!m) {
    throw new Error(`.agents/rules/${arquivo}: frontmatter (---) ausente`);
  }
  const rule = { nome, description: "", globs: [], corpo: m[2].trim() + "\n" };
  let emListaDeGlobs = false;
  for (const linha of m[1].split("\n")) {
    const item = linha.match(/^\s+-\s+"?([^"]+?)"?\s*$/);
    if (emListaDeGlobs && item) {
      rule.globs.push(item[1]);
      continue;
    }
    emListaDeGlobs = false;
    const [, chave, valor] = linha.match(/^(\w+):\s*(.*)$/) || [];
    if (chave === "description") {
      rule.description = valor.trim();
    } else if (chave === "globs") {
      if (valor.trim()) {
        rule.globs = JSON.parse(valor);
      } else {
        emListaDeGlobs = true;
      }
    }
  }
  if (!rule.description) {
    throw new Error(`.agents/rules/${arquivo}: description obrigatoria`);
  }
  return rule;
}

function lerRules() {
  if (!fs.existsSync(rulesDir)) {
    return [];
  }
  return fs
    .readdirSync(rulesDir)
    .filter((f) => f.endsWith(".md"))
    .sort()
    .map(lerRule);
}

// Links relativos de um doc de docs/ reescritos para valer a partir do arquivo gerado (raiz = caminho ate a raiz).
function comLinksDe(texto, raiz) {
  return texto.replace(/\]\((?!https?:|mailto:|#|\/)([^)\s]+)\)/g, (_, alvo) => `](${raiz}docs/${alvo})`);
}

function codigo(texto) {
  return "`" + texto + "`";
}

// Versao, modo e data do Agent Docs Kit aplicados ao projeto; "" sem o arquivo ou sem o campo "kit". A data vem do
// arquivo, nao do relogio, para o --check nao mudar de um dia para o outro.
function linhaDoKit() {
  if (!fs.existsSync(path.join(workspaceRoot, RECURSOS_KIT))) {
    return "";
  }
  let dados;
  try {
    dados = JSON.parse(ler(RECURSOS_KIT));
  } catch (erro) {
    throw new Error(`${RECURSOS_KIT}: JSON invalido (${erro.message})`);
  }
  const kit = dados && dados.kit;
  if (!kit) {
    return "";
  }
  const { versao, data, modo } = kit;
  if (typeof versao !== "string" || !versao || !/^\d{4}-\d{2}-\d{2}$/.test(data || "") || !MODOS_KIT.includes(modo)) {
    throw new Error(`${RECURSOS_KIT}: o campo kit exige versao, data (AAAA-MM-DD) e modo (${MODOS_KIT.join(" ou ")})`);
  }
  return `<!-- Agent Docs Kit ${versao} — ${modo} em ${data} -->`;
}

// Cabecalho das entradas: a MARCA e, se houver, a linha do kit.
function cabecalho() {
  const kit = linhaDoKit();
  return kit ? `${MARCA_MD}\n${kit}` : MARCA_MD;
}

// Entrada das ferramentas sem import (Codex, Copilot): encaminhamento + conduta incorporada + indice das rules.
function entradaIncorporada(rules, raiz) {
  let texto = [
    cabecalho(),
    "",
    `> Fonte única das orientações deste projeto: [docs/README.md](${raiz}docs/README.md) (ordem inicial de leitura e`,
    `> índice). A conduta abaixo é cópia gerada de [${CONDUTA}](${raiz}${CONDUTA}); não edite aqui.`,
    "",
    comLinksDe(ler(CONDUTA).trim(), raiz),
    "",
  ].join("\n");
  for (const r of rules.filter((x) => x.globs.length === 0)) {
    texto += `\n${r.corpo}`;
  }
  const comGlob = rules.filter((r) => r.globs.length > 0);
  if (comGlob.length > 0) {
    texto += "\n## Encaminhamento por caminho\n\nAo mexer nestes caminhos, leia a rule correspondente.\n\n";
    texto += "| Rule | Quando | Caminhos |\n| --- | --- | --- |\n";
    for (const r of comGlob) {
      const caminhos = r.globs.map(codigo).join(", ");
      texto += `| [${r.nome}](${raiz}.agents/rules/${r.nome}.md) | ${r.description} | ${caminhos} |\n`;
    }
  }
  return texto;
}

// Rule sempre ativa do Cursor: so referencias aos docs centrais.
function fonteUnicaCursor() {
  return [
    "---",
    "description: Fonte única das orientações do projeto (docs/)",
    "globs:",
    "alwaysApply: true",
    "---",
    "",
    cabecalho(),
    "",
    "Leia antes de qualquer tarefa: @docs/README.md (ordem inicial de leitura) e @docs/conduta-agentes.md (conduta",
    `obrigatória). As orientações deste projeto ficam só em ${codigo("docs/")}.`,
    "",
  ].join("\n");
}

function gerados() {
  const rules = lerRules();
  const arquivos = {};
  const importa = `${cabecalho()}\n\n${IMPORTS.join("\n")}\n`;

  arquivos["CLAUDE.md"] = importa;
  arquivos["GEMINI.md"] = importa;
  arquivos["AGENTS.md"] = entradaIncorporada(rules, "");
  arquivos[".github/copilot-instructions.md"] = entradaIncorporada(rules, "../");
  arquivos[".cursor/rules/fonte-unica.mdc"] = fonteUnicaCursor();

  for (const r of rules) {
    const corpo = `${MARCA_MD}\n\n${r.corpo}`;
    const sempre = r.globs.length === 0;
    const paths = sempre ? "" : `paths:\n${r.globs.map((g) => `  - "${g}"`).join("\n")}\n`;
    arquivos[`.claude/rules/${r.nome}.md`] = `---\ndescription: ${r.description}\n${paths}---\n\n${corpo}`;
    arquivos[`.cursor/rules/${r.nome}.mdc`] =
      `---\ndescription: ${r.description}\nglobs: ${r.globs.join(",")}\nalwaysApply: ${sempre}\n---\n\n${corpo}`;
    arquivos[`.github/instructions/${r.nome}.instructions.md`] =
      `---\ndescription: ${r.description}\napplyTo: "${sempre ? "**" : r.globs.join(",")}"\n---\n\n${corpo}`;
  }
  return arquivos;
}

// Gerados antigos (com a MARCA) que nao estao mais na lista.
function sobrando(arquivos) {
  const lista = [];
  for (const { dir, ext } of PASTAS_RULES) {
    const abs = path.join(workspaceRoot, dir);
    if (!fs.existsSync(abs)) {
      continue;
    }
    for (const f of fs.readdirSync(abs)) {
      const relativo = `${dir}/${f}`;
      if (f.endsWith(ext) && !(relativo in arquivos) && ler(relativo).includes("GERADO por npm run agents:sync")) {
        lista.push(relativo);
      }
    }
  }
  return lista;
}

function main() {
  const check = process.argv.includes("--check");
  const arquivos = gerados();
  const defasados = [];

  for (const [relativo, conteudo] of Object.entries(arquivos)) {
    const abs = path.join(workspaceRoot, relativo);
    const atual = fs.existsSync(abs) ? ler(relativo) : null;
    if (atual === conteudo) {
      continue;
    }
    if (atual !== null && !atual.includes("GERADO por npm run agents:sync")) {
      throw new Error(`${relativo} existe e nao foi gerado por este script: mova o conteudo para docs/ e apague-o.`);
    }
    defasados.push(relativo);
    if (!check) {
      fs.mkdirSync(path.dirname(abs), { recursive: true });
      fs.writeFileSync(abs, conteudo, "utf8");
    }
  }

  const extras = sobrando(arquivos);
  if (!check) {
    extras.forEach((relativo) => fs.unlinkSync(path.join(workspaceRoot, relativo)));
  }

  if (check) {
    if (defasados.length > 0 || extras.length > 0) {
      defasados.forEach((f) => console.error(`defasado: ${f}`));
      extras.forEach((f) => console.error(`sobrando: ${f}`));
      console.error("Rode: npm run agents:sync");
      process.exit(1);
    }
    console.log(`Instrucoes de agentes em dia (${Object.keys(arquivos).length} arquivos).`);
    return;
  }

  defasados.forEach((f) => console.log(`gerado: ${f}`));
  extras.forEach((f) => console.log(`removido: ${f}`));
  console.log(defasados.length + extras.length === 0 ? "Nada a atualizar." : "Instrucoes de agentes atualizadas.");
}

try {
  main();
} catch (error) {
  console.error(error.message);
  process.exit(1);
}
