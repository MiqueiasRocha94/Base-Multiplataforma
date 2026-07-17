# Contexto de IA do Projeto

## 1. Identidade do projeto

Este repositorio e uma base multiplataforma orientada a produto, feita para servir como fundacao de aplicacoes que precisam operar:

- na web
- no mobile encapsulado
- com uma unica base de codigo
- com shell adaptativo
- com internacionalizacao
- com tema dinamico
- com arquitetura preparada para crescer

O projeto nao deve ser interpretado como um site isolado. Ele deve ser entendido como uma base de plataforma.

O nome do repositorio ja indica o objetivo: ser uma base reutilizavel para produtos digitais com experiencia web-first, mas com caminho real para mobile via Capacitor.

## 2. Stack principal

O estado atual do projeto usa:

- `Next.js 16.2.6`
- `React 19.2.4`
- `TypeScript 5`
- `Tailwind CSS 4`
- `i18next`
- `Capacitor 8`
- `zod`

Dependencias de plataforma ja presentes:

- `@capacitor/android`
- `@capacitor/ios`
- `@capacitor/camera`
- `@capacitor/filesystem`
- `@capacitor/local-notifications`
- `@capacitor/push-notifications`
- `@aparajita/capacitor-biometric-auth`
- `@capawesome/capacitor-file-picker`

Isso significa que a base ja nasce com preocupacao pratica de produto, nao apenas layout:

- autenticacao
- preferencia de usuario
- armazenamento local
- arquivos
- camera
- notificacoes
- biometria

## 3. Objetivo central da base

O objetivo principal do projeto e reduzir o custo de iniciar e evoluir um produto digital que precisa de:

- area publica
- area autenticada
- experiencia coerente entre desktop e mobile
- layout sistemico
- design system inicial
- providers globais previsiveis
- build web
- build mobile

Em termos de IA, isso significa que novas implementacoes devem fortalecer a base como plataforma. Nao devem fragmentar a arquitetura com solucoes locais, pontuais ou duplicadas.

## 4. Visao de produto

O produto-base foi desenhado para suportar cenarios como:

- portal institucional com area logada
- dashboard administrativo
- app operacional interno
- produto SaaS com onboarding publico e fluxo autenticado
- plataforma com distribuicao web e app nativo

A base precisa manter dois dominios de experiencia:

1. Dominio publico
   Focado em descoberta, apresentacao, conversao, login, cadastro e comunicacao de valor.

2. Dominio autenticado
   Focado em produtividade, continuidade, operacao, preferencias e navegacao recorrente.

Esses dois dominios nao devem ser confundidos, mas tambem nao devem divergir tanto a ponto de parecerem produtos diferentes.

## 5. Estrutura atual de pastas

Estrutura principal em `src/` (organizacao **por tipo** — cada pasta guarda um tipo de artefato, sem misturar):

```text
src/
  app/          rotas + view (App Router)
  components/   componentes reutilizaveis (ui/ + shell/nav)
  contexts/     providers globais de runtime
  core/         engine de modulos (contracts, entity-runtime, module-engine)
  services/     comunicacao com API real
  dev-backend/  backend de desenvolvimento (mock que implementa o mesmo contrato)
  hooks/        hooks compartilhados
  lib/          utilitarios de baixo nivel (auth, env, i18n, platform, preferences, theme, mock-*)
  types/        tipos globais puros
  styles/       tokens e estilo global
```

Leitura conceitual:

- `src/app`
  App Router do Next.js. Rotas, layouts e a **view** de cada tela. A logica de tela (screen) vive aqui: inline no `page.tsx`, ou em uma pasta privada `_screens/` quando compartilhada por rotas irmas (ex.: `portal/users/_screens/user-form-screen.tsx`). Nao existe mais `src/domain`.

- `src/app/(Public)`
  Rotas publicas. Exemplo: home, login, register, start.

- `src/app/(Portal)`
  Rotas autenticadas. Exemplo: portal, profile, users, analytics.

