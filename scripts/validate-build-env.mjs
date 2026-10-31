import { loadAppEnv, normalizeAppEnv } from "./app-env.mjs";

const targetEnvironment = normalizeAppEnv(process.argv[2], "production");
const { loadedFiles } = loadAppEnv(targetEnvironment);

// Flags que habilitam ferramentas de desenvolvimento (painel do sistema, modo
// desenvolvedor). Nenhuma pode ir para homolog/producao: alem de esconder a UI,
// o codigo delas e uma superficie de ataque.
const DEV_ONLY_FLAGS = ["NEXT_PUBLIC_DEVELOPER_MODE", "NEXT_PUBLIC_SYSTEM_PANEL_ENABLED"];
const isFlagOn = (key) => String(process.env[key] ?? "").trim().toLowerCase() === "true";
const enabledDevFlags = DEV_ONLY_FLAGS.filter(isFlagOn);

// Credenciais do acesso rapido (dev): so no `.env` de desenvolvimento. Definidas
// num build de homolog/producao, falha — credencial nao pode ir para o bundle.
const DEV_ONLY_SECRETS = ["NEXT_PUBLIC_DEV_QUICK_LOGIN", "NEXT_PUBLIC_DEV_QUICK_PASSWORD"];
const definedDevSecrets = DEV_ONLY_SECRETS.filter((key) => String(process.env[key] ?? "").trim() !== "");

// Fora de dev não há falso backend (dev-backend fica fora do build): a API é obrigatória.
const REQUIRED_OUTSIDE_DEV = ["NEXT_PUBLIC_ACESSO_API_URL"];
const missingRequired = REQUIRED_OUTSIDE_DEV.filter((key) => String(process.env[key] ?? "").trim() === "");

if ((targetEnvironment === "homolog" || targetEnvironment === "production") && missingRequired.length > 0) {
  console.error("[build] Erro: variaveis obrigatorias fora de dev nao definidas:");
  console.error(`[build]   ${missingRequired.join(", ")}`);
  console.error("[build] Sem API o build de homologacao/producao nao tem de onde ler os dados.");
  process.exit(1);
}

if ((targetEnvironment === "homolog" || targetEnvironment === "production") && definedDevSecrets.length > 0) {
  console.error("[build] Erro: credenciais de desenvolvimento definidas para um build fora de dev:");
  console.error(`[build]   ${definedDevSecrets.join(", ")}`);
  console.error("[build] Elas so podem existir no .env de desenvolvimento.");
  process.exit(1);
}

if ((targetEnvironment === "homolog" || targetEnvironment === "production") && enabledDevFlags.length > 0) {
  const environmentLabel = targetEnvironment === "production" ? "producao" : "homologacao";
  const sourceLabel = loadedFiles.length > 0 ? loadedFiles.join(", ") : "variaveis atuais";

  console.error(`[build] Erro: as flags de desenvolvimento a seguir nao podem estar ativas em build de ${environmentLabel}:`);
  console.error(`[build]   ${enabledDevFlags.map((key) => `${key}=true`).join(", ")}`);
  console.error(`[build] Origem validada: ${sourceLabel}`);
  console.error("[build] Ajuste as flags para false antes de gerar o build.");
  process.exit(1);
}

console.log(
  `[build] Validacao concluida para ${targetEnvironment}. Flags de dev ativas: ${enabledDevFlags.length > 0 ? enabledDevFlags.join(", ") : "nenhuma"}.`,
);

if (loadedFiles.length > 0) {
  console.log(`[build] Arquivos de ambiente utilizados: ${loadedFiles.join(", ")}`);
}
