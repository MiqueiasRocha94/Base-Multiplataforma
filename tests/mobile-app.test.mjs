import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import sharp from "sharp";

import {
  appIconSource,
  applyAndroidIcon,
  applyAndroidIdentity,
  applyAndroidNotificationIcon,
  resolveMobileApp,
  versionCodeFrom,
} from "../scripts/mobile-app.mjs";

test("versionCode segue o esquema MAJOR·100000 + MINOR·1000 + PATCH·10", () => {
  assert.equal(versionCodeFrom("3.1.4"), 301040);
  assert.equal(versionCodeFrom("4.0.0"), 400000);
  assert.ok(versionCodeFrom("4.0.0") > versionCodeFrom("3.99.99"));
});

test("versao fora do esquema falha", () => {
  assert.throws(() => versionCodeFrom("4.0"), /versao invalida/);
  assert.throws(() => versionCodeFrom("4.0.0-beta.1"), /versao invalida/);
  assert.throws(() => versionCodeFrom("4.100.0"), /ate 99/);
});

test("producao usa o applicationId publicado da marca", () => {
  const app = resolveMobileApp({ brand: "base", appEnv: "production", appVersion: "4.0.0", nativeVersion: "4.0.0" });
  assert.equal(app.appId, "com.multiplataforma.base");
  assert.equal(app.name, "Base Multiplataforma");
  assert.equal(app.versionCode, 400000);
});

test("versao da loja vem da versao nativa, nao da versao da aplicacao", () => {
  const app = resolveMobileApp({
    brand: "base",
    appEnv: "production",
    appVersion: "4.3.2",
    nativeVersion: "4.0.1",
  });
  assert.equal(app.versionName, "4.0.1");
  assert.equal(app.versionCode, 400010);
  assert.equal(app.appVersion, "4.3.2");
});

test("versao nativa padrao vem de mobile-apps.json", () => {
  const { nativeVersion } = JSON.parse(
    fs.readFileSync(path.join(import.meta.dirname, "..", "scripts", "mobile-apps.json"), "utf8"),
  );
  const app = resolveMobileApp({ brand: "base", appEnv: "production", appVersion: "9.9.9" });
  assert.equal(app.versionName, nativeVersion);
  assert.equal(app.versionCode, versionCodeFrom(nativeVersion));
});

test("fora de producao o applicationId leva o sufixo do ambiente", () => {
  const app = resolveMobileApp({ brand: "Base", appEnv: "homolog", appVersion: "4.0.0" });
  assert.equal(app.appId, "com.multiplataforma.base.homolog");
});

test("producao sem marca ou com marca desconhecida falha", () => {
  assert.throws(() => resolveMobileApp({ brand: "", appEnv: "production", appVersion: "4.0.0" }), /NEXT_PUBLIC_BRAND/);
  assert.throws(() => resolveMobileApp({ brand: "outra", appEnv: "production", appVersion: "4.0.0" }), /desconhecida/);
});

test("grava a identidade no projeto Android", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "mobile-app-"));
  const values = path.join(root, "app", "src", "main", "res", "values");
  fs.mkdirSync(values, { recursive: true });
  fs.writeFileSync(
    path.join(root, "app", "build.gradle"),
    'defaultConfig {\n    applicationId "com.exemplo"\n    versionCode 1\n    versionName "1.0"\n}\n',
  );
  fs.writeFileSync(
    path.join(values, "strings.xml"),
    '<resources>\n  <string name="app_name">App</string>\n  <string name="title_activity_main">App</string>\n</resources>\n',
  );

  applyAndroidIdentity(root, resolveMobileApp({ brand: "base", appEnv: "production", appVersion: "4.0.0", nativeVersion: "4.0.0" }));

  const gradle = fs.readFileSync(path.join(root, "app", "build.gradle"), "utf8");
  assert.match(gradle, /applicationId "com\.multiplataforma\.base"/);
  assert.match(gradle, /versionCode 400000/);
  assert.match(gradle, /versionName "4\.0\.0"/);
  const strings = fs.readFileSync(path.join(values, "strings.xml"), "utf8");
  assert.equal(strings.match(/>Base Multiplataforma</g)?.length, 2);
  fs.rmSync(root, { recursive: true, force: true });
});

test("ícone do app vem do icon da marca; sem ele, do favicon e depois do logo (PNG ou SVG)", () => {
  assert.match(appIconSource("base").split(path.sep).join("/"), /public\/brands\/base\/favicon\.svg$/);
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "mobile-icon-src-"));
  try {
    const dir = path.join(root, "public", "brands", "nova");
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, "logo.png"), "");
    assert.match(appIconSource("nova", root), /logo\.png$/);
    fs.writeFileSync(path.join(dir, "favicon.png"), "");
    assert.match(appIconSource("nova", root), /favicon\.png$/);
    fs.writeFileSync(path.join(dir, "icon.svg"), "");
    assert.match(appIconSource("nova", root), /icon\.svg$/);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
  assert.throws(() => appIconSource("inexistente"), /sem icon, favicon nem logo/);
});

test("grava os ícones do launcher em todas as densidades", async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "mobile-icon-"));
  try {
    await applyAndroidIcon(root, "base");
    const res = path.join(root, "app", "src", "main", "res");
    const expected = { mdpi: [48, 108], hdpi: [72, 162], xhdpi: [96, 216], xxhdpi: [144, 324], xxxhdpi: [192, 432] };
    for (const [density, [legacy, foreground]] of Object.entries(expected)) {
      const dir = path.join(res, `mipmap-${density}`);
      assert.equal((await sharp(path.join(dir, "ic_launcher.png")).metadata()).width, legacy);
      assert.equal((await sharp(path.join(dir, "ic_launcher_round.png")).metadata()).width, legacy);
      assert.equal((await sharp(path.join(dir, "ic_launcher_foreground.png")).metadata()).width, foreground);
    }
    assert.match(fs.readFileSync(path.join(res, "values", "ic_launcher_background.xml"), "utf8"), /#FFFFFF/);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("grava o ícone de notificação em todas as densidades e o registra no manifest uma vez", async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "mobile-notify-"));
  try {
    const main = path.join(root, "app", "src", "main");
    fs.mkdirSync(main, { recursive: true });
    const manifestFile = path.join(main, "AndroidManifest.xml");
    fs.writeFileSync(manifestFile, "<manifest>\n    <application>\n    </application>\n</manifest>\n");
    // Duas vezes: o registro no manifest não duplica.
    await applyAndroidNotificationIcon(root, "base");
    await applyAndroidNotificationIcon(root, "base");
    const expected = { mdpi: 24, hdpi: 36, xhdpi: 48, xxhdpi: 72, xxxhdpi: 96 };
    for (const [density, size] of Object.entries(expected)) {
      const meta = await sharp(path.join(main, "res", `drawable-${density}`, "ic_stat_notify.png")).metadata();
      assert.equal(meta.width, size);
      assert.equal(meta.hasAlpha, true);
    }
    const manifest = fs.readFileSync(manifestFile, "utf8");
    assert.equal(manifest.match(/default_notification_icon/g)?.length, 1);
    assert.match(manifest, /@drawable\/ic_stat_notify/);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});
