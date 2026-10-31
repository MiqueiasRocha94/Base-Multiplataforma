import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";

// Aviso rápido, confirmação e decisão do voltar do sistema
// (docs/componentes-ui.md → "Catálogo"; docs/plataforma-nativa.md → "Voltar do sistema").

const dataUrl = (code) => `data:text/javascript;base64,${Buffer.from(code).toString("base64")}`;

async function load(relPath, replacements = {}) {
  let source = await readFile(new URL(`../${relPath}`, import.meta.url), "utf8");
  for (const [from, to] of Object.entries(replacements)) source = source.replaceAll(from, to);
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext },
  });
  return import(dataUrl(outputText));
}

const toastModule = await load("src/lib/toast.ts");
const confirmModule = await load("src/lib/confirm.ts");
const backModule = await load("src/lib/platform/back-button.ts", {
  '"@/lib/platform/capacitor"': JSON.stringify(dataUrl("export const isNativePlatform = () => false;")),
});

test("toast avisa os assinantes, some sozinho e respeita o limite visível", (t) => {
  t.mock.timers.enable({ apis: ["setTimeout"] });
  const { toast, getToasts, subscribeToasts, dismissToast, TOAST_DURATION_MS, TOAST_MAX_VISIBLE } = toastModule;
  let calls = 0;
  const unsubscribe = subscribeToasts(() => calls++);

  const id = toast.success("Registro salvo.");
  assert.deepEqual(getToasts().map((item) => [item.tone, item.message]), [["success", "Registro salvo."]]);
  assert.equal(calls, 1);

  for (let index = 0; index < TOAST_MAX_VISIBLE; index++) toast.info(`aviso ${index}`);
  assert.equal(getToasts().length, TOAST_MAX_VISIBLE);
  assert.equal(getToasts().some((item) => item.id === id), false);

  t.mock.timers.tick(TOAST_DURATION_MS);
  assert.equal(getToasts().length, 0);

  dismissToast(9999);
  unsubscribe();
});

test("confirmação devolve a resposta e um novo pedido cancela o aberto", async () => {
  const { requestConfirm, settleConfirm, getConfirmRequest } = confirmModule;

  const first = requestConfirm({ message: "Excluir?", destructive: true });
  assert.equal(getConfirmRequest().message, "Excluir?");
  const second = requestConfirm({ message: "Descartar?" });
  assert.equal(await first, false);
  assert.equal(getConfirmRequest().message, "Descartar?");

  settleConfirm(true);
  assert.equal(await second, true);
  assert.equal(getConfirmRequest(), null);
  settleConfirm(false);
});

test("voltar do sistema: histórico, home ou sair com o segundo toque", () => {
  const { resolveBackAction, EXIT_CONFIRM_WINDOW_MS } = backModule;
  const base = { now: 10_000, lastPressAt: null };

  assert.equal(resolveBackAction({ ...base, canGoBack: true, atRoot: true }), "history");
  assert.equal(resolveBackAction({ ...base, canGoBack: false, atRoot: false }), "home");
  assert.equal(resolveBackAction({ ...base, canGoBack: false, atRoot: true }), "exit-hint");
  assert.equal(resolveBackAction({ canGoBack: false, atRoot: true, now: 10_000, lastPressAt: 10_000 - EXIT_CONFIRM_WINDOW_MS }), "exit");
  assert.equal(resolveBackAction({ canGoBack: false, atRoot: true, now: 10_000, lastPressAt: 10_000 - EXIT_CONFIRM_WINDOW_MS - 1 }), "exit-hint");
});

test("fora do app nativo o voltar não assina nem sai", async () => {
  const unsubscribe = backModule.subscribeBackButton(() => assert.fail("não deve chamar"));
  unsubscribe();
  await backModule.exitApp();
});
