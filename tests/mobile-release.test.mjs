import assert from "node:assert/strict";
import fs from "node:fs";
import { readFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import ts from "typescript";

import { MOBILE_RELEASE_FILE, readMobileRelease, routeOfPage, stripUnreleasedPages } from "../scripts/mobile-release.mjs";

const projectRoot = path.join(import.meta.dirname, "..");

function fakeProject(pages, release) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "mobile-release-"));
  for (const page of pages) {
    const file = path.join(root, "src", "app", ...page.split("/"), "page.tsx");
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, "export default function Page() { return null; }\n");
  }
  fs.mkdirSync(path.join(root, "src", "config"), { recursive: true });
  fs.writeFileSync(path.join(root, MOBILE_RELEASE_FILE), JSON.stringify(release));
  return root;
}

test("rota da página ignora os grupos do App Router", () => {
  const appDir = path.join("x", "src", "app");
  assert.equal(routeOfPage(appDir, path.join(appDir, "page.tsx")), "/");
  assert.equal(routeOfPage(appDir, path.join(appDir, "(Public)", "login", "page.tsx")), "/login");
  assert.equal(routeOfPage(appDir, path.join(appDir, "(Portal)", "portal", "persons", "detail", "page.tsx")), "/portal/persons/detail");
});

test("build mobile remove só as páginas fora da lista", () => {
  const root = fakeProject(
    ["", "(Public)/login", "(Portal)/portal/home", "(Portal)/portal/analytics", "[...notFound]"],
    { profiles: ["USER"], routes: ["/", "/login", "/portal/home"] },
  );
  try {
    const removed = stripUnreleasedPages(root);
    assert.deepEqual(removed.sort(), ["/[...notFound]", "/portal/analytics"]);
    const app = path.join(root, "src", "app");
    assert.ok(fs.existsSync(path.join(app, "(Portal)", "portal", "home", "page.tsx")));
    assert.ok(!fs.existsSync(path.join(app, "(Portal)", "portal", "analytics", "page.tsx")));
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("lista com rota sem página falha o build", () => {
  const root = fakeProject(["(Public)/login"], { profiles: ["USER"], routes: ["/login", "/portal/inexistente"] });
  try {
    assert.throws(() => stripUnreleasedPages(root), /\/portal\/inexistente/);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("lista do projeto: toda rota citada tem página; vazia, só as dinâmicas saem", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "mobile-release-real-"));
  try {
    fs.cpSync(path.join(projectRoot, "src", "app"), path.join(root, "src", "app"), { recursive: true });
    fs.mkdirSync(path.join(root, "src", "config"), { recursive: true });
    fs.copyFileSync(path.join(projectRoot, MOBILE_RELEASE_FILE), path.join(root, MOBILE_RELEASE_FILE));
    const removed = stripUnreleasedPages(root);
    if (readMobileRelease().routes.length === 0) {
      assert.ok(removed.every((route) => route.includes("[")));
    }
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("lista vazia no build: todas as páginas entram, menos as dinâmicas", () => {
  const root = fakeProject(["(Public)/login", "(Portal)/portal/analytics", "[...notFound]"], { profiles: [], routes: [] });
  try {
    assert.deepEqual(stripUnreleasedPages(root), ["/[...notFound]"]);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

// Módulo do app (src/lib/auth/mobile-release.ts) transpilado com o alvo do build.
const dataUrl = (codigo) => `data:text/javascript;base64,${Buffer.from(codigo).toString("base64")}`;
async function loadAppModule(buildTarget, appEnv = "homolog", release = { profiles: ["USER"], routes: ["/portal/home", "/portal/persons/detail"] }) {
  let fonte = await readFile(new URL("../src/lib/auth/mobile-release.ts", import.meta.url), "utf8");
  fonte = fonte
    .replace(/import release from "@\/config\/mobile-release\.json";/, `const release = ${JSON.stringify(release)};`)
    .replace(
      '"@/lib/auth/user"',
      JSON.stringify(dataUrl("export const hasAnyRole = (u, roles) => roles.some((r) => u.authorization.roles.includes(r));")),
    )
    .replace("process.env.NEXT_PUBLIC_BUILD_TARGET", JSON.stringify(buildTarget))
    .replace("process.env.NEXT_PUBLIC_APP_ENV", JSON.stringify(appEnv));
  const { outputText } = ts.transpileModule(fonte, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext } });
  return import(dataUrl(outputText));
}
const userWith = (roles) => ({ authorization: { roles, permissions: [] } });

test("no app, só rotas e perfis liberados", async () => {
  const app = await loadAppModule("mobile");
  assert.equal(app.isRouteReleased("/portal/persons/detail"), true);
  assert.equal(app.isRouteReleased("/portal/persons/detail/"), true);
  assert.equal(app.isRouteReleased("/portal/analytics"), false);
  assert.equal(app.isProfileReleased(userWith(["USER"])), true);
  assert.equal(app.isProfileReleased(userWith(["ADMIN"])), false);
  // Sessão ainda sem perfil não é bloqueada.
  assert.equal(app.isProfileReleased(userWith([])), true);
});

test("na web e no APK debug nada é restringido", async () => {
  for (const app of [await loadAppModule("web"), await loadAppModule("mobile", "development")]) {
    assert.equal(app.isRouteReleased("/portal/analytics"), true);
    assert.equal(app.isProfileReleased(userWith(["ADMIN"])), true);
  }
});

test("no app, lista vazia não restringe rota nem perfil", async () => {
  const app = await loadAppModule("mobile", "homolog", { profiles: [], routes: [] });
  assert.equal(app.isRouteReleased("/portal/analytics"), true);
  assert.equal(app.isProfileReleased(userWith(["ADMIN"])), true);
});
