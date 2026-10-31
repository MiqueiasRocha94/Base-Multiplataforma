// Serve o build web de homologação/produção montado em dist/web (standalone),
// o mesmo artefato da imagem Docker: `npm run start` / `npm run production`.
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";

import { loadAppEnv, normalizeAppEnv, projectRoot } from "./app-env.mjs";

const envArg = process.argv.find((arg) => arg.startsWith("--env="));
loadAppEnv(normalizeAppEnv(envArg?.slice("--env=".length), "production"));

const server = path.join(projectRoot, "dist", "web", "server.js");
if (!existsSync(server)) {
  console.error("[serve-dist] dist/web/server.js não existe: rode o build (npm run start / npm run production).");
  process.exit(1);
}

const result = spawnSync(process.execPath, [server], {
  cwd: path.dirname(server),
  env: { ...process.env, NODE_ENV: "production", PORT: process.env.PORT ?? "3000" },
  stdio: "inherit",
});
process.exit(result.status ?? 0);