- `src/components`
  Componentes de composicao, navegacao, shell, blocos de pagina. Arquivos em **kebab-case** (`brand-button.tsx`).

- `src/components/ui`
  Nucleo do design system base (button, card, input, generic-table, dynamic-form, chart...).

- `src/components/layout`
  Camada estrutural da malha (`app-structure`, `header`, `left-sidebar`, `main-content`, `right-sidebar`, `footer`, `mobile-app-shell`, `screen-layout`). Separa estrutura fisica de conteudo/comportamento.

- `src/components/system`
  Componentes ligados ao painel estrutural do `SystemContext`.

- `src/contexts`
  Providers globais e contextos de runtime (arquivos em PascalCase por convencao).

- `src/core`
  Engine orientado a contrato: `contracts` (tipos canonicos), `entity-runtime` (`useEntity`), `module-engine` (funcoes puras schema->UI). Reusado por qualquer entidade CRUD, sem service especifico por entidade.

- `src/services`
  Comunicacao com a API real.

- `src/dev-backend`
  Implementa o mesmo contrato da API com dados locais (mock). `getEntityDataProvider` escolhe dev-backend vs API por env/flag.

- `src/hooks`
  Hooks auxiliares compartilhados.

- `src/lib`
  Funcoes, adaptadores, utilitarios, env, i18n, navegacao, preferencias, plataforma (Capacitor), mocks e integracoes de baixo nivel.

- `src/types`
  Tipos globais puros. Valores de runtime ficam onde sao consumidos, nao aqui.

- `src/styles`
  Tokens e definicoes globais de estilo.

## 6. Roteamento e organizacao por dominio

O projeto usa App Router.

Principio importante para IA:

- rotas publicas e autenticadas devem continuar separadas por intencao
- layout global deve permanecer centralizado
- shell nao deve ser redefinido por pagina sem necessidade forte

Leitura pratica:

- `src/app/layout.tsx`
  Layout raiz do App Router. Envolve tudo em `TooltipProvider` e delega a composicao global para `AppStructure`.

- `src/components/layout/app-structure.tsx`
  E o verdadeiro orquestrador de runtime da UI global: monta os providers e escolhe o shell desktop/mobile.

## 7. AppStructure e ordem dos providers

Hoje o `AppStructure` monta os providers nesta ordem:

1. `ThemeProvider`
2. `LanguageProvider`
3. `AuthProvider`
4. `DeviceProvider`
5. `DeveloperModeProvider`
6. `SystemProvider`
7. `NavigationProvider`
8. `ScreenChromeProvider`

Depois disso, `AppStructureContent` renderiza o shell (desktop ou mobile) e os overlays:

- shell desktop (`Header`, `LeftSidebar`, `MainContent`, `RightSidebar`, `Footer`) ou `MobileAppShell`
- `SystemContextPanel`
- `DeveloperModePainel`

Implicacoes:

- tema esta na camada mais externa de UX
- idioma esta acima de autenticacao
- dispositivo influencia shell, nao apenas CSS
- `SystemContext` hoje controla a estrutura e tambem o estado de sidebars do sistema

## 8. Shell adaptativo atual

O shell atual se divide em:

- shell desktop (`Header` + `LeftSidebar` + `MainContent` + `RightSidebar` + `Footer`)
- shell mobile (`MobileAppShell`)

A escolha e feita por `DeviceContext`, dentro de `AppStructureContent`.

Regra atual:

- `view === "mobile"` renderiza `MobileAppShell`
- caso contrario renderiza a malha desktop

Isso e uma decisao arquitetural, nao apenas visual. A IA deve respeitar esse principio.

## 9. Estrutura fisica da tela

O projeto passou a adotar uma modelagem mais explicita de estrutura.

Hoje a malha principal e orquestrada por `AppStructure`.

Regioes estruturais:

- `Header`
- `LeftSidebar`
- `MainContent`
- `RightSidebar`
- `Footer`

