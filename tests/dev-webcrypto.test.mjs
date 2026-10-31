import assert from "node:assert/strict";
import { createPublicKey, verify } from "node:crypto";
import { readFile } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";

// Substituto de WebCrypto do DPoP em dev (src/dev-tools/runtime/webcrypto.ts):
// a prova precisa ser um ES256 que um verificador padrão aceite.
const source = await readFile(new URL("../src/dev-tools/runtime/webcrypto.ts", import.meta.url), "utf8");
const { outputText } = ts.transpileModule(source, {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext },
});
// Módulo `data:` só resolve URL absoluta: troca os pacotes pelo caminho resolvido.
const code = outputText.replace(/from "(@noble\/[^"]+)"/g, (_, spec) => `from "${import.meta.resolve(spec)}"`);
const { devWebCrypto } = await import(`data:text/javascript;base64,${Buffer.from(code).toString("base64")}`);

const dev = devWebCrypto();
const b64url = (bytes) => Buffer.from(bytes).toString("base64url");

test("assinatura r||s é aceita como ES256 pela chave pública do JWK", () => {
  const privada = dev.gerarChavePrivada();
  const { x, y } = dev.coordenadasPublicas(privada);
  const publica = createPublicKey({ key: { kty: "EC", crv: "P-256", x: b64url(x), y: b64url(y) }, format: "jwk" });
  const dados = new TextEncoder().encode("cabecalho.corpo");
  const assinatura = dev.assinar(privada, dados);

  assert.equal(assinatura.length, 64);
  assert.ok(verify("sha256", dados, { key: publica, dsaEncoding: "ieee-p1363" }, assinatura));
  assert.ok(!verify("sha256", new TextEncoder().encode("outro"), { key: publica, dsaEncoding: "ieee-p1363" }, assinatura));
});

test("sha256 bate com o do Node", async () => {
  const { createHash } = await import("node:crypto");
  const dados = new TextEncoder().encode("token");
  assert.equal(b64url(dev.sha256(dados)), createHash("sha256").update(dados).digest("base64url"));
});
