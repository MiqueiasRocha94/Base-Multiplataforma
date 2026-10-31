# Estrutura do projeto

A organização separa **rotas** (App Router, por domínio de experiência) de
**infraestrutura reutilizável** (componentes, contexts e libs). Cada pasta de
primeiro nível em `src/` é um **módulo arquitetural** com fronteira própria —
**organização por tipo**: cada pasta agrupa um tipo de artefato e é dona dessa
responsabilidade. A navegação do Next.js não é recriada por outro framework
dentro de `src/app`.

## Pastas

Resumo das pastas principais; a árvore completa, arquivo a arquivo, é gerada no
[mapa de src](./mapa-src.md).

```text
src/
  app/                     rotas finas (page.tsx → tela em components/), layouts e boundaries
    layout.tsx             root layout mínimo → renderiza AppStructure
    page.tsx               bootstrap/start (redireciona; conta regressiva no mobile)
    (Public)/              grupo de rotas públicas (não altera URL)
      login/page.tsx       login (máquina de modos: form/biometria/recuperar)
      start/page.tsx       transição de abertura do APK (logo no centro → posição no login)
    (Portal)/              grupo de rotas autenticadas
      portal/
        layout.tsx         PortalGate (sessão, fluxo de acesso, permissão)
        page.tsx           entrada do portal
        home/page.tsx      home autenticada (demo)
        alterar-senha-expirada/, redefinir-senha/  transições de senha
        persons/           módulo Pessoas — page.tsx + new/ + detail/ (wrappers finos
                           → src/components/entity)
        profile/page.tsx   perfil (mobile-only; no web é o dropdown account-menu)
        analytics/page.tsx demo de gráficos
        demo400/ demo500/  demos de StatusScreen
        audit/page.tsx     placeholder de módulo (ModulePlaceholder)
    [...notFound]/page.tsx catch-all 404
    api/dev/app-update/    canal de atualização do APK debug (só `npm run dev`; fora dos builds)
  app-update/              ★ atualização remota do app, ausente dos artefatos gerados sem ela
    ui/ runtime/           entradas (`@/app-update/ui` com React, `@/app-update/runtime` sem)
    locales/               textos do aviso de atualização
  components/              módulo de UI, telas, shell visual e navegação concreta
    ui/                    ★ design system base (button, card, input, generic-table, select-one…)
    layout/                ★ malha física (AppStructure, Header, *Sidebar, MainContent, Footer, ScreenLayout)
    entity/                ★ base de entidade (entity-list-screen, entity-form-screen)
    login/                 telas do login (auth-shell, login-form, biometric-prompt, recover-password-form,
                           start-transition + login-intro: abertura do APK)
    home/                  home de demonstração
    portal/                module-hub e module-placeholder (página de módulo)
    navigation/            navegação concreta
    analytics/             charts da demo de analytics
    *.tsx                  átomos compartilhados (loading, tooltip, logo, navigation, sidebar,
                           account-menu, portal-gate, status-screen, marker, back-button…)
  config/                  módulo de configuração declarativa (brand, system defaults, páginas do app)
  contexts/                ★ módulo de providers globais de runtime (system/types/ = tipos do SystemContext)
  core/                    ★ módulo de entity-runtime + module-engine + contracts
  dev-backend/             ★ módulo de "falso backend": contratos + seeds + brand info
  dev-tools/               ★ recursos de dev, ausentes dos artefatos de homolog/produção
    ui/ runtime/           entradas (`@/dev-tools/ui` com React, `@/dev-tools/runtime` sem)
    locales/               textos dos painéis e do acesso rápido (fora de public/locales)
  hooks/                   módulo de hooks compartilhados
  lib/
    actions/               catálogo de ações por entidade + RBAC de exibição
    auth/                  sessão, canal/DPoP, permissões e gate de acesso
    i18n/                  dicionários e settings
    platform/              ★ wrappers de Capacitor (biometria, câmera, arquivos, notificações, storage)
    system/                ★ resolveSystemConfig (resolver puro) + route-meta (RouteMeta)
    navigation.ts          árvore de navegação + regras de placement
    utils.ts               cn() e utilitários
  services/                módulo de serviços reais (acesso, entidades, brand, analytics; api/ = cliente da API)
  styles/tokens.css        módulo de estilos globais: CSS variables semânticas
  types/                   módulo de tipos globais puros
scripts/                   pipeline de env e build (web/mobile/APK)
```

