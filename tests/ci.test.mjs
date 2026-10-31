import assert from "node:assert/strict";
import test from "node:test";

import { errorTail, isCopied, pipelineStages, selectStages } from "../scripts/ci.mjs";

// Esteira (docs/ambiente-e-build.md → "Esteira (CI)").

test("cópia da esteira leva os fontes e os modelos de ambiente", () => {
  assert.equal(isCopied(""), true);
  assert.equal(isCopied("src/app/layout.tsx"), true);
  assert.equal(isCopied("scripts\\ci.mjs"), true);
  assert.equal(isCopied(".env.example"), true);
  assert.equal(isCopied(".env.homolog.example"), true);
  assert.equal(isCopied("docs/ambiente-e-build.md"), true);
});

test("cópia da esteira deixa de fora segredos, dependências e saídas de build", () => {
  assert.equal(isCopied(".env"), false);
  assert.equal(isCopied(".env.homolog"), false);
  assert.equal(isCopied(".env.production"), false);
  assert.equal(isCopied(".env-homologacao"), false);
  assert.equal(isCopied(".secrets/android-signing.homolog.env"), false);
  assert.equal(isCopied("node_modules"), false);
  assert.equal(isCopied("src/x/node_modules/y.js"), false);
  assert.equal(isCopied("references/agent-docs-kit/README.md"), false);
  assert.equal(isCopied(".next/cache"), false);
  assert.equal(isCopied("android"), false);
  assert.equal(isCopied("builds/apk/app.apk"), false);
  assert.equal(isCopied(".git/HEAD"), false);
  assert.equal(isCopied(".claude/worktrees/x/package.json"), false);
  assert.equal(isCopied(".agents/workspace/ESTADO.md"), false);
});

test("etapas seguem a ordem e o ambiente escolhe o build", () => {
  const ids = pipelineStages("homolog").map((stage) => stage.id);
  assert.deepEqual(ids, ["install", "typecheck", "lint", "test", "check-arch", "dist-check", "deps", "build-web", "build-apk"]);
  assert.equal(pipelineStages("production").at(-1).command, "npm run apk:production");
  assert.equal(pipelineStages("homolog").find((stage) => stage.id === "build-web").command, "node ./scripts/build-target.mjs web --env=homolog");
  assert.equal(pipelineStages("homolog").find((stage) => stage.id === "deps").warnOnly, true);
});

test("seleção de etapas mantém a ordem da esteira e recusa id desconhecido", () => {
  const stages = pipelineStages("homolog");
  assert.equal(selectStages(stages, "").length, stages.length);
  assert.deepEqual(selectStages(stages, "test, install").map((stage) => stage.id), ["install", "test"]);
  assert.throws(() => selectStages(stages, "deploy"), /etapa desconhecida: deploy/);
});

test("trecho de erro corta no final e mascara segredos", () => {
  assert.equal(errorTail("falhou com senha s3cr3t\n", ["s3cr3t", undefined]), "falhou com senha ***");
  assert.equal(errorTail("abcdef", [], 3), "…def");
});
