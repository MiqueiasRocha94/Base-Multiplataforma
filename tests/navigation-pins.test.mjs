import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";

const dataUrl = (code) => `data:text/javascript;base64,${Buffer.from(code).toString("base64")}`;

// Só o toggle é testado: navegação e storage viram stubs mínimos.
let source = await readFile(new URL("../src/lib/navigation-pins.ts", import.meta.url), "utf8");
source = source
  .replaceAll('"@/lib/navigation"', JSON.stringify(dataUrl("export const MOBILE_NAV_MAX = 7;")))
  .replaceAll(
    '"@/lib/platform/storage"',
    JSON.stringify(dataUrl("export const storageKeys = {}; export const getStorageItem = () => null; export const setStorageItem = () => {};")),
  );
const { outputText } = ts.transpileModule(source, {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext },
});
const { MOBILE_NAV_MAX_PINS, toggleMobileNavPin } = await import(dataUrl(outputText));

const visiveis = (hrefs) => (href) => hrefs.includes(href);
const pins = (...entradas) => entradas.map(([href, slot]) => ({ href, slot }));

test("desafixar o 1 libera o 1; o próximo pin ocupa o 1", () => {
  const ve = visiveis(["/a", "/b", "/c", "/d"]);
  const semA = toggleMobileNavPin(pins(["/a", 1], ["/b", 2], ["/c", 3]), "/a", ve, 3);
  assert.deepEqual(semA, pins(["/b", 2], ["/c", 3]));
  assert.deepEqual(toggleMobileNavPin(semA, "/d", ve, 3), pins(["/b", 2], ["/c", 3], ["/d", 1]));
});

test("cheio: solta o visível mais antigo e usa o slot dele", () => {
  const ve = visiveis(["/a", "/b", "/c", "/d"]);
  assert.deepEqual(
    toggleMobileNavPin(pins(["/b", 2], ["/a", 1], ["/c", 3]), "/d", ve, 3),
    pins(["/a", 1], ["/c", 3], ["/d", 2]),
  );
});

test("pin oculto (sem acesso) não ocupa slot nem limite, e não é descartado", () => {
  assert.equal(MOBILE_NAV_MAX_PINS, 5);
  const ve = visiveis(["/a", "/b"]);
  assert.deepEqual(toggleMobileNavPin(pins(["/x/oculto", 1], ["/a", 2]), "/b", ve, 3), pins(["/x/oculto", 1], ["/a", 2], ["/b", 1]));
});

test("limite = slots da barra atual: visíveis além dele (barra maior) saem", () => {
  const ve = visiveis(["/a", "/b", "/c", "/d", "/e", "/f"]);
  const tablet = pins(["/a", 1], ["/b", 2], ["/c", 3], ["/d", 4], ["/e", 5]);
  assert.deepEqual(toggleMobileNavPin(tablet, "/f", ve, 3), pins(["/b", 2], ["/c", 3], ["/f", 1]));
});

// Barra: cada pin no seu slot; slot livre = item padrão (módulos após o home).
let navSource = await readFile(new URL("../src/lib/navigation.ts", import.meta.url), "utf8");
navSource = navSource
  .replaceAll('"@/lib/auth/user"', JSON.stringify(dataUrl("export const hasAllPermissions = () => true; export const hasAnyRole = () => true; export const hasPermission = () => true;")))
  .replaceAll('"@/lib/auth/mobile-release"', JSON.stringify(dataUrl("export const isRouteReleased = () => true;")));
const nav = ts.transpileModule(navSource, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext } });
const { getMobileNavigationGroups } = await import(dataUrl(nav.outputText));

test("barra: desafixado o slot 1, ele volta ao padrão e o pin 2 fica no 2", () => {
  const itens = [
    { href: "/home", label: "Home" },
    { href: "/m1", label: "M1" },
    { href: "/m2", label: "M2" },
    { href: "/consulta", label: "Consulta", children: [{ href: "/consulta/contratos", label: "Contratos" }] },
  ];
  const barra = getMobileNavigationGroups(itens, 5, [{ href: "/consulta/contratos", slot: 2 }]);
  assert.deepEqual(barra.left.map((item) => item.href), ["/home", "/m1", "/consulta/contratos", "/m2"]);
});
