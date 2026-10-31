# Shell adaptativo

A parte central da base: **o mesmo código entrega duas experiências** (desktop e
mobile), e a **malha física da tela é configurável em runtime**. Tudo nasce de
um único orquestrador:

```tsx
// src/app/layout.tsx
<AppStructure>{children}</AppStructure>
```

Sidebars, árvore de navegação e *placement* do menu ficam em [navegação](./navegacao.md).

## O orquestrador (`AppStructure`)

[app-structure.tsx](../src/components/layout/app-structure.tsx) faz duas coisas:

1. **Monta os providers globais em ordem fixa** (ver abaixo).
2. **Renderiza sempre a mesma árvore de regiões** — `Header · LeftSidebar ·
   MainContent · RightSidebar · Footer` — em `100dvh`, com scroll só no conteúdo.
   Cada região se liga/desliga pelo layout resolvido no `SystemContext` e tem sua
   variante mobile por dentro; não existe um shell separado por dispositivo
   ("Composição de layout (regras)"). No mobile, os botões de dev/sistema
   flutuam no topo, sem reservar espaço, e só existem com as
   [ferramentas de desenvolvimento](./ferramentas-dev.md) habilitadas.

![AppStructure monta os providers em ordem fixa (Brand → Theme → Language → Auth → Device → DeveloperMode → Navigation → System); o System resolve o layout e a árvore única de regiões é sempre a mesma.](/docs/providers-ordem.svg)

### Providers

```text
BrandProvider → ThemeProvider → LanguageProvider → AuthProvider → DeviceProvider
→ DeveloperModeProvider → NavigationProvider → SystemProvider
```

A **marca** é a entrada das cores, então envolve o tema; tema e idioma são as
camadas externas; `NavigationProvider` depende de sessão (`AuthProvider`) e de
plataforma (`DeviceProvider`); o `SystemProvider` resolve o layout lendo device +
sessão + rota (`RouteMeta`) e fica por dentro — nenhum outro context lê o
`SystemContext`.

| Provider | Arquivo | Papel | Doc |
| --- | --- | --- | --- |
| `BrandProvider` | [BrandContext.tsx](../src/contexts/BrandContext.tsx) | Marca ativa (identidade) + `info` institucional | [tema e marca](./tema-marca-e-idioma.md) |
| `ThemeProvider` | [ThemeProvider.tsx](../src/contexts/ThemeProvider.tsx) | Cores (consome a marca), preset/escala de fonte, radius | [tema e marca](./tema-marca-e-idioma.md) |
| `LanguageProvider` | [LanguageContext.tsx](../src/contexts/LanguageContext.tsx) | Dicionário e locale | [tema e marca](./tema-marca-e-idioma.md) → "i18n" |
| `AuthProvider` | [AuthContext.tsx](../src/contexts/AuthContext.tsx) | Sessão (auth), troca de senha e biometria | [autenticação](./autenticacao-e-permissoes.md) |
| `DeviceProvider` | [DeviceContext.tsx](../src/contexts/DeviceContext.tsx) | `view` (mobile/desktop), aparelho e toque | "Decisão de plataforma" |
| `DeveloperModeProvider` | [developer-mode-context.tsx](../src/dev-tools/ui/developer-mode-context.tsx) | Flags de desenvolvimento | [ferramentas de desenvolvimento](./ferramentas-dev.md) |
| `NavigationProvider` | [NavigationContext.tsx](../src/contexts/NavigationContext.tsx) | Itens e *placement* da navegação | "Navegação" |
| `SystemProvider` | [SystemContext.tsx](../src/contexts/SystemContext.tsx) | Layout: resolve as regiões e guarda geometria, painéis e slots | "Camada estrutural" |

## Decisão de plataforma (`DeviceContext`)

[DeviceContext.tsx](../src/contexts/DeviceContext.tsx) decide a `view` e a
publica em `<html data-view="mobile|desktop">` (no `<html>` para portais
herdarem). Nada de media query paralela decidindo. **Duas views, regra única
(web e nativo):** `desktop` = paisagem **e** largura ≥ `DESKTOP_MIN_WIDTH`
(1024 px CSS — menor desktop real: 1280×720 a 125%); o resto é `mobile`. A view
é reavaliada no `resize` (rotação inclusa).

