# 03 — Estrutura do projeto

A organização separa **rotas** (App Router, por domínio de experiência) de
**infraestrutura reutilizável** (componentes, contexts e libs). A navegação do
Next.js não é recriada por outro framework dentro de `src/app`.

## Pastas

```text
src/
  app/                     rotas do App Router
    layout.tsx             root layout mínimo → renderiza AppStructure
    page.tsx               bootstrap/start (redireciona p/ /home; conta regressiva no mobile)
    (Public)/              grupo de rotas públicas (não altera URL)
      layout.tsx           passthrough
      start/page.tsx       alias de start
      home/page.tsx        home pública (showcase da base)
      documentation/       documentação renderizada (page.tsx + _components)
      register/page.tsx    cadastro
      unauthorized/page.tsx  sem permissão (403)
      login/
        page.tsx           login
        _components/        login-entry, login-form (não-roteável)
        _lib/               login.schema.ts (Zod)
    (Portal)/              grupo de rotas autenticadas
      portal/
        layout.tsx         PortalGate (sessão + biometria)
        page.tsx           entrada do portal
        home/page.tsx      home autenticada
        profile/page.tsx   perfil
        persons/           módulo Pessoas (page.tsx + new/ + detail/ + _screens/)
        analytics/page.tsx demo de gráficos
        demo400/ demo500/  demos de tela de status (StatusScreen)
  components/
    layout/                ★ malha física (AppStructure, Header, *Sidebar, MainContent, Footer, MobileAppShell)
    system/                painel do SystemContext (SystemContextPanel)
    developer-mode/        painel do Modo desenvolvedor
    ui/                    ★ design system base (button, card, input*, label, switch, generic-table…)
    portal-gate.tsx        gate da área protegida (não-roteável)
    *.tsx                  composição/navegação (Navigation, Sidebar, Marker, Logo, AccountMenu, StatusScreen…)
  contexts/                ★ providers globais de runtime
    system/types/          tipos do SystemContext (layout, panel, context)
  hooks/                   hooks compartilhados (use-mounted)
  lib/
    auth/                  sessão demo + gate de acesso protegido
    env/                   leitura de env público
    i18n/                  dicionários e settings de i18n
    platform/              ★ wrappers de Capacitor (biometria, câmera, arquivos, notificações, storage)
    preferences/           opções de preferências
    theme/                 helpers de tema (color-scheme)
    navigation.ts          itens de navegação + regras de placement
    utils.ts               cn() e utilitários
  services/api/            cliente HTTP (apiFetch)
  styles/tokens.css        CSS variables semânticas (tema claro/escuro + presets de fonte)
scripts/                   pipeline de env e build (web/mobile/APK)
```

> A camada `components/layout` representa **estrutura física**. Ela não deve
> conter regra de autenticação, navegação concreta ou regra de negócio — isso
> pertence aos contexts e à navegação. Ver
> [04 — Shell adaptativo](./04-shell-adaptativo.md).

## Convenção do App Router

Arquivos seguem as convenções do Next 16:

- `layout.tsx` raiz é **mínimo** e delega a composição para `AppStructure`.
- **Grupos de rota** `(Public)` e `(Portal)` organizam a aplicação **sem alterar
  a URL**.
- Pastas **privadas** `_components` e `_lib` guardam implementação não-roteável
  colocada perto da rota.
- Cada área define sua própria composição com `layout.tsx` / `page.tsx`.
- **Arquivos especiais** na raiz de `app/` (inspirados na Base-Next):
  [loading.tsx](../src/app/loading.tsx) (fallback de Suspense → spinner
  [Loading](../src/components/Loading.tsx)), [not-found.tsx](../src/app/not-found.tsx)
  (404 com auto-redirect ao início), [error.tsx](../src/app/error.tsx) (boundary do
  segmento) e [global-error.tsx](../src/app/global-error.tsx) (boundary do **root
  layout** — roda sem providers; resolve o idioma pelo storage). A página de
  **sem permissão** ([(Public)/unauthorized/page.tsx](<../src/app/(Public)/unauthorized/page.tsx>),
  403) e todas as anteriores reutilizam o mesmo componente
  [StatusScreen](../src/components/StatusScreen.tsx) — "a mesma tela que troca a
  mensagem" (apenas apresentação, sem dependência de contexto).
