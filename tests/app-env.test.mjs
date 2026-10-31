import assert from "node:assert/strict";
import test from "node:test";

import { applyLanHostToLocalUrls, getAppEnvFiles, resolveDevHostIp } from "../scripts/app-env.mjs";

// Ambientes (docs/ambiente-e-build.md → "Ambientes").

test("um arquivo por ambiente, sem herança do .env", () => {
  assert.deepEqual(getAppEnvFiles("development"), [".env"]);
  assert.deepEqual(getAppEnvFiles("homolog"), [".env.homolog"]);
  assert.deepEqual(getAppEnvFiles("production"), [".env.production"]);
});

test("IP da rede prefere 192.168, depois 10, depois 172.16–31; DEV_HOST_IP força", () => {
  assert.equal(resolveDevHostIp({}, ["172.20.0.1", "10.0.0.5", "192.168.1.28"]), "192.168.1.28");
  assert.equal(resolveDevHostIp({}, ["172.20.0.1", "10.0.0.5"]), "10.0.0.5");
  assert.equal(resolveDevHostIp({}, ["172.20.0.1"]), "172.20.0.1");
  assert.equal(resolveDevHostIp({}, ["100.64.0.2"]), "100.64.0.2");
  assert.equal(resolveDevHostIp({}, []), null);
  assert.equal(resolveDevHostIp({ DEV_HOST_IP: "192.168.0.9" }, ["10.0.0.5"]), "192.168.0.9");
});

test("troca localhost das URLs públicas pelo IP, mantendo porta e caminho", () => {
  const env = {
    NEXT_PUBLIC_ACESSO_API_URL: "http://localhost:8080",
    NEXT_PUBLIC_API_URL: "http://127.0.0.1:3000/api",
    NEXT_PUBLIC_API_BASE_URL: "https://api.exemplo.com.br",
    NEXT_PUBLIC_APP_NAME: "localhost app",
    OUTRA_URL: "http://localhost:9000",
    NEXT_PUBLIC_HOST_PARECIDO: "http://localhost.exemplo.com",
  };
  assert.equal(applyLanHostToLocalUrls(env, "192.168.1.28"), "192.168.1.28");
  assert.equal(env.NEXT_PUBLIC_ACESSO_API_URL, "http://192.168.1.28:8080");
  assert.equal(env.NEXT_PUBLIC_API_URL, "http://192.168.1.28:3000/api");
  assert.equal(env.NEXT_PUBLIC_API_BASE_URL, "https://api.exemplo.com.br");
  assert.equal(env.NEXT_PUBLIC_APP_NAME, "localhost app");
  assert.equal(env.OUTRA_URL, "http://localhost:9000");
  assert.equal(env.NEXT_PUBLIC_HOST_PARECIDO, "http://localhost.exemplo.com");
  assert.equal(applyLanHostToLocalUrls({ NEXT_PUBLIC_X: "https://x.com" }, "192.168.1.28"), null);
});
