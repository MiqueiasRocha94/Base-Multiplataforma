import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";

const source = await readFile(new URL("../src/lib/system/account-placement.ts", import.meta.url), "utf8");
const { outputText } = ts.transpileModule(source, {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext },
});
const { resolveAccountPlacement } = await import(`data:text/javascript;base64,${Buffer.from(outputText).toString("base64")}`);

const base = { placement: "auto", isMobile: false, headerVisible: true, menuAvailable: true };

test("auto e header: perfil no header quando ele aparece", () => {
  assert.equal(resolveAccountPlacement(base), "header");
  assert.equal(resolveAccountPlacement({ ...base, placement: "header" }), "header");
});

test("menu escolhido: perfil no menu", () => {
  assert.equal(resolveAccountPlacement({ ...base, placement: "menu" }), "menu");
});

test("header oculto: perfil vai para o menu", () => {
  assert.equal(resolveAccountPlacement({ ...base, headerVisible: false }), "menu");
  assert.equal(resolveAccountPlacement({ ...base, placement: "header", headerVisible: false }), "menu");
});

test("sem menu na sidebar: sempre header, mesmo escolhendo menu", () => {
  assert.equal(resolveAccountPlacement({ ...base, placement: "menu", menuAvailable: false }), "header");
});

test("mobile: não usa (perfil é a tela /portal/profile)", () => {
  assert.equal(resolveAccountPlacement({ ...base, isMobile: true }), null);
});