Essas regioes nao sao equivalentes aos componentes de navegacao concretos do produto.

Muito importante:

- os componentes de `src/components/layout/` (`header`, `footer`, `left-sidebar`...) sao a **estrutura fisica** da malha
- a **navegacao concreta** vive em componentes proprios: `src/components/navigation.tsx`, `src/components/sidebar.tsx`, `src/components/sidebar-item.tsx`
- estrutura (`layout/`) e navegacao (conteudo montado dentro das regioes) nao devem se misturar

## 10. AppStructure

Arquivo-chave:

- `src/components/layout/app-structure.tsx`

Papel atual:

- montar a malha global em altura cheia
- impedir scroll global do documento
- manter `Header`, `Body` e `Footer` na vertical
- manter `LeftSidebar`, `MainContent` e `RightSidebar` no corpo da tela

Comportamento estrutural atual:

- raiz com `h-screen`
- `overflow-hidden` na malha
- `MainContent` com scroll proprio
- `RightSidebar` em overlay absoluto na direita

Esse detalhe e importante:

- `RightSidebar` nao deve empurrar horizontalmente o `MainContent`
- por isso ela participa da experiencia mais como painel lateral sobreposto do que como coluna tradicional

## 11. Camada 1 - Estrutura

O projeto adotou a diretriz de tratar a estrutura fisica da aplicacao como uma camada propria.

Responsabilidade da Camada 1:

- definir Header
- definir LeftSidebar
- definir MainContent
- definir RightSidebar
- definir Footer
- definir limites estruturais entre essas regioes
- expor pontos de montagem para camadas superiores

Nao pertence a essa camada:

- autenticacao
- navegacao
- permissao
- regra de negocio
- contexto de dispositivo
- comportamento de botao
- titulos contextuais
- menus concretos

## 12. Camada 2 - Configuracao global da estrutura

Essa camada hoje e implementada por:

- `src/contexts/SystemContext.tsx`

Ele e a fonte unica de configuracao estrutural e, no estado atual do projeto, tambem do controle unificado das sidebars do sistema.

### 12.1. Estado estrutural base

Campos atuais de configuracao:

- `headerVisible`
- `leftSidebarVisible`
- `rightSidebarVisible`
- `footerVisible`
- `headerHeight`
- `footerHeight`
- `leftSidebarWidth`
- `rightSidebarWidth`
- `mainContentMode`
- `zIndexHeader`
- `zIndexFooter`

### 12.2. Estado das sidebars

O mesmo `SystemContext` tambem controla:

- `leftSidebar`
- `rightSidebar`

Estrutura de cada sidebar:

- `isVisible`
- `activeView`
- `activeItemId`
- `activeLabel`

### 12.3. Acoes principais

Acoes publicas atuais:

- `updateConfig(patch)`
- `resetConfig()`
- `openSidebar(side, payload)`
- `closeSidebar(side)`

Regra importante consolidada no projeto:

- nao criar novos contexts para sidebar
- o controle de sidebar deve permanecer no `SystemContext`
- `openSidebar()` deve sempre funcionar
- `closeSidebar()` apenas oculta, sem destruir a capacidade de reabrir

### 12.4. Regra atual de reabertura

O projeto foi ajustado para que:

- `openSidebar("right", payload)` sempre volte a marcar `rightSidebarVisible = true`
- `closeSidebar("right")` sempre marque `rightSidebarVisible = false`
- o mesmo vale para a esquerda

Isso reduz risco de estado inconsistente entre:

- visibilidade estrutural
- view ativa
- conteudo atual da sidebar

## 13. SystemContextPanel

Arquivos principais:

- `src/components/system/system-context-panel.tsx`
- `src/components/layout/app-structure.tsx`

Papel do painel:

- expor a configuracao estrutural do `SystemContext`
- permitir testar a malha em runtime
- abrir na `RightSidebar` no desktop
- abrir em modal no mobile

Comportamentos relevantes:

- no desktop, quando fechado, ele pode ser reaberto por um botao lateral fixo
- o botao de reabertura usa a ultima `activeLabel`
- no mobile, ele usa launcher fixo superior
- o painel nao deve ser outro controlador de sidebar; ele e apenas consumidor do `SystemContext`

### 13.1. Campos do painel

Hoje o painel expoe:

- visibilidade de header
- visibilidade de left sidebar
- visibilidade de right sidebar
- visibilidade de footer
- altura de header
- altura de footer
- largura de left sidebar
- largura de right sidebar
- z-index de header
- z-index de footer
- modo do `MainContent`

### 13.2. Papel para IA

O painel serve como ferramenta de desenvolvimento e validacao estrutural.

Ele nao deve virar:

- centro de logica de produto
- menu principal da aplicacao
- mecanismo permanente de navegacao do usuario final

## 14. Camada 3 - Contextos globais de runtime

Contexts atuais encontrados no projeto:

- `AuthContext`
- `DeviceContext`
- `DeveloperModeContext`
- `LanguageContext`
- `ThemeProvider` / contexto interno de tema
- `SystemContext`
- `NavigationContext`
- `ScreenChromeContext`

Cada contexto e responsavel por um **tipo distinto** de estado; nao devem ser fundidos. `SystemContext` (geometria/sidebars), `NavigationContext` (modelo de navegacao) e `ScreenChromeContext` (slots de header/footer por pagina) tocam o shell, mas em eixos diferentes.

Papel conceitual de cada um:

### AuthContext

- controla sessao
- afeta navegacao e shell
- influencia o que aparece no desktop e mobile

### DeviceContext

- define `shellMode`
- escolhe experiencia desktop ou mobile
- atua em nivel arquitetural

### LanguageContext

- fornece `dictionary`
- suporta internacionalizacao da interface

### ThemeProvider

- controla tema (`light`, `dark`, `system`)
- controla preset tipografico
- grava atributos em `html`

### NavigationContext

- deriva itens/modos/placement de navegacao (a partir de `Auth` + `Device` + `lib/navigation`)
- controla a navegacao contextual do footer mobile

### ScreenChromeContext

- expoe slots (portais) para uma pagina injetar conteudo no header/footer via `ScreenLayout`

### DeveloperModeContext

- habilita recursos de desenvolvimento e inspecao

### SystemContext

- controla geometria estrutural
- controla presenca estrutural
- controla sidebars estruturais do sistema

## 15. Tema, tokens e design system

O tema do projeto nao depende apenas de classes fixas.

A arquitetura de tema hoje funciona assim:

1. `ThemeProvider` define `data-theme` e `data-font` no `html`
2. `src/styles/tokens.css` define as CSS variables semanticas
3. `globals.css` e `Tailwind` consomem essas variaveis
4. componentes devem usar tokens semanticos e nao cores fixas

### 15.1. Tokens principais

Tokens centrais:

- `--color-primary`
- `--color-primary-strong`
- `--color-secondary`
- `--color-background`
- `--color-surface`
- `--color-surface-strong`
- `--color-text`
- `--color-text-muted`
- `--color-border`
- `--color-success`
- `--color-error`
- `--shadow-soft`
- `--radius-xl`
- `--radius-2xl`

### 15.2. Direcao cromatica atual

No light theme:

- fundo claro quente
- superficies creme claras
- texto escuro
- verde profundo como primaria
- amarelo quente como secundaria

No dark theme:

- fundo verde-preto profundo
- superficies verde-escuro
- texto claro
- primaria verde claro
- secundaria amarela clara

### 15.3. Regra importante para IA

Evitar:

- `bg-white`
- `text-white` sem necessidade semantica
- hardcode de cor em componentes genericos

Priorizar:

- `bg-background`
- `bg-surface`
- `text-text`
- `text-text-muted`
- `border-border`
- tokens semanticos equivalentes

## 16. Presets de fonte

O tema tambem controla preset de fonte por `data-font`.