| Aparelho | Retrato | Paisagem |
| --- | --- | --- |
| Celular | `mobile` (360–430) | `mobile` (até ~932) — no nativo nem gira (travado) |
| Tablet | `mobile` (744–1024) | `desktop` (≥ 1024) |
| Desktop | janela estreita → `mobile` | `desktop` |

Expõe ainda `isNative`, `isPhone`, `isTablet` (refletem o **aparelho**, não a
view), `isTouch` e `platform`. **Só `mobile`** ativa as variantes mobile das
regiões ("Regiões no mobile"); `desktop` usa a malha física completa.
Rotação no nativo: celular trava em retrato, tablet gira livre
([plataforma nativa](./plataforma-nativa.md) → `applyOrientationPolicy`).

## Malha física (desktop)

Regiões montadas por `AppStructure` fora do mobile
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

- **Scroll:** a raiz usa altura de tela + `overflow-hidden`; **o scroll principal
  fica no `MainContent`** ([main-content.tsx](../src/components/layout/main-content.tsx),
  `data-layout-scroll="content"`). Não reintroduza scroll global no documento.
  A área rolável tem **2px de respiro** embaixo, para o conteúdo não encostar no
  rodapé (barra de ações no web, navbar no mobile); telas públicas full-bleed não.
- O `MainContent` tem dois modos (`mainContentMode`): `full` (largura cheia) e
  `card` (centralizado, com margem e cartão arredondado). Rotas `minimal` usam o
  conteúdo sem margens do shell nos dois devices.
- **Topo do `MainContent` (web):** breadcrumb à esquerda; centro/direita = ações
  específicas da tela (`Button type="special"`/`"destructive"`, slot `main.start`)
  e, quando houver, ações em lote. **Notificações e perfil ficam no Header**
  (direita), não no topo do conteúdo. Tela de lista não repete título em card:
  o breadcrumb já nomeia a tela.
- **Lugar do perfil (web)** — `accountPlacement` no `SystemLayoutConfig`
  (`auto` | `header` | `menu`), escolhido no painel estrutural (seção "Perfil"),
  regra em [account-placement.ts](../src/lib/system/account-placement.ts):
  - sem menu na sidebar esquerda → perfil **sempre no header** (a seção nem
    aparece no painel);
  - header oculto → perfil no **menu** (não pode sumir);
  - senão: `menu` põe no menu; `auto`/`header`, no header.

  No mobile não se aplica (perfil = tela `/portal/profile`) e a opção não aparece.
- Cada região respeita o `SystemContext` (visibilidade, dimensões, z-index) e se
  oculta sozinha quando desabilitada (ex.: `Header` retorna `null` se
  `!headerVisible`).

## Regiões no mobile

Não há shell mobile separado: com `view === "mobile"` as **mesmas regiões** da
`AppStructure` trocam de variante. Sidebars não aparecem (`canRenderSidebars`);
a tela fica em **Header + conteúdo rolável + Footer**, respeitando as áreas seguras.

**Áreas seguras.** O layout raiz declara `viewport-fit=cover`, e no APK o app é edge-to-edge (Capacitor 8): a página
ocupa também a área da barra de status e da barra de navegação do SO. Use sempre `--app-safe-top` e
`--app-safe-bottom` ([globals.css](../src/app/globals.css)), nunca `env(safe-area-inset-*)` direto: no Android elas
leem o `--safe-area-inset-*` que o Capacitor injeta (o `env()` do WebView falha em várias versões); no navegador e no
iOS, o `env()`.

- O **header** soma `--app-safe-top` à altura e pinta essa faixa com o próprio fundo.
- O **footer** (navbar) estende o fundo por `--app-safe-bottom`.
- Sem header ou sem footer (login, rota `minimal`), a `AppStructure` reserva a área no topo ou na base, para o
  conteúdo não ficar sob a barra.
- Overlays de tela cheia (seleção, data, notificações) usam as mesmas variáveis.
- A cor dos ícones das barras acompanha esse fundo ([plataforma nativa](./plataforma-nativa.md) → "Padrão", linha
  "Barras do sistema"). Na web as barras são do navegador e o site não as pinta.

