function getBooleanEnv(value: string | undefined, fallback = false) {
  const normalizedValue = String(value ?? "").trim().toLowerCase();

  if (!normalizedValue) {
    return fallback;
  }

  return normalizedValue === "true";
}

export function getPublicEnv() {
  // Ferramentas de dev so podem existir no ambiente de desenvolvimento
  // explicito. Fora dele (incluindo um `next build` cru sem APP_ENV, que herda
  // as flags de dev do .env base) elas ficam desligadas — o alias do next.config
  // ainda remove o codigo, isto e a segunda tranca.
  const isDevEnv = process.env.NEXT_PUBLIC_APP_ENV === "development";

  return {
    apiUrl: process.env.NEXT_PUBLIC_API_URL ?? "",
    appName: process.env.NEXT_PUBLIC_APP_NAME ?? "Base Multiplataforma",
    appEnv: process.env.NEXT_PUBLIC_APP_ENV ?? "development",
    systemPanelEnabled: isDevEnv && getBooleanEnv(process.env.NEXT_PUBLIC_SYSTEM_PANEL_ENABLED, false),
  };
}
