# 07 — Scaffold e módulos orientados a contrato

Como um **módulo CRUD** (lista + detalhe + criação/edição) nasce nesta base a
partir de **um contrato**, sem escrever um service por entidade. Este documento
descreve a **arquitetura orientada a contrato** (que já existe e roda) e o
**scaffold** — o gerador que automatiza a criação desse módulo.

> **Estado atual (2026-07):** as **convenções** do scaffold já estão fixadas no
> código (pastas, marcadores, layout de arquivos) e a **engine que consome o
> contrato roda em produção** (módulo Pessoas). O **gerador em si ainda não
> existe** — por ora um módulo novo é criado à mão seguindo exatamente o mesmo
> layout (ver ["Passo a passo manual"](#passo-a-passo-manual)). Quando o gerador
> chegar, ele produz esses mesmos arquivos.

## A ideia

Uma entidade é descrita por um **contrato** (`EntityContract`): `schema` de
campos + `ui` (colunas/filtros/ações) + `permissions` + `relations`. A partir
desse contrato, o frontend **se monta sozinho** — tabela, filtros, formulário,
validação Zod, ações e permissões. O frontend **não conhece a origem** dos dados:
um provider entrega dev-backend (mock) ou a API real, com o mesmo formato.

![Do modelo à UI: o modelo TS vira contrato+seed no dev-backend; useEntity consome o contrato e o module-engine gera a UI (GenericTable + DynamicForm). O provider é dev-backend (mock) sem API ou a API REST quando configurada.](/docs/contrato-para-ui.svg)

Contratos canônicos em [src/core/contracts](../src/core/contracts/index.ts):

```text
GET /{entity}/contract  -> EntityContract   (version, permissions, schema, ui, relations)
GET /{entity}           -> DataResponse<T>   ({ data, pagination })
```

## Convenções que o scaffold segue

Estas regras já valem no repositório e são o que o gerador vai respeitar:

- **Alvos do scaffold = `src/types/model/`.** Toda interface em
  [src/types/model/](../src/types/model/index.ts) é um "modelo de API" — o alvo
  que gera as páginas. O barrel [index.ts](../src/types/model/index.ts) reexporta
  os modelos.
- **Identidade autenticada fica FORA.** [src/types/user.ts](../src/types/user.ts)
  (raiz de `types/`) é a interface estática do usuário logado (RBAC), **não** um
  recurso CRUD — o scaffold nunca gera páginas para ela. Ver
  [05 — Infraestrutura](./05-infraestrutura.md) e
  [entendimento-mock-auth-permissoes.md](./entendimento-mock-auth-permissoes.md).
- **Ponto de registro:** o marcador `// scaffold:register` em
  [src/dev-backend/index.ts](../src/dev-backend/index.ts) é onde a linha
  `registerDevEntity({ url, contract, seed })` é inserida.
- **Rotas estáticas por `?id=`.** Detalhe/edição usam **query param** (`?id=...`),
  não segmento `[id]` — para manter compatibilidade com `output: export` (mobile).
  Ver [rotas dinâmicas × export no doc 03](./03-estrutura-projeto.md).
- **Organização por tipo:** `app/` (view), `core/` (engine), `dev-backend/`
  (mock), `types/` (modelos). Sem `domain/` nem service por entidade.

## Anatomia de um módulo (referência: Pessoas)

O scaffold gera/toca **exatamente** este conjunto de arquivos por entidade
`<x>` (exemplo real: `<x> = persons`, modelo `Person`):

| Arquivo | Papel | Referência (Pessoas) |
| --- | --- | --- |
| `src/types/model/<x>.ts` | Modelo TS + reexport no barrel | [person.ts](../src/types/model/person.ts) |
| `src/dev-backend/entities/<x>.ts` | `EntityContract` (schema/ui/permissions/relations) + `seed` | [person.ts](../src/dev-backend/entities/person.ts) |
| `src/dev-backend/index.ts` | Linha `registerDevEntity(...)` no marcador `// scaffold:register` | [index.ts](../src/dev-backend/index.ts) |
| `src/app/(Portal)/portal/<x>/page.tsx` | Lista: `useEntity` + `module-engine` + `GenericTable` | [persons/page.tsx](<../src/app/(Portal)/portal/persons/page.tsx>) |
| `.../<x>/new/page.tsx` e `.../<x>/detail/page.tsx` | Wrappers `Suspense` da tela de formulário | [new](<../src/app/(Portal)/portal/persons/new/page.tsx>) · [detail](<../src/app/(Portal)/portal/persons/detail/page.tsx>) |
| `.../<x>/_screens/<x>-form-screen.tsx` | Criação/edição com `DynamicForm` (id por `?id=`) | [person-form-screen.tsx](<../src/app/(Portal)/portal/persons/_screens/person-form-screen.tsx>) |
| `src/lib/actions/registry.ts` | Catálogo de ações da entidade (ex.: `PERSON_ACTIONS`) | [registry.ts](../src/lib/actions/registry.ts) |
| `src/lib/navigation.ts` | Item de menu (com RBAC `requiredPermissions`/`requiredRoles`) | [navigation.ts](../src/lib/navigation.ts) |
| `public/locales/*/*.json` | Chaves i18n do módulo (ex.: `dictionary.persons`) nos 3 idiomas | [locales](../public/locales) |

## O contrato (`EntityContract`)

Cada campo em `schema.fields` é um [EntityField](../src/core/contracts/index.ts):
`type` (`string`/`email`/`enum`/`relation`/`boolean`/`datetime`…), `required`,
`min/maxLength`, `default`, `readOnly`, `hidden`, `mask`, `enum[]`, `relationship`
e `validations`. O bloco `ui` escolhe `columns` (colunas da lista), `filters`
(campos filtráveis), `sort` e `actions`. `permissions` descreve o que a entidade
permite; `relations` declara selects dirigidos por dados.

```ts
// src/dev-backend/entities/person.ts (essência)
export const PERSON_CONTRACT: EntityContract = {
  version: "1.0.0",
  permissions: { create: true, update: true, delete: true, view: true, export: true },
  schema: {
    primaryKey: "id",
    fields: [
      { name: "name", type: "string", label: "Nome", required: true, minLength: 2, maxLength: 100 },
      { name: "email", type: "email", label: "E-mail", required: true },
      { name: "role", type: "enum", label: "Papel", required: true, default: "viewer", enum: [/* ... */] },
      { name: "active", type: "boolean", label: "Situação", default: true },
      { name: "phone", type: "phone", label: "Telefone", mask: "(99) 99999-9999" },
      { name: "department", type: "relation", label: "Departamento",
        relationship: { entity: "departments", labelField: "name", valueField: "id" } },
      { name: "createdAt", type: "datetime", label: "Criado em", readOnly: true, hidden: true },
    ],
  },
  ui: {
    columns: ["email", "role", "active"],
    filters: ["name", "role", "active"],
    sort: { field: "createdAt", direction: "DESC" },
    actions: { create: true, edit: true, delete: true, view: true, export: true },
  },
  relations: { department: { entity: "departments", labelField: "name", valueField: "id" } },
};
```

## Como roda em runtime

1. **Contrato** — `useEntity({ url })`
   ([use-entity.ts](../src/core/entity-runtime/use-entity.ts)) chama
   `loadContract(url)` ([contract-provider.ts](../src/core/entity-runtime/contract-provider.ts)),
   que busca o contrato pelo provider ativo, cacheia e registra `schema`/`ui` no
   [module-registry](../src/core/module-engine/module-registry.ts) (para detalhe/
   formulário montarem sem uma chamada extra).
2. **Dados** — o mesmo hook busca a lista paginada e expõe CRUD
   (`create`/`update`/`remove`/`refresh`).
3. **UI** — os helpers de [module-engine](../src/core/module-engine/index.ts)
   convertem o schema em UI: `buildTableColumns`, `buildFilterFields`,
   `buildPredicate`, `buildRowStatus`, `buildFormFields`, `buildZodSchema`,
   `buildCsv`.
4. **Permissões efetivas + ações** — `useEntity` cruza a autorização do **usuário
   logado** (via [entity-policy](../src/lib/auth/entity-policy.ts)) com
   `contract.ui.actions`. É o único ponto onde o `User` "entra" no runtime: trocar
   de usuário muda os botões na tela. As ações por linha ainda passam por
   `resolveAvailableActions(PERSON_ACTIONS, user)`
   ([resolve-actions.ts](../src/lib/actions/resolve-actions.ts)).
5. **Origem dos dados** — `getEntityDataProvider()`
   ([entity-provider.ts](../src/core/entity-runtime/entity-provider.ts)) escolhe:
   sem `NEXT_PUBLIC_API_BASE_URL` → **Dev Backend** (mock); com API configurada e
   mock desligado → **API REST**. Ambos implementam `EntityDataProvider`.

![Runtime do módulo: persons/page.tsx chama useEntity, que carrega contrato (loadContract), dados (provider.list) e permissões efetivas (entity-policy); module-engine e resolveActions alimentam o GenericTable/DynamicForm.](/docs/runtime-modulo.svg)

## Passo a passo manual

Enquanto o gerador não existe, crie o módulo `<x>` seguindo o layout acima:

1. **Modelo** — `src/types/model/<x>.ts` com a interface e reexport no
   [barrel](../src/types/model/index.ts).
2. **Contrato + seed** — `src/dev-backend/entities/<x>.ts` com o `EntityContract`
   (`schema.fields`, `ui.columns`/`filters`/`actions`, `permissions`, `relations`)
   e uma função `seed(): ModuleRecord[]`.
3. **Registrar** — no marcador `// scaffold:register` de
   [src/dev-backend/index.ts](../src/dev-backend/index.ts):
   `registerDevEntity({ url: "<x>", contract: <X>_CONTRACT, seed: <x>Seed })`.
4. **Lista** — `src/app/(Portal)/portal/<x>/page.tsx` (cliente) com
   `useEntity({ url: "<x>" })` + helpers de `module-engine` alimentando o
   `GenericTable`.
5. **Formulário** — `_screens/<x>-form-screen.tsx` com `DynamicForm`, e os
   wrappers `new/page.tsx` e `detail/page.tsx` (Suspense; id por `?id=`).
6. **Ações + navegação + i18n** — catálogo em
   [src/lib/actions/registry.ts](../src/lib/actions/registry.ts), item em
   [src/lib/navigation.ts](../src/lib/navigation.ts) (com RBAC se aplicável) e as
   chaves `dictionary.<x>` nos três JSONs de [locales](../public/locales).

> Migrar do mock para a API real **não muda as telas**: basta configurar
> `NEXT_PUBLIC_API_BASE_URL` e desligar o mock — o provider passa a servir a API,
> desde que ela responda o mesmo contrato.

Voltar ao [índice](./README.md).
</content>