Modos observados:

- padrao
- `reading`
- `compact`

Efeitos:

- troca de familia tipografica
- ajuste de `font-scale`

Isso significa que espacamentos e componentes devem tolerar pequenas variacoes tipograficas.

## 17. Componentes-base de UI

Componentes centrais em `src/components/ui`:

- `button.tsx`
- `card.tsx`
- `input.tsx`
- `label.tsx`
- `generic-table.tsx`

### Button

Ja trabalha com variantes semanticas como:

- default
- outline
- secondary
- ghost
- danger

Deve continuar sendo o ponto central para botoes reutilizaveis do sistema.

### Card

E um dos blocos mais importantes da base.

Ele organiza:

- secoes
- paineis
- formularios
- paines de conteudo
- agrupamentos visuais

### Input

Base de formularios.

Deve usar tokens do sistema, especialmente em dark mode.

### GenericTable

Mostra uma diretriz importante da base:

- desktop pode usar tabela
- mobile pode adaptar para cards

Ou seja, a base reconhece que a mesma representacao de dados pode mudar entre plataformas.

## 18. Shell desktop

No desktop, o shell atual (`AppStructureContent`) usa:

- `Header`
- `LeftSidebar` para a navegacao lateral
- `MainContent`
- `RightSidebar` para painel estrutural do sistema
- `Footer`

Detalhes relevantes:

- `Header` e o chrome de topo do desktop; a navegacao concreta vem de `Navigation` / `Sidebar`
- `LeftSidebar` hospeda a navegacao lateral de web
- o `SystemContextPanel` pode ocupar a sidebar direita
- `MainContent` organiza a respiracao e o scroll do conteudo principal

## 19. Shell mobile

No mobile, o shell atual usa `MobileAppShell`, que compoe:

- chrome superior mobile (quando habilitado via `ScreenChromeContext`)
- conteudo da tela
- navegacao inferior autenticada

Comportamento atual:

- o chrome mobile so aparece quando habilitado
- o painel do sistema abre em modal, nao em sidebar fixa

## 20. Navegacao

A navegacao concreta continua separada da estrutura.

Arquivos e componentes envolvidos:

- `src/lib/navigation.ts`
- `Header`
- `Navigation`
- `Sidebar` / `SidebarItem`

Conceito importante:

- estrutura global da tela nao deve depender semanticamente da navegacao
- navegacao e conteudo montado dentro das regioes

Ao evoluir a navegacao, a IA deve evitar misturar:

- malha estrutural
- regra de autenticacao
- definicao de itens de menu

## 21. Scroll

Decisao estrutural atual do projeto:

- `html` e `body` ficam sem scroll principal
- a malha global usa `h-screen`
- o scroll principal fica no `MainContent`

Implicacoes:

- header e footer permanecem no shell
- overlays e sidebars podem coexistir sem baguncar o documento
- componentes muito altos devem considerar o scroll local da regiao

Essa e uma decisao importante para IA. Nao deve ser alterada casualmente.

## 22. Sidebars esquerda e direita

O sistema hoje foi evoluido para tratar sidebars como entidades independentes.

Cada uma possui:

- estado de visibilidade
- view ativa
- item ativo
- label ativa

Conceito esperado:

- a esquerda pode servir navegacao, lista, arvore ou conteudo contextual
- a direita pode servir ferramentas, painel do sistema, chat, detalhes ou inspector

Regra fundamental:

- o estado da sidebar deve sobreviver ao fechamento
- fechar nao deve quebrar reabertura
- marcador contextual deve conseguir reabrir com view/item corretos

## 23. Marcadores contextuais

O projeto passou a assumir um conceito de marcador textual/contextual para sidebars.

Ideia:

- elementos do conteudo principal podem abrir sidebars diretamente
- isso deve acontecer chamando `openSidebar(side, payload)`

Payload esperado:

- `view`
- `label`
- `itemId` opcional

Regra para IA:

