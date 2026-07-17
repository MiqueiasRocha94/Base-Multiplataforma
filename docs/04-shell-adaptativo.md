# 04 — Shell adaptativo e estrutura

A parte central da base. A ideia: **o mesmo código entrega duas experiências**
(desktop e mobile), e a **malha física da tela é configurável em runtime**. Tudo
nasce de um único orquestrador:

```tsx
// src/app/layout.tsx
<AppStructure>{children}</AppStructure>
```

## O orquestrador (`AppStructure`)

[AppStructure.tsx](../src/components/layout/AppStructure.tsx) faz duas coisas:

1. **Monta os providers globais em ordem fixa** (a ordem importa — ver abaixo).
2. **Escolhe o shell** conforme `DeviceContext.view`: `mobile` → `MobileAppShell`;
   caso contrário → a malha física desktop (Header + corpo + Footer).

![AppStructure monta os providers na ordem fixa (Theme → … → Navigation) e, no AppStructureContent, escolhe entre MobileAppShell e a malha desktop conforme view === mobile.](/docs/providers-ordem.svg)

### Ordem dos providers

```text
ThemeProvider → LanguageProvider → AuthProvider → DeviceProvider
→ DeveloperModeProvider → UIProvider → SystemProvider → NavigationProvider
```

Implicações: tema e idioma são as camadas mais externas; **dispositivo influencia
o shell** (não só CSS); `SystemProvider` depende de `DeviceProvider`
(`canRenderSidebars = view !== "mobile"`); `NavigationProvider` depende de sessão
(`AuthProvider`) e de plataforma (`DeviceProvider`).

## Decisão de plataforma (`DeviceContext`)

[DeviceContext.tsx](../src/contexts/DeviceContext.tsx) resolve `view` combinando
viewport e Capacitor ([capacitor.ts](../src/lib/platform/capacitor.ts)), e
reavalia no `resize`:

| `view` | Quando |
| --- | --- |
| `mobile` | viewport `max-width: 767px` |
| `tablet` | viewport 768–1024px **ou** plataforma nativa android/ios sem viewport de telefone |
| `desktop` | demais casos |

Expõe ainda `isNative`, `isPhone`, `isTablet`, `platform`. **Só `mobile`** troca
para o `MobileAppShell`; `tablet` e `desktop` usam a malha física completa.

## Malha física (desktop/tablet)

Regiões montadas por `AppStructure` no modo não-mobile
([src/components/layout](../src/components/layout)):

```text
┌───────────────────────── Header ─────────────────────────┐
│ Logo · Navigation(header) · AccountMenu/Theme/Locale      │
├──────────┬──────────────────────────────┬────────────────┤
│ Left     │        MainContent           │     Right       │
│ Sidebar  │   (única região com scroll)  │   Sidebar       │
├──────────┴──────────────────────────────┴────────────────┤
│                        Footer                             │
└───────────────────────────────────────────────────────────┘
```

![Mapeamento das regiões da malha física no web e no mobile: no web, Header, Left, MainContent e Right, Footer; o MainContent tem uma região de topo fixa e uma região de ações fixa em volta do conteúdo com scroll. No mobile, colapsa em Header, conteúdo com scroll e Footer.](/docs/mapeamento-regioes-web-mobile.png)

> **Mapeamento web × mobile.** No web, o `MainContent` pode ter uma **região de
> topo fixa** (título/breadcrumb à esquerda, ações especiais/destrutivas à
> direita) e uma **região de ações fixa** (voltar/salvar/editar — ou navegação, na
> lista) ao redor do conteúdo rolável. No mobile, a mesma estrutura colapsa em
> Header + conteúdo + Footer.

- **Scroll:** a raiz usa `h-screen` + `overflow-hidden`; **o scroll principal
  fica no `MainContent`** ([MainContent.tsx](../src/components/layout/MainContent.tsx),
  `data-layout-scroll="content"`). Não reintroduza scroll global no documento.
- O `MainContent` tem dois modos (`mainContentMode`): `full` (largura cheia) e
  `card` (centralizado, com margem e cartão arredondado).
- Cada região respeita o `SystemContext` (visibilidade, dimensões, z-index) e se
  oculta sozinha quando desabilitada (ex.: `Header` retorna `null` se
  `!headerVisible`).

## Shell mobile (`MobileAppShell`)

[MobileAppShell.tsx](../src/components/layout/MobileAppShell.tsx): header enxuto
(breadcrumb + `BrandButton`), corpo rolável e **footer de navegação** quando o
*placement* é `footer`. Em telas públicas de autenticação (`/`, `/home`,
`/login`) sem sessão, o chrome é suprimido. Respeita `env(safe-area-inset-*)`.

![Guia de ergonomia mobile — zonas de alcance do polegar: da base ao topo, zona natural e confortável (ações frequentes), intermediária, de difícil alcance e crítica (ações raras, destrutivas ou irreversíveis).](/docs/ergonomia-mobile.png)

> **Ergonomia (por que a navegação vai para o footer).** Em uso com uma mão, as
> zonas de alcance do polegar priorizam a **base** da tela para ações frequentes
> (navegação, buscar, adicionar) e reservam o **topo** (difícil alcance) para
> ações críticas/destrutivas. Por isso o `MobileAppShell` leva a navegação
> primária e o FAB de criação para o rodapé — ver também o FAB do `GenericTable`
> em [06 — Componentes adaptativos](./06-componentes-adaptativos.md).

## Camada estrutural (`SystemContext`)

