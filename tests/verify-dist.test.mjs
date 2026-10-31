import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import { forbiddenIdentifiers, intentionalEntry, verifyDist } from "../scripts/verify-dist.mjs";

// Achados propositais e configuração de rota do Next na verificação dos artefatos
// (docs/ferramentas-dev.md → "Fora dos artefatos").

function withArtifact(files, check) {
  const dir = mkdtempSync(path.join(tmpdir(), "verify-dist-"));
  try {
    for (const [rel, content] of Object.entries(files)) {
      mkdirSync(path.dirname(path.join(dir, rel)), { recursive: true });
      writeFileSync(path.join(dir, rel), content);
    }
    check(dir);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

const identifiers = ["devWebCrypto", "Modo desenvolvedor"];

test("tela de demonstração e o texto da home são propositais: contam, mas não reprovam", () => {
  withArtifact(
    {
      "portal/persons.html": "<html></html>",
      ".next/static/chunks/home.js": 'title:"Modo desenvolvedor adaptado do Expo"',
    },
    (dir) => {
      const result = verifyDist(dir, { identifiers, quiet: true });
      assert.equal(result.ok, true);
      assert.equal(result.findings.length, 0);
      assert.equal(result.intentional.length, 2);
    },
  );
});

test("achado real reprova mesmo ao lado de um proposital", () => {
  withArtifact({ "portal/audit.html": "", ".next/static/chunks/b.js": "devWebCrypto()" }, (dir) => {
    const result = verifyDist(dir, { identifiers, quiet: true });
    assert.equal(result.ok, false);
    assert.deepEqual(result.findings.map((finding) => finding.detail), ["devWebCrypto"]);
    assert.equal(result.intentional.length, 1);
  });
});

test("o texto proposital fora do trecho da home continua reprovando", () => {
  assert.equal(intentionalEntry("Modo desenvolvedor", '"Modo desenvolvedor adaptado do Expo"')?.label, 'texto "Modo desenvolvedor" na home');
  assert.equal(intentionalEntry("Modo desenvolvedor", '{"title":"Modo desenvolvedor"}'), undefined);
  assert.equal(
    intentionalEntry("Modo desenvolvedor", '"Modo desenvolvedor adaptado do Expo" {"title":"Modo desenvolvedor"}'),
    undefined,
  );
});

test("configuração de rota do Next exportada pelo código de dev não vira identificador", () => {
  const forbidden = forbiddenIdentifiers();
  for (const name of ["dynamic", "revalidate", "runtime", "default"]) assert.equal(forbidden.includes(name), false, name);
});
