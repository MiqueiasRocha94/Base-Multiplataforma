# 02 — Primeiros passos

## Requisitos

- Node.js **>= 22** (ver `.nvmrc` e `engines` no `package.json`) e npm 10+
- Android local: Android Studio / Android SDK (e JDK 21 para o Gradle)
- iOS: macOS com Xcode
- Docker (opcional): build de web e de APK em container

## Rodar (web)

```bash
npm install
# crie um .env na raiz (ver "Ambientes" abaixo)
npm run dev              # Next.js (Turbopack) em http://localhost:3000
```

Comandos úteis:

```bash
npm run lint             # ESLint (eslint .)
npm run env:check        # valida flags de ambiente
npm run start            # build (homolog) + serve
npm run production       # build (produção) + serve
```

> Antes de concluir uma alteração, rode `npm run lint` e `npm run build`, e
> confirme que novas rotas seguem as convenções do App Router (ver
> [README.md](../README.md) e [AGENTS.md](../AGENTS.md)).

## Ambientes

A resolução é feita pelos scripts em [scripts/app-env.mjs](../scripts/app-env.mjs)
(`loadAppEnv` / `normalizeAppEnv`). Cada ambiente carrega o `.env` base e
sobrescreve com o arquivo específico — **variáveis já presentes no processo não
são sobrescritas**:

| Ambiente | Arquivos carregados |
| --- | --- |
| development | `.env` |
| homologação | `.env` + `.env.homolog` |
| produção | `.env` + `.env.production` |

Regras importantes:

- `dev` usa `development`; `dev:homolog` usa `homolog`.
- Builds `homolog` e `production` rodam [validate-build-env.mjs](../scripts/validate-build-env.mjs),
  que **bloqueia** `NEXT_PUBLIC_DEVELOPER_MODE=true` (falha o build).
- O alvo (`web` / `mobile`) é definido por `NEXT_BUILD_TARGET`; só o build
  **mobile** ativa `output: "export"` e `images.unoptimized` em
  [next.config.ts](../next.config.ts).

### Variáveis públicas

Lidas estaticamente em [src/lib/env/public.ts](../src/lib/env/public.ts)
(`getPublicEnv`):

```bash
NEXT_PUBLIC_API_URL=
NEXT_PUBLIC_APP_NAME=Base Multiplataforma
NEXT_PUBLIC_APP_ENV=development
NEXT_PUBLIC_SYSTEM_PANEL_ENABLED=false
NEXT_PUBLIC_DEVELOPER_MODE=
```

> Em Next, env público no client deve ser lido por **referência estática**
> (`process.env.NEXT_PUBLIC_X`). Evite `process.env[name]` em código client.

## Build mobile (Capacitor)

O Capacitor consome o export estático do Next em `out/`
([capacitor.config.ts](../capacitor.config.ts): `webDir: "out"`).

```bash
npm run cap:sync                   # export estático (produção) em out/ + cap sync
npm run mobile:debug               # APK debug (development)
npm run apk                        # APK release (homolog), nomeado em builds/apk/
npm run apk:production             # APK release (produção), nomeado em builds/apk/
npm run android:open               # abre o projeto Android no Android Studio
npm run ios:open                   # abre o projeto iOS no Xcode
```

O pipeline ([scripts/build-target.mjs](../scripts/build-target.mjs) e
[scripts/android-build.mjs](../scripts/android-build.mjs)) faz: carregar env →
validar (homolog/prod) → `next build` (export) → `cap sync` → `gradlew
assemble*` → assinar → copiar o APK nomeado para `builds/apk/`.

## Build em Docker

Duas imagens independentes em [docker/](../docker):

**Web** ([docker/web.Dockerfile](../docker/web.Dockerfile)) — imagem auto-contida
(multi-stage, `output: "standalone"`) que faz o `next build` e serve um server Node
minimo. Ativa o standalone via `NEXT_OUTPUT_STANDALONE=true`
([next.config.ts](../next.config.ts)).

```bash
npm run web:image                  # docker compose build web
npm run web:up                     # docker compose up --build web -> http://localhost:3000
npm run web:down                   # docker compose down
```

- `APP_ENV` (build arg): `production` (default) ou `homolog`.
- `WEB_PORT` (env do host): porta publicada (default `3000`).

**APK** ([docker/android.Dockerfile](../docker/android.Dockerfile)) — toolchain
(JDK 21 + Node 22 + Android SDK) que monta o projeto em runtime e gera o APK em
`builds/apk/`.

```bash
npm run apk:image                  # docker compose build apk (toolchain)
npm run apk:docker                 # APK homolog
npm run apk:docker:prod            # APK produção
```

## Login sem backend

Não há backend ainda. A sessão é **demo/offline**
([src/lib/auth/session.ts](../src/lib/auth/session.ts)): o login gera um
`DemoSession` (token aleatório, perfil `portal`) e persiste em `localStorage` +
cookies. Qualquer credencial válida no formulário entra no portal. Ver o fluxo em
[src/app/(Public)/login](<../src/app/(Public)/login>).

## Modo desenvolvedor e painel do sistema

- **Modo desenvolvedor** ([DeveloperModeContext.tsx](../src/contexts/DeveloperModeContext.tsx)):
  habilitado por `NEXT_PUBLIC_DEVELOPER_MODE=true` **ou** quando `NODE_ENV !==
  production`. Expõe um painel ([DeveloperModePainel.tsx](../src/components/developer-mode/DeveloperModePainel.tsx))
  com flags (acesso rápido, blocos de formulário, Zod, dados mockados, ignorar TLS),
  persistidas no storage.
- **Painel do sistema** ([SystemContextPanel.tsx](../src/components/system/SystemContextPanel.tsx)):
  ferramenta de runtime para editar a geometria do `SystemContext` (alturas,
  larguras, visibilidade, z-index, cores do tema). Aparece apenas quando
  `NEXT_PUBLIC_SYSTEM_PANEL_ENABLED=true`.

> Ambos são ferramentas de desenvolvimento — não devem virar navegação ou lógica
> de produto do usuário final.

Próximo: [03 — Estrutura do projeto](./03-estrutura-projeto.md).
