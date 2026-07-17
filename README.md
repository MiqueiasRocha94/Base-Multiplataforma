# Base Multiplataforma

![Next.js](https://img.shields.io/badge/framework-next.js_16.2.6-000000)
![React](https://img.shields.io/badge/ui-react_19.2.4-61DAFB)
![Capacitor](https://img.shields.io/badge/mobile-capacitor_8.3.4-119EFF)
![TypeScript](https://img.shields.io/badge/language-typescript_5-blue)
![Zod](https://img.shields.io/badge/validation-zod_4.4.3-3E67B1)
![Tailwind](https://img.shields.io/badge/style-tailwindcss_4-38BDF8)
![i18next](https://img.shields.io/badge/i18n-i18next_26.3.0-26A69A)

Base reutilizavel para produtos **multiplataforma** em `Next.js` (App Router) com
`Capacitor`. O mesmo codigo entrega uma experiencia **web (desktop)** e uma
**mobile encapsulada**, com a malha fisica da tela (Header, Sidebars, Conteudo,
Footer) controlada em runtime pelo `SystemContext`. A exportacao estatica
(`webDir: "out"`) alimenta o empacotamento mobile.

> Convencao do projeto: **codigo em ingles**, **documentacao em pt-BR**
> (ver [AGENTS.md](./AGENTS.md)).

## Documentacao

O guia de uso completo esta em [docs/](./docs/README.md):

| Doc | Conteudo |
| --- | --- |
| [01 — Visao geral](./docs/01-visao-geral.md) | O que e a base, stack e arquitetura em camadas. |
| [02 — Primeiros passos](./docs/02-primeiros-passos.md) | Instalar, rodar, ambientes (`.env`), build web/mobile e Modo desenvolvedor. |
| [03 — Estrutura do projeto](./docs/03-estrutura-projeto.md) | Pastas, App Router (`(Public)`/`(Portal)`), rotas e onde mexer. |
| [04 — Shell adaptativo](./docs/04-shell-adaptativo.md) | ★ `AppStructure`, providers, decisao desktop×mobile, malha fisica e `SystemContext`. |
| [05 — Infraestrutura](./docs/05-infraestrutura.md) | Tema/tokens, i18n, fonte, auth/biometria/RBAC, storage, camada nativa, HTTP. |
| [06 — Componentes adaptativos](./docs/06-componentes-adaptativos.md) | Mesmo componente por plataforma: `GenericTable` e o modulo Pessoas. |
| [07 — Scaffold e modulos](./docs/07-scaffold-modulos.md) | Arquitetura orientada a contrato (Entity Runtime) e como o scaffold gera um modulo CRUD a partir do contrato. |

## Diretriz

Este projeto segue a estrutura do Next.js sem recriar navegacao de outros
frameworks dentro de `src/app`.

- `src/app/layout.tsx` e o root layout minimo (delega a composicao ao `AppStructure`)
- grupos de rota organizam a aplicacao sem alterar URL: `(Public)` e `(Portal)`
- pastas privadas `_components` / `_lib` / `_screens` guardam implementacao nao-roteavel
- cada area define sua composicao com `layout.tsx` / `page.tsx`
- `next.config.ts` muda de comportamento por alvo de build (`NEXT_BUILD_TARGET`)
- `capacitor.config.ts` usa `webDir: "out"` para consumir a saida do Next.js

## Stack

- Next.js `16.2.6` · React `19.2.4` · TypeScript `^5`
- Tailwind CSS `^4` · Zod `^4.4.3` · i18next `^26.3.0`
- Recharts `^2.15.4` (graficos estilo shadcn em `src/components/ui/chart.tsx`)
- Capacitor Core / CLI / Android / iOS `^8.3.4`

Plugins nativos principais:

- `@capacitor/camera` `^8.2.0`
- `@capacitor/filesystem` `^8.1.2`
- `@capacitor/local-notifications` `^8.2.0`
- `@capacitor/push-notifications` `^8.1.1`
- `@capawesome/capacitor-file-picker` `^8.0.2`
- `@aparajita/capacitor-biometric-auth` `^10.0.0`

## Estrutura

```text
src/
  app/                       rotas do App Router
    layout.tsx               root layout minimo -> AppStructure
    page.tsx                 bootstrap/start
    (Public)/                grupo de rotas publicas
      home/ documentation/ register/ login/ start/ unauthorized/
    (Portal)/portal/         grupo autenticado
      layout.tsx             PortalGate (sessao + biometria)
      home/ profile/ persons/ analytics/ demo400/ demo500/
  components/
    layout/                  malha fisica (AppStructure, Header, *Sidebar, MainContent, Footer, MobileAppShell)
    ui/                      design system base
    portal-gate.tsx          gate da area protegida
  contexts/                  providers globais (Theme, Language, Auth, Device, System, Navigation, ...)
  lib/                       auth/ env/ i18n/ platform/ navigation.ts ...
  services/api/              cliente HTTP (apiFetch)
  styles/tokens.css          CSS variables semanticas
scripts/                     pipeline de env e build (web / mobile / APK / Docker)
docker/                      android.Dockerfile (APK) e web.Dockerfile (web)
```

## Rotas

| Rota | Acesso |
| --- | --- |
| `/` | publico (bootstrap/start) |
| `/start` | publico (alias de start) |
| `/home` | publico (home / showcase) |
| `/documentation` | publico (documentacao renderizada) |
| `/register` | publico (cadastro) |
| `/login` | publico (gateway de autenticacao) |
| `/unauthorized` | tela de sem permissao (403) |
| `/portal` | autenticado (entrada — `PortalGate`) |
| `/portal/home` | autenticado |
| `/portal/persons` | autenticado (modulo Pessoas — lista adaptativa, RBAC `pessoa.visualizar`) |
| `/portal/analytics` | autenticado (demo de graficos — RBAC `ANALISTA`/`ADMIN`) |
| `/portal/profile` | autenticado |
| `/portal/demo400`, `/portal/demo500` | autenticado (demos de erro — `ADMIN`) |

> A navegacao ([src/lib/navigation.ts](./src/lib/navigation.ts)) aplica RBAC por
> papeis/permissoes e exercita o *placement* (header / sidebar / footer mobile).

## Requisitos

- Node.js **>= 22** (ver `.nvmrc` e `engines` no `package.json`) e npm 10+
- Android local: Android Studio / Android SDK (e JDK 21 para o Gradle)
- iOS: macOS com Xcode
- Docker (opcional): build de APK e de web em container

## Comandos

Web:

```bash
npm install
npm run dev          # Next.js (Turbopack) em http://localhost:3000
npm run lint         # ESLint
npm run start        # build + serve (homolog)
npm run production   # build + serve (production)
npm run env:check    # valida flags de ambiente
```

Mobile (Capacitor):

```bash
npm run cap:sync         # export estatico (production) + cap sync
npm run mobile:debug     # APK debug (development)
npm run apk              # APK release (homolog), nomeado em builds/apk/
npm run apk:production   # APK release (production), nomeado em builds/apk/
npm run android:open     # abre o projeto Android no Android Studio
npm run ios:open         # abre o projeto iOS no Xcode
```

## Docker

Duas imagens independentes em [docker/](./docker):

### Web (`docker/web.Dockerfile`)

Imagem **auto-contida e deployavel** (multi-stage, `output: "standalone"`) que faz
o `next build` e serve um server Node minimo.

```bash
npm run web:image    # docker compose build web
npm run web:up       # docker compose up --build web  -> http://localhost:3000
npm run web:down     # docker compose down
```

- `APP_ENV` (build arg): `production` (default) ou `homolog` — define os `.env`
  carregados e os valores `NEXT_PUBLIC_*` embutidos no bundle.
- `WEB_PORT` (env do host): porta publicada (default `3000`).
- Homolog: `APP_ENV=homolog docker compose up --build web`.

### APK (`docker/android.Dockerfile`)

Imagem de toolchain (JDK 21 + Node 22 + Android SDK) que monta o projeto em
runtime e gera o APK. Capacitor 8 exige JDK 21 e Node >= 22.

```bash
npm run apk:image        # docker compose build apk (toolchain)
npm run apk:docker       # docker compose run --rm apk  (APK homolog)
npm run apk:docker:prod  # APK production
```

O APK gerado aparece em `builds/apk/` (o projeto e um bind mount).

## Ambientes

Resolucao feita por [scripts/app-env.mjs](./scripts/app-env.mjs) (`loadAppEnv` /
`normalizeAppEnv`). Cada ambiente carrega o `.env` base e sobrescreve com o
especifico — variaveis ja presentes no processo **nao** sao sobrescritas:

| Ambiente | Arquivos carregados |
| --- | --- |
| development | `.env` |
| homologacao | `.env` + `.env.homolog` |
| producao | `.env` + `.env.production` |

Regras aplicadas nos scripts:

- builds `homolog` e `production` rodam [validate-build-env.mjs](./scripts/validate-build-env.mjs),
  que **bloqueia** `NEXT_PUBLIC_DEVELOPER_MODE=true` e `NEXT_PUBLIC_SYSTEM_PANEL_ENABLED=true`
- o alvo (`web` / `mobile`) e definido por `NEXT_BUILD_TARGET`; so o build
  **mobile** ativa `output: "export"` + `images.unoptimized`
- o build web em Docker ativa `output: "standalone"` via `NEXT_OUTPUT_STANDALONE=true`
- `apk`/`apk:production` geram artefato nomeado em `builds/apk/`

Variaveis publicas atuais (lidas em [src/lib/env/public.ts](./src/lib/env/public.ts)):

```bash
NEXT_PUBLIC_API_URL=
NEXT_PUBLIC_APP_NAME=Base Multiplataforma
NEXT_PUBLIC_DEVELOPER_MODE=
NEXT_PUBLIC_SYSTEM_PANEL_ENABLED=
```

## Validacao

Antes de concluir alteracoes:

- `npm run lint`
- `npm run start` (ou `npm run production`) para validar o build web
- confirmar que novas rotas seguem as convencoes do App Router
- manter codigo especifico de rota em `app/**/_components`, `_lib` ou `_screens`

## Referencias do repositorio

- [docs/](./docs/README.md) — guia de uso da base
- [AGENTS.md](./AGENTS.md) e [guia.md](./guia.md)
- `references/base-next/` e `references/base-expo/`
</content>
</invoke>
