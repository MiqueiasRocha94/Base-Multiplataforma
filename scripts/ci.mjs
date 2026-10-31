// Esteira (docs/ambiente-e-build.md → "Esteira (CI)").
//
// As mesmas etapas rodam no compose da esteira emulada (docker/ci) e nos exemplos de
// GitHub Actions e Jenkins. Com `--source`, copia a árvore para `--workdir` sem saídas
// de build, `android/` (gerada na etapa do APK) nem segredos (`.secrets/`, `.env*`
// fora dos modelos `*.example`), e roda tudo na cópia.
//
// Uso: node scripts/ci.mjs [--source=<pasta> --workdir=<pasta>] [--stages=a,b]
// Parâmetros (ambiente): CI_APP_ENV (homolog | production; padrão homolog),
// CI_ENV_FILE (padrão .env.<ambiente>.example), CI_STAGES, CI_ARTIFACTS_DIR.
// Código de saída: 0 tudo certo (avisos não reprovam), 1 alguma etapa falhou.
import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { projectRoot } from "./app-env.mjs";

// Tamanho do trecho de erro mostrado no resumo de uma etapa que falhou.
const ERROR_TAIL = 1500;

// Variáveis cujo valor nunca aparece no trecho de erro.
const SECRET_VARS = ["ANDROID_KEYSTORE_PASSWORD", "ANDROID_KEY_PASSWORD"];

// Fora da cópia: dependências, saídas de build, plataformas nativas geradas, segredos, áreas locais e
// projetos de referência (`references/`, ignorada pelo git: só consulta).
const EXCLUDED_ROOTS = [
  ".git",
  ".next",
  "out",
  "dist",
  "builds",
  "android",
  "ios",
  ".secrets",
  ".claude/worktrees",
  ".agents/workspace",
  "references",
];

/** O caminho (relativo à raiz, com `/` ou `\`) entra na cópia da esteira? */
export function isCopied(relPath) {
  const posix = relPath.replace(/\\/g, "/");
  if (posix === "") return true;
  if (posix.split("/").includes("node_modules")) return false;
  if (EXCLUDED_ROOTS.some((root) => posix === root || posix.startsWith(`${root}/`))) return false;
  const base = posix.split("/").pop();
  return !(base.startsWith(".env") && !base.endsWith(".example"));
}

/** Etapas da esteira, na ordem. `warnOnly`: a falha vira aviso. */
export function pipelineStages(appEnv) {
  return [
    { id: "install", command: "npm ci --no-audit --no-fund" },
    // Checkout novo não tem os tipos de rota (`LayoutProps`…): o `next typegen` gera sem build.
    { id: "typecheck", command: "npx next typegen && npm run typecheck" },
    { id: "lint", command: "npm run lint" },
    { id: "test", command: "npm test" },
    { id: "check-arch", command: "npm run check:arch" },
    { id: "dist-check", command: "npm run dist:check" },
    { id: "deps", command: "npm run deps:check", warnOnly: true },
    { id: "build-web", command: `node ./scripts/build-target.mjs web --env=${appEnv}` },
    { id: "build-apk", command: appEnv === "production" ? "npm run apk:production" : "npm run apk", android: true },
  ];
}

/** Filtra as etapas pela lista `a,b` (vazia = todas); id desconhecido é erro. */
export function selectStages(stages, list) {
  const wanted = (list ?? "").split(",").map((id) => id.trim()).filter(Boolean);
  if (wanted.length === 0) return stages;
  const unknown = wanted.filter((id) => !stages.some((stage) => stage.id === id));
  if (unknown.length > 0) {
    throw new Error(`etapa desconhecida: ${unknown.join(", ")} (use ${stages.map((stage) => stage.id).join(", ")})`);
  }
  return stages.filter((stage) => wanted.includes(stage.id));
}

/** Final da saída de uma etapa, com os valores secretos mascarados. */
export function errorTail(output, secrets = [], max = ERROR_TAIL) {
  const masked = secrets.filter(Boolean).reduce((text, secret) => text.split(secret).join("***"), output);
  const trimmed = masked.trimEnd();
  return trimmed.length > max ? `…${trimmed.slice(-max)}` : trimmed;
}

function parseArgs(argv) {
  const args = {};
  for (const arg of argv) {
    const match = /^--([\w-]+)=(.*)$/.exec(arg);
    if (match) args[match[1]] = match[2];
  }
  return args;
}

