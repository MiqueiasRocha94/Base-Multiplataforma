import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";

async function moduleUrl(path, replacements = {}) {
  let source = await readFile(new URL(path, import.meta.url), "utf8");
  for (const [from, to] of Object.entries(replacements)) source = source.replaceAll(from, to);
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext },
  });
  return `data:text/javascript;base64,${Buffer.from(outputText).toString("base64")}`;
}

const httpUrl = await moduleUrl("../src/lib/http.ts");
const { apiFetch, HttpError, isServerError } = await import(httpUrl);
const { loadDocument } = await import(await moduleUrl("../src/lib/docs/load-document.ts", { "@/lib/http": httpUrl }));

test("preserva Headers, URL, signal e resposta de sucesso", async (t) => {
  const controller = new AbortController();
  t.mock.method(globalThis, "fetch", async (url, options) => {
    assert.equal(url, "https://example.test/entities");
    assert.equal(options.headers.get("Authorization"), "Bearer test");
    assert.equal(options.headers.get("Content-Type"), "application/json");
    assert.equal(options.signal, controller.signal);
    assert.equal("baseUrl" in options, false);
    return Response.json({ id: 1 }, { status: 201 });
  });
  const response = await apiFetch("/entities", {
    baseUrl: "https://example.test", method: "POST", body: "{}",
    headers: new Headers({ Authorization: "Bearer test" }), signal: controller.signal,
  });
  assert.deepEqual(await response.json(), { id: 1 });
});

test("preserva detalhes de validacao 422 para a UI", async (t) => {
  const payload = { message: "Entrada invalida", errors: { name: "Obrigatorio" } };
  t.mock.method(globalThis, "fetch", async () => Response.json(payload, { status: 422 }));
  await assert.rejects(apiFetch("/entities"), (error) => {
    assert.ok(error instanceof HttpError);
    assert.equal(error.status, 422);
    assert.equal(error.message, payload.message);
    assert.deepEqual(error.payload, payload);
    assert.equal(isServerError(error), false);
    return true;
  });
});

test("classifica 503 nao JSON como falha fatal sem exibir HTML do servidor", async (t) => {
  t.mock.method(globalThis, "fetch", async () => new Response("<html>proxy error</html>", { status: 503 }));
  await assert.rejects(apiFetch("/entities"), (error) => {
    assert.equal(isServerError(error), true);
    assert.equal(error.payload, "<html>proxy error</html>");
    assert.match(error.message, /503/);
    assert.doesNotMatch(error.message, /html/);
    return true;
  });
});

test("GET e multipart nao recebem Content-Type JSON automaticamente", async (t) => {
  t.mock.method(globalThis, "fetch", async (_url, options) => {
    assert.equal(options.headers.has("Content-Type"), false);
    return new Response(null, { status: 204 });
  });
  await apiFetch("/entities");
  await apiFetch("/files", { method: "POST", body: new FormData() });
});

test("documento HTTP 404 rejeita em vez de renderizar a pagina de erro", async (t) => {
  t.mock.method(globalThis, "fetch", async () => new Response("Not found", { status: 404 }));
  await assert.rejects(loadDocument("https://example.test/document.md"), (error) => error.status === 404);
});

test("documentos data e blob continuam funcionando e respeitam cancelamento", async () => {
  assert.equal(await loadDocument("data:text/plain,%23%20Documento"), "# Documento");
  const uri = URL.createObjectURL(new Blob(["# Local"]));
  try { assert.equal(await loadDocument(uri), "# Local"); } finally { URL.revokeObjectURL(uri); }
  const controller = new AbortController();
  controller.abort();
  await assert.rejects(loadDocument("data:text/plain,test", controller.signal), { name: "AbortError" });
});
