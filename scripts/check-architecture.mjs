#!/usr/bin/env node
// Checagem estrutural da arquitetura de src/ — o que o ESLint não enxerga
// (pastas, nomes de arquivo, JSX fora de módulo de view). O mapa docs/mapa-src.md é
// verificado por scripts/gen-src-map.mjs --check.
// Fronteiras de import ficam no eslint.config.mjs. Regras: docs/estrutura-projeto.md;
// exceções: docs/enforcement-arquitetura.md.
//
//   node scripts/check-architecture.mjs            → checa src/ inteiro
//   node scripts/check-architecture.mjs <arquivo>  → checa só esse caminho
//
// Sai com código 1 se houver erro. Avisos não falham.
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";

import { REMOVABLE_PARTS, importsIn, isPartPath, markerErrors, stripRegions } from "./dev-only.mjs";

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1")), "..");
const SRC = path.join(ROOT, "src");

// Desvios conhecidos (nome PascalCase de antes do padrão kebab-case; renomear em
// 2 passos no Windows). Remova daqui ao corrigir.
const KNOWN = {
  "src/components/Can.tsx": "D14",
  "src/components/Turnstile.tsx": "D14",
};

// Módulos que não são view: não podem ter JSX (.tsx).
const NO_TSX = ["lib", "core", "services", "types", "dev-backend", "config", "hooks"];
// contexts usa PascalCase por convenção (AuthContext.tsx…); o resto é kebab.
const KEBAB_EXEMPT = ["contexts", "app"];
const KEBAB = /^[a-z0-9][a-z0-9.-]*$/;
const PAGE_WARN_LINES = 150;

// Partes removíveis da entrada de build (scripts/dev-only.mjs): recursos de dev
// (docs/ferramentas-dev.md → "Fora dos artefatos") e atualização remota
// (docs/ambiente-e-build.md → "Atualização remota do app"). Fora das pastas da
// parte, import dela só dentro das regiões `@dev-only`/`@app-update` (que a
// entrada de build remove) e marcadores sempre em par.

const rel = (p) => path.relative(ROOT, p).split(path.sep).join("/");

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const full = path.join(dir, name);
    if (statSync(full).isDirectory()) {
      out.push(full);
      walk(full, out);
    } else {
      out.push(full);
    }
  }
  return out;
}

function check(paths) {
  const errors = [];
  const warnings = [];

  for (const full of paths) {
    const r = rel(full);
    if (!r.startsWith("src/")) continue;
    const parts = r.split("/").slice(1); // sem "src"
    const mod = parts[0];
    const name = parts[parts.length - 1];
    const isDir = existsSync(full) && statSync(full).isDirectory();
    const known = KNOWN[r];

    if (mod === "app") {
      // Pastas privadas de rota: telas vão para src/components/{modulo}.
      const priv = parts.find((p) => /^_/.test(p));
      if (priv) errors.push(`${r}: pasta "${priv}" em src/app — telas e subcomponentes ficam em src/components/{modulo} (docs/estrutura-projeto.md "Regra de colocação").`);
      // Segmento dinâmico quebra output:export (APK): use ?id= (docs/estrutura-projeto.md).
      const dyn = parts.find((p) => /^\[.*\]$/.test(p) && p !== "[...notFound]");
      if (dyn) errors.push(`${r}: rota dinâmica "${dyn}" — use query param ?id= + Suspense (docs/estrutura-projeto.md "Rotas estáticas por ?id=").`);
      if (!isDir && name === "page.tsx" && existsSync(full)) {
        const lines = readFileSync(full, "utf8").split("\n").length;
        if (lines > PAGE_WARN_LINES) warnings.push(`${r}: ${lines} linhas — page.tsx deve ser fina; extraia a tela para src/components/{modulo}.`);
      }
      continue;
    }

    if (isDir) continue;

    if (/\.(m?[jt]sx?)$/.test(name) && existsSync(full)) errors.push(...devOnlyErrors(full, r));

    if (NO_TSX.includes(mod) && name.endsWith(".tsx")) {
      errors.push(`${r}: .tsx em src/${mod} — JSX/componente pertence a src/components (docs/estrutura-projeto.md "Módulos arquiteturais").`);
    }

    if (!KEBAB_EXEMPT.includes(mod) && name !== "AGENTS.md" && !KEBAB.test(name)) {
      (known ? warnings : errors).push(`${r}: nome fora do padrão kebab-case${known ? ` (${known}, desvio conhecido)` : ""}.`);
    }
  }
  return { errors, warnings };
}

function devOnlyErrors(full, r) {
  const source = readFileSync(full, "utf8");
  const errors = [];
  for (const part of REMOVABLE_PARTS) {
    errors.push(...markerErrors(source, part).map((message) => `${r}: ${message} (${part.doc}).`));
    if (isPartPath(r, part)) continue;
    for (const spec of importsIn(stripRegions(source, part), part)) {
      errors.push(`${r}: importa "${spec}" fora de região @${part.marker} — a entrada de build sem a parte não teria o módulo (${part.doc}).`);
    }
  }
  return errors;
}

const args = process.argv.slice(2);
const targets = args.length ? args.map((a) => path.resolve(a)) : walk(SRC);
const { errors, warnings } = check(targets);
// next.config.ts também é entrada de build: mesmas regras de região.
if (!args.length) errors.push(...devOnlyErrors(path.join(ROOT, "next.config.ts"), "next.config.ts"));

for (const w of warnings) console.warn(`aviso  ${w}`);
for (const e of errors) console.error(`ERRO   ${e}`);
if (!args.length) console.log(`\ncheck-architecture: ${errors.length} erro(s), ${warnings.length} aviso(s).`);
process.exit(errors.length ? 1 : 0);
