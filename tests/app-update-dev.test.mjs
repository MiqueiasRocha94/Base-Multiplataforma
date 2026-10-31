import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { buildProcessEnv, devManifestUrl, devUpdateStatus, devUpdateVersion, recordDebugApk } from "../scripts/app-update-dev.mjs";
import { stripExportIncompatible } from "../scripts/mobile-release.mjs";

const tempDir = () => fs.mkdtempSync(path.join(os.tmpdir(), "app-update-dev-"));

test("versão de dev cresce com o tempo e mantém MAJOR.MINOR", () => {
  const first = devUpdateVersion("4.0.0", new Date(2026, 9, 30, 15, 29, 59));
  const next = devUpdateVersion("4.0.0", new Date(2026, 9, 30, 15, 30, 0));
  assert.equal(first, "4.0.261030152959");
  assert.ok(Number(next.split(".")[2]) > Number(first.split(".")[2]));
});

test("manifesto no IP da rede e na porta do dev", () => {
  assert.equal(devManifestUrl({ DEV_HOST_IP: "192.168.0.7", PORT: "3001" }), "http://192.168.0.7:3001/api/dev/app-update/manifest");
  assert.equal(devManifestUrl({ DEV_HOST_IP: "10.0.0.2" }), "http://10.0.0.2:3000/api/dev/app-update/manifest");
});

test("canal: igual ao APK → nada; mudou → build; pronto → manifesto", () => {
  const dir = tempDir();
  try {
    let builds = 0;
    const startBuild = () => {
      builds += 1;
      return 999999; // pid inexistente: o build "terminou"
    };
    assert.equal(devUpdateStatus({ dir, fingerprint: "a", startBuild }).state, "failed"); // sem APK registrado
    recordDebugApk({ version: "4.0.1", brand: "base", fingerprint: "a" }, dir);
    assert.equal(devUpdateStatus({ dir, fingerprint: "a", startBuild }).state, "current");
    assert.equal(devUpdateStatus({ dir, fingerprint: "b", startBuild }).state, "building");
    assert.equal(builds, 1);

    fs.writeFileSync(path.join(dir, "manifest.json"), JSON.stringify({ version: "4.0.2", fingerprint: "b" }));
    fs.writeFileSync(path.join(dir, "state.json"), JSON.stringify({ building: false, fingerprint: "b" }));
    assert.deepEqual(devUpdateStatus({ dir, fingerprint: "b", startBuild }), { state: "ready", manifest: { version: "4.0.2", fingerprint: "b" } });

    // Build que falhou não se repete para os mesmos fontes.
    fs.writeFileSync(path.join(dir, "state.json"), JSON.stringify({ building: false, fingerprint: "c", error: "erro de compilação" }));
    assert.deepEqual(devUpdateStatus({ dir, fingerprint: "c", startBuild }), { state: "failed", error: "erro de compilação" });
    assert.equal(builds, 1);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("APK debug: sai só o que o export não aceita", () => {
  const root = tempDir();
  try {
    const app = path.join(root, "src", "app");
    for (const page of ["(Portal)/portal/analytics", "[...notFound]", "(Public)/login"]) {
      fs.mkdirSync(path.join(app, page), { recursive: true });
      fs.writeFileSync(path.join(app, page, "page.tsx"), "");
    }
    fs.mkdirSync(path.join(app, "api", "dev"), { recursive: true });
    fs.writeFileSync(path.join(app, "api", "dev", "route.ts"), "");
    assert.deepEqual(stripExportIncompatible(root).sort(), ["/[...notFound]", "/api"]);
    assert.ok(fs.existsSync(path.join(app, "(Portal)", "portal", "analytics", "page.tsx")));
    assert.ok(!fs.existsSync(path.join(app, "api")));
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("build do pacote não herda o ambiente do next dev", () => {
  const env = buildProcessEnv({ NODE_ENV: "development", __NEXT_PRIVATE_X: "1", NEXT_PRIVATE_Y: "1", TURBOPACK: "1", PORT: "80", NEXT_PUBLIC_BRAND: "base" });
  assert.deepEqual(env, { PORT: "80", NEXT_PUBLIC_BRAND: "base" });
});
