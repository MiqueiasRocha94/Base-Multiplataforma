// Executado DENTRO do container (ver docker-compose.yml -> service `apk`).
// Instala deps, garante a plataforma android e gera o APK. O projeto e um bind
// mount, entao o APK gerado em builds/apk/ ja aparece no host.
//
// Em Node em vez de shell script para nao depender de bash nem sofrer com
// CRLF ao montar o repo (checkout no Windows) dentro do container Linux.
import { spawnSync } from "node:child_process";
import fs from "node:fs";

const WORKSPACE = "/workspace";

// APP_ENV vem do compose. homolog/production geram release; debug gera APK debug.
const appEnv = (process.env.APP_ENV ?? "homolog").trim().toLowerCase();
const scriptByEnv = {
  homolog: "apk",
  production: "apk:production",
  debug: "mobile:debug",
};
const npmScript = scriptByEnv[appEnv];

if (!npmScript) {
  console.error(`[docker] APP_ENV invalido: "${appEnv}". Use homolog | production | debug.`);
  process.exit(1);
}

function run(command, args) {
  const result = spawnSync(command, args, { stdio: "inherit", cwd: WORKSPACE });
  if (typeof result.status === "number" && result.status !== 0) {
    process.exit(result.status);
  }
  if (result.error) {
    throw result.error;
  }
}

console.log(`[docker] gerando APK (${appEnv})`);

// Deps: node_modules e um volume (isola dos binarios do host Windows — SWC/
// Turbopack sao por-plataforma). O dir do volume sempre existe (vazio na 1a vez),
// entao usamos `npm install`, que reconcilia no lugar (nao remove o mount point,
// evita EBUSY). Rapido quando ja esta instalado.
run("npm", ["install", "--no-audit", "--no-fund"]);

// Plataforma nativa (fica no bind mount). Gera se ainda nao existe.
if (!fs.existsSync(`${WORKSPACE}/android`)) {
  run("npx", ["--yes", "cap", "add", "android"]);
}

// android/ pode ter vindo do host Windows: remove o local.properties (sdk.dir com
// caminho Windows) para o Gradle usar o ANDROID_HOME do container, e garante o
// gradlew executavel (o build chama ./gradlew com shell:false no Linux).
fs.rmSync(`${WORKSPACE}/android/local.properties`, { force: true });
if (fs.existsSync(`${WORKSPACE}/android/gradlew`)) {
  fs.chmodSync(`${WORKSPACE}/android/gradlew`, 0o755);
}

run("npm", ["run", npmScript]);

console.log("[docker] concluido — APK em builds/apk/");