| Região | Variante mobile | Arquivo |
| --- | --- | --- |
| **Header** | Esquerda = slot `header.start` (título/voltar da tela via `ScreenLayout`), com fallback para o breadcrumb *lite*. Direita = slot `header.end` (botões `type="special"`/`"destructive"` da tela), com fallback para o `NotificationButton` quando logado. **Público sem título injetado → sem header.** | [header.tsx](../src/components/layout/header.tsx) |
| **MainContent** | Única região com scroll. A barra de topo e a barra de ações do web **não** aparecem no mobile: título vai para o header e ações para o footer. | [main-content.tsx](../src/components/layout/main-content.tsx) |
| **Footer** | É a **navbar** quando o *placement* é `footer`, mais o slot `footer.end` (segunda barra de ações). Renderiza se houver navegação **ou** ações da tela (ex.: Voltar numa página pública); senão some. | [footer.tsx](../src/components/layout/footer.tsx) |

Quem aparece é decidido antes, pelo resolver: rota `minimal` tira todo o chrome;
`mobileLayout: "mobile"` dá header + footer (ex.: página pública de leitura com
ação Voltar) — ver "Rota declara o layout". Regras da navbar e das ações:

- **Footer = navbar (identidade escura).** No mobile o footer É a navbar
  principal, então `Footer`/`Navigation` (variante footer) consomem os tokens da
  **sidebar esquerda** (`--color-left-sidebar-*`), não os do footer desktop
  (claros). Item selecionado usa `primary-strong` (marca ativa); nenhuma cor
  hardcoded — troca de brand/tema reflete automaticamente. Hover/realce derivam
  do `--color-left-sidebar-foreground` (color-mix 12%), nunca de `surface-strong`
  da página — a marca pode ter sidebar escura no tema claro.
- **Ações no footer mobile** (`Button type="action"`, slot `footer.end`): a barra
  de ações usa a identidade da navbar (`--color-left-sidebar-*`, tokens da página
  remapeados, borda do `outline` derivada do texto da barra) e os botões dividem
  a largura. Fora do mobile as ações vão para a barra do MainContent, centralizadas
  com largura mínima. Tudo em `[data-region="actions"]` ("Apresentação por device").
  - **Rodapé web em três:** saída à esquerda (`Button type="back"`, slot
    `main.back`) · centro (slot `main.footer`, componente
    [ScreenFooter](../src/components/layout/screen-footer.tsx)) · ações à direita
    (`type="action"`, slot `main.end`). O centro é para informação e controles da
    tela que não são ação — ex.: total de registros e paginação da tabela,
    sempre à vista. O rodapé existe se houver saída, ações **ou** conteúdo no
    centro; no mobile o `ScreenFooter` não renderiza.
  - **Saída é navegação, não ação** (`Button type="back"`, slot `footer.back`):
    voltar/fechar/cancelar vira **célula própria da navbar** (ícone ← + rótulo da
    tela), a um toque — nunca dentro de Ações. Ações = só operações (editar,
    salvar, exportar…). Sem navbar (página pública) ou sem célula livre,
    o `back` cai na barra de ações; no web vai para o rodapé do MainContent.
  - **Com navegação, a navbar nunca sai** (o usuário não fica preso). Tela com
    saída e/ou ações → modo contextual **`Home · Voltar · Ações · Menu`** (cada
    célula só se a tela tiver o botão). Pouco espaço: Menu e Ações nunca caem;
    cai primeiro o Home, depois o Voltar (segue no header).
  - **Ações** (botão central, indicado por contorno) abre a **segunda barra** com
    as operações, logo acima da navbar (`role="toolbar"`, `aria-controls`). **Dois
    toques de propósito**: evita toque acidental e não mistura destino
    (navegação) com comando (ação). Os dinâmicos/pins saem só enquanto durar o
    modo contextual. A segunda barra fecha ao tocar numa ação, no próprio botão,
    no Esc e ao trocar de rota. Estado em `chrome.mobileActionsOpen`
    ([SystemContext](../src/contexts/SystemContext.tsx)).
  - **Sem navegação** (página pública, ex.: Voltar numa página de leitura): saída
    e ações ocupam a barra direto.
  - Telas com ações mantêm também o **voltar no cabeçalho** (`ScreenLayout onBack`).