- nao introduzir novo contexto so para isso
- nao depender de estado local do painel para reabertura
- usar o `SystemContext` como fluxo unico

## 24. Conteudo publico atual

A home publica atual funciona como showcase enxuto da base.

Ela nao tenta ser landing page completa.

Seu papel hoje e:

- apresentar a existencia da base
- mostrar componentes
- funcionar como referencia visual
- evitar poluicao de conteudo

Essa decisao ajuda a manter foco da base como fundacao de produto.

## 25. Conteudo portal atual

A area de portal serve como laboratorio de experiencia autenticada.

Ela deve ser lida como ambiente para:

- componentes operacionais
- sessoes internas
- perfil
- tabelas
- blocos de configuracao
- showcases internos

## 26. Internacionalizacao

O projeto usa `i18next`, `react-i18next`, backend HTTP e language detector.

Implicacoes:

- texto hardcoded deve ser evitado
- sempre que possivel, novos textos devem entrar no dicionario
- componentes compartilhados devem preferir chave de traducao ou texto vindo de contexto

`LanguageContext` hoje expoe `dictionary`, o que ja simplifica o consumo na UI.

## 27. Ambientes e envs

Arquivos de ambiente adotados:

- `.env`
- `.env.homolog`
- `.env.production`

Leitura publica atual em:

- `src/lib/env/public.ts`

Campos publicos expostos:

- `NEXT_PUBLIC_API_URL`
- `NEXT_PUBLIC_APP_NAME`
- `NEXT_PUBLIC_APP_ENV`
- `NEXT_PUBLIC_SYSTEM_PANEL_ENABLED`

Regra tecnica importante:

- em Next, env publico no client deve ser lido por referencia estatica
- usar `process.env.NEXT_PUBLIC_X` diretamente
- evitar `process.env[name]` em client code

## 28. Scripts de ambiente e build

Scripts relevantes no `package.json`:

- `npm run dev`
- `npm run dev:homolog`
- `npm run build`
- `npm run build:development`
- `npm run build:homolog`
- `npm run build:production`
- `npm run build:mobile`
- `npm run mobile:build:*`
- `npm run apk:debug`
- `npm run apk:homolog`
- `npm run apk:production`
- `npm run release:android`

Scripts auxiliares usados:

- `scripts/run-next-with-env.mjs`
- `scripts/build-target.mjs`
- `scripts/app-env.mjs`
- `scripts/validate-build-env.mjs`
- `scripts/android-build.mjs`

Conceito:

- web e mobile compartilham pipeline base
- o ambiente e escolhido por script
- a base ja considera build android/release

## 29. Developer Mode

Existe um `DeveloperModeOverlay` e um `DeveloperModeContext`.

Papel conceitual:

- expor informacoes tecnicas
- ajudar depuracao
- inspecionar estados e runtime

Regra:

- nao misturar componentes de developer mode com UX principal do usuario final
- manter debug tools desacopladas da jornada primaria

## 30. MainContent (respiracao do conteudo)

`MainContent` (`src/components/layout/main-content.tsx`) e importante porque controla:

- largura util
- padding
- respiracao do conteudo
- scroll principal da regiao (o `html`/`body` nao rolam)

Nao e apenas um wrapper cosmetico. E parte da consistencia espacial do produto e da decisao de scroll local.

## 31. Responsabilidades atuais dos componentes principais

### `src/components/layout/header.tsx`

- chrome superior desktop
- identidade da aplicacao
- acoes globais de conta, tema e idioma

### `src/components/layout/footer.tsx`

- rodape institucional desktop

### `src/components/layout/mobile-app-shell.tsx`

- shell mobile: chrome superior, conteudo e navegacao inferior autenticada

### `src/components/navigation.tsx` e `src/components/sidebar.tsx`

- navegacao concreta do produto, montada dentro das regioes estruturais
- `sidebar-item.tsx` e o item individual da sidebar

### `src/components/system/system-context-panel.tsx`

