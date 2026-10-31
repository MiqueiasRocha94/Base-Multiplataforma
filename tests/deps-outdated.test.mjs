import assert from "node:assert/strict";
import test from "node:test";

import {
  compareVersions,
  isStable,
  jumpType,
  nodeTargets,
  satisfiesNode,
  suggestVersion,
} from "../scripts/deps-outdated.mjs";

// Dependências desatualizadas (docs/ambiente-e-build.md → "Dependências desatualizadas").

test("versão estável é só x.y.z numérico", () => {
  assert.equal(isStable("16.2.6"), true);
  assert.equal(isStable("17.0.0-canary.3"), false);
  assert.equal(isStable("8.0.0-rc.1"), false);
  assert.equal(isStable("1.0"), false);
});

test("compara versões segmento a segmento e classifica o salto", () => {
  assert.ok(compareVersions("1.10.0", "1.9.0") > 0);
  assert.equal(compareVersions("2.0.0", "2.0.0"), 0);
  assert.equal(jumpType("8.3.4", "8.3.9"), "patch");
  assert.equal(jumpType("8.3.4", "8.6.0"), "minor");
  assert.equal(jumpType("8.3.4", "9.0.0"), "major");
  assert.equal(jumpType("0.34.5", "0.35.0"), "major");
  assert.equal(jumpType("0.34.5", "0.34.6"), "patch");
});

test("engines.node: operadores, parciais, caret, til, hífen e alternativas", () => {
  assert.equal(satisfiesNode("22.21.0", undefined), true);
  assert.equal(satisfiesNode("22.21.0", ">=22"), true);
  assert.equal(satisfiesNode("22.21.0", ">=24.0.0"), false);
  assert.equal(satisfiesNode("22.21.0", ">= 20.9.0"), true);
  assert.equal(satisfiesNode("22.21.0", "^20.19.0 || >=22.12.0"), true);
  assert.equal(satisfiesNode("22.10.0", "^20.19.0 || >=22.12.0"), false);
  assert.equal(satisfiesNode("22.21.0", "^22"), true);
  assert.equal(satisfiesNode("23.0.0", "^22"), false);
  assert.equal(satisfiesNode("22.21.0", "~22.21"), true);
  assert.equal(satisfiesNode("22.22.0", "~22.21"), false);
  assert.equal(satisfiesNode("22.21.0", "22.x"), true);
  assert.equal(satisfiesNode("22.21.0", ">20"), true);
  assert.equal(satisfiesNode("20.5.0", ">20"), false);
  assert.equal(satisfiesNode("22.21.0", ">=18 <23"), true);
  assert.equal(satisfiesNode("22.21.0", "18 - 20"), false);
  assert.equal(satisfiesNode("22.21.0", "*"), true);
});

test("engines.node com sintaxe desconhecida fica como não verificado", () => {
  assert.equal(satisfiesNode("22.21.0", "lts/*"), null);
  assert.equal(satisfiesNode("22.21.0", "lts/* || >=22"), true);
});

test("sugere a estável mais nova que roda no Node e aponta a que exige outro", () => {
  const versions = {
    "1.0.0": {},
    "1.1.0": { engines: { node: ">=20" } },
    "1.2.0-beta.1": { engines: { node: ">=20" } },
    "2.0.0": { engines: { node: ">=24" } },
  };
  assert.deepEqual(suggestVersion("1.0.0", versions, "22.21.0"), {
    version: "1.1.0",
    unverified: false,
    blocked: { version: "2.0.0", node: ">=24" },
  });
  assert.deepEqual(suggestVersion("1.0.0", versions, "24.11.0"), {
    version: "2.0.0",
    unverified: false,
    blocked: null,
  });
  assert.equal(suggestVersion("2.0.0", versions, "22.21.0"), null);
});

test("Node do projeto é a última da major do .nvmrc; LTS é a mais nova marcada", () => {
  const releases = [
    { version: "v25.1.0", lts: false },
    { version: "v24.11.0", lts: "Krypton" },
    { version: "v22.21.0", lts: "Jod" },
    { version: "v22.20.0", lts: "Jod" },
  ];
  assert.deepEqual(nodeTargets(releases, 22), { project: "22.21.0", latestLts: "24.11.0" });
  assert.deepEqual(nodeTargets(releases, 18), { project: "18.0.0", latestLts: "24.11.0" });
});
