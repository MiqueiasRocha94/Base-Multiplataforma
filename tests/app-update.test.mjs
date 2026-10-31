import assert from "node:assert/strict";
import crypto from "node:crypto";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import { unzipSync } from "fflate";

import { buildManifest, publishedBundleErrors, signBundle, zipDirectory } from "../scripts/app-update-bundle.mjs";
import { APP_UPDATE_PART, appUpdateEnabled, importsIn, markerErrors, stripRegions } from "../scripts/dev-only.mjs";
import { appUpdateChannelFor } from "../scripts/mobile-app.mjs";
import { verifyDist } from "../scripts/verify-dist.mjs";

// Atualização remota do app (docs/ambiente-e-build.md → "Atualização remota do app").

function pasta(files) {
  const dir = mkdtempSync(path.join(tmpdir(), "app-update-"));
  for (const [rel, content] of Object.entries(files)) {
    mkdirSync(path.dirname(path.join(dir, rel)), { recursive: true });
    writeFileSync(path.join(dir, rel), content);
  }
  return dir;
}

test("desligada por padrão: só APP_UPDATE_ENABLED=true liga", () => {
  assert.equal(appUpdateEnabled({}), false);
  assert.equal(appUpdateEnabled({ APP_UPDATE_ENABLED: "false" }), false);
  assert.equal(appUpdateEnabled({ APP_UPDATE_ENABLED: "1" }), false);
  assert.equal(appUpdateEnabled({ APP_UPDATE_ENABLED: " TRUE " }), true);
});

test("remove as regiões @app-update e acusa import fora delas", () => {
  const source = [
    'import { a } from "@/lib/a";',
    "// @app-update:start",
    'import { AppUpdateGate } from "@/app-update/ui";',
    "// @app-update:end",
    "  {/* @app-update:start */}",
    "  <AppUpdateGate />",
    "  {/* @app-update:end */}",
  ].join("\n");
  const stripped = stripRegions(source, APP_UPDATE_PART);
  assert.equal(stripped, 'import { a } from "@/lib/a";\n');
  assert.deepEqual(importsIn(stripped, APP_UPDATE_PART), []);
  assert.deepEqual(markerErrors("// @app-update:start\n", APP_UPDATE_PART), ["@app-update:start sem @app-update:end"]);
  assert.deepEqual(
    importsIn('import { LiveUpdate } from "@capawesome/capacitor-live-update";\nimport { x } from "@/app-update/runtime";', APP_UPDATE_PART),
    ["@capawesome/capacitor-live-update", "@/app-update/runtime"],
  );
});

test("artefato gerado sem o recurso não pode ter vestígio dele", () => {
  const identifiers = ["LiveUpdate", "liveupdate"];
  const casos = {
    texto: { "_next/static/chunks/a.js": 'import("LiveUpdate")' },
    "config do plugin": { "assets/capacitor.config.json": '{"plugins":{"LiveUpdate":{}}}' },
    pasta: { "src/app-update/runtime/index.js": "" },
  };
  for (const [nome, files] of Object.entries(casos)) {
    const dir = pasta({ "index.html": "<html></html>", ...files });
    try {
      assert.equal(verifyDist(dir, { identifiers, quiet: true }).ok, false, nome);
      assert.equal(verifyDist(dir, { identifiers: [], keepAppUpdate: true, quiet: true }).ok, true, `${nome} (mantida)`);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  }
});

test("pacote zipado e assinado confere com a chave pública", () => {
  const dir = pasta({ "index.html": "<html></html>", "_next/static/a.js": "x" });
  try {
    const bundle = zipDirectory(dir);
    assert.deepEqual(Object.keys(unzipSync(bundle)).sort(), ["_next/static/a.js", "index.html"]);
    assert.deepEqual(zipDirectory(dir), bundle, "mesmo conteúdo, mesmo zip");

    const { privateKey, publicKey } = crypto.generateKeyPairSync("rsa", { modulusLength: 2048 });
    const { checksum, signature } = signBundle(bundle, privateKey);
    assert.equal(checksum, crypto.createHash("sha256").update(bundle).digest("hex"));
    assert.equal(crypto.verify("sha256", bundle, publicKey, Buffer.from(signature, "base64")), true);

    const adulterado = Buffer.from(bundle);
    adulterado[adulterado.length - 1] ^= 1;
    assert.equal(crypto.verify("sha256", adulterado, publicKey, Buffer.from(signature, "base64")), false);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("pasta sem index.html na raiz não vira pacote", () => {
  const dir = pasta({ "out/index.html": "" });
  try {
    assert.throws(() => zipDirectory(dir), /sem index\.html/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("imagem web só publica pacote do próprio canal e versão", () => {
  const channel = appUpdateChannelFor("base", "homolog");
  assert.equal(channel, "base/homolog");
  const manifest = buildManifest({
    channel,
    version: "4.1.0",
    minNativeVersion: "4.0.0",
    mandatory: false,
    bundleFile: "bundle-4.1.0.zip",
    checksum: "c",
    signature: "s",
  });
  const dir = pasta({ "manifest.json": JSON.stringify(manifest), "bundle-4.1.0.zip": "zip" });
  try {
    assert.deepEqual(publishedBundleErrors(dir, { channel, version: "4.1.0" }), []);
    assert.equal(publishedBundleErrors(dir, { channel: "outra/homolog", version: "4.1.0" }).length, 1);
    assert.equal(publishedBundleErrors(dir, { channel, version: "4.2.0" }).length, 1);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