- **Loader de transição global:** [RouteLoadingOverlay](../src/components/RouteLoadingOverlay.tsx),
  montado no [AppStructure](../src/components/layout/AppStructure.tsx), exibe o
  `Loading` a cada mudança de rota (cobre a montagem da nova página e redirects de
  gate) — evita "piscar" conteúdo que ainda não deveria aparecer. Como a navegação
  client não dispara o `loading.tsx`, este overlay complementa esse caso.

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
| `/home` | [(Public)/home/page.tsx](<../src/app/(Public)/home/page.tsx>) | público |
| `/documentation` | [(Public)/documentation/page.tsx](<../src/app/(Public)/documentation/page.tsx>) | público (documentação renderizada) |
| `/register` | [(Public)/register/page.tsx](<../src/app/(Public)/register/page.tsx>) | público |
| `/login` | [(Public)/login/page.tsx](<../src/app/(Public)/login/page.tsx>) | público |
| `/unauthorized` | [(Public)/unauthorized/page.tsx](<../src/app/(Public)/unauthorized/page.tsx>) | sem permissão (403) |
| `/portal` | [(Portal)/portal/page.tsx](<../src/app/(Portal)/portal/page.tsx>) | autenticado (PortalGate) |
| `/portal/home` | [(Portal)/portal/home/page.tsx](<../src/app/(Portal)/portal/home/page.tsx>) | autenticado |
| `/portal/persons` | [(Portal)/portal/persons/page.tsx](<../src/app/(Portal)/portal/persons/page.tsx>) | autenticado (módulo Pessoas — RBAC `pessoa.visualizar` — ver [06](./06-componentes-adaptativos.md)) |
| `/portal/analytics` | [(Portal)/portal/analytics/page.tsx](<../src/app/(Portal)/portal/analytics/page.tsx>) | autenticado (demo de gráficos shadcn/Recharts — RBAC `ANALISTA`/`ADMIN`) |
| `/portal/profile` | [(Portal)/portal/profile/page.tsx](<../src/app/(Portal)/portal/profile/page.tsx>) | autenticado |
| `/portal/demo400`, `/portal/demo500` | [(Portal)/portal/demo400/page.tsx](<../src/app/(Portal)/portal/demo400/page.tsx>) | autenticado (demos de `StatusScreen` — `ADMIN`) |

> **RBAC + itens sem rota:** [navigation.ts](../src/lib/navigation.ts) filtra os
> itens por papéis/permissões do usuário (`requiredRoles` / `requiredPermissions`)
> e ainda lista destinos de **auditoria** (`/portal/audit/*`) e módulos sintéticos
> (`/portal/modulo-N`) que **não têm `page.tsx`** (resultariam em 404). Servem para
> exercitar o *placement* de navegação (mais de 5 itens → sidebar no desktop /
> overflow no mobile). Crie a `page.tsx` correspondente antes de tratá-los como
> rotas reais.

## Fluxo de navegação (alto nível)

![Fluxo de navegação: bootstrap → home pública → login → /portal/home; o PortalGate redireciona para /login sem sessão e exige biometria no nativo.](/docs/fluxo-navegacao.svg)

## Onde mexer (mapa rápido)

| Quero… | Vá em |
| --- | --- |
| Criar uma rota pública/portal | `src/app/(Public)/...` ou `src/app/(Portal)/portal/...` |
| Registrar item de navegação | [src/lib/navigation.ts](../src/lib/navigation.ts) |
| Ajustar a malha física / shell | [src/components/layout](../src/components/layout) ([04 — Shell adaptativo](./04-shell-adaptativo.md)) |
| Geometria da tela em runtime | [src/contexts/SystemContext.tsx](../src/contexts/SystemContext.tsx) |
| Mudar cores / tema | [src/styles/tokens.css](../src/styles/tokens.css) + [ThemeProvider.tsx](../src/contexts/ThemeProvider.tsx) |
| Adicionar tradução | [public/locales](../public/locales) + [src/lib/i18n/dictionaries.ts](../src/lib/i18n/dictionaries.ts) |
| Componente de UI reutilizável | [src/components/ui](../src/components/ui) |
| Recurso nativo (câmera, arquivo…) | [src/lib/platform](../src/lib/platform) |

Próximo: [04 — Shell adaptativo e estrutura](./04-shell-adaptativo.md).
