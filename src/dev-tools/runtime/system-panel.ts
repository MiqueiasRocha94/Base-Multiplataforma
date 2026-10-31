/**
 * Painel do sistema ligado? Só em desenvolvimento e com
 * `NEXT_PUBLIC_SYSTEM_PANEL_ENABLED=true` no `.env`.
 */
export function systemPanelEnabled(): boolean {
  return (
    process.env.NEXT_PUBLIC_APP_ENV === "development" &&
    String(process.env.NEXT_PUBLIC_SYSTEM_PANEL_ENABLED ?? "").trim().toLowerCase() === "true"
  );
}
