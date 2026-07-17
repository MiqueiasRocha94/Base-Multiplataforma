/**
 * DEV BACKEND — provider de desenvolvimento que implementa o mesmo contrato da
 * API de producao com dados locais. Cada entidade de exemplo se registra aqui.
 *
 * Para adicionar uma entidade ao Dev Backend: crie `entities/<x>.ts` com o
 * contrato + seed e registre-a abaixo.
 */
import { PERSON_CONTRACT, personSeed } from "@/dev-backend/entities/person";
import { registerDevEntity } from "@/dev-backend/registry";

// scaffold:register
registerDevEntity({ url: "persons", contract: PERSON_CONTRACT, seed: personSeed });

export { devDataProvider } from "@/dev-backend/dev-data-provider";
export { getDevEntity, registerDevEntity } from "@/dev-backend/registry";
export type { DevEntityModule } from "@/dev-backend/registry";
