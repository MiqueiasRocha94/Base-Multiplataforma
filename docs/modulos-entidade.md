# Módulos de entidade (orientados a contrato)

Como um **módulo CRUD** (lista + detalhe + criação/edição) nasce nesta base a
partir de **um contrato**, sem escrever um service por entidade, e as
convenções que todo módulo segue. Não há gerador automático: o módulo é criado à
mão ("Passo a passo"). Referência viva: o módulo **Pessoas**
([/portal/persons](<../src/app/(Portal)/portal/persons/page.tsx>)).

## A ideia

Uma entidade é descrita por um **contrato** (`EntityContract`): `schema` de
campos + `ui` (colunas/filtros/ações) + `permissions` + `relations`. A partir
desse contrato, o frontend **se monta sozinho** — tabela, filtros, formulário,
validação Zod, ações, permissões e CSV. O frontend **não conhece a origem** dos
dados: um provider entrega o dev-backend (mock) ou a API real, com o mesmo formato.

![Do modelo à UI: o modelo TS vira contrato+seed no dev-backend; useEntity consome o contrato e o module-engine gera a UI (GenericTable + DynamicForm). O provider é dev-backend (mock) sem API ou a API REST quando configurada.](/docs/contrato-para-ui.svg)

Contratos canônicos em [src/core/contracts](../src/core/contracts/index.ts):

```text
GET /{entity}/contract  -> EntityContract   (version, permissions, schema, ui, relations)
GET /{entity}           -> DataResponse<T>   ({ data, pagination })
```

**Entidades da API autenticada (`/private`).** A `url` é a própria rota (ex.:
`/private/pedidos`). O provider de
[services/entidades.ts](../src/services/entidades.ts) (`providerDaEntidade`) é
injetado pela tela em `useEntity({ provider })` e resolve o que muda nessa raiz:
`NEXT_PUBLIC_ACESSO_API_URL`, `chamarApi` (Bearer/DPoP e renovação) e a
paginação do Spring (`?page=&size=` a partir de 0, resposta `{content, page}`
convertida em `{data, pagination}`). Sem a raiz configurada, responde o
dev-backend. O backend pode variar o contrato **por perfil** (decide pelo token);
por isso o cache do contrato é por usuário.

**Exibição pelo contrato** (sem configuração por entidade no front):
`mask: "currency"` → R$; `mask: "percent"` → valor já em percentual (`1.75` →
`1,75%`); `date`/`datetime` aceitam número ou texto ISO
(`yyyy-MM-dd…` → dd/mm/aaaa, sem fuso); enum pelo rótulo do contrato; número
alinhado à direita. **Ordenação:** na lista local (veio inteira) toda coluna
ordena; quando a ordenação vai à API, só as colunas que o contrato declara
aceitas — `ui.sortable` + o `ui.sort.field` padrão (campo fora disso a API
recusa com 400 "Ordenação inválida"; o front não deduz).

## O que é e o que não é módulo de entidade

- **Recurso CRUD do domínio** (ex.: pessoas, produtos, pedidos) → `EntityContract`
  com lista, filtro, formulário, validação e CSV do `module-engine`.
- **Ação ou consulta que não é CRUD** (login, cálculo, aprovar pedido,
  cancelar) → função em `src/services/` ([comunicação com a API](./comunicacao-api.md)),
  não forçada no provider CRUD.
- **Status e enums de domínio** são tipos TS + Zod legíveis, não os códigos crus
  da API.
- **Identidade autenticada fica FORA.** [src/types/user.ts](../src/types/user.ts)
  é a interface do usuário logado (RBAC), **não** um recurso CRUD
  ([autenticação](./autenticacao-e-permissoes.md)).

## Convenções

- **Modelos em `src/types/model/`.** Toda interface em
  [src/types/model/](../src/types/model/index.ts) é um "modelo de API"; o barrel
  [index.ts](../src/types/model/index.ts) os reexporta.
- **Ponto de registro:** o marcador `// scaffold:register` em
  [src/dev-backend/index.ts](../src/dev-backend/index.ts) é onde entra a linha
  `registerDevEntity({ url, contract, seed })`.