[SystemContext.tsx](../src/contexts/SystemContext.tsx) é a **fonte única** da
geometria da malha e do estado dos painéis especiais. Tipos em
[src/contexts/system/types](../src/contexts/system/types).

### Geometria (`SystemLayoutConfig`)

```ts
{
  headerVisible, leftSidebarVisible, rightSidebarVisible, footerVisible,   // presença
  headerHeight, footerHeight, leftSidebarWidth, rightSidebarWidth,         // dimensões
  leftSidebarDisplayMode, rightSidebarDisplayMode,   // 'full' | 'card' | 'card-full'
  leftSidebarLayoutMode,  rightSidebarLayoutMode,    // 'structural' | 'overlay'
  sidebarCardMargin,
  mainContentMode,        // 'full' | 'card'
  mainContentCardMargin,
  zIndexHeader, zIndexFooter,
}
```

Derivados no provider: `canRenderSidebars` (`view !== "mobile"`),
`leftSidebarInLayout` / `rightSidebarInLayout` (`canRenderSidebars &&
…Visible`).

### Painéis especiais (developer / menu / system)

Além da geometria, o `SystemContext` controla três painéis
([panel.ts](../src/contexts/system/types/panel.ts)): `developer`, `menu`,
`system`. Cada um tem `{ isOpen, label, view, activeItemId }`.

```ts
openPanel(panelId);   // abre um e fecha os outros (exclusividade)
closePanel(panelId);  // apenas oculta — preserva a capacidade de reabrir
```

> Regra consolidada: **não criar novos contexts para sidebar/painel**. Todo o
> controle vive no `SystemContext`. `closePanel` só oculta; `openPanel` sempre
> volta a abrir com `view`/label corretos.

### Ações públicas

`updateConfig(patch)` · `resetConfig()` · `setSidebarEnabled(side, enabled)` ·
`setMainContentMode(value)` · `setMainContentCardMargin(value)` ·
`setSidebarDisplayMode(side, value)` · `setSidebarLayoutMode(side, value)` ·
`openPanel(id)` · `closePanel(id)`.

## Sidebars, SidebarItem e Marker

As sidebars são genéricas e dirigidas por conteúdo
([Sidebar.tsx](../src/components/Sidebar.tsx)):

- A `Sidebar` recebe `SidebarItem`s como filhos. Cada
  [SidebarItem](../src/components/SidebarItem.tsx) é **apenas declarativo**
  (`id`, `title`, `markerTitle`, `icon`, `children`) — não renderiza nada
  sozinho; a `Sidebar` lê suas props.
- Quando **nenhum** painel está aberto, a `Sidebar` mostra um
  [Marker](../src/components/Marker.tsx) por item (atalho de borda). Clicar chama
  `openPanel(id)`.
- Quando um item está aberto, ela renderiza o conteúdo dentro de
  `SidebarPanelFrame` (cartão com título + botão de fechar → `closePanel`).
- `layoutMode: overlay` posiciona a sidebar em `absolute` (sobreposta), de modo
  que a **direita não empurra horizontalmente** o `MainContent`; `structural`
  participa do fluxo como coluna.

Montagem concreta:

- [LeftSidebar.tsx](../src/components/layout/LeftSidebar.tsx) — exibe a navegação
  como item `menu` quando `NavigationContext.desktopMode === "sidebar"`.
- [RightSidebar.tsx](../src/components/layout/RightSidebar.tsx) — itens `system`
  (se `NEXT_PUBLIC_SYSTEM_PANEL_ENABLED`) e `developer`.

## Navegação e *placement*

A navegação é **conteúdo montado dentro das regiões**, separado da malha física.

- [navigation.ts](../src/lib/navigation.ts): itens por sessão
  (`getAppNavigationItems`), regras de corte (`HEADER_NAV_LIMIT = 5`,
  `MOBILE_NAV_LIMIT = 5`), agrupamento mobile (left / overflow / right) e
  `isNavigationItemActive`.
- [NavigationContext.tsx](../src/contexts/NavigationContext.tsx): calcula o
  `placement` final:
  - **desktop** → `header` (≤5 itens, sem aninhamento) ou `sidebar` (mais itens
    ou itens com filhos);
  - **mobile** → `footer` (com sessão ou >1 destino público) ou `hidden`.
- [Navigation.tsx](../src/components/Navigation.tsx): renderiza a variante
  (`header` / `sidebar` / `footer`) conforme o `placement`, com overflow "Mais"
  no footer mobile.

![Placement da navegação: no desktop, > 5 itens ou aninhado vai para sidebar, senão header; no mobile, com sessão ou >1 item público vai para footer, senão fica oculto.](/docs/navegacao-placement.svg)

## Criar/ajustar estrutura (passo a passo)

1. **Nova região visível?** Não crie layout paralelo — ajuste
   [AppStructure.tsx](../src/components/layout/AppStructure.tsx) e os componentes
   de [src/components/layout](../src/components/layout).
2. **Mudar dimensões/visibilidade em runtime:** use `updateConfig` /
   `setSidebarEnabled` / `setMainContentMode` do `SystemContext` — não hardcode.
3. **Novo painel lateral:** adicione um `SidebarItem` em `LeftSidebar`/
   `RightSidebar` e abra com `openPanel(id)`. Mantenha o estado no `SystemContext`.
4. **Novo destino de navegação:** registre em
   [navigation.ts](../src/lib/navigation.ts) e crie a `page.tsx` da rota.

> O que **não** misturar na camada `layout/`: autenticação, regra de negócio,
> definição concreta de itens de menu. Estrutura física ≠ conteúdo/comportamento.

Próximo: [05 — Infraestrutura](./05-infraestrutura.md).