- **Menu + Perfil numa célula só (fim da barra).** A barra é
  `home·dinâmico·dinâmico·dinâmico·menu` (escala 100%; fonte maior derruba
  dinâmicos, depois home — o Menu nunca cai). A célula do Menu mostra o avatar
  (iniciais) e abre a gaveta como **lista agrupada única** (estilo Ajustes):
  avatar sem card (nome, e-mail, status da sessão) → **CONTA** (Dados do perfil ⌄,
  Configurações ⌄, Redefinir senha ›, Sair em
  texto vermelho; não recolhe) → **NAVEGAÇÃO** na **mesma ordem do desktop, de
  cima para baixo** (sem Profile nem Home). Todas as linhas
  seguem o estilo das de navegação (48px, ícone à esquerda, seta à direita,
  linha inteira tocável). Aberta por célula de módulo, a gaveta mostra só o
  módulo. **Com busca**, a CONTA sai, os resultados ficam colados no campo (perto
  do polegar) **sem inverter a ordem**, o rótulo vira **RESULTADOS (n)** e a
  lista rola até o fim a cada tecla. Componentes em
  [profile-panel.tsx](../src/components/profile-panel.tsx): `ProfilePanel`
  (tela `/portal/profile`, em cards), `ProfileDrawerSection`
  (gaveta). Os campos expandidos reaproveitam `ProfileDetailsList` e
  `ProfileConfigFields` com os tokens da página remapeados para os da sidebar
  esquerda (style no wrapper — `@theme inline`). O namespace lazy `profile` é
  carregado via `useLazyNamespace` (LanguageContext) — funciona fora da rota.
- **Nº de células pela escala da fonte E pela largura da barra.** Células =
  o maior entre o que a fonte garante (<120% → 5; 120% → 4; 150% → 3; 200%+ → 2)
  e o que a largura comporta (`largura / 4.5rem` — em `rem`, então já acompanha a
  fonte), com teto por aparelho: **celular até 5** (`MOBILE_NAV_LIMIT`,
  usabilidade) e **tablet/janela larga até 7** (`MOBILE_NAV_MAX`). Ex.: tablet em
  retrato 768–1023px → 7 células (5 dinâmicos) a 100%, 5 a 200%. As células
  extras viram slots dinâmicos; a ordem de queda não muda.
- **Slots dinâmicos fixáveis por usuário.** O usuário fixa páginas (folhas, em
  qualquer nível) pelo alfinete na gaveta do Menu. Cada página fixada fica num
  **slot** da barra (o alfinete mostra o selo com o número: 1 = primeiro slot
  após o home): desafixar o 1 libera o 1 — ele volta ao item padrão e os outros
  mantêm o número; o próximo pin ocupa o menor slot livre. Slot sem pin segue o
  padrão. Limite = slots dinâmicos da barra ATUAL (`mobileDynamicSlots`:
  celular 3, tablet até `MOBILE_NAV_MAX_PINS` = 5), sem limite por módulo; cheio,
  fixar mais um solta o mais antigo (FIFO) e usa o slot dele.
  Preferência local por login em [navigation-pins.ts](../src/lib/navigation-pins.ts)
  (localStorage `{ href, slot }[]`, não vai ao backend; a lista antiga de hrefs
  é migrada na leitura); resolvida na árvore já filtrada por permissão
  (`resolvePinnedSlots`, usada pela barra e pelo selo da gaveta).
  Pin de página fora do menu atual (ex.: permissão retirada) fica
  guardado, mas não ocupa posição nem conta no máximo/FIFO, que valem só para
  os visíveis. Âncoras (home/profile) não são fixáveis.
- **`Profile` é mobile-only** (`mobileOnly` em [navigation.ts](../src/lib/navigation.ts),
  `MOBILE_PINNED_HREF`). No desktop a conta vive no `AccountMenu` (dropdown
  do header): ao cair em `/portal/profile` numa tela maior — inclusive ao crescer
  o viewport estando na tela — `ProfilePage` redireciona para `/portal/home` e
  pede a abertura do menu via [account-menu-signal](../src/lib/account-menu-signal.ts)
  (canal leve, sem `useSearchParams`/Suspense). O link "Perfil" do dropdown só
  aparece no mobile.

![Guia de ergonomia mobile — zonas de alcance do polegar: da base ao topo, zona natural e confortável (ações frequentes), intermediária, de difícil alcance e crítica (ações raras, destrutivas ou irreversíveis).](/docs/ergonomia-mobile.png)

> **Ergonomia (por que a navegação vai para o footer).** Em uso com uma mão, as
> zonas de alcance do polegar priorizam a **base** da tela para ações frequentes
> (navegação, buscar, adicionar) e reservam o **topo** (difícil alcance) para
> ações críticas/destrutivas. Por isso, no mobile, a navegação primária, as ações
> e o FAB de criação ficam no rodapé, e os botões especiais/destrutivos no header
> — ver o FAB do `GenericTable` em [componentes de UI](./componentes-ui.md) e as
> zonas de ergonomia (`ScreenZones`) em "Apresentação por device".