- **Rotas estáticas por `?id=`.** Detalhe/edição usam **query param** (`?id=...`),
  não segmento `[id]` — compatível com `output: export` (APK).
- **Rota fina, tela na base.** Lista e formulário são **genéricos** e moram em
  `src/components/entity/` — escritos **uma vez**. Cada entidade tem apenas 3
  `page.tsx` **finos** que apontam a base para uma `url`; o específico da
  entidade (catálogo de ações, `labels`, nomes de CSV) é
  injetado por **props no `page.tsx`**. Quando o específico precisa de
  `services/` (documentos do backend, ações com API), um invólucro em
  `src/components/<modulo>/` só **compõe** a base com essas props (ex.:
  `PedidosListScreen` envolvendo a `EntityListScreen`) — rota não chama services. Nunca colunas, filtros ou ordenação escritos à mão:
  vêm do contrato. Tela que não é CRUD (consulta com abas, detalhe com parcelas)
  é tela própria — nunca num `_screens`/`_components` de rota
  ([estrutura do projeto](./estrutura-projeto.md) → "Regra de colocação").
  O mesmo vale para uma criação que o `DynamicForm` não descreve (escolha entre
  registros que a API devolve, campo condicional): o `new` da entidade abre tela
  própria e a lista só aponta para ele (ex.: uma `SolicitarPedidoScreen`);
  `labels.create` troca o rótulo "Adicionar" (ex.: "Solicitar pedido").
- **Regra da lista** (`EntityListScreen`, toda entidade): o GET inicial pede 10.
  Se trouxe tudo (`total` ≤ itens), filtro e ordenação são locais; senão, cada
  filtro, ordenação ou página é um novo GET com os parâmetros
  (`ListQuery.filters` com o **valor** da API — código do enum — e `sort`
  composto). Desktop: ordenação composta nas colunas, paginação 10/20/30 no
  centro do rodapé, Voltar à esquerda e Adicionar/Exportar à direita; mobile:
  barra de filtro + FABs, navbar em modo navegação. Com `ui.requiredFilters`, a
  lista não faz GET até o usuário preencher esses filtros (a API daria 400): fica
  sempre no modo API e mostra "Informe … nos filtros para consultar."
- **Ações por linha decididas pelo backend:** `ActionDef.recordFlag` — a ação só
  aparece quando `record[recordFlag] === true` (ex.: `podeSimularLiquidacao`);
  o RBAC continua em `resolveAvailableActions`.

## Anatomia de um módulo

A **base** (compartilhada por toda entidade):

| Arquivo | Papel |
| --- | --- |
| [components/entity/entity-list-screen.tsx](../src/components/entity/entity-list-screen.tsx) | Lista genérica: `useEntity` + `module-engine` + `GenericTable`. Props: `url`, `basePath`, `createPath` (criação fora da lista, ex.: em outro módulo; padrão `${basePath}/new`), `actionsCatalog`, `labels`, nomes de CSV e, quando a entidade tem, `rowHandlers` (ações próprias), `rowDownloads` (documento do backend por linha) e `exportFile` (exportação gerada no backend; recebe os filtros aplicados, no formato da API — também com a lista local — e as colunas adicionais exibidas, para o `addColumn`) |
| [components/entity/entity-form-screen.tsx](../src/components/entity/entity-form-screen.tsx) | Formulário genérico (view/edit/new) com `DynamicForm`, id por `?id=`. Props: `url`, `basePath`, `labels`. Foto/galeria vêm dos campos `file`/`files` do contrato (ver "O contrato") |

**Por entidade `<x>`** (exemplo real: `<x> = persons`, modelo `Person`):

