import { spawnSync } from "node:child_process";
import path from "node:path";

import { loadAppEnv, normalizeAppEnv, projectRoot } from "./app-env.mjs";
import { ensureDevCertificate } from "./dev-https-cert.mjs";

const command = process.argv[2] ?? "dev";
const extraArgs = process.argv.slice(3);

const envArg = extraArgs.find((arg) => arg.startsWith("--env="));
const appEnv = normalizeAppEnv(envArg?.slice("--env=".length), command === "dev" ? "development" : "production");
const https = extraArgs.includes("--https");
const nextArgs = extraArgs.filter((arg) => !arg.startsWith("--env=") && arg !== "--https");

loadAppEnv(appEnv);

// `--https` (só dev): certificado próprio com os IPs da rede — ver dev-https-cert.mjs.
if (https && command === "dev") {
  const { keyPath, certPath } = ensureDevCertificate();
  nextArgs.push("--experimental-https", "--experimental-https-key", keyPath, "--experimental-https-cert", certPath);
}

const nextBin = path.join(projectRoot, "node_modules", "next", "dist", "bin", "next");

const result = spawnSync(process.execPath, [nextBin, command, ...nextArgs], {
  cwd: projectRoot,
  // O ambiente já veio só do arquivo dele (app-env.mjs): o Next não carrega outros `.env*` por conta própria.
  env: { ...process.env, __NEXT_PROCESSED_ENV: "true" },
  stdio: "inherit",
  shell: false,
});

if (typeof result.status === "number" && result.status !== 0) {
  process.exit(result.status);
}

if (result.error) {
  throw result.error;
}