## Composição de layout (regras)

Regras da composição Contexts → `SystemContext` → `AppStructure` → regiões.

**Princípio — incorporar, não deletar.** Em refatoração de layout, nenhum
componente ou estado é removido antes de ter um novo lar que obedeça estas
regras. Primeiro clarificar responsabilidade, depois amadurecer a resolução e só
então mexer na composição.

### Responsabilidade de cada context (regra inegociável)

**Um context = uma responsabilidade. Não se criam contexts novos para layout.**

| Context | Responsabilidade única | NÃO é dele |
| --- | --- | --- |
| `AuthContext` | usuário, sessão, permissões | layout |
| `DeviceContext` | dispositivo, viewport, `data-view` | layout |
| `NavigationContext` | itens e destinos de navegação | **decidir layout** |
| `Language`/`Theme`/`Brand`/`DeveloperMode` | idioma / tema / marca / modo dev | layout |
| **`SystemContext`** | **layout** — resolve a composição **e possui o estado de layout** (geometria/override, painéis, slots/chrome) | estado de outros domínios |

O que precisa ser puro é a **resolução**, não o provider. Estado de layout
(override do painel, painel aberto, slots montados) é legítimo e mora no
`SystemContext`; criar `PanelContext`/`ChromeContext`/`LayoutOverrideContext`
espalharia uma responsabilidade só. Teste para decidir: **"isto é layout?"** —
geometria/painel/slot = sim, fica no System; auth/device/navegação = não, é
entrada lida de fora. Nenhum context lê o `SystemContext`: ele é sempre
*downstream* (o lint bloqueia `useSystemContext` em `src/contexts`).

### Resolver puro

[resolve-system-config.ts](../src/lib/system/resolve-system-config.ts) —
`resolveSystemConfig(inputs) → ResolvedLayout`, sem React, sem estado,
testável. O `SystemProvider` só junta as entradas e chama o resolver.

- **Chamar sempre dentro de `useMemo`** com deps explícitas: com o React Compiler
  e `react-hooks/preserve-manual-memoization` como erro, uma chamada crua no
  render invalida a memoização manual do provider inteiro.
- **Precedência por fold de fontes ordenadas**, cada uma devolvendo um patch de
  presença por região:
  - **restrição é grudenta** — uma vez `false`, fonte posterior não reativa a região;
  - **ausência ≠ negação** — `undefined` = "não mexe";
  - **`main` é imutável** — fica fora do fold; o tipo (`main: true`) impede desligá-lo.

### Rota declara o layout (`RouteMeta`)

A rota declara um **token** em [route-meta.ts](../src/lib/system/route-meta.ts);
o resolver conhece o token, **nunca a lista de rotas**:

| Token | Regiões |
| --- | --- |
| `default` | todas conforme config/device |
| `minimal` | só main (sem chrome do app; main *bare*) |
| `basic` | header + main |
| `mobile` | header + main + footer |

`layout` vale para todos os tamanhos; `mobileLayout` (opcional) o substitui no
mobile. Não criar shell novo para um caso de rota: declarar o token.

### `AppStructure` única

Existe **uma** árvore de regiões (`Header · LeftSidebar · MainContent ·
RightSidebar · Footer`) ligadas/desligadas pelo layout resolvido. Não há
`MobileAppShell`/`DesktopAppShell`: a variação por device é **variante interna da
região** (e aparência por CSS — ver "Apresentação por device"), então trocar de
viewport não remonta o shell. Regra de negócio não entra em região: região não
lê rota nem sessão para decidir o que mostrar; isso vem resolvido ou entra por
slot (`ScreenLayout` é só o wrapper que injeta o título da tela no header).

- **Resolvido no `SystemContext`:** flags (`isAuthenticated`) e estado de layout
  que depende da rota (ex.: a segunda barra de ações fecha ao trocar de rota).
- **Componente de fora de `layout`:** conteúdo que precisa da sessão é um
  componente próprio que a região só hospeda — `NotificationButton` no header,
  [ApiVersion](../src/components/api-version.tsx) no footer.
- **Enforcement:** o lint proíbe `useAuth` e `usePathname` em
  `src/components/layout` (o `AuthProvider` continua importável pelo
  `AppStructure`).