| Arquivo | Papel | Referência (Pessoas) |
| --- | --- | --- |
| `src/types/model/<x>.ts` | Modelo TS + reexport no barrel | [person.ts](../src/types/model/person.ts) |
| `src/dev-backend/entities/<x>.ts` | `EntityContract` (schema/ui/permissions/relations) + `seed` | [person.ts](../src/dev-backend/entities/person.ts) |
| `src/dev-backend/index.ts` | Linha `registerDevEntity(...)` no marcador `// scaffold:register` (com `scope` quando a API escopa pelo token, ex.: o usuário só vê os seus) | [index.ts](../src/dev-backend/index.ts) |
| `src/app/(Portal)/portal/<x>/page.tsx` | **Wrapper fino** → `<EntityListScreen url="<x>" …/>` (injeta ações/labels/CSV) | [persons/page.tsx](<../src/app/(Portal)/portal/persons/page.tsx>) |
| `.../<x>/new/page.tsx` e `.../<x>/detail/page.tsx` | **Wrappers finos** `Suspense` → `<EntityFormScreen url="<x>" …/>` | [new](<../src/app/(Portal)/portal/persons/new/page.tsx>) · [detail](<../src/app/(Portal)/portal/persons/detail/page.tsx>) |
| `src/lib/actions/registry.ts` | Catálogo de ações da entidade (ex.: `PERSON_ACTIONS`) | [registry.ts](../src/lib/actions/registry.ts) |
| `src/lib/navigation.ts` | Item de menu (com RBAC `requiredPermissions`/`requiredRoles`) | [navigation.ts](../src/lib/navigation.ts) |
| `public/locales/*/*.json` | Chaves i18n do módulo (ex.: `dictionary.persons`) nos 3 idiomas | [locales](../public/locales) |

## O contrato (`EntityContract`)

Cada campo em `schema.fields` é um [EntityField](../src/core/contracts/index.ts):
`type` (`string`/`email`/`enum`/`relation`/`boolean`/`datetime`…), `required`,
`min/maxLength`, `default`, `readOnly`, `hidden`, `mask`, `enum[]`, `relationship`
e `validations`. O bloco `ui` escolhe `columns` (colunas da lista — formato
preferido `{ field, visible, additional? }` por coluna: `visible: false` = oferecida
no seletor "Colunas" mas oculta por padrão, ex.: `id`; `additional: true` = a API
só devolve o campo sob pedido, e exibir a coluna faz o front pedir
`addColumn=<field>` no GET; uma `string` = visível, formato anterior), `filters`
(campos filtráveis), `requiredFilters` (filtros que precisam estar preenchidos
antes do 1º GET — ex.: um perfil só consulta um registro por vez), `sort` (padrão), `sortable`
(campos aceitos em `sort` pela API) e `actions`. `permissions` descreve o que a entidade
permite; `relations` declara selects dirigidos por dados.

**Arquivos (imagens):** o contrato declara quando a entidade tem arquivo no
corpo — `type: "file"` (um `FileItem`) vira **foto** no formulário e
`type: "files"` (`FileItem[]`) vira **galeria**, com o `label` do campo. Ficam
fora do `DynamicForm`, da tabela, dos filtros, do Zod e do CSV
(`isFileField`/`fileFields` no module-engine); vão no corpo ao salvar se não
forem `readOnly`. Entidade sem campo de arquivo (ex.: saldo devedor) não mostra
imagem nenhuma — a rota não decide isso.

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
      { name: "photo", type: "file", label: "Foto de perfil" },   // foto
      { name: "photos", type: "files", label: "Galeria" },        // galeria
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

O contrato e o seed representam o que a API de produção retornaria em
`GET /persons/contract` e `GET /persons`.

## Como roda em runtime

1. **Contrato** — `useEntity({ url })`
   ([use-entity.ts](../src/core/entity-runtime/use-entity.ts)) chama
   `loadContract(url)` ([contract-provider.ts](../src/core/entity-runtime/contract-provider.ts)),
   que busca o contrato pelo provider ativo, cacheia e registra `schema`/`ui` no
   [module-registry](../src/core/module-engine/module-registry.ts) (para detalhe/
   formulário montarem sem uma chamada extra).
2. **Dados** — o mesmo hook busca a lista paginada e expõe CRUD
   (`create`/`update`/`remove`/`refresh`), sem service específico da entidade.
