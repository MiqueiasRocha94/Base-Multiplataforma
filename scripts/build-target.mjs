import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const target = process.argv[2] ?? "web";
const shouldSyncCapacitor = process.argv.includes("--sync");

const isMobileTarget = target === "mobile";
const currentDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(currentDir, "..");
const nextBin = path.join(projectRoot, "node_modules", "next", "dist", "bin", "next");
const capacitorBin = path.join(projectRoot, "node_modules", "@capacitor", "cli", "bin", "capacitor");

function run(args, env = process.env) {
  const result = spawnSync(process.execPath, args, {
    stdio: "inherit",
    shell: false,
    env,
    cwd: projectRoot,
  });

  if (typeof result.status === "number" && result.status !== 0) {
    process.exit(result.status);
  }

  if (result.error) {
    throw result.error;
  }
}

run([nextBin, "build"], {
  ...process.env,
  NEXT_BUILD_TARGET: isMobileTarget ? "mobile" : "web",
});

if (isMobileTarget && shouldSyncCapacitor) {
  run([capacitorBin, "sync"]);
}
