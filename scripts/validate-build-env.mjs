import { loadAppEnv, normalizeAppEnv } from "./app-env.mjs";

const targetEnvironment = normalizeAppEnv(process.argv[2], "production");
const { loadedFiles } = loadAppEnv(targetEnvironment);

// Flags que habilitam ferramentas de desenvolvimento (painel do sistema, modo
// desenvolvedor). Nenhuma pode ir para homolog/producao: alem de esconder a UI,
// o codigo delas e uma superficie de ataque.
const DEV_ONLY_FLAGS = ["NEXT_PUBLIC_DEVELOPER_MODE", "NEXT_PUBLIC_SYSTEM_PANEL_ENABLED"];
const isFlagOn = (key) => String(process.env[key] ?? "").trim().toLowerCase() === "true";
const enabledDevFlags = DEV_ONLY_FLAGS.filter(isFlagOn);

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
