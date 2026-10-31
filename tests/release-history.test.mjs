import assert from "node:assert/strict";
import test from "node:test";

import { bump, classify } from "../scripts/release/calcular-versao-historico.mjs";

// Versão retroativa (docs/ambiente-e-build.md → "Release").

test("classifica commits convencionais e os fora do padrão por palavra-chave", () => {
  assert.equal(classify("feat!: ✨ shell novo", ""), 3);
  assert.equal(classify("fix: 🐛 corrige", "BREAKING CHANGE: muda contrato"), 3);
  assert.equal(classify("feat: ✨ tela", ""), 2);
  assert.equal(classify("build: 🏗️ apk", ""), 1);
  assert.equal(classify("style: 💄 espaços", ""), 0);
  assert.equal(classify("Merge branch 'x'", ""), 0);
  assert.equal(classify("Adicionado relatório", ""), 2);
  assert.equal(classify("Initial commit from Create Next App", ""), 1);
});

test("fase beta não tem major; o marco vira 1.0.0 e depois a quebra sobe o major", () => {
  assert.deepEqual(bump(null, 1), [0, 1, 0]);
  assert.deepEqual(bump([0, 1, 0], 3), [0, 2, 0]);
  assert.deepEqual(bump([0, 2, 0], 1), [0, 2, 1]);
  assert.deepEqual(bump([0, 9, 3], 1, { marco: true }), [1, 0, 0]);
  assert.deepEqual(bump([1, 4, 2], 3, { stable: true }), [2, 0, 0]);
});