- ferramenta estrutural de runtime
- leitura e edicao de `SystemContext`

## 32. Regras de arquitetura para IA

Ao trabalhar neste projeto, a IA deve assumir as seguintes regras:

### 32.1. Nao duplicar contexts

Se uma responsabilidade ja pertence a um contexto existente, expandir esse contexto com cuidado antes de criar outro.

Exemplo concreto:

- sidebars do sistema devem continuar no `SystemContext`

### 32.2. Nao misturar estrutura com conteudo

Evitar colocar logica de navegacao dentro da camada `components/layout/`.

### 32.3. Nao quebrar shell desktop/mobile

Mudancas em desktop e mobile devem preservar:

- navegacao atual
- autenticacao atual
- UX especifica atual

### 32.4. Nao introduzir cores fixas sem motivo forte

Tema e tokens devem continuar sendo a fonte principal de cor.

### 32.5. Nao rebaixar tudo a CSS responsivo generico

O projeto tem shell por plataforma. Nem toda adaptacao deve ser resolvida apenas com breakpoint.

### 32.6. Priorizar reutilizacao

Antes de criar:

- novo wrapper
- novo contexto
- novo painel
- nova variante de componente

verificar se:

- `ui/`
- `contexts/`
- `lib/`
- `core/`
- `components/layout/`

ja oferecem ponto de extensao suficiente.

## 33. Regras de UX para IA

### Clareza

Toda tela deve deixar claro:

- onde o usuario esta
- o que ele pode fazer
- qual a acao principal

### Continuidade

Desktop e mobile podem mudar de forma, mas nao devem parecer produtos desconectados.

### Confianca

A interface deve parecer:

- estavel
- consistente
- segura
- legivel

### Hierarquia

Prioridade visual deve ser clara entre:

- titulo
- descricao
- bloco principal
- acao primaria
- acoes secundarias

### Densidade controlada

Evitar:

- excesso de texto auxiliar
- cards sem funcao
- ruido visual
- multiplas camadas de destaque simultaneas

## 34. O que a IA deve preservar

Ao modificar o projeto, preservar sempre que possivel:

- a divisao publico/portal
- o shell adaptativo atual
- o `SystemContext` como centro estrutural
- os providers globais existentes
- os tokens semanticos
- a compatibilidade web/mobile
- o fluxo de build existente

## 35. O que a IA deve evitar

Evitar introduzir:

- estado global duplicado
- `context` novo sem justificativa forte
- layout paralelo fora de `AppStructure`
- cor fixa para resolver tema
- componente monolitico que mistura shell, regra de negocio e UI
- alterar comportamento de autenticacao sem necessidade explicita
- alterar navegacao sem pedido explicito

## 36. Leitura executiva rapida para agentes

Se um agente de IA entrar neste repositorio e precisar decidir rapido, deve assumir:

- isto e uma base de plataforma, nao um site isolado
- Next 16 e React 19 exigem cuidado com convencoes atuais
- `AppStructure` (`components/layout/app-structure.tsx`) e o centro de orquestracao global de UI e a malha fisica
- organizacao **por tipo**: view em `app/`, engine de modulos em `core/`, mock dev em `dev-backend/`, tipos em `types/`
- `SystemContext` controla geometria estrutural e sidebars do sistema
- desktop e mobile tem shell proprio
- `ThemeProvider` + `tokens.css` formam o sistema de tema
- env publico deve ser lido estaticamente
- sidebars devem reabrir sempre via `openSidebar`
- `MainContent` e a regiao de scroll principal
- componentes de `ui/` devem ser a primeira fonte de reutilizacao

## 37. Resumo final

Este projeto quer ser uma fundacao robusta para produtos digitais multiplataforma com:

- estrutura clara
- shell adaptativo real
- tema consistente
- contexto global previsivel
- design system inicial funcional
- abertura para web e mobile
- espaco para evolucao sem perder coerencia

Para IA, a regra central e simples:

fortalecer a base, nao fragmenta-la.