## Camada estrutural (`SystemContext`)

[SystemContext.tsx](../src/contexts/SystemContext.tsx) é a **fonte única** da
geometria da malha e do estado dos painéis especiais. Tipos em
[src/contexts/system/types](../src/contexts/system/types). A baseline da
geometria vem do `system-config.json` ([tema e marca](./tema-marca-e-idioma.md)
→ "Configuração estática").

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

> Regra: **não criar novos contexts para sidebar/painel**. Todo o
> controle vive no `SystemContext`. `closePanel` só oculta; `openPanel` sempre
> volta a abrir com `view`/label corretos.

### Ações públicas

`updateConfig(patch)` · `resetConfig()` · `setSidebarEnabled(side, enabled)` ·
`setMainContentMode(value)` · `setMainContentCardMargin(value)` ·
`setSidebarDisplayMode(side, value)` · `setSidebarLayoutMode(side, value)` ·
`openPanel(id)` · `closePanel(id)`.

## Apresentação por device (fonte única)

Regra: **diferença de ESTRUTURA** por device (outro componente — `SelectOne`
nativo × overlay, tabela × cards, para onde vai um `Button type="action"`) fica
no componente, via `useDevice().view`. **Diferença só de APARÊNCIA** nunca vira
`isMobile ? "..." : "..."` no componente: sai do CSS global, num lugar só. A
fonte da view é o `data-view` ("Decisão de plataforma").

- **Título/voltar do header mobile:** `ScreenTitle` (seta ←) é o único — usado
  pelo breadcrumb e pelas telas via `ScreenLayout title/onBack`. Região
  `[data-region="header"]` no mobile remapeia os tokens da página para as cores
  do header (conteúdo injetado nunca fica "apagado"). `header` custom no
  `ScreenLayout` é a saída para fugir do padrão.
- **Variantes Tailwind** (`globals.css`): `mobile:` e `desktop:`. **Opt-in**: só
  age no elemento que usa a variante; sem ela vale o estilo da página. Ex.:
  `className="mx-auto max-w-2xl px-4 desktop:lg:max-w-4xl"` (entity-form-screen).
  Ajuste fino por tamanho dentro de uma view usa os breakpoints do Tailwind
  (`sm:`, `lg:`) — ex.: a folha do editor do input limitada com `sm:max-w-xl`.
- **Sem piscar no SSR:** o `<head>` do layout raiz roda um script inline
  (`VIEW_BOOTSTRAP_SCRIPT`, [view.ts](../src/lib/platform/view.ts)) que publica
  `data-view` antes da primeira pintura, com a MESMA media query do
  DeviceContext (`DESKTOP_VIEW_QUERY`). As variantes já valem no HTML inicial —
  ex.: a moldura do login (`AuthShell`) usa `desktop:` para o split (painel de
  marca) e mostra a logo no topo na view mobile (tablet em retrato incluso).
- **Mobile largo — variante `wide:`** = view `mobile` **e** largura ≥ 768px
  (tablet em retrato, janela estreita, celular deitado na web). Mesma ESTRUTURA
  do mobile, aproveitando a largura. Declarada depois de `mobile:` (vence quando
  as duas se aplicam). Onde age:

  | Ponto | Mobile | `wide:` |
  |---|---|---|
  | Lista de cards (`GenericTable`) | 1 coluna | 2 colunas |
  | `DynamicForm columns="adaptive"` | 1 coluna | 2 colunas |
  | Formulário de entidade | `max-w-2xl` | `max-w-4xl` |
  | Respiro do `MainContent` | `px-2 py-3` | `px-4 py-4` |
  | `FilterModal` | sheet de largura total | centralizado `max-w-lg` |
  | Barra de ações (`[data-region="actions"]`) | botões dividem a largura | botões até 16rem, centralizados |

  Os atalhos do footer também crescem com a largura (até 7) — ver "Nº de
  células" acima.
- **Regiões do shell** (`[data-region]` em `globals.css`, regras sem layer para
  dimensionar os filhos por cima das utilities):
  - `actions` — barra dos `Button type="action"`: web centraliza com `min-width`;
    mobile na identidade da navbar, botões `flex: 1`. `hidden` esconde.
  - `drawer` — gaveta do Menu: tokens da página remapeados para a sidebar.
  - `sidebar-panel` — painéis especiais das sidebars (`SidebarPanelFrame`: painel
    do sistema, modo desenvolvedor…): tokens da página remapeados para as cores da
    área do lado (`--color-sidebar-*` → left/right), para o conteúdo seguir o
    esquema da área e não o tema da página.
  Um componente dentro da região não precisa saber o device (ex.: o formulário
  de senha passa sempre `w-full`; a barra o transforma em `auto`/`flex-1`).
