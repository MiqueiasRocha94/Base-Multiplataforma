import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import { devImportsIn, markerErrors, stripDevRegions } from "../scripts/dev-only.mjs";
import { verifyDist } from "../scripts/verify-dist.mjs";

// Remoção do código de dev da entrada de build e verificação dos artefatos
// (docs/ferramentas-dev.md → "Fora dos artefatos").

test("remove região em linhas, em JSX e dentro da linha", () => {
  const source = [
    'import { a } from "@/lib/a";',
    "// @dev-only:start",
    'import { dev } from "@/dev-tools/runtime";',
    "// @dev-only:end",
    "const x = /* @dev-only:start */ dev() ?? /* @dev-only:end */ 1;",
    "  {/* @dev-only:start */}",
    "  <Painel />",
    "  {/* @dev-only:end */}",
    "export { a };",
  ].join("\n");
  const stripped = stripDevRegions(source);
  assert.equal(stripped, ['import { a } from "@/lib/a";', "const x =  1;", "export { a };"].join("\n"));
  assert.deepEqual(devImportsIn(stripped), []);
});

test("acusa marcador sem par, aninhado e import de dev fora de região", () => {
  assert.deepEqual(markerErrors("// @dev-only:start\n"), ["@dev-only:start sem @dev-only:end"]);
  assert.deepEqual(markerErrors("// @dev-only:end\n"), ["@dev-only:end sem @dev-only:start"]);
  assert.equal(markerErrors("// @dev-only:start\n// @dev-only:start\n// @dev-only:end\n").length, 1);
  assert.deepEqual(devImportsIn('import { x } from "@/dev-backend/acesso";\nimport { p } from "@noble/curves/nist.js";'), [
    "@/dev-backend/acesso",
    "@noble/curves/nist.js",
  ]);
  assert.deepEqual(devImportsIn('import { x } from "@/lib/dev-utils";'), []);
});

function artefato(files) {
  const dir = mkdtempSync(path.join(tmpdir(), "verify-dist-"));
  for (const [rel, content] of Object.entries(files)) {
    mkdirSync(path.dirname(path.join(dir, rel)), { recursive: true });
    writeFileSync(path.join(dir, rel), content);
  }
  return dir;
}

const identifiers = ["devWebCrypto", "Modo desenvolvedor", "@noble/curves"];
const limpo = { "server.js": "require('next')", ".next/static/chunks/a.js": 'console.log("produto")' };

test("artefato limpo passa", () => {
  const dir = artefato(limpo);
  try {
    assert.equal(verifyDist(dir, { identifiers, quiet: true }).ok, true);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("vestígio plantado em cada categoria falha", () => {
  const casos = {
    texto: { ".next/static/chunks/b.js": "devWebCrypto()" },
    traducao: { "public/locales/pt-BR/pt-BR.json": '{"t":"Modo desenvolvedor"}' },
    trace: { ".next/server/app/page.js.nft.json": '{"files":["../node_modules/@noble/curves/nist.js"]}' },
    "source map": { ".next/static/chunks/a.js.map": "{}" },
    "arquivo de ambiente": { ".env.production": "X=1" },
    "pasta de dev": { ".next/server/dev-tools/x.js": "" },
    "pacote de dev": { "node_modules/@noble/curves/index.js": "" },
  };
  for (const [nome, extra] of Object.entries(casos)) {
    const dir = artefato({ ...limpo, ...extra });
    try {
      assert.equal(verifyDist(dir, { identifiers, quiet: true }).ok, false, nome);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  }
});
