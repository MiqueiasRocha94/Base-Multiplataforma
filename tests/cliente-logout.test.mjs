import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";

// Dependências do transporte simuladas: estado compartilhado em `globalThis.__api`.
const dataUrl = (codigo) => `data:text/javascript;base64,${Buffer.from(codigo).toString("base64")}`;

const http = dataUrl(`
export class HttpError extends Error {
  constructor(status, payload, message, headers) { super(message); this.status = status; this.payload = payload; this.headers = headers; }
}
export async function apiFetch(path, init) { return globalThis.__api.responder(path, init); }
`);
const session = dataUrl(`
export const getSession = () => globalThis.__api.sessao;
export const clearSession = () => { globalThis.__api.sessao = null; globalThis.__api.limpou += 1; };
export const sessaoRenovavel = (s) => Boolean(s.renovavel);
export const saveSession = (resposta, atual) => (globalThis.__api.sessao = { ...atual, accessToken: resposta.token });
`);
const dpop = dataUrl(`export const criarProvaDpop = async () => "prova"; export const tokenVinculado = () => false;`);
const canal = dataUrl(`export const usaCookieDeRenovacao = () => false;`);
const devTools = dataUrl(`export const devApiBase = (base) => base;`);

let fonte = await readFile(new URL("../src/services/api/cliente.ts", import.meta.url), "utf8");
for (const [de, para] of Object.entries({ "@/lib/http": http, "@/lib/auth/session": session, "@/lib/auth/dpop": dpop, "@/lib/auth/canal": canal, "@/dev-tools/runtime": devTools })) {
  fonte = fonte.replaceAll(`"${de}"`, JSON.stringify(para));
}
const { outputText } = ts.transpileModule(fonte, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext } });
const { chamarApi } = await import(dataUrl(outputText));
const { HttpError } = await import(http);

const ok = () => new Response(JSON.stringify({ ok: true }), { status: 200 });
const recusa = (status = 401) => {
  throw new HttpError(status, null, "recusado");
};

/** Prepara a sessão e as respostas (uma função por chamada, na ordem). */
function cenario(sessao, respostas) {
  const fila = [...respostas];
  globalThis.__api = { sessao, limpou: 0, chamadas: [], responder: (path, init) => {
    globalThis.__api.chamadas.push({ path, auth: new Headers(init.headers).get("Authorization") });
    return fila.shift()();
  } };
  return globalThis.__api;
}

test("401 sem renovação possível: propaga e encerra a sessão", async () => {
  const api = cenario({ accessToken: "t1", renovavel: false }, [() => recusa()]);
  await assert.rejects(chamarApi("/private/x", { token: "t1" }), { status: 401 });
  assert.equal(api.limpou, 1);
  assert.equal(api.sessao, null);
});

test("401 de token antigo (sessão já é outra) não derruba a sessão atual", async () => {
  const api = cenario({ accessToken: "novo", renovavel: false }, [() => recusa()]);
  await assert.rejects(chamarApi("/private/x", { token: "antigo" }), { status: 401 });
  assert.equal(api.limpou, 0);
});

test("401 renovado com sucesso repete a chamada e mantém a sessão", async () => {
  const api = cenario({ accessToken: "t1", renovavel: true }, [
    () => recusa(),
    () => new Response(JSON.stringify({ token: "t2" }), { status: 200 }),
    ok,
  ]);
  const resposta = await chamarApi("/private/x", { token: "t1" });
  assert.equal(resposta.status, 200);
  assert.equal(api.limpou, 0);
  assert.equal(api.chamadas.at(-1).auth, "Bearer t2");
});

test("401 que persiste depois da renovação encerra a sessão", async () => {
  const api = cenario({ accessToken: "t1", renovavel: true }, [
    () => recusa(),
    () => new Response(JSON.stringify({ token: "t2" }), { status: 200 }),
    () => recusa(),
  ]);
  await assert.rejects(chamarApi("/private/x", { token: "t1" }), { status: 401 });
  assert.equal(api.limpou, 1);
});

test("refresh recusado encerra a sessão", async () => {
  const api = cenario({ accessToken: "t1", renovavel: true }, [() => recusa(), () => recusa()]);
  await assert.rejects(chamarApi("/private/x", { token: "t1" }), { status: 401 });
  assert.equal(api.limpou, 1);
});

test("não encerra: login sem token, chamada sem renovação e 403", async () => {
  const api = cenario({ accessToken: "t1", renovavel: false }, [() => recusa(), () => recusa(), () => recusa(403)]);
  await assert.rejects(chamarApi("/auth/login", { method: "POST" }), { status: 401 });
  await assert.rejects(chamarApi("/auth/logout", { token: "t1", renovar: false }), { status: 401 });
  await assert.rejects(chamarApi("/private/x", { token: "t1" }), { status: 403 });
  assert.equal(api.limpou, 0);
});
