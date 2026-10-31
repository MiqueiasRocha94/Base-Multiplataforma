// Páginas publicadas no app (docs/ambiente-e-build.md → "Páginas publicadas no app").
//
// A lista em src/config/mobile-release.json é a mesma que o app lê (menu e gate).
// O build mobile apaga, na CÓPIA dos fontes, o `page.tsx` de toda rota fora dela:
// a página não entra no APK. Os fontes originais não mudam.
import fs from "node:fs";
import path from "node:path";

import { projectRoot } from "./app-env.mjs";

export const MOBILE_RELEASE_FILE = path.join("src", "config", "mobile-release.json");

/** Lista de rotas e perfis liberados no app (lista vazia = sem restrição). */
export function readMobileRelease(root = projectRoot) {
  return JSON.parse(fs.readFileSync(path.join(root, MOBILE_RELEASE_FILE), "utf8"));
}

/** Rota de um `page.tsx` do App Router: sem os grupos `(Nome)`. */
export function routeOfPage(appDir, pageFile) {
  const segments = path
    .relative(appDir, path.dirname(pageFile))
    .split(path.sep)
    .filter((segment) => segment && !/^\(.*\)$/.test(segment));
  return `/${segments.join("/")}`;
}

function pageFiles(dir) {
  const files = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...pageFiles(full));
    else if (entry.name === "page.tsx") files.push(full);
  }
  return files;
}

/**
 * Remove de `root/src/app` as páginas fora da lista e devolve as rotas removidas.
 * Falha se a lista citar rota sem página (erro de digitação ou página apagada).
 */
export function stripUnreleasedPages(root) {
  const appDir = path.join(root, "src", "app");
  const released = new Set(readMobileRelease(root).routes);
  const pages = pageFiles(appDir).map((file) => ({ file, route: routeOfPage(appDir, file) }));
  // Sem lista: todas as páginas entram, menos as dinâmicas (o `output: export` não as aceita).
  const isReleased = released.size === 0 ? (route) => !route.includes("[") : (route) => released.has(route);

  const missing = [...released].filter((route) => !pages.some((page) => page.route === route));
  if (missing.length) {
    throw new Error(`[mobile-release] rota(s) sem página em ${MOBILE_RELEASE_FILE}: ${missing.join(", ")}`);
  }

  const removed = [];
  for (const { file, route } of pages) {
    if (isReleased(route)) continue;
    fs.rmSync(file);
    removed.push(route);
  }
  console.log(`[mobile-release] ${pages.length - removed.length} página(s) no app; ${removed.length} fora do build.`);
  return removed;
}

/**
 * APK debug (desenvolvimento): todas as páginas entram; sai só o que o
 * `output: export` não aceita — rota dinâmica (`[...notFound]`) e as rotas de
 * API (`src/app/api`, servidas só pelo `npm run dev`). Devolve as rotas removidas.
 */
export function stripExportIncompatible(root) {
  const appDir = path.join(root, "src", "app");
  const removed = [];
  const apiDir = path.join(appDir, "api");
  if (fs.existsSync(apiDir)) {
    fs.rmSync(apiDir, { recursive: true });
    removed.push("/api");
  }
  for (const file of pageFiles(appDir)) {
    const route = routeOfPage(appDir, file);
    if (!route.includes("[")) continue;
    fs.rmSync(file);
    removed.push(route);
  }
  console.log(`[mobile-release] APK debug com todas as páginas; fora do export: ${removed.join(", ") || "nada"}.`);
  return removed;
}
