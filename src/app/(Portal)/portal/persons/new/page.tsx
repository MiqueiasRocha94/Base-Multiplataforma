"use client";

import { Suspense } from "react";

import { EntityFormScreen } from "@/components/entity/entity-form-screen";
import { useLanguage } from "@/contexts/LanguageContext";

// Rota estatica de criacao. Wrapper fino sobre a base `EntityFormScreen`; o
// especifico de Pessoa (rotulos, foto) entra aqui.
export default function PortalPersonNewPage() {
  const { dictionary } = useLanguage();
  return (
    <Suspense>
      <EntityFormScreen url="persons" basePath="/portal/persons" labels={dictionary.persons} />
    </Suspense>
  );
}
