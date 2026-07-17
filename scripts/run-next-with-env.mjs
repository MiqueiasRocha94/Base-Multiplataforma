import { spawnSync } from "node:child_process";
import path from "node:path";

import { loadAppEnv, normalizeAppEnv, projectRoot } from "./app-env.mjs";

const command = process.argv[2] ?? "dev";
const extraArgs = process.argv.slice(3);

const envArg = extraArgs.find((arg) => arg.startsWith("--env="));
const appEnv = normalizeAppEnv(envArg?.slice("--env=".length), command === "dev" ? "development" : "production");
const nextArgs = extraArgs.filter((arg) => !arg.startsWith("--env="));

loadAppEnv(appEnv);

const nextBin = path.join(projectRoot, "node_modules", "next", "dist", "bin", "next");

const result = spawnSync(process.execPath, [nextBin, command, ...nextArgs], {
  cwd: projectRoot,
  env: process.env,
  stdio: "inherit",
  shell: false,
});

if (typeof result.status === "number" && result.status !== 0) {
  process.exit(result.status);
}

if (result.error) {
  throw result.error;
}
