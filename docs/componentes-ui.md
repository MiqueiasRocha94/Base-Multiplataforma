# Componentes de UI

O design system em [src/components/ui](../src/components/ui) é a primeira fonte
de reutilização. Princípio multiplataforma: **um único componente muda de
comportamento conforme a plataforma**, em vez de telas duplicadas. A decisão vem
do `DeviceContext` (`useDevice().view`), não de breakpoints CSS soltos
([shell adaptativo](./shell-adaptativo.md) → "Apresentação por device").

## Design único web/mobile

A tela é escrita uma vez; web e APK diferem só no alvo de build.

1. **A tela não ramifica `if mobile/web` no conteúdo.** Diferença de estrutura
   fica dentro do componente adaptativo; diferença de aparência, no CSS
   (variantes `mobile:`/`desktop:` e `[data-region]`).
2. **Listagens → `GenericTable`** com `mobileRole` por coluna.
3. **Formulários → `DynamicForm`** (schema-driven, o mesmo nos dois).
4. **Ações da tela → `Button type="action"`** (footer no mobile, barra de ações
   do MainContent no web); saída → `type="back"`; especiais/destrutivas no
   header → `type="special"`/`"destructive"` ([shell adaptativo](./shell-adaptativo.md)
   → "Regiões no mobile").
5. **Escolha única → `SelectOne`** (web = `<select>` nativo; mobile =
   `SelectOverlay` tela cheia), não grid de botões nem segmento.
   **Data ou mês → `DateField`**, nunca `<input type="date|month">` nativo (muda
   por navegador, some no tema escuro e não existe para mês em vários navegadores).
6. **Recursos de aparelho via `DeviceContext`** (`pickImage`) ou `lib/platform`
   (biometria, push), nunca Capacitor direto na tela; câmera cai para file
   picker na web ([plataforma nativa](./plataforma-nativa.md)).
7. **Cores, densidade e espaçamento por tokens** (radius/fonte do
   `system-config`) — nunca cor fixa ([tema e marca](./tema-marca-e-idioma.md)).
8. **Tela com referência segue a forma da referência** (sistema anterior,
   protótipo ou print), não a descrição da função. Antes de montar, abra a tela
   de origem e mapeie cada elemento: tabela → `GenericTable` (ou `EntityListScreen`
   com `contract`) com ação de linha levando ao item (`?id=`); seleção única →
   `SelectOne`; formulário → campos do formulário. Os cards do mobile são os do
   `GenericTable`; **nunca** grade de cards, `radiogroup` ou `<table>` feitos à
   mão na tela. Mudar a forma (ex.: tabela virar escolha por card) é decisão de
   produto: pergunte antes.
9. **Confirmação de ação → `requestConfirm`**, nunca `window.confirm` (diálogo
   do navegador: fora do tema, sem i18n, ruim no APK). Retorno de operação
   (salvo, excluído) → `toast`. Ver "Confirmação e aviso rápido".

Os itens 2, 5, 8 e 9 são verificados por lint em `src/components` e `src/app`
(`<table>`, `<select>`, `<input type="date|month">`, `window.confirm` fora de
`components/ui`) — [enforcement](./enforcement-arquitetura.md).

## Catálogo

