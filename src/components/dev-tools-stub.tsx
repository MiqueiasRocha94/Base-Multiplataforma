"use client";

/**
 * Stub de producao das ferramentas de desenvolvimento.
 *
 * Fora do ambiente de desenvolvimento (`NEXT_PUBLIC_APP_ENV !== "development"`),
 * o `next.config` faz alias dos modulos do painel do sistema e do painel de
 * developer mode para este arquivo. Assim o codigo real dessas ferramentas
 * (edicao de layout/tema, gravacao de arquivo, flags de dev) NAO entra no bundle
 * de homolog/producao — elimina a superficie de ataque, nao so esconde em runtime.
 *
 * Os nomes exportados aqui precisam cobrir todos os exports usados pelos
 * importadores (app-structure e right-sidebar).
 */

export function SystemContextPanel() {
  return null;
}

export function SystemContextPanelContent() {
  return null;
}

export function DeveloperModePainel() {
  return null;
}

export function DeveloperModePanelContent() {
  return null;
}