// Roda o comando mostrando a saída e guardando o final dela para o resumo.
function runStage(command, cwd) {
  return new Promise((resolve) => {
    let output = "";
    const child = spawn(command, { cwd, shell: true, env: process.env });
    const collect = (stream) => (chunk) => {
      stream.write(chunk);
      output = (output + chunk.toString()).slice(-ERROR_TAIL * 4);
    };
    child.stdout.on("data", collect(process.stdout));
    child.stderr.on("data", collect(process.stderr));
    child.on("error", (error) => resolve({ code: 1, output: `${output}\n${error.message}` }));
    child.on("close", (code) => resolve({ code: code ?? 1, output }));
  });
}

// Plataforma Android da cópia: gerada como no docker-apk.mjs, sem o local.properties do host.
async function prepareAndroid(root) {
  if (!fs.existsSync(path.join(root, "android"))) {
    const result = await runStage("npx --yes cap add android", root);
    if (result.code !== 0) return result;
  }
  fs.rmSync(path.join(root, "android", "local.properties"), { force: true });
  const gradlew = path.join(root, "android", "gradlew");
  if (fs.existsSync(gradlew)) fs.chmodSync(gradlew, 0o755);
  return { code: 0, output: "" };
}

function prepareWorkspace(args, appEnv) {
  const envFile = process.env.CI_ENV_FILE?.trim() || `.env.${appEnv}.example`;
  if (!args.source) {
    const target = path.join(projectRoot, `.env.${appEnv}`);
    if (fs.existsSync(target)) {
      console.log(`[ci] usando o .env.${appEnv} existente (sem --source a árvore não é copiada).`);
    } else {
      fs.copyFileSync(path.resolve(projectRoot, envFile), target);
    }
    return projectRoot;
  }

  const source = path.resolve(args.source);
  const workdir = path.resolve(args.workdir ?? "/workspace");
  console.log(`[ci] copiando ${source} → ${workdir}`);
  fs.rmSync(workdir, { recursive: true, force: true });
  fs.cpSync(source, workdir, { recursive: true, filter: (from) => isCopied(path.relative(source, from)) });
  // O arquivo de ambiente pode ser um não copiado (ex.: o real): lido da origem.
  fs.copyFileSync(path.resolve(source, envFile), path.join(workdir, `.env.${appEnv}`));
  console.log(`[ci] ambiente ${appEnv} a partir de ${envFile}`);
  return workdir;
}

function copyArtifacts(root) {
  const target = process.env.CI_ARTIFACTS_DIR?.trim();
  const apkDir = path.join(root, "builds", "apk");
  if (!target || !fs.existsSync(apkDir)) return;
  fs.mkdirSync(target, { recursive: true });
  for (const file of fs.readdirSync(apkDir).filter((name) => name.endsWith(".apk"))) {
    fs.copyFileSync(path.join(apkDir, file), path.join(target, file));
    console.log(`[ci] artefato: ${path.join(target, file)}`);
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const appEnv = (process.env.CI_APP_ENV ?? "homolog").trim().toLowerCase();
  if (appEnv !== "homolog" && appEnv !== "production") {
    throw new Error(`CI_APP_ENV inválido: "${appEnv}" (use homolog | production)`);
  }
  const stages = selectStages(pipelineStages(appEnv), args.stages ?? process.env.CI_STAGES);
  const root = prepareWorkspace(args, appEnv);
  const secrets = SECRET_VARS.map((key) => process.env[key]);
  const results = [];

  for (const stage of stages) {
    console.log(`\n[ci] ── ${stage.id}: ${stage.command}`);
    const started = Date.now();
    let result = stage.android ? await prepareAndroid(root) : { code: 0 };
    if (result.code === 0) result = await runStage(stage.command, root);
    const seconds = Math.round((Date.now() - started) / 1000);
    const status = result.code === 0 ? "ok" : stage.warnOnly ? "aviso" : "falhou";
    results.push({ id: stage.id, status, seconds });
    if (status === "falhou") {
      console.error(`\n[ci] etapa "${stage.id}" falhou (saída ${result.code}). Trecho final:\n${errorTail(result.output, secrets)}`);
      break;
    }
  }

  copyArtifacts(root);
  console.log("\n[ci] Resumo:");
  for (const { id, status, seconds } of results) console.log(`[ci]   ${status.padEnd(6)} ${id} (${seconds}s)`);
  const skipped = stages.slice(results.length).map((stage) => stage.id);
  if (skipped.length > 0) console.log(`[ci]   não executadas: ${skipped.join(", ")}`);
  return results.some(({ status }) => status === "falhou") ? 1 : 0;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().then(
    (code) => process.exit(code),
    (error) => {
      console.error(`[ci] Erro: ${error.message}`);
      process.exit(1);
    },
  );
}
