"use client";

import { EntityListScreen } from "@/components/entity/entity-list-screen";
import { useLanguage } from "@/contexts/LanguageContext";
import { PERSON_ACTIONS } from "@/lib/actions/registry";

const ENTITY_URL = "persons";
const BASE_PATH = "/portal/persons";

/**
 * Rota da lista de Pessoas — wrapper fino sobre a base `EntityListScreen`. Tudo
 * que e generico mora na base; aqui ficam so os dados desta entidade (catalogo de
 * acoes, rotulos, nomes de CSV). Customizacao especifica de Pessoa entra aqui.
 */
export default function PersonsListPage() {
  const { dictionary } = useLanguage();
  return (
    <EntityListScreen
      url={ENTITY_URL}
      basePath={BASE_PATH}
      actionsCatalog={PERSON_ACTIONS}
      labels={dictionary.persons}
      csvRowName={(id) => `pessoa-${id}.csv`}
      csvListName={() => `pessoas-${Date.now()}.csv`}
    />
  );
}
