# Visão geral

## O que é

Base reutilizável para produtos digitais **multiplataforma** em **Next.js 16
(App Router) / React 19 + TypeScript**, com empacotamento mobile via
**Capacitor 8**. Traz a infraestrutura comum pronta: tema dinâmico, white-label,
i18n, escala/preset de fonte, autenticação com a API do produto ou o `dev-backend`,
biometria, storage, wrappers de recursos nativos, cliente HTTP, ferramentas de
desenvolvimento e scripts de build web/mobile. Cada produto é construído sobre
ela, trazendo o seu domínio, telas, marcas e specs.

Princípios da plataforma:

- **Um código, três alvos.** Web, APK e app desktop têm a mesma funcionalidade e
  chamam os mesmos endpoints, em todas as marcas; muda só o alvo de build e a
  identidade visual ([ambiente e build](./ambiente-e-build.md),
  [tema e marca](./tema-marca-e-idioma.md)).
- **Regra de negócio fica no backend**: o front consome e apresenta
  ([comunicação com a API](./comunicacao-api.md) → "Front consome, backend decide").
- **Fluxo de entrada:** start → login → (troca de senha, quando exigida) →
  portal ([autenticação](./autenticacao-e-permissoes.md)).

O diferencial é a **arquitetura de shell adaptativo orientada a estrutura**: o
mesmo código entrega uma experiência **desktop** e uma **mobile** (escolhidas em
runtime pelo `DeviceContext`), e a **malha física da tela** (Header, LeftSidebar,
MainContent, RightSidebar, Footer) é configurável em runtime pelo
`SystemContext`. Ver [shell adaptativo](./shell-adaptativo.md).

## Como o sistema é distribuído

Um código, três alvos (web, APK e app desktop Windows/Linux), três ambientes e uma imagem por marca em produção
(build-arg `BRAND`; a base traz a marca neutra `base`). Comandos e matriz completa em
[ambiente e build](./ambiente-e-build.md).

| Ambiente | Web | APK | Desktop | Arquivos |
| --- | --- | --- | --- | --- |
| Desenvolvimento | `npm run dev` | `npm run mobile:debug` ou `docker/develop/app` | `npm run desktop:debug` ou `docker/develop/desktop` | `.env` |
| Homologação | `npm run start` ou `docker/homolog/web` | `npm run apk` ou `docker/homolog/app` | `npm run desktop` ou `docker/homolog/desktop` | `.env` + `.env.homolog` |
| Produção | `docker/production/web` (`NEXT_PUBLIC_BRAND=<marca>`) | `npm run apk:production` (sem compose; lojas por outra via) | `npm run desktop:production` ou `docker/production/desktop` | `.env` + `.env.production` |

## Base e produto

A base não é um produto publicado: ela entrega a infraestrutura e recursos **preparados** que cada produto ativa.
Vale para quem usa a base, para quem a evolui e para quem reaplica o Agent Docs Kit nela.

| Recurso | Na base | O produto |
| --- | --- | --- |
| Domínio e telas | domínio de demonstração (Pessoas, Analytics, Auditoria; perfis comum, analista, admin) | troca pelo seu ([domínio da base](./dominios/base-multiplataforma.md)) |
| Marca | marca neutra `base` | cria as suas e fixa `NEXT_PUBLIC_BRAND` em produção ([tema e marca](./tema-marca-e-idioma.md) → "Marca (white-label)") |
| Publicação nas lojas | não publica; build APK assinado, scripts e roteiro prontos | cria `store/`, escolhe a via (Capacitor, Expo ou outra; iOS exige macOS) e publica ([publicação nas lojas](./publicacao-lojas.md)) |
| PWA | desligado; validador e roteiro prontos | habilita na web ([PWA e instalação](./pwa-e-instalacao.md)) |
| Produção | web e instaladores desktop por compose; mobile sem compose | define o deploy e as credenciais ([ambiente e build](./ambiente-e-build.md) → "Build em Docker") |

- Docs de recurso preparado descrevem **como o produto ativa**, sem afirmar que a base já faz.
- Ao evoluir a base ou reaplicar o kit, um recurso preparado continua preparado: a base não ganha `store/`,
  manifest nem credenciais de publicação. A escolha fica registrada em `.agents/recursos-kit.json`.

## Stack

- Next.js 16.2.6 (App Router) / React 19.2.4 / TypeScript 5
- Capacitor 8.3.4 (Android / iOS) — consome o export estático do Next (`webDir: "out"`)
- Tauri 2 (desktop Windows / Linux, `src-tauri/`) — consome o mesmo export (`frontendDist: "../out"`)
- Tailwind CSS 4 + CSS variables semânticas ([src/styles/tokens.css](../src/styles/tokens.css))
- i18next 26 + react-i18next (pt-BR / en / es-ES)
- Zod 4 (validação de formulários) · lucide-react (ícones)
- Plugins nativos: camera, filesystem, local/push-notifications, file-picker, biometric-auth