| Componente | Arquivo | Uso |
| --- | --- | --- |
| `Button` | [ui/button.tsx](../src/components/ui/button.tsx) | Variantes semânticas (default, outline, secondary, ghost, danger) e tipos de posicionamento (`action`, `back`, `special`, `destructive`). |
| `Card` | [ui/card.tsx](../src/components/ui/card.tsx) | `Card`/`CardHeader`/`CardTitle`/`CardContent` — blocos e painéis. |
| `Input` / `InputText` / `InputNumber` / `InputColor` | [ui/](../src/components/ui) | Campos de formulário com tokens. |
| `Label` | [ui/label.tsx](../src/components/ui/label.tsx) | Rótulo de campo. |
| `Switch` | [ui/switch.tsx](../src/components/ui/switch.tsx) | Toggle. |
| `SelectOne` | [ui/select-one.tsx](../src/components/ui/select-one.tsx) | **Escolha única adaptativa** (web = `<select>` nativo; mobile = `SelectOverlay` tela cheia). |
| `DateField` | [ui/date-field.tsx](../src/components/ui/date-field.tsx) | **Data (`mode="day"`, `yyyy-MM-dd`) ou mês (`mode="month"`, `yyyy-MM`) adaptativo**: web = digitação com máscara `dd/mm/aaaa` + calendário em popover (portal, não é cortado por modal); mobile = tela cheia com o calendário embaixo, "Limpar"/"Hoje", back do sistema fecha. `min`/`max` no formato do valor; nomes pelo idioma ativo. Helpers puros em [lib/date-field.ts](../src/lib/date-field.ts). |
| `SegmentSelector` | [ui/segment-selector.tsx](../src/components/ui/segment-selector.tsx) | Seleção segmentada (para escolha única use `SelectOne`). |
| `GenericTable` | [ui/generic-table.tsx](../src/components/ui/generic-table.tsx) | Tabela no desktop; lista de cards + filtros + FAB no mobile ("GenericTable"). |
| `FilterModal` | [ui/filter-modal.tsx](../src/components/ui/filter-modal.tsx) | Filtro adaptativo (sheet no mobile, dialog no desktop) usado pelo `GenericTable`. |
| `DynamicForm` | [ui/dynamic-form.tsx](../src/components/ui/dynamic-form.tsx) + [form-field-input.tsx](../src/components/ui/form-field-input.tsx) | Formulário gerado de campos + Zod ("DynamicForm"). |
| `Chart` | [ui/chart.tsx](../src/components/ui/chart.tsx) | Wrapper de gráficos no estilo shadcn (Recharts): `ChartContainer`, `ChartTooltipContent`, `ChartLegendContent`. Cores via `--chart-1..5`. Demo em [/portal/analytics](<../src/app/(Portal)/portal/analytics/page.tsx>). |
| `ImageField` / `ImageGallery` / `ImageViewer` / `DocumentReader` | [ui/](../src/components/ui) | Foto, galeria, visualização de imagem e leitura de documento. |
| `EmptyState` | [ui/empty-state.tsx](../src/components/ui/empty-state.tsx) | Estado vazio de lista/bloco com o texto da tela ("Nenhum…"). |
| `InlineError` | [ui/inline-error.tsx](../src/components/ui/inline-error.tsx) | Erro de operação com a tela montada (`role="alert"`); sem mensagem não renderiza. |
| `LoadRetry` | [ui/load-retry.tsx](../src/components/ui/load-retry.tsx) | Falha de carga de um **bloco** (a tela tem o que mostrar) + "Tentar novamente". Tela sem o que mostrar usa o `LoadErrorScreen` ([comunicação com a API](./comunicacao-api.md)). |
| `ConfirmHost` | [ui/confirm-dialog.tsx](../src/components/ui/confirm-dialog.tsx) | Exibe `requestConfirm` ([lib/confirm.ts](../src/lib/confirm.ts)); montado no `AppStructure` ("Confirmação e aviso rápido"). |
| `Toaster` | [ui/toaster.tsx](../src/components/ui/toaster.tsx) | Exibe `toast` ([lib/toast.ts](../src/lib/toast.ts)); montado no `AppStructure` ("Confirmação e aviso rápido"). |
| `BottomActionBar` | [ui/bottom-action-bar.tsx](../src/components/ui/bottom-action-bar.tsx) | Barra inferior com ação secundária + primária (porta da base mobile). As telas usam `Button type="action"`. |

## Confirmação e aviso rápido

Os dois são chamados por função, de qualquer tela, sem provider: o estado fica em
`lib/` e o `AppStructure` monta uma vez o `ConfirmHost` e o `Toaster`.

- **`requestConfirm({ message, title?, confirmLabel?, cancelLabel?, destructive? })`**
  devolve `Promise<boolean>`: `true` ao confirmar; `false` ao cancelar, com Esc,
  toque no fundo ou voltar do sistema. Desktop: diálogo centralizado; mobile: folha
  ancorada embaixo (zona do polegar). Foco começa em Cancelar e fica preso no
  diálogo; `destructive` põe o botão de confirmar em `danger`. Abrir empilha um
  estado no histórico, como as demais camadas, e a resposta só sai depois de
  desempilhar — a tela pode navegar logo em seguida. Um pedido novo cancela o
  aberto. O nome não é `confirm` porque o lint barra a chamada `confirm(...)` nas
  telas (item 9).
- **`toast.success | error | info(mensagem, duraçãoMs?)`**: aviso que some sozinho
  (4 s), com no máximo 3 na tela, e continua visível depois de trocar de rota.
  Mobile: no topo, abaixo da área segura; desktop: canto inferior direito.
  Erro de operação com a tela montada continua no `InlineError`; o toast é o
  retorno de sucesso ou um aviso passageiro.
- Textos padrão em `common` (`confirm`, `cancel`, `saved`, `deleted`); a base de
  entidade usa os rótulos da entidade quando existem (`labels.saved`,
  `labels.deleted`).

## GenericTable