3. **UI** — os helpers de [module-engine](../src/core/module-engine/index.ts)
   convertem o schema em UI: `buildTableColumns`, `buildFilterFields`,
   `buildPredicate`, `buildRowStatus`, `buildFormFields`, `buildZodSchema`,
   `buildCsv` / `downloadCsv`. O formulário usa o `DynamicForm`
   ([componentes de UI](./componentes-ui.md)).
4. **Permissões efetivas + ações** — `useEntity` cruza a autorização do **usuário
   logado** (via [entity-policy](../src/lib/auth/entity-policy.ts)) com
   `contract.ui.actions`. É o único ponto onde o `User` "entra" no runtime: trocar
   de usuário muda os botões na tela. As ações por linha passam por
   `resolveAvailableActions(registry, user)`
   ([resolve-actions.ts](../src/lib/actions/resolve-actions.ts)) — só aparecem as
   que o usuário pode ver. A visibilidade do item de menu vem de
   `requiredPermissions`/`requiredRoles` em [navigation.ts](../src/lib/navigation.ts).
5. **Origem dos dados** — `getEntityDataProvider()`
   ([entity-provider.ts](../src/core/entity-runtime/entity-provider.ts)) escolhe:
   em dev, sem `NEXT_PUBLIC_API_BASE_URL` → **dev-backend** (mock); com API
   configurada e mock desligado → **API REST**. Fora de dev, sempre a API REST
   (a escolha é uma região `@dev-only`). Entidades `/private` recebem o provider
   injetado pela tela (`providerDaEntidade`). Todos implementam `EntityDataProvider`.

![Runtime do módulo: persons/page.tsx (rota fina) renderiza a EntityListScreen, que chama useEntity, que carrega contrato (loadContract), dados (provider.list) e permissões efetivas (entity-policy); module-engine e resolveActions alimentam o GenericTable/DynamicForm.](/docs/runtime-modulo.svg)

## Passo a passo

Para criar o módulo `<x>`:

1. **Modelo** — `src/types/model/<x>.ts` com a interface e reexport no
   [barrel](../src/types/model/index.ts).
2. **Contrato + seed** — `src/dev-backend/entities/<x>.ts` com o `EntityContract`
   (`schema.fields`, `ui.columns`/`filters`/`actions`, `permissions`, `relations`)
   e uma função `seed(): ModuleRecord[]`.
3. **Registrar** — no marcador `// scaffold:register` de
   [src/dev-backend/index.ts](../src/dev-backend/index.ts):
   `registerDevEntity({ url: "<x>", contract: <X>_CONTRACT, seed: <x>Seed })`.
4. **Lista** — `src/app/(Portal)/portal/<x>/page.tsx` (cliente) é um **wrapper
   fino**: `<EntityListScreen url="<x>" basePath="/portal/<x>" actionsCatalog={…}
   labels={dictionary.<x>} … />`.
5. **Formulário** — só os wrappers finos `new/page.tsx` e `detail/page.tsx`
   (Suspense; id por `?id=`) apontando `<EntityFormScreen url="<x>" …/>`.
6. **Ações + navegação + i18n** — catálogo em
   [src/lib/actions/registry.ts](../src/lib/actions/registry.ts), item em
   [src/lib/navigation.ts](../src/lib/navigation.ts) (com RBAC se aplicável) e as
   chaves `dictionary.<x>` nos três JSONs de [locales](../public/locales).

> Migrar do mock para a API real **não muda as telas**: basta configurar
> `NEXT_PUBLIC_API_BASE_URL` e desligar o mock — o provider passa a servir a API,
> desde que ela responda o mesmo contrato.

## Onde está no código

| Peça | Onde |
| --- | --- |
| Contratos | [src/core/contracts/index.ts](../src/core/contracts/index.ts) |
| Entity-runtime | [src/core/entity-runtime/](../src/core/entity-runtime/) |
| Module-engine | [src/core/module-engine/](../src/core/module-engine/) |
| Telas base | [src/components/entity/](../src/components/entity/) |
| Catálogo de ações | [src/lib/actions/](../src/lib/actions/) |
| Modelos | [src/types/model/](../src/types/model/) |
| Contratos e seeds do dev-backend | [src/dev-backend/](../src/dev-backend/) |

Voltar ao [índice](./README.md).
