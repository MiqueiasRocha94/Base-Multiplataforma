"use client";

import { useAuth } from "@/contexts/AuthContext";

/**
 * Versão da API da sessão atual, exibida no footer desktop. Fica fora de
 * `components/layout` porque lê a sessão: a região só hospeda o componente
 * (mesmo padrão do `NotificationButton` no header). Sem sessão, não renderiza.
 */
export function ApiVersion({ prefix = "" }: { prefix?: string }) {
  const { user } = useAuth();
  const version = user?.metadata.apiVersion;
  if (!version) {
    return null;
  }
  return <>{prefix + version}</>;
}