## Módulos arquiteturais de `src`

| Módulo | Dono da responsabilidade | Não deve conter |
| --- | --- | --- |
| `app` | rotas, layouts especiais, boundaries e wiring do App Router | tela reutilizável, API client, regra de navegação |
| `components` | UI, telas reutilizáveis, shell visual e navegação concreta | estado global, API real, engines de contrato |
| `app-update` | atualização remota do app (pacote web assinado) — opcional, só no app gerado com `APP_UPDATE_ENABLED=true`; fora de `src/app-update` só dentro de regiões `@app-update` ([ambiente e build](./ambiente-e-build.md) → "Atualização remota do app") | regra de produto; `runtime/` não importa components, contexts nem services |
| `config` | configuração declarativa de produto, marca e sistema | helpers complexos, componentes, providers |
| `contexts` | providers globais e estado de runtime | UI apresentacional, API client direto |
| `core` | contratos, entity-runtime e engines puras | componentes React, chamadas HTTP concretas |
| `dev-backend` | mock/dev provider compatível com a API — só em dev (fora dos artefatos) | cliente de produção, UI |
| `dev-tools` | recursos só de desenvolvimento (painéis, modo desenvolvedor, diagnóstico, acesso rápido, substitutos de WebCrypto/captcha/API) — fora de `src/dev-tools`/`src/dev-backend` só dentro de regiões `@dev-only` ([ferramentas de desenvolvimento](./ferramentas-dev.md)) | recurso usado em homolog/produção; `runtime/` não importa components, contexts nem services |
| `hooks` | hooks React compartilhados | utilitário puro sem React, contexto duplicado |
| `lib` | utilitários, validações, cliente HTTP, políticas, env, i18n e adaptadores | UI concreta, provider state |
| `services` | comunicação com APIs reais e serviços externos | mocks locais, componentes |
| `styles` | tokens e CSS global | lógica de componente ou dados de domínio |
| `types` | tipos globais puros | valores de runtime, funções, componentes |

> **Enforcement:** esta tabela é verificada por `eslint.config.mjs`
> (`no-restricted-imports`) e `npm run check:arch`. Camadas de enforcement e como
> marcar uma exceção: [enforcement de arquitetura](./enforcement-arquitetura.md).

> A camada `components/layout` representa **estrutura física**. Ela não contém
> regra de autenticação, navegação concreta ou regra de negócio — isso pertence
> aos contexts e à navegação. Região não lê sessão (`useAuth`) nem rota
> (`usePathname`): o valor vem resolvido do `SystemContext`
> ([shell adaptativo](./shell-adaptativo.md) → "`AppStructure` única").

## Regra de colocação

- **`page.tsx` é fino:** lê os parâmetros da rota (`?id=` + `Suspense`), declara
  o que é da rota e renderiza a tela de `src/components/{modulo}`. A tela —
  JSX, estado, carga de dados, subcomponentes — fica no módulo visual, mesmo
  quando é pequena. O `page.tsx` pode, no máximo, **escolher qual view de
  `components/` mostrar** (modo, redirecionamento — o login alterna
  form/biometria/recuperar assim), sem markup de tela próprio. O `check:arch`
  avisa `page.tsx` acima de 150 linhas.
- **Não criar `_components` ou `_screens` dentro das rotas.** Subcomponentes
  extraídos ficam no módulo visual correspondente.
- **Base de entidade:** `components/entity/` (`entity-list-screen`,
  `entity-form-screen`); módulos CRUD compõem ou estendem essa base, e o
  específico de uma entidade vai no `page.tsx` dela
  ([módulos de entidade](./modulos-entidade.md)).
- **Arquivos de apoio** saem para o módulo dono:
  - helper/função pura → `src/lib/...` (inclusive formatação usada por `*-ui.tsx`:
    moeda/data/percentual em `lib/format.ts`, mensagem de erro em `lib/http-errors.ts`)
  - hook React compartilhado → `src/hooks/...`
  - constante/configuração declarativa → `src/config/...`
  - comunicação com API real → `src/services/...`
  - contrato/engine/schema de runtime → `src/core/...`
  - tipo global puro → `src/types/...`
