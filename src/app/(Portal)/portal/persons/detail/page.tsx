"use client";

import { Suspense } from "react";

import { EntityFormScreen } from "@/components/entity/entity-form-screen";
import { useLanguage } from "@/contexts/LanguageContext";

// Rota estatica de detalhe/edicao: o id vem por ?id=... (lido no cliente pelo
// EntityFormScreen). Diferente de um segmento [id], funciona com `output: export`.
// Wrapper fino sobre a base; o especifico de Pessoa (rotulos, foto) entra aqui.
export default function PortalPersonDetailPage() {
  const { dictionary } = useLanguage();
  return (
    <Suspense>
      <EntityFormScreen url="persons" basePath="/portal/persons" labels={dictionary.persons} />
    </Suspense>
  );
}
