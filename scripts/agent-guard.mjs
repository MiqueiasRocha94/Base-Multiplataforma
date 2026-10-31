#!/usr/bin/env node
// Hook PostToolUse do Claude Code (.claude/settings.json): após o agente
// editar/criar um arquivo em src/, roda o ESLint (fronteiras de módulo) e a
// checagem estrutural só nesse arquivo. Também protege os arquivos gerados por
// scripts/agents/sync-agents.mjs e regenera-os quando a fonte (docs/README.md,
// docs/conduta-agentes.md, .agents/rules/) muda. Problema encontrado → exit 2: o texto
// do stderr volta para o agente, que precisa corrigir antes de seguir.
// Regras: docs/estrutura-projeto.md; exceções: docs/enforcement-arquitetura.md.
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

const ARCH_RULES = new Set(["no-restricted-imports", "no-restricted-syntax"]);
// Cabeçalho que o sync escreve nos .md/.mdc gerados (montado para não casar com este arquivo).
const GENERATED_MARK = "<" + "!-- GERADO por npm run agents:sync";
const SYNC = ["scripts/agents/sync-agents.mjs"];
const SYNC_SOURCES = ["docs/README.md", "docs/conduta-agentes.md"];

let raw = "";
process.stdin.setEncoding("utf8");
process.stdin.on("data", (d) => (raw += d));
process.stdin.on("end", () => {
  let filePath;
  try {
    const input = JSON.parse(raw || "{}");
    filePath = input.tool_input?.file_path ?? input.tool_input?.notebook_path;
  } catch {
    process.exit(0);
  }
  if (!filePath) process.exit(0);

  const root = process.env.CLAUDE_PROJECT_DIR || process.cwd();
  const relPath = path.relative(root, path.resolve(filePath)).split(path.sep).join("/");
  const opts = { cwd: root, encoding: "utf8", shell: process.platform === "win32" };

  // Arquivos de entrada das ferramentas (AGENTS.md, CLAUDE.md, .cursor/rules…)
  // são gerados a partir de docs/ e .agents/rules/: edição direta é revertida e bloqueada.
  const full = path.join(root, relPath);
  const isGenerated =
    /\.(md|mdc)$/.test(relPath) &&
    !relPath.startsWith(".agents/") &&
    !relPath.startsWith("docs/") &&
    existsSync(full) &&
    readFileSync(full, "utf8").includes(GENERATED_MARK);
  if (isGenerated) {
    spawnSync("node", SYNC, opts);
    process.stderr.write(
      `${relPath} é GERADO e foi restaurado. Faça a mudança na fonte ` +
        `(docs/README.md, docs/conduta-agentes.md ou .agents/rules/*.md); o sync roda sozinho.\n`,
    );
    process.exit(2);
  }

  // Fonte editada → regenera os pontos de entrada de todas as ferramentas.
  if (SYNC_SOURCES.includes(relPath) || relPath.startsWith(".agents/rules/")) {
    const sync = spawnSync("node", SYNC, opts);
    if (sync.status !== 0) {
      process.stderr.write(`agents:sync falhou após editar ${relPath}:\n${sync.stderr}\n`);
      process.exit(2);
    }
    process.exit(0);
  }

  if (!relPath.startsWith("src/")) process.exit(0);

  const problems = [];

  const arch = spawnSync("node", ["scripts/check-architecture.mjs", relPath], opts);
  if (arch.status === 1) problems.push(arch.stderr.trim());

  if (/\.(ts|tsx|mjs|js)$/.test(relPath)) {
    // Só as regras de fronteira: erros antigos de outras regras não travam o agente.
    const lint = spawnSync("npx", ["eslint", "--no-warn-ignored", "-f", "json", `"${relPath}"`], opts);
    try {
      const messages = JSON.parse(lint.stdout || "[]")
        .flatMap((f) => f.messages)
        .filter((m) => ARCH_RULES.has(m.ruleId));
      if (messages.length) {
        problems.push(messages.map((m) => `${relPath}:${m.line} [${m.ruleId}] ${m.message}`).join("\n"));
      }
    } catch {
      // saída inesperada do ESLint: não bloqueia
    }
  }

  if (problems.length) {
    process.stderr.write(
      `Violação de arquitetura/lint em ${relPath}. Corrija seguindo docs/estrutura-projeto.md ` +
        `(não afrouxe a regra; exceção inevitável segue docs/enforcement-arquitetura.md → "Exceção intencional": eslint-disable-next-line <regra> -- Dxx (desvio conhecido): <motivo>):\n\n` +
        problems.join("\n\n") +
        "\n",
    );
    process.exit(2);
  }
  process.exit(0);
});
