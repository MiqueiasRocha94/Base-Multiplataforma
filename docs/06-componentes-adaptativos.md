# 06 — Componentes adaptativos (mesmo componente, comportamento por plataforma)

Princípio multiplataforma desta base: **um único componente muda de
comportamento conforme a plataforma**, em vez de telas duplicadas. A decisão vem
do `DeviceContext` (`useDevice().view`), não apenas de breakpoints CSS.

O caso de referência é o `GenericTable`, espelhando o `GenericListScreen` da base
Expo: **no desktop renderiza a tabela completa**; **no mobile vira a "tela de
lista" estilo Expo** (cards + barra de filtros + FAB de criar/exportar +
paginação).

![GenericTable, a partir de useDevice().view: no desktop/tablet vira tabela completa com toolbar; no mobile vira lista de cards com barra de filtros e FAB. FilterModal é dialog no desktop e sheet no mobile.](/docs/generictable-adaptativo.svg)

## GenericTable

[src/components/ui/generic-table.tsx](../src/components/ui/generic-table.tsx).
Quando recebe apenas `columns`/`data`, comporta-se como antes (tabela no desktop,
cards simples no mobile). Quando recebe **chrome** (`filter`, `onCreate`,
`onExport`), vira a tela de lista completa.

### Colunas

```ts
type GenericTableColumn<T> = {
  key: string;
  header: ReactNode;                 // cabeçalho da tabela (desktop)
  render: (item, index) => ReactNode;
  mobileLabel?: ReactNode;           // rótulo label/valor no card
  mobileRole?: "title" | "badge" | "meta" | "field"; // papel no card mobile
  mobilePriority?: "primary" | "secondary" | "meta";  // compat. legada
  hideOnMobile?: boolean;
  className?, headerClassName?;
};
```

No card mobile: `title` é o cabeçalho colorido; `badge` vira a etiqueta; `meta`
fica à direita do header; os demais campos viram linhas **label/valor**.

### Adaptadores de linha e ações

| Prop | Efeito |
| --- | --- |
| `getRowStatus(item)` | Faixa de status com tom (`success`/`danger`/`warning`/`neutral`). No mobile vira a faixa colorida do card; no desktop pode complementar a linha. |
| `onRowDetails(item)` | Botão **VER DETALHES** (rodapé do card / coluna de ação na tabela). |
| `getRowActions(item)` | Ações por linha (`edit`, `delete`…); no card abrem um overlay (engrenagem), na tabela viram botões. |
| `onCreate()` / `onExport()` | FAB de criar/exportar no mobile; botões na toolbar do desktop. |

### Filtros e paginação

`filter: ListFilterConfig<T>` descreve os campos e o predicado; os básicos
(**Limite / Pular / Data**) são gerados automaticamente e ficam fixos no rodapé
do [FilterModal](../src/components/ui/filter-modal.tsx) (sheet no mobile, dialog
no desktop), exatamente como na base Expo.

```ts
type ListFilterConfig<T> = {
  fields: FilterField[];                       // text | number | select | date-range
  predicate: (item, values) => boolean;        // filtro client-side
  enabled?: boolean | "auto";                  // 'auto' habilita acima de autoThreshold
  dateOf?: (item) => number;                   // habilita o filtro básico de Data
};
```

- **Modo cliente (padrão):** o `GenericTable` aplica predicado + data + pular +
  limite sobre `data`.
- **Modo servidor:** passe `onQueryChange(query: ListQuery)`
  ([src/types/list-query.ts](../src/types/list-query.ts)) e o componente emite
  `{ limit, offset, dateFrom, dateTo }` para o pai buscar a página (API ou
  `applyListQuery` local).

### Textos (i18n)

O componente tem rótulos padrão em pt-BR, sobrescritos por `labels`. As telas
passam os textos do dicionário (seção `table` nos
[locales](../public/locales)), preservando a convenção de i18n.

## Exemplo: módulo Pessoas (portal) — schema-driven

O módulo [/portal/persons](<../src/app/(Portal)/portal/persons/page.tsx>) é
**dirigido por contrato**, não por código específico da entidade. A lista, os
filtros, as colunas, o formulário e as ações **se montam a partir do schema**:

- **Contrato + dados (dev backend):** [src/dev-backend/entities/person.ts](../src/dev-backend/entities/person.ts)
  define `PERSON_CONTRACT` (`schema` de campos + `ui` de colunas/filtros +
  `permissions`) e o `personSeed`, registrado em
  [src/dev-backend/index.ts](../src/dev-backend/index.ts) (`registerDevEntity({ url: "persons", ... })`).
  Representa o que a API de produção retornaria em `GET /persons/contract` e `GET /persons`.
- **Entity Runtime:** `useEntity({ url: "persons", query })`
  ([src/core/entity-runtime](../src/core/entity-runtime)) entrega `items`, `schema`,
  `ui`, `actions` (já refletindo a autorização do usuário) e CRUD
  (`create`/`update`/`remove`/`refresh`) — sem service específico de Pessoa.
- **Module engine:** helpers de [src/core/module-engine](../src/core/module-engine)
  convertem o schema em UI: `buildTableColumns`, `buildFilterFields`,
  `buildPredicate`, `buildRowStatus`, `buildFormFields`, `buildZodSchema`,
  `buildCsv` / `downloadCsv`.
- **Ações + RBAC:** o catálogo [PERSON_ACTIONS](../src/lib/actions/registry.ts)
  passa por `resolveAvailableActions(registry, user)`
  ([resolve-actions](../src/lib/actions/resolve-actions.ts)) — só aparecem as ações
  que o usuário logado tem permissão de ver. A visibilidade do próprio item de menu
  vem de `requiredPermissions`/`requiredRoles` em [navigation.ts](../src/lib/navigation.ts).
- **Formulário:** criar/editar usa a tela
  [_screens/person-form-screen.tsx](<../src/app/(Portal)/portal/persons/_screens/person-form-screen.tsx>)
  com o [DynamicForm](../src/components/ui/dynamic-form.tsx) (campos + validação Zod
  gerados do schema). O id trafega por **query param** (`?id=`), mantendo rotas
  estáticas compatíveis com `output: export` (mobile).

A home pública ([src/app/(Public)/home/page.tsx](<../src/app/(Public)/home/page.tsx>))
usa o mesmo `GenericTable` num showcase diversificado (stats, tabela adaptativa
com status, galeria de componentes).

## Criar um módulo de lista novo

O módulo Pessoas é **orientado a contrato**: lista, filtros, formulário e ações
se montam a partir do `EntityContract`. O passo a passo completo (anatomia dos
arquivos, o contrato e como o **scaffold** gera/gerará cada peça) está em
[07 — Scaffold e módulos](./07-scaffold-modulos.md).

Voltar ao [índice](./README.md).
