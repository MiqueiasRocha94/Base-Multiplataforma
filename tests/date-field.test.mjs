import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";

const source = await readFile(new URL("../src/lib/date-field.ts", import.meta.url), "utf8");
const { outputText } = ts.transpileModule(source, {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext },
});
const { formatDisplay, maskTyping, parseIso, parseTyping, toIso, withinRange } = await import(
  `data:text/javascript;base64,${Buffer.from(outputText).toString("base64")}`
);

test("valor da API ↔ exibição, por dia e por mês", () => {
  assert.equal(formatDisplay("2026-06-05", "day"), "05/06/2026");
  assert.equal(formatDisplay("2026-06", "month"), "06/2026");
  assert.equal(formatDisplay("", "day"), "");
  assert.equal(formatDisplay("2026-02-30", "day"), "");
  assert.equal(toIso("day", 2026, 6, 5), "2026-06-05");
  assert.equal(toIso("month", 2026, 6), "2026-06");
});

test("máscara de digitação insere as barras e limita o tamanho", () => {
  assert.equal(maskTyping("05", "day"), "05");
  assert.equal(maskTyping("0506", "day"), "05/06");
  assert.equal(maskTyping("05062026999", "day"), "05/06/2026");
  assert.equal(maskTyping("06a2026", "month"), "06/2026");
});

test("texto digitado só vira valor quando completo e existente", () => {
  assert.equal(parseTyping("05/06/2026", "day"), "2026-06-05");
  assert.equal(parseTyping("29/02/2025", "day"), null);
  assert.equal(parseTyping("29/02/2024", "day"), "2024-02-29");
  assert.equal(parseTyping("05/06/20", "day"), null);
  assert.equal(parseTyping("13/2026", "month"), null);
  assert.equal(parseTyping("12/2026", "month"), "2026-12");
  assert.equal(parseIso("2026-13", "month"), null);
});

test("limites mínimo e máximo", () => {
  assert.ok(withinRange("2026-06-05", "2026-01-01", "2026-12-31"));
  assert.ok(!withinRange("2027-01-01", undefined, "2026-12-31"));
  assert.ok(withinRange("2026-06", "2026-06"));
});