- **Tipos de props** e tipos privados pequenos ficam junto do componente enquanto
  só aquela view os usa; consumidos fora dela, migram para o módulo dono.
- **`components/ui`** abriga primitivos e o design do projeto, incluindo
  integrações visuais com contexts e o shell — sem separação artificial
  ([componentes de UI](./componentes-ui.md)). O motor em `core` mantém sua
  organização.
- **Nomes** em kebab-case (exceto `contexts/*Context.tsx`); exceções conhecidas
  aparecem como aviso no `check:arch`.

Exemplo de módulo dividido por tipo — **Analytics**: tela e gráficos em
`components/analytics`, hook em `hooks/use-analytics.ts`, service em
`services/analytics.ts`, tipos em `types/analytics.ts` e mock em
`dev-backend/analytics.ts`.

### Ao mover arquivos

- **Reescreva os imports no mesmo passo do move.** Mover e corrigir depois faz o
  dev server compilar no meio e mostrar `Module not found`, que continua no
  console mesmo após o compile passar — valide por `tsc` + recarregar, não pelo
  histórico do console.
- Arquivo novo/untracked usa `mv` normal (`git mv` falha com "not under version
  control").
- Renomear só a caixa no Windows (`Can.tsx` → `can.tsx`) exige dois passos, porque
  o sistema de arquivos não diferencia maiúsculas: `git mv Can.tsx can.tmp && git mv can.tmp can.tsx`.
- Criou/moveu/removeu arquivo em `src/` → `npm run docs:src-map` e descrever os
  itens `(descrever)` no [mapa de src](./mapa-src.md).

## Convenção do App Router

- `layout.tsx` raiz é **mínimo** e delega a composição para `AppStructure`.
- **Grupos de rota** `(Public)` e `(Portal)` organizam a app **sem alterar a URL**.
- **Layout por rota:** a rota declara um token em
  [src/lib/system/route-meta.ts](../src/lib/system/route-meta.ts) — `minimal` para
  telas "nuas" (`login`, `start`, troca de senha expirada). O resolver puro
  interpreta o token ([shell adaptativo](./shell-adaptativo.md) → "Rota declara o
  layout").
- **Rotas estáticas por `?id=`** (detalhe/edição): query param + `Suspense`, não
  segmento `[id]` — mantém `output: export` (APK).
- **Arquivos especiais** na raiz de `app/`: [loading.tsx](../src/app/loading.tsx)
  (fallback de Suspense → [Loading](../src/components/loading.tsx)),
  [error.tsx](../src/app/error.tsx) e [global-error.tsx](../src/app/global-error.tsx)
  (boundaries). O 404 é o catch-all `[...notFound]`, que reusa o
  [StatusScreen](../src/components/status-screen.tsx) — "a mesma tela que troca a
  mensagem".
- **Loader de transição global:** [RouteLoadingOverlay](../src/components/route-loading-overlay.tsx),
  montado no [AppStructure](../src/components/layout/app-structure.tsx), exibe o
  `Loading` a cada mudança de rota (cobre montagem e redirects de gate) e, em
  tela cheia, na **rotação da tela** até os `resize` assentarem (o `loading.tsx`
  é fallback de Suspense e não dispara em rotação, que não troca de rota).

```tsx
// src/app/layout.tsx (essência)
export default function RootLayout({ children }) {
  return (
    <html lang="pt-BR">
      <body>
        <TooltipProvider>
          <AppStructure>{children}</AppStructure>
        </TooltipProvider>
      </body>
    </html>
  );
}
```

## Rotas

| Rota | Arquivo | Acesso |
| --- | --- | --- |
| `/` | [page.tsx](../src/app/page.tsx) | público (bootstrap/start) |
| `/start` | [(Public)/start/page.tsx](<../src/app/(Public)/start/page.tsx>) | público |
| `/login` | [(Public)/login/page.tsx](<../src/app/(Public)/login/page.tsx>) | público (minimal) |
| `/portal` | [(Portal)/portal/page.tsx](<../src/app/(Portal)/portal/page.tsx>) | autenticado (PortalGate) |
| `/portal/home` | [(Portal)/portal/home/page.tsx](<../src/app/(Portal)/portal/home/page.tsx>) | autenticado (home de demonstração → `components/home/home-screen`) |
| `/portal/persons` | [(Portal)/portal/persons/page.tsx](<../src/app/(Portal)/portal/persons/page.tsx>) | autenticado (módulo Pessoas — RBAC `pessoa.visualizar`) |
| `/portal/persons/new`, `/portal/persons/detail` | [new](<../src/app/(Portal)/portal/persons/new/page.tsx>) · [detail](<../src/app/(Portal)/portal/persons/detail/page.tsx>) | autenticado (wrappers finos → `EntityFormScreen`) |
| `/portal/analytics` | [(Portal)/portal/analytics/page.tsx](<../src/app/(Portal)/portal/analytics/page.tsx>) | autenticado (demo de gráficos — RBAC `ANALISTA`/`ADMIN`) |
| `/portal/profile` | [(Portal)/portal/profile/page.tsx](<../src/app/(Portal)/portal/profile/page.tsx>) | autenticado (mobile-only) |
| `/portal/demo400`, `/portal/demo500` | [demo400](<../src/app/(Portal)/portal/demo400/page.tsx>) | autenticado (demos de `StatusScreen` — `ADMIN`) |
| `/portal/audit` | [audit](<../src/app/(Portal)/portal/audit/page.tsx>) | autenticado — placeholder de módulo (`ModulePlaceholder`, `ADMIN`) |
| `/api/dev/app-update/manifest`, `/api/dev/app-update/bundle` | [manifest](../src/app/api/dev/app-update/manifest/route.ts) · [bundle](../src/app/api/dev/app-update/bundle/route.ts) | rotas de API do `npm run dev` para o APK debug ([ambiente e build](./ambiente-e-build.md) → "Atualização no desenvolvimento") |

**Transições de acesso** (o `PortalGate` prende a sessão na troca de senha
expirada até ser resolvida — [autenticação](./autenticacao-e-permissoes.md)):

| Rota | Tela |
| --- | --- |
| `/portal/alterar-senha-expirada` | `components/login/senha-expirada-screen` |
| `/portal/redefinir-senha` | `components/login/redefinir-senha-screen` |

**Módulos do produto:** cada módulo do menu pode ter uma página raiz com o
`ModuleHub` (lista os recursos do menu já filtrados por permissão) e subrotas
sem tela ainda com o `ModulePlaceholder` (rota e RBAC prontos). Como a árvore e
o gate funcionam: [navegação](./navegacao.md) e
[autenticação](./autenticacao-e-permissoes.md) → "Permissões".

## Fluxo de navegação (alto nível)

![Fluxo de navegação: / vai ao /login (web) ou passa por /start (APK); após o login, senha expirada leva à troca de senha; senão /portal/home. O PortalGate manda para /login sem sessão.](/docs/fluxo-navegacao.svg)

## Onde mexer (mapa rápido)

| Quero… | Vá em |
| --- | --- |
| Criar uma rota | `src/app/(Public)/...` ou `src/app/(Portal)/portal/...` — `page.tsx` fino |
| Escrever a **tela** de uma rota | `src/components/{modulo}` (com `components/ui`, [componentes de UI](./componentes-ui.md)) |
| Novo módulo CRUD (entidade) | contrato em `src/dev-backend/entities` + rotas finas → `src/components/entity` ([módulos de entidade](./modulos-entidade.md)) |
| Registrar item de navegação | [src/lib/navigation.ts](../src/lib/navigation.ts) |
| Marcar uma rota como "nua" | [src/lib/system/route-meta.ts](../src/lib/system/route-meta.ts) (`layout: "minimal"`) |
| Ajustar a malha física / shell | [src/components/layout](../src/components/layout) ([shell adaptativo](./shell-adaptativo.md)) |
| Mudar cores / tema | [src/styles/tokens.css](../src/styles/tokens.css) + [ThemeProvider.tsx](../src/contexts/ThemeProvider.tsx) ([tema e marca](./tema-marca-e-idioma.md)) |
| Adicionar tradução | [public/locales](../public/locales) + [dictionaries.ts](../src/lib/i18n/dictionaries.ts) |
| Componente de UI reutilizável | [src/components/ui](../src/components/ui) ([componentes de UI](./componentes-ui.md)) |
| Recurso nativo (câmera, arquivo…) | [src/lib/platform](../src/lib/platform) ([plataforma nativa](./plataforma-nativa.md)) |

Voltar ao [índice](./README.md).
