#!/usr/bin/env node
// Entrada de build de homologação/produção SEM o código de desenvolvimento
// (docs/ferramentas-dev.md → "Fora dos artefatos"). Os fontes originais não
// mudam: o preparo trabalha numa cópia em `.dist-build/source`, que o
// build-target.mjs apaga no fim (inclusive em erro).
//
//   node scripts/prepare-dist-source.mjs              → prepara a cópia e confere (tsc)
//   node scripts/prepare-dist-source.mjs --in-place   → só em container (Docker web):
//                                                       remove no próprio contexto
//   ... --keep-app-update                              → mantém a atualização remota
//                                                       (app gerado com APP_UPDATE_ENABLED=true)
//
// Remove as pastas e as regiões das partes removíveis (scripts/dev-only.mjs): o
// código de dev sempre; a atualização remota (`src/app-update`, regiões
// `@app-update`) salvo `keepAppUpdate`. Falha se sobrar marcador ou import delas.
import { spawnSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  APP_UPDATE_PART,
  DEV_PART,
  NOT_DISTRIBUTED_PATHS,
  importsIn,
  markerErrors,
  readText,
  stripRegions,
  walkSource,
} from "./dev-only.mjs";
import { FORBIDDEN_SNAPSHOT, forbiddenIdentifierSets } from "./verify-dist.mjs";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
export const DIST_SOURCE_DIR = path.join(projectRoot, ".dist-build", "source");
export const DIST_SOURCE_STAMP = ".dist-source";

// Só o necessário para o `next build`: sem .env (o processo pai já carregou as
// variáveis), sem docs/tests/.agents, sem caches (.next) nem saídas antigas. Sem
// node_modules: a cópia fica dentro do projeto e a resolução sobe até o dele.
const COPY_ENTRIES = [
  "src",
  "public",
  "package.json",
  "next.config.ts",
  "tsconfig.json",
  "postcss.config.mjs",
  "next-env.d.ts",
];

const rel = (root, file) => path.relative(root, file).split(path.sep).join("/");

/** Remove pastas e regiões das partes em `root` e devolve os erros encontrados. */
function stripTree(root, parts) {
  const errors = [];
  for (const removed of [...parts.flatMap((part) => part.paths), ...NOT_DISTRIBUTED_PATHS]) {
    rmSync(path.join(root, removed), { recursive: true, force: true });
  }
  const files = [...walkSource(path.join(root, "src")), path.join(root, "next.config.ts")];
  for (const file of files) {
    if (!existsSync(file)) continue;
    const original = readText(file);
    let stripped = original;
    for (const part of parts) {
      for (const message of markerErrors(original, part)) errors.push(`${rel(root, file)}: ${message}`);
      stripped = stripRegions(stripped, part);
      if (stripped.includes(`@${part.marker}:`)) errors.push(`${rel(root, file)}: marcador @${part.marker} sobrou após a remoção`);
      for (const spec of importsIn(stripped, part)) {
        errors.push(`${rel(root, file)}: importa "${spec}" fora de região @${part.marker}`);
      }
    }
    if (stripped !== original) writeFileSync(file, stripped);
  }
  return errors;
}

function typecheck(root) {
  // Tipos gerados pelo Next (rotas, `LayoutProps`…) antes do tsc: a cópia não tem `.next`.
  const nextBin = path.join(projectRoot, "node_modules", "next", "dist", "bin", "next");
  const typegen = spawnSync(process.execPath, [nextBin, "typegen"], { cwd: root, stdio: "inherit" });
  if (typegen.status !== 0) return false;
  const tsc = path.join(projectRoot, "node_modules", "typescript", "bin", "tsc");
  const result = spawnSync(process.execPath, [tsc, "--noEmit", "--incremental", "false", "-p", root], {
    cwd: root,
    stdio: "inherit",
  });
  return result.status === 0;
}

/**
 * Cópia dos fontes para build em `.dist-build/source` (os originais não mudam).
 * Sozinha (build mobile de desenvolvimento), mantém o código de dev; quem chama
 * apaga a cópia com `cleanup`.
 */
export function copyBuildSource(dir = DIST_SOURCE_DIR) {
  rmSync(path.dirname(dir), { recursive: true, force: true });
  mkdirSync(dir, { recursive: true });
  for (const entry of COPY_ENTRIES) {
    const from = path.join(projectRoot, entry);
    if (existsSync(from)) cpSync(from, path.join(dir, entry), { recursive: true });
  }
  return {
    root: dir,
    cleanup: () => rmSync(path.dirname(dir), { recursive: true, force: true }),
  };
}

/**
 * Prepara a entrada limpa. Devolve a raiz onde o build deve rodar e a limpeza.
 * `inPlace` só é aceito fora de um checkout git (contexto de imagem Docker).
 * `keepAppUpdate` mantém a atualização remota (só app mobile gerado com ela).
 */
export function prepareDistSource({ inPlace = false, keepAppUpdate = false } = {}) {
  let root = DIST_SOURCE_DIR;
  // Listas de identificadores proibidos geradas antes da remoção (verify-dist.mjs).
  const forbidden = forbiddenIdentifierSets();
  const parts = keepAppUpdate ? [DEV_PART] : [DEV_PART, APP_UPDATE_PART];

  if (inPlace) {
    if (existsSync(path.join(projectRoot, ".git"))) {
      throw new Error("[dist] --in-place apagaria fontes de um checkout: use só no build de imagem Docker.");
    }
    root = projectRoot;
  } else {
    copyBuildSource();
  }

  mkdirSync(path.dirname(FORBIDDEN_SNAPSHOT), { recursive: true });
  writeFileSync(FORBIDDEN_SNAPSHOT, JSON.stringify(forbidden));

  const errors = stripTree(root, parts);
  if (errors.length) {
    for (const error of errors) console.error(`[dist] ERRO ${error}`);
    throw new Error(`[dist] entrada de build com ${errors.length} vestígio(s) de partes removidas.`);
  }
  if (!typecheck(root)) {
    throw new Error("[dist] a entrada sem as partes removidas não compila (tsc): ajuste as regiões @dev-only/@app-update.");
  }
  writeFileSync(
    path.join(root, DIST_SOURCE_STAMP),
    `entrada de build sem codigo de desenvolvimento${keepAppUpdate ? " (com atualizacao remota)" : " nem atualizacao remota"}\n`,
  );
  console.log(`[dist] entrada limpa pronta em ${rel(projectRoot, root) || "."}${keepAppUpdate ? " (mantém a atualização remota)" : ""}`);

  return {
    root,
    cleanup() {
      if (!inPlace) rmSync(path.dirname(DIST_SOURCE_DIR), { recursive: true, force: true });
    },
  };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const inPlace = process.argv.includes("--in-place");
  const keepAppUpdate = process.argv.includes("--keep-app-update");
  try {
    const { cleanup } = prepareDistSource({ inPlace, keepAppUpdate });
    // Sem --in-place é só conferência: a cópia não fica para trás.
    if (!inPlace) cleanup();
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  }
}
