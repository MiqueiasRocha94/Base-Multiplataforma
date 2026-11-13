// Executado DENTRO do container (entrypoint de docker/<ambiente>/desktop/docker-compose.yml).
// Instala as deps no volume de node_modules e roda o build desktop inteiro aqui
// (export do Next + compilação do Tauri), com os parâmetros repassados:
//
//   docker compose -f docker/<ambiente>/desktop/docker-compose.yml run --rm windows|linux [--debug] [--exe-only]
//     (atalhos: npm run docker:<ambiente>:desktop:windows | npm run docker:<ambiente>:desktop:linux)
//
// O --platform e o --env vêm fixos do entrypoint de cada serviço/compose.
//
// Em Node em vez de shell script para nao depender de bash nem sofrer com CRLF
// ao montar o repo (checkout no Windows) dentro do container Linux.
import { spawnSync } from "node:child_process";

const WORKSPACE = "/src";

function run(command, args, env = process.env) {
  const result = spawnSync(command, args, { stdio: "inherit", cwd: WORKSPACE, env });
  if (result.error) {
    throw result.error;
  }
  if (typeof result.status === "number" && result.status !== 0) {
    process.exit(result.status);
  }
}

// Deps: node_modules e um volume (isola dos binarios do host Windows — SWC,
// Turbopack e sharp sao por-plataforma). `npm install` reconcilia no lugar sem
// remover o mount point; rapido quando ja esta instalado.
run("npm", ["install", "--no-audit", "--no-fund"]);

run("node", ["scripts/desktop-build.mjs", ...process.argv.slice(2)], { ...process.env, DESKTOP_IN_CONTAINER: "1" });