- **Zonas de ergonomia (mobile) — divisão invisível e SUGESTIVA:**
  [ScreenZones](../src/components/layout/screen-zones.tsx) (ou `ScreenLayout`
  com `top`/`reach`) separa a tela em zona de **LEITURA** (`top`: título,
  subtítulo, resumos, avisos — difícil alcance) e zona de **ALCANCE** (`children`:
  listas/cards, formulários, ações — polegar). Não é linha fixa: a zona de
  alcance só assenta junto à navegação quando **sobra** espaço
  (`mobile:mt-auto` numa coluna de altura mínima cheia); conteúdo maior que a
  tela segue o fluxo e rola, nada é cortado nem reservado. No desktop as zonas
  ficam em sequência. A altura chega pela cadeia flex do shell: scroll do
  MainContent → contêiner da rota (AppStructure) → PortalGate → zonas.
  **Opt-in:** leitura longa (termo, detalhes) não usa. Usa: lista de entidades.

  | Zona | Conteúdo | Posição com pouco conteúdo | Com conteúdo longo |
  |---|---|---|---|
  | Leitura (`top`) | orientação, avisos | topo | topo (rola junto) |
  | Alcance (`children`) | cards, campos, ações | assenta no fim (perto da navegação) | fluxo normal; lista abre no fim (`GenericTable`) |
- **Fugir do padrão:** uma tela que precise de outra aparência simplesmente não
  usa a variante/região e aplica o próprio estilo.
- **Três eixos, três fontes** (não misturar):

  | Eixo | Fonte | Exemplos |
  |---|---|---|
  | Aparência | variantes `mobile:`/`desktop:` e `[data-region]` (CSS) | espaçamento de tela, colunas do formulário, filtro como folha × diálogo |
  | Estrutura (layout) | `useDevice().view` | tabela × cards, select nativo × tela de seleção, notificações, link de perfil |
  | Comportamento de toque | `useDevice().isTouch` (celular **e** tablet) | editor do input acima do teclado virtual (`FormFieldInput touch`) |

  Celular e tablet têm sempre comportamento de toque, qualquer que seja a view.

## Criar/ajustar estrutura (passo a passo)

1. **Nova região visível?** Não crie layout paralelo — ajuste
   [app-structure.tsx](../src/components/layout/app-structure.tsx) e os componentes
   de [src/components/layout](../src/components/layout).
2. **Mudar dimensões/visibilidade em runtime:** use `updateConfig` /
   `setSidebarEnabled` / `setMainContentMode` do `SystemContext` — não hardcode.
3. **Novo painel lateral:** adicione um `SidebarItem` em `LeftSidebar`/
   `RightSidebar` e abra com `openPanel(id)`. Mantenha o estado no `SystemContext`.
4. **Novo destino de navegação:** registre em
   [navigation.ts](../src/lib/navigation.ts) e crie a `page.tsx` da rota.

> O que **não** misturar na camada `layout/`: autenticação, regra de negócio,
> definição concreta de itens de menu. Estrutura física ≠ conteúdo/comportamento.

## Onde está no código

| Peça | Onde |
| --- | --- |
| Orquestrador | [src/components/layout/app-structure.tsx](../src/components/layout/app-structure.tsx) |
| Providers globais | [src/contexts/](../src/contexts/) |
| Decisão de plataforma | [src/contexts/DeviceContext.tsx](../src/contexts/DeviceContext.tsx) |
| Camada estrutural | [src/contexts/SystemContext.tsx](../src/contexts/SystemContext.tsx) |
| Resolver puro do layout | [src/lib/system/resolve-system-config.ts](../src/lib/system/resolve-system-config.ts) |
| Tipos do SystemContext | [src/contexts/system/types/](../src/contexts/system/types/) |
| Regiões da malha | [src/components/layout/](../src/components/layout/) |
| Placement do perfil | [src/lib/system/account-placement.ts](../src/lib/system/account-placement.ts) |

Voltar ao [índice](./README.md).