![GenericTable, a partir de useDevice().view: no desktop vira tabela completa com toolbar; no mobile vira lista de cards com barra de filtros e FAB. FilterModal é dialog no desktop e sheet no mobile.](/docs/generictable-adaptativo.svg)

Espelha o `GenericListScreen` da base Expo: **no desktop renderiza a tabela
completa**; **no mobile vira a "tela de lista"** (cards + barra de filtros + FAB
de criar/exportar + paginação). Com apenas `columns`/`data`, é tabela no desktop e
cards simples no mobile; com **chrome** (`filter`, `onCreate`, `onExport`), vira a
tela de lista completa.

**Mobile — card = alvo da ação principal:** o card quase inteiro (header +
corpo + status) dispara `onRowDetails` (ver detalhes, ou a ação principal da
lista), com seta `›` no header como indicação e o rótulo (`labels.details`)
como nome acessível; `role="button"` + Enter/Espaço. O **rodapé** fica só para as
ações secundárias (`getRowActions` → painel "Ações"); sem ações, não há rodapé.
Card só com título ganha altura de ~48px (alvo de toque mínimo).

**Mobile — cards na zona do polegar:** a lista começa junto à navegação/footer,
sem inverter a ordem (mesmo princípio dos resultados da gaveta do Menu). Poucos
cards → **a tela** põe a lista na zona de ALCANCE (`ScreenZones` /
`ScreenLayout top|reach` — [shell adaptativo](./shell-adaptativo.md) → "Zonas de
ergonomia") e ela assenta no fim por CSS; muitos → o `GenericTable` abre rolado
até o fim e fica "grudado" lá enquanto o shell assenta (ex.: footer de ações
montando) — `useStickToEnd`. Se o usuário rola para cima, nada o puxa de volta.

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
  sortKey?: string;                  // coluna ordenável (desktop); nome do campo
  sortValue?: (item) => string | number | null | undefined; // valor da ordenação local
  className?, headerClassName?;
};
```

**Rolagem da tabela desktop:** só a **horizontal** é da tabela; a vertical é da
página (MainContent). A barra horizontal é própria e fica **presa ao pé da área
visível** enquanto a tabela aparece (à vista sem ir ao fim das linhas; some se
tudo cabe). Cada coluna ocupa a largura do seu conteúdo (sem espremer o texto);
com poucas colunas, a tabela ocupa a largura toda. A **coluna de ações fica fixa
à direita** (sempre visível, fundo opaco sobre as colunas que passam por baixo).
O **cabeçalho fica preso ao topo** ao rolar a página: como a tabela é área de
rolagem horizontal, o `sticky` do cabeçalho real não alcança a página — um
cabeçalho espelho (mesmas larguras medidas, mesma rolagem horizontal, clicável
para ordenar) fica sobreposto a ele; o real continua o acessível (o espelho é
`aria-hidden` e fora da tabulação). O quadro usa `contain: inline-size` para a
tabela larga não alargar a página.
Paginação de tela vai para o centro do rodapé do MainContent (`ScreenFooter` —
[shell adaptativo](./shell-adaptativo.md)); "Por página" oferece 10, 20, 30,
50, 100, 250 e 500, cada um só enquanto o anterior não cobre o total (19
registros → 10 e 20).

**Colunas (desktop):** botão **Colunas** ao lado de **Filtros** abre a lista na
ordem da tabela: marcar exibe/oculta, **arrastar** (ou as setas ↑/↓, pelo
teclado) muda a posição. A última coluna visível não pode ser desmarcada; o
botão mostra `visíveis/total` quando há oculta; "Mostrar todas" exibe todas e
"Restaurar padrão" volta à ordem e às ocultas do contrato.
Coluna com `defaultHidden` começa oculta (no card mobile não aparece);
`additional` + `onVisibleColumnsChange(keys)` deixam a tela pedir à API os campos
que só vêm sob pedido (`addColumn`). Vale para a sessão da tela (não persiste).
No mobile o seletor não aparece (cards). Rótulos:
`labels.columns`, `showAllColumns`, `resetColumns`, `moveColumnUp`,
`moveColumnDown` (`table.*` nos locales).

**Ordenação composta (desktop):** coluna com `sortKey` tem cabeçalho clicável;
cada clique acrescenta a coluna (asc) → inverte (desc) → retira, mantendo as
demais. A ordem dos cliques é a prioridade (número no cabeçalho quando há mais de
uma). Sem `onSortChange`, ordena localmente por `sortValue` antes de
pular/limitar; com `onSortChange(sort: ListSort)`
([list-query.ts](../src/types/list-query.ts)), só emite os critérios e a tela
busca na API (ex.: `sort=campo,asc&sort=campo2,desc`).

No card mobile: `title` é o cabeçalho colorido; `badge` vira a etiqueta; `meta`
fica à direita do header; os demais campos viram linhas **label/valor**.

### Adaptadores de linha e ações

| Prop | Efeito |
| --- | --- |
| `getRowStatus(item)` | Faixa de status com tom (`success`/`danger`/`warning`/`neutral`). No mobile vira a faixa colorida do card; no desktop pode complementar a linha. |
| `onRowDetails(item)` | Ação principal da linha: card inteiro no mobile, coluna de ação na tabela. |
| `getRowActions(item)` | Ações por linha (`edit`, `delete`…); no card abrem o painel "Ações", na tabela viram botões. |
| `onCreate()` / `onExport()` | FAB de criar/exportar no mobile; botões na toolbar do desktop. |

### Filtros e paginação

`filter: ListFilterConfig<T>` descreve os campos e o predicado; os básicos
(**Limite / Pular / Data**) são gerados automaticamente e ficam fixos no rodapé
do [FilterModal](../src/components/ui/filter-modal.tsx), como na base Expo.
`basic: "date"` deixa só a Data, para telas que paginam por conta própria (ex.:
tabela desktop com seletor de página).

Barra de filtro (mobile): com **um** filtro aplicado mostra `Campo: valor`
(ex.: "Cliente: LOJA CENTRAL"); com **vários**, só os nomes
("Cliente, Produto"). No desktop cada filtro vira um chip `Campo: valor`.

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
- **`onFilterChange(values)`**: avisa os valores aplicados (campos da entidade
  inclusive), para a tela levá-los à API. Ex.: o `EntityListScreen` filtra e
  ordena local se o GET inicial veio inteiro; senão passa
  `onFilterChange`/`onQueryChange`/`onSortChange` e envia campos +
  limite/offset/data + `sort` como parâmetros do GET
  ([módulos de entidade](./modulos-entidade.md) → "Regra da lista").

### Textos (i18n)

O componente tem rótulos padrão em pt-BR, sobrescritos por `labels`. As telas
passam os textos do dicionário (seção `table` nos [locales](../public/locales)).

## DynamicForm

Campos e validação Zod gerados de um schema; é o formulário das telas de
entidade ([módulos de entidade](./modulos-entidade.md)) e do login.
`columns="adaptive"` dá 1 coluna no mobile e 2 no mobile largo (`wide:`).

**Teclado** ([form-field-input.tsx](../src/components/ui/form-field-input.tsx)):

- Enter/"Próximo" avança para o próximo campo editável; no **último** campo,
  Enter/"Ir" submete o `<form>` que envolve o DynamicForm (`requestSubmit`,
  adiado um tick para enxergar o valor recém-confirmado). `enterKeyHint`
  (`next`/`go`) troca a tecla de ação do teclado virtual — sem ele o Android
  mostra ↵ (quebra de linha). Vale para input inline, senha e editor de toque.
- No **editor de toque**, a tecla "Próximo" do teclado nem sempre gera Enter: o
  navegador move o foco direto para o próximo campo do form. Por isso o editor
  **confirma o rascunho ao perder o foco** (e avança se o foco foi para outro
  campo); só Cancelar e o toque fora descartam (marcados no `pointerdown`, antes
  do blur). Teclados que não mandam `keydown` Enter (Android: keyCode 229)
  disparam `beforeinput` com `insertLineBreak`/`insertParagraph` — tratado como
  a mesma tecla de ação (listener nativo; o `onBeforeInput` do React não expõe
  `inputType`).
- Em aparelho de toque, **todo submit de `<form>` fecha o teclado virtual**
  (listener único no documento, ligado pelo DeviceContext —
  [keyboard.ts](../src/lib/platform/keyboard.ts)); no desktop o foco fica.
- Ao **sair da tela** após um submit bem-sucedido (login, troca de senha), a tela
  chama `dismissKeyboard()` antes de navegar em qualquer device: desmontar o
  campo focado não dispara `blur`, e o teclado ficaria aberto na próxima tela.

## Onde está no código

| Peça | Onde |
| --- | --- |
| Design system | [src/components/ui/](../src/components/ui/) |
| Tabela genérica | [src/components/ui/generic-table.tsx](../src/components/ui/generic-table.tsx) |
| Formulário dinâmico | [src/components/ui/dynamic-form.tsx](../src/components/ui/dynamic-form.tsx) |
| Data | [src/components/ui/date-field.tsx](../src/components/ui/date-field.tsx) |
| Consulta de listagem | [src/types/list-query.ts](../src/types/list-query.ts) |
| Teclado | [src/lib/platform/keyboard.ts](../src/lib/platform/keyboard.ts) |

Voltar ao [índice](./README.md).
