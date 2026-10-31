"use client";

import { ModulePlaceholder } from "@/components/portal/module-placeholder";

// Landing de Auditoria (feature de vitrine da base, fora da navbar). A rota existe
// para não dar 404 em acesso direto por URL — ex.: atalho do painel de dev.
export default function AuditPage() {
  return (
    <ModulePlaceholder
      title="Auditoria"
      description="Módulo de auditoria (feature de demonstração da base)."
    />
  );
}