## Interfaces do sistema

| Interface | Usuário | Onde | Doc |
| --- | --- | --- | --- |
| Portal web | perfis do produto (na base: comum, analista, admin) | `/portal/*` (autenticado) | [estrutura do projeto](./estrutura-projeto.md) → "Rotas" |
| APK | os mesmos perfis | mesmo código, export estático | [ambiente e build](./ambiente-e-build.md) → "Build mobile (Capacitor)" |
| App desktop | os mesmos perfis | mesmo export, casca Tauri | [ambiente e build](./ambiente-e-build.md) → "Build desktop (Tauri)" |
| Páginas públicas | qualquer visitante | `/login`, `/start` | [estrutura do projeto](./estrutura-projeto.md) → "Rotas" |
| API consumida | este front | API do produto (`NEXT_PUBLIC_ACESSO_API_URL`, `NEXT_PUBLIC_API_BASE_URL`) | [comunicação com a API](./comunicacao-api.md) |
| Serviços externos | este front | Turnstile, push | [integrações](./integracoes.md) |

## A estrutura pertence ao Next.js

A base nasceu de duas referências (uma base Next.js e a Base-Expo), já
absorvidas. **A estrutura é a do Next.js** (App
Router, layouts, `src/app`); a Base-Expo (React Native) só empresta lógica,
comportamento e referência de integração nativa. Motivo: reproduzir a navegação
e a organização do Expo dentro do App Router criaria dois modelos de rota e de
tela no mesmo código. Para cada coisa vinda da Base-Expo:

- **define estrutura** (telas RN, `expo-router`, pastas de navegação) → não migra;
  é reescrita no padrão web;
- **define comportamento** (tipos, schemas Zod, regras de sessão/biometria,
  storage, bootstrap) → é adaptada;
- **acessa hardware** → vira wrapper em `src/lib/platform` sobre o plugin
  Capacitor equivalente ([plataforma nativa](./plataforma-nativa.md)).

## Arquitetura em camadas

![Arquitetura em camadas: src/app → AppStructure → contexts globais; o SystemContext resolve o layout (device, sessão, rota) e liga/desliga as regiões únicas, cada uma com sua variante mobile.](/docs/arquitetura-camadas.svg)

**Princípio de roteamento:** o App Router organiza a aplicação por **grupos de
rota** (`(Public)` e `(Portal)`) sem alterar a URL. O `layout.tsx` raiz é mínimo e
delega toda a composição de UI para `AppStructure`. As `page.tsx` são **finas**;
a tela reutilizável mora em `src/components` ([estrutura do
projeto](./estrutura-projeto.md)).

![Camadas do shell: app/layout → AppStructure → providers; o SystemContext (resolveSystemConfig) combina o view do DeviceContext e o token do RouteMeta e entrega o layout às regiões únicas.](/docs/camadas-shell.svg)

## Conceitos-chave

| Conceito | Onde | Para quê | Doc |
| --- | --- | --- | --- |
| Orquestrador de UI | [app-structure.tsx](../src/components/layout/app-structure.tsx) | Monta os providers e a árvore única de regiões. | [shell](./shell-adaptativo.md) |
| Decisão de plataforma | [DeviceContext.tsx](../src/contexts/DeviceContext.tsx) | `view: mobile / desktop` a partir de viewport + aparelho. | [shell](./shell-adaptativo.md) |
| Camada estrutural | [SystemContext.tsx](../src/contexts/SystemContext.tsx) | Resolve o layout; geometria da malha e painéis especiais. | [shell](./shell-adaptativo.md) |
| Navegação | [navigation.ts](../src/lib/navigation.ts) + [NavigationContext.tsx](../src/contexts/NavigationContext.tsx) | Árvore de itens e *placement* (header / sidebar / footer). | [shell](./shell-adaptativo.md) |
| Componentes | [src/components/ui](../src/components/ui) | Design system e componentes adaptativos. | [componentes de UI](./componentes-ui.md) |
| Módulo de entidade | [src/core](../src/core) | Contrato → lista, filtro, formulário e ações. | [módulos de entidade](./modulos-entidade.md) |
| Tema e marca | [ThemeProvider.tsx](../src/contexts/ThemeProvider.tsx) + [brand.ts](../src/config/brand.ts) | Tokens semânticos e identidade por marca. | [tema e marca](./tema-marca-e-idioma.md) |
| Sessão e permissões | [AuthContext.tsx](../src/contexts/AuthContext.tsx) | Auth, sessão, RBAC. | [autenticação](./autenticacao-e-permissoes.md) |
| Camada nativa | [src/lib/platform](../src/lib/platform) | Wrappers de Capacitor. | [plataforma nativa](./plataforma-nativa.md) |

Voltar ao [índice](./README.md).
