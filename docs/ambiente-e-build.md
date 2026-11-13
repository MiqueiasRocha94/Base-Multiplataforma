# Ambiente e build

Instalar, rodar, configurar ambientes e gerar os artefatos (web, APK, Docker).

## Requisitos

- Node.js **>= 22** (ver `.nvmrc` e `engines` no `package.json`) e npm 10+
- Android local: Android Studio / Android SDK (e JDK 21 para o Gradle)
- iOS: macOS com Xcode
- Docker: obrigatório para o app desktop, que compila sempre no container de toolchain (sem Rust na máquina;
  [Build desktop (Tauri)](#build-desktop-tauri)); opcional para o build de web e de APK em container

## Rodar (web)

```bash
npm install
cp .env.example .env     # ajuste os valores (ver "Ambientes" abaixo)
npm run dev              # Next.js (Turbopack) em http://localhost:3000
npm run dev:https        # idem, em HTTPS (certificado autoassinado)
```

Comandos úteis:

```bash
npm run typecheck        # tsc --noEmit
npm run lint             # ESLint (eslint .)
npm test                 # node --test (tests/ + scripts de lojas e PWA)
npm run check:arch       # fronteiras de src/ + sincronia de .agents e do mapa de src
npm run env:check        # valida flags de ambiente
npm run start            # build (homolog) sem o código de dev → dist/web + serve
npm run production       # build (produção) sem o código de dev → dist/web + serve
npm run dist:check       # só confere a entrada de build limpa (remoção + tsc)
npm run verify:dist <x>  # verifica um artefato (pasta ou .apk)
```

> Antes de concluir uma alteração, rode `typecheck`, `lint`, `test` (se tocar
> lógica coberta) e `check:arch` — ver [conduta](./conduta-agentes.md) →
> "Validação".

**Pela rede local (celular, outra máquina, terceiros):** o `npm run dev` já
atende em `http://<ip-da-máquina>:<porta>`, sem configuração no aparelho de
quem acessa. Em dev, a API é chamada pela mesma origem (proxy do `next.config`),
o DPoP usa um substituto do WebCrypto quando a página não está em contexto
seguro e o captcha usa a chave de teste da Cloudflare — detalhes e limites em
[ferramentas de desenvolvimento](./ferramentas-dev.md) → "Acesso pela rede".
A porta vem de `PORT` (padrão 3000); para atender na 80, `PORT=80` no `.env`
da sua máquina.

`npm run dev:https` sobe o mesmo dev em HTTPS (contexto seguro de verdade, com o
WebCrypto nativo): o script (`scripts/dev-https-cert.mjs`) gera em
`certificates/` (ignorado pelo git) um certificado autoassinado para
`localhost` + os IPv4 da máquina, refeito quando um IP muda, com o openssl do
sistema ou o que vem com o Git. Não instala CA no sistema: o navegador avisa na
primeira vez e segue após "continuar".

**Sem backend (só em dev):** sem `NEXT_PUBLIC_ACESSO_API_URL` e `NEXT_PUBLIC_API_BASE_URL`,
login e telas usam o `dev-backend`, com usuários de demonstração por perfil
(comum, analista, admin) e atalhos de login de demo
([comunicação com a API](./comunicacao-api.md) → "dev-backend").

## Ambientes

A resolução é feita pelos scripts em [scripts/app-env.mjs](../scripts/app-env.mjs)
(`loadAppEnv` / `normalizeAppEnv`). **Um arquivo por ambiente, sem herança** —
cada um tem todas as variáveis do seu ambiente; **variáveis já presentes no
processo não são sobrescritas**:

| Ambiente | Arquivo carregado | Modelo versionado |
| --- | --- | --- |
| development | `.env` | `.env.example` |
| homologação | `.env.homolog` | `.env.homolog.example` |
| produção | `.env.production` | `.env.production.example` |

Os arquivos carregados são locais e ignorados pelo git; cada um nasce da cópia do
seu modelo, que só tem valores genéricos. Não há outros `.env*`: os scripts passam ao Next o ambiente já carregado
(`__NEXT_PROCESSED_ENV`), para ele não ler sozinho os demais arquivos da raiz.

**IP da máquina em desenvolvimento:** `localhost`/`127.0.0.1` nas URLs
`NEXT_PUBLIC_*` do `.env` viram o IP da máquina na rede (porta e caminho mantidos),
para o APK debug e o celular alcançarem a API sem editar o arquivo. O IP aparece
no início do `npm run dev`/build (`[env] desenvolvimento: localhost → <ip>`); a
escolha prefere 192.168.x, depois 10.x e 172.16–31.x, e `DEV_HOST_IP` força outro.
A API precisa escutar na rede (`0.0.0.0`). Mudou o IP, gere o APK debug de novo.
O APK debug fala com essa API por HTTP: o `capacitor.config.ts` libera cleartext e
mixed content **só** no build de desenvolvimento.

Regras:

- `dev` usa `development`; `start` usa `homolog`; `production` usa `production`.
- Builds `homolog` e `production` rodam [validate-build-env.mjs](../scripts/validate-build-env.mjs),
  que **bloqueia** `NEXT_PUBLIC_DEVELOPER_MODE=true` e
  `NEXT_PUBLIC_SYSTEM_PANEL_ENABLED=true` (falha o build) — ver
  [ferramentas de desenvolvimento](./ferramentas-dev.md).
- O alvo (`web` / `mobile`) é definido por `NEXT_BUILD_TARGET`
  ([scripts/build-target.mjs](../scripts/build-target.mjs)); só o build
  **mobile** ativa `output: "export"` e `images.unoptimized` em
  [next.config.ts](../next.config.ts). Por isso não há rota `[param]`
  ([estrutura do projeto](./estrutura-projeto.md) → "Convenção do App Router").

### Variáveis públicas

Lidas por referência estática no código (as gerais em
[src/lib/env/public.ts](../src/lib/env/public.ts), `getPublicEnv`):

```bash
NEXT_PUBLIC_APP_NAME=Base Multiplataforma
NEXT_PUBLIC_APP_ENV=development        # development | homolog | production
NEXT_PUBLIC_API_URL=
NEXT_PUBLIC_ACESSO_API_URL=            # API de acesso (login/sessão); vazio → dev-backend (só dev; obrigatória em homolog/produção)
NEXT_PUBLIC_API_BASE_URL=              # API das entidades do portal; vazio → dev-backend (só dev)
NEXT_PUBLIC_BRAND=                     # marca (white-label); fixada pelo compose de produção
NEXT_PUBLIC_SYSTEM_PANEL_ENABLED=false
NEXT_PUBLIC_DEVELOPER_MODE=
```

`ACESSO_API_URL` × `API_BASE_URL`: [comunicação com a API](./comunicacao-api.md).

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
validar (homolog/prod) → `next build` (export) → `cap sync` → gravar a identidade do app → `gradlew
assemble*` → assinar → copiar o APK nomeado (`<Nome>-<ambiente>-n<nativa>-a<aplicação>-<data>.apk`) para
`builds/apk/`.

### Páginas publicadas no app

Um produto pode publicar no app só as páginas prontas para a loja (Apple 2.1/2.5 e
Google Play: nada incompleto, oculto ou dormente no pacote). A lista fica em
[src/config/mobile-release.json](../src/config/mobile-release.json): `routes`
(rotas publicadas, sem os grupos `(Nome)` do App Router) e `profiles` (perfis que
entram no app). **Lista vazia = sem restrição** (padrão da base). A web não é
afetada. A lista vale para os APKs de homologação e produção; o APK debug
(desenvolvimento) leva todas as páginas e todos os perfis, para testar o que ainda
não saiu.

- **Build:** todo build mobile roda numa cópia dos fontes em `.dist-build/source`.
  Em homologação e produção, apaga dela o `page.tsx` de cada rota fora da
  lista ([scripts/mobile-release.mjs](../scripts/mobile-release.mjs)); a página
  não chega ao `out/` nem ao APK. Rota da lista sem página falha o build. O
  catch-all de 404 (`[...notFound]`, incompatível com `output: export`) sai
  sempre, com ou sem lista; o 404 do app vem do `404.html` da not-found. No
  debug, sai só o que o export não aceita: o catch-all e as rotas de API (`src/app/api`).
- **App:** o build passa `NEXT_PUBLIC_BUILD_TARGET=mobile` e o app de
  homologação/produção restringe o menu, o acesso por rota e o perfil à mesma lista
  ([src/lib/auth/mobile-release.ts](../src/lib/auth/mobile-release.ts) —
  [autenticação](./autenticacao-e-permissoes.md) → "Perfis no app").
- **Liberar uma tela ou um perfil:** incluir na lista e gerar o app de novo.

### Identidade do app por marca

Cada marca é um app próprio na loja, e o APK só atualiza o app publicado com o mesmo `applicationId`, a mesma chave
e um `versionCode` maior. A marca vem de `NEXT_PUBLIC_BRAND`; o build de **produção sem marca falha**. Os ids
ficam em [scripts/mobile-apps.json](../scripts/mobile-apps.json): a base traz só `base` →
`com.multiplataforma.base`; cada produto registra ali as suas marcas (e em `config/brand.ts`).

[scripts/mobile-app.mjs](../scripts/mobile-app.mjs) grava no projeto `android/` (gerado pelo Capacitor, fora do git)
o `applicationId`, o `versionName`, o `versionCode` e o nome exibido. Fora de produção o `applicationId` leva o
sufixo do ambiente (`com.multiplataforma.base.homolog`), para o app de teste conviver com o publicado no aparelho.

- **Versão:** `versionName` e `versionCode` vêm da **versão nativa** (`nativeVersion` em
  [scripts/mobile-apps.json](../scripts/mobile-apps.json)), comum a todas as marcas e separada da versão da
  aplicação ([Release](#release)).
- **`versionCode`:** `MAJOR·100000 + MINOR·1000 + PATCH·10` (3.1.4 → 301040; 4.0.0 → 400000). Minor e patch vão
  até 99; versão fora de `MAJOR.MINOR.PATCH` falha o build.
- **Ícone:** gerado a cada build do APK a partir de `public/brands/<marca>/icon` (1024 px, fundo transparente).
  Sem `icon`, cai no `favicon` e depois no `logo`, cada um em PNG ou SVG (a base usa o `favicon.svg`). Saem o
  ícone clássico, o redondo e o adaptativo (camada da frente na zona segura, fundo branco) em todas as densidades.
- **Ícone de notificação:** `public/brands/<marca>/notification.png` (ou `.svg`), silhueta branca em fundo
  transparente (o Android usa só o alfa; ícone colorido vira um quadrado branco). O build grava
  `drawable-*/ic_stat_notify.png` (24 dp) e o registra no `AndroidManifest.xml` como ícone padrão das notificações
  push (FCM); as notificações locais usam o mesmo nome (`LocalNotifications.smallIcon` em `capacitor.config.ts`).
  No iOS a notificação mostra o ícone do app.
- **Assinatura de produção:** um arquivo por marca, `.secrets/android-signing.production.<marca>.env`, com as chaves
  de `.secrets/android-signing.production.env.example` apontando para o keystore do app publicado (ou as variáveis
  `ANDROID_KEYSTORE_*` no ambiente). Sem ele o build falha; produção nunca usa keystore gerado. Homologação gera e
  reaproveita o próprio keystore.

## Build desktop (Tauri)

O app desktop (casca em [src-tauri/](../src-tauri), [plataforma nativa](./plataforma-nativa.md) → "Desktop
(Tauri)") empacota o mesmo export estático do mobile (`out/`) para **Windows x64** (instalador NSIS) e **Linux
x64** (`.deb` e `.AppImage`). Compila **só no container**
([desktop.Dockerfile](../docker/images/desktop.Dockerfile), um compose por ambiente em
`docker/<develop|homolog|production>/desktop/`, ver [Build em Docker](#build-em-docker)): Rust, cargo-xwin, NSIS
e WebKitGTK não são instalados na máquina.

```bash
npm run docker:image:desktop:windows   # imagem Windows (1ª vez ou ao mudar o Dockerfile)
npm run docker:image:desktop:linux     # imagem Linux (inclui a do Windows)
npm run desktop:debug                  # development, build debug (com DevTools)
npm run desktop -- --exe-only          # homologação, só o .exe do Windows (dia a dia)
npm run desktop                        # homologação, instalador NSIS
npm run desktop:production             # produção, instalador (exige NEXT_PUBLIC_BRAND)
npm run docker:homolog:desktop:windows -- --exe-only   # pipeline inteiro no container, só Windows
npm run docker:production:desktop:linux                # pipeline inteiro no container, só Linux
```

- **Imagens:** o [desktop.Dockerfile](../docker/images/desktop.Dockerfile) tem dois estágios. `windows` é enxuto
  (cargo-xwin + NSIS, com um `.pc` mínimo da biblioteca de bandeja para o bundler); `linux` acrescenta
  WebKitGTK/GTK, que são a parte demorada da imagem, e também compila o Windows. Cada serviço do compose
  (`windows`, `linux`) usa o seu estágio; os composes dos três ambientes usam as mesmas imagens e volumes.
- **Onde roda:** `npm run desktop*` faz o export do Next no host e só compila no container do compose do ambiente
  (serviço `windows` com `--platform=windows`, senão `linux`); `npm run docker:<ambiente>:desktop:<sistema>` roda
  o pipeline inteiro no container ([scripts/docker-desktop.mjs](../scripts/docker-desktop.mjs), `node_modules`
  Linux num volume próprio), sem depender do Node do host. O ambiente e o sistema vêm do compose e do serviço;
  parâmetros: `--debug` (em develop) e `--exe-only`.
- **Sistema (fluxo pelo host):** `--platform=windows|linux|all` (padrão `windows`), ex.:
  `npm run desktop -- --platform=all`.
- **Só o `.exe` (`--exe-only`):** `cargo tauri build --no-bundle`, sem o NSIS nem os downloads do bundler; sai
  `<Nome>-<ambiente>-…-windows.exe`. Só com `--platform=windows` e fora de produção: produção gera só
  instalador.
- **Licença da Microsoft:** o build Windows baixa o CRT/SDK da Microsoft (cargo-xwin); a licença está aceita no
  compose (`XWIN_ACCEPT_LICENSE: "1"`).
- **Perfil release:** produção usa o perfil de [src-tauri/Cargo.toml](../src-tauri/Cargo.toml) (LTO completo,
  `codegen-units = 1`); homologação e development usam LTO `thin` e 16 codegen units, porque o link com LTO
  completo é single-thread e pesado em RAM. `src-tauri/Cargo.lock` é versionado (dependências fixas).
- **Tempos:** a 1ª execução baixa crates, o CRT/SDK da Microsoft (~1 GB) e compila todas as dependências do
  Tauri, com longos trechos sem saída. Para achar onde parou: `docker stats` em outro terminal e, num shell do
  container (`docker compose -f docker/develop/desktop/docker-compose.yml run --rm --entrypoint sh windows`), rodar em
  `/src/src-tauri` os passos separados (`cargo xwin check --target x86_64-pc-windows-msvc`, depois o
  `cargo tauri build --no-bundle`). Exit 137 é falta de memória no Docker Desktop/WSL2.
- **Pipeline** ([scripts/desktop-build.mjs](../scripts/desktop-build.mjs)): carregar env → identidade da marca →
  export (`build-target.mjs desktop`, que valida o env e verifica o `out/` em homologação/produção, como no
  mobile) → ícones e config do Tauri da marca → `cargo tauri build` no container → artefatos nomeados
  (`<Nome>-<ambiente>-n<nativa>-a<aplicação>-<data>-{windows.exe,windows-setup.exe,linux.deb,linux.AppImage}`) em
  `builds/desktop/`.
- **Páginas:** todas, como a web. O alvo passa `NEXT_PUBLIC_BUILD_TARGET=desktop`; a lista de
  [Páginas publicadas no app](#páginas-publicadas-no-app) vale só para `mobile`. Sai só o que o export não aceita
  (rotas dinâmicas, rotas de API, catch-all).
- **Identidade por marca:** [scripts/desktop-apps.json](../scripts/desktop-apps.json) (`appId`, nome) com a
  versão nativa própria do desktop (`nativeVersion`). Fora de produção o identificador leva o sufixo do ambiente
  (`com.multiplataforma.base.homolog`), para o app de teste conviver com o publicado. Ícones gerados a partir do
  mesmo ícone da marca do APK (`public/brands/<marca>/icon` → `favicon` → `logo`), só quando a marca ou o ícone
  de origem mudam (`src-tauri/icons/.source`); o `tauri.build.json` só é regravado se mudar. Assim o `build.rs`
  do Tauri não recompila o app a cada build. Para forçar, apagar `src-tauri/icons/`.
- **CSP:** a de [src-tauri/tauri.conf.json](../src-tauri/tauri.conf.json), com as origens de
  `NEXT_PUBLIC_ACESSO_API_URL` e `NEXT_PUBLIC_API_BASE_URL` acrescentadas ao `connect-src` no build. O Tauri
  injeta hashes no `script-src`, mas não no `style-src` (`dangerousDisableAssetCspModification: ["style-src"]`):
  com hash, o navegador ignora o `'unsafe-inline'` e bloqueia os `<style>` criados em runtime (cores dos
  gráficos em [chart.tsx](../src/components/ui/chart.tsx)).
- **Gerados (fora do git):** `src-tauri/{target,gen,icons}/` e `src-tauri/tauri.build.json`.
- **Fora do escopo atual:** macOS (exige máquina macOS), assinatura de código (o Windows mostra o aviso do
  SmartScreen), atualização automática e lojas; a esteira não gera os instaladores.
- **API real:** o backend precisa aceitar a origem do app (`http://tauri.localhost` no Windows,
  `tauri://localhost` no Linux) no CORS e o login sem atestado de app; o Turnstile precisa aceitar o hostname do
  app.

## Atualização remota do app

O app mobile pode receber **pacotes web assinados** (o `out/` do build: HTML, CSS, JS e assets) sem nova versão de
loja, pelo plugin `@capawesome/capacitor-live-update`. Requisitos e critérios:
`.agents/specs/atualizacao-remota-app.md`.

**Desligada por padrão e removida dos artefatos.** O recurso só existe no app gerado com `APP_UPDATE_ENABLED=true`.
Sem a variável — e sempre na web — ele sai da entrada de build como o código de dev
([ferramentas de desenvolvimento](./ferramentas-dev.md) → "Fora dos artefatos"):

- a pasta [src/app-update](../src/app-update/) e as regiões `// @app-update:start` … `// @app-update:end` são removidas
  antes de compilar ([dev-only.mjs](../scripts/dev-only.mjs) declara as partes removíveis);
- o [capacitor.config.ts](../capacitor.config.ts) passa `includePlugins` sem o plugin, então o `cap sync` não o
  registra e o APK não leva o código nativo dele nem a configuração;
- as variáveis `NEXT_PUBLIC_APP_UPDATE_*` não chegam ao bundle;
- o `verify-dist` falha se achar no artefato a pasta, o marcador, o plugin, a configuração ou os textos do módulo.

Fora de `src/app-update`, o produto só toca o módulo dentro de regiões `@app-update` (hoje: o `AppUpdateGate` no
`AppStructure` e o botão do painel do modo desenvolvedor); o `check:arch` barra import do módulo ou do plugin fora delas.

**Ligar na geração do app:**

| Variável | Onde | Efeito |
| --- | --- | --- |
| `APP_UPDATE_ENABLED=true` | ambiente do `npm run apk*`/`mobile:debug`/`app-update:bundle` (nos composes do app: variável do host) | mantém o módulo e o plugin |
| `NEXT_PUBLIC_APP_UPDATE_URL` | idem; nos composes vem do host e prevalece sobre os `.env` | URL **HTTPS** do `manifest.json` do canal (`https://<web do canal>/app-updates/manifest.json`); obrigatória quando ligada, o build falha sem ela |
| `APP_UPDATE_MANDATORY=true` ou `--mandatory` | `app-update:bundle` | marca o pacote como obrigatório |

O APK de release não aceita HTTP sem TLS: o canal precisa ser servido por HTTPS.

**Canal, versões e chaves:**

- Um canal por marca × ambiente (`base/homolog`, `base/production`…). O app só aceita manifesto do próprio
  canal, de versão da aplicação maior que a dele e cuja versão nativa mínima (a `nativeVersion` do build do pacote,
  [Release](#release)) seja atendida pela instalada.
- Chave RSA por canal, só usada pelos scripts ([app-update-signing.mjs](../scripts/app-update-signing.mjs)):
  produção exige `.secrets/app-update.production.<marca>.pem` (nunca gerada); homologação e desenvolvimento geram
  `.secrets/app-update.<ambiente>.pem` na primeira vez (vale para a máquina que a gerou). A chave pública vai no APK;
  com ela o plugin **recusa pacote sem assinatura válida**. Trocar a chave de produção exige versão de loja nova.

**Gerar e publicar um pacote:**

1. `APP_UPDATE_ENABLED=true NEXT_PUBLIC_APP_UPDATE_URL=<url> npm run app-update:bundle -- --env=<homolog|production>`
   (com `NEXT_PUBLIC_BRAND` em produção): build mobile com o recurso, `out/` verificado, zip assinado e
   `manifest.json` em `dist/app-updates/` ([app-update-bundle.mjs](../scripts/app-update-bundle.mjs)).
2. Build da imagem web do mesmo canal: o [web.Dockerfile](../docker/images/web.Dockerfile) confere se o pacote é do canal e da
   versão da imagem e o serve em `/app-updates/`. Sem pacote, a pasta fica vazia. A chave fica no host, fora da imagem.

**No app:** ao abrir, o `AppUpdateGate` confirma o pacote atual, consulta o manifesto e baixa o pacote novo, que vale na
**abertura seguinte**. Pacote obrigatório é aplicado na hora, com aviso em tela cheia. Sem rede ou com falha, segue no
pacote atual. Se um pacote não confirmar a abertura em 10 s, o plugin volta ao pacote embutido no APK e o app não
aplica aquele pacote de novo.

**Regras das lojas (o que não fazer):**

| Não faça | Por quê |
| --- | --- |
| Pacote com código nativo (dex, JAR, `.so`) ou qualquer coisa além do `out/` | Google Play só aceita fora da loja o código interpretado no WebView; Apple 2.5.2 e contrato 3.3.1 B só aceitam código interpretado |
| Liberar por pacote perfil, público ou recurso grande que não passou pela revisão, ou deixar telas escondidas no app para ligar depois | Apple 2.5.19 (sem recurso oculto ou dormente), 2.3.1(a) e 2.3.12 (recurso novo descrito à revisão e nas novidades); contrato 3.3.1 B (não mudar o propósito anunciado) |
| Pacote sem assinatura, de outro canal ou de endereço vindo do conteúdo | Google Play barra WebView com interface JavaScript carregando conteúdo não confiável; contrato 3.3.1 B (não contornar a segurança do sistema) |
| Mudar por pacote permissão nativa, plugin ou coleta de dados | exigem versão de loja com as declarações de privacidade/segurança dos dados atualizadas |
| `--mandatory` por rotina | o pacote obrigatório interrompe o uso; é para correção crítica |

Políticas: [App Store Review Guidelines](https://developer.apple.com/app-store/review/guidelines/) ·
[Apple Developer Program License Agreement](https://developer.apple.com/support/terms/apple-developer-program-license-agreement/)
(3.3.1 B) · [Google Play — Abuso de dispositivo e rede](https://support.google.com/googleplay/android-developer/answer/9888379).
O texto das políticas muda: confira antes de publicar a primeira versão com o recurso ligado.

### Atualização no desenvolvimento

O APK debug (`npm run mobile:debug`) sai com a atualização remota **ligada** e atualiza sozinho a partir do
`npm run dev`, sem reinstalar. `APP_UPDATE_ENABLED=false` no build do APK desliga.

- **Endereço:** `http://<IP da rede>:<PORT>/api/dev/app-update/manifest`, com o IP da máquina
  (`resolveDevHostIp`; `DEV_HOST_IP` força outro) e a porta do `.env`. Fica fixado no APK: mudou o IP, gere o APK
  de novo. O celular precisa estar na mesma rede e o firewall precisa liberar a porta do dev.
- **Rotas** (só no `npm run dev`; `src/app/api/dev` sai dos builds como código de dev):
  `manifest` compara um resumo dos fontes (`src/`, `public/`, `.env`, `package.json`, configs) com o do APK
  instalado e o do último pacote. Mudou: dispara o build do pacote em segundo plano (1–2 min) e responde `204`
  enquanto isso; pronto: devolve o manifesto, **obrigatório**. `bundle` entrega o zip.
- **Pacote** ([scripts/app-update-dev.mjs](../scripts/app-update-dev.mjs)): build mobile de desenvolvimento (todas as
  páginas, código de dev incluído) em cópia própria (`.dist-build-dev`), assinado com a chave de desenvolvimento,
  versão `MAJOR.MINOR.<AAMMDDhhmmss>` (sempre maior que a do APK) e saída em `dist/app-update-dev/`
  (`build.log` com a saída do build). Build que falhou não se repete até os fontes mudarem de novo.
- **No app:** o APK debug consulta o manifesto **ao abrir** e quando se toca em **"Verificar atualização do app"** no
  painel do modo desenvolvedor (pedido do painel ao `AppUpdateGate` em região `@dev-only`). Pacote encontrado é
  aplicado na hora, com o aviso em tela cheia. Sem pacote no momento (ainda gerando), toque de novo depois.
- O `mobile:debug` grava em `dist/app-update-dev/apk.json` a versão, a marca e o resumo dos fontes do APK gerado:
  sem ele, a rota não gera pacote. Mudou o código nativo (plugin, permissão, `capacitor.config.ts`): gere o APK.

Este pacote nunca é publicado: é de desenvolvimento e leva o código de dev.

## Build em Docker

A matriz de deploy é **alvo (web/APK/desktop) × ambiente**, com a marca como parâmetro. A configuração fica em
[docker/](../docker): os Dockerfiles em `docker/images/` e um compose por **ambiente → alvo**. Web, App e desktop
têm ciclos de build independentes, então **não** compartilham compose. Imagens:

| Dockerfile | Imagem | Tipo |
| --- | --- | --- |
| [web.Dockerfile](../docker/images/web.Dockerfile) | `multiplataforma-web:<ambiente>` | auto-contida e deployável (`next build` standalone + server Node mínimo); por projeto |
| [android.Dockerfile](../docker/images/android.Dockerfile) | `toolchain-android:jdk21-node22-sdk35` | toolchain (JDK 21 + Node 22 + Android SDK), projeto montado em runtime, APK em `builds/apk/` |
| [desktop.Dockerfile](../docker/images/desktop.Dockerfile) | `toolchain-tauri:rust1.99-node22-{windows,linux}` | toolchain do app desktop ([Build desktop (Tauri)](#build-desktop-tauri)) |

```
docker/
├── images/                         # Dockerfiles (web, android, desktop)
├── develop/
│   ├── app/docker-compose.yml      # APK debug (a Web em dev roda via `npm run dev`)
│   └── desktop/docker-compose.yml  # .exe/instaladores de development (debug)
├── homolog/
│   ├── web/docker-compose.yml
│   ├── app/docker-compose.yml
│   └── desktop/docker-compose.yml
├── production/
│   ├── web/docker-compose.yml      # imagem web de produção
│   └── desktop/docker-compose.yml  # instaladores Windows (NSIS) e Linux (.deb/.AppImage)
└── ci/docker-compose.yml           # esteira emulada (ver "Esteira (CI)")
```

```bash
npm run docker:image:android               # imagem de toolchain do APK (1ª vez ou ao mudar o Dockerfile)
npm run docker:develop:app                 # APK debug (com painel + devtools)
npm run docker:homolog:web                 # sobe a web de homolog -> http://localhost:3000
npm run docker:homolog:app                 # APK release de homolog
NEXT_PUBLIC_BRAND=<marca> npm run docker:production:web   # sobe a web de produção da marca
```

**Imagens e caches compartilhados entre projetos.** As toolchains (`toolchain-android`, `toolchain-tauri`) não
levam nada do projeto: o nome é genérico e a tag traz as versões da toolchain. Outro projeto com a mesma toolchain
usa a mesma imagem em vez de criar uma igual; quando uma versão muda (ex.: Rust), muda a tag, e um projeto não
sobrescreve a imagem de outro. Os caches de download também são comuns (`toolchain-cargo-registry`,
`toolchain-xwin-cache`, `toolchain-tauri-cache`, `toolchain-gradle-cache`, `toolchain-npm-cache`). Ficam **por
projeto**, com o prefixo `mpb-`, só o que depende do código: `node_modules` (`mpb-node_modules`,
`mpb-desktop-node_modules`), a saída do cargo (`mpb-desktop-target`) e a imagem web.

**Produção:** `docker/production` gera a **web** e os **instaladores desktop** (Windows NSIS; Linux `.deb` e
`.AppImage`). A marca vem de `NEXT_PUBLIC_BRAND`, obrigatória: o compose falha sem ela (na web vira o build-arg
`BRAND`, inlined no bundle; ver [tema e marca](./tema-marca-e-idioma.md) → "Marca"). Homolog/develop usam o
default. Android e iOS de produção **não** têm compose na base: a publicação nas lojas segue outra via (Expo ou
equivalente; iOS exige macOS).

- Scripts: `docker:<ambiente>:<alvo>` (`web`, `app`, `desktop:windows`, `desktop:linux`); a web tem
  `:image` (só `build`) e `:down` (`compose down`). Imagens de toolchain: `docker:image:*`.
- `WEB_PORT` (env do host): porta publicada da web (default `3000`).
- Em develop **não** há Docker para a Web — use `npm run dev` (Turbopack/hot reload).

## Verificações e testes

| Comando | Cobre |
| --- | --- |
| `npm run typecheck` | `tsc --noEmit` no projeto inteiro |
| `npm run lint` | ESLint, inclusive as regras de fronteira ([enforcement](./enforcement-arquitetura.md)) |
| `npm test` | `node --test`: 19 suítes de lógica pura em `tests/` (`account-placement`, `app-env`, `app-update`, `app-update-dev`, `ci`, `cliente-logout`, `date-field`, `deps-outdated`, `dev-only`, `dev-webcrypto`, `http`, `layout`, `mobile-app`, `mobile-release`, `module-engine`, `navigation-pins`, `release-history`, `toast-confirm`, `verify-dist`) + os testes dos scripts de lojas e PWA (`scripts/store/*.test.mjs`, `scripts/pwa/*.test.mjs`) |
| `npm run store:validar` · `npm run pwa:validar` | validam o material das lojas e o manifest do PWA; na base falham por falta de `store/` e de manifest, o esperado ([visão geral](./visao-geral.md) → "Base e produto") |
| `npm run check:arch` | estrutura de `src/`, gerados de `.agents/` em dia e [mapa de src](./mapa-src.md) igual ao disco |
| `npm run env:check` | flags de ambiente proibidas em homologação/produção |
| `npm run dist:check`, `npm run verify:dist <x>` | entrada de build sem código de dev; vestígio de dev no artefato |
| `npm run deps:check` | dependências desatualizadas e LTS do Node (ver "Dependências desatualizadas") |

Não há teste de componente nem de tela: o comportamento visual (desktop × mobile, perfis) é conferido à mão. Quais
rodar antes de entregar: [conduta](./conduta-agentes.md) → "Validação".

### Dependências desatualizadas

`npm run deps:check` ([scripts/deps-outdated.mjs](../scripts/deps-outdated.mjs), sem dependência) só sugere: não
instala nada nem altera o `package.json` (atualizar dependência segue [conduta](./conduta-agentes.md) →
"Autorizações").

| Alvo | Sugestão |
| --- | --- |
| Pacotes do `npm outdated` | a versão estável mais nova (sem alfa, beta, RC ou canary; majors incluídas), com o tipo de salto (patch, minor, major; em `0.y.z` trocar `y` é major), que roda no Node do projeto: a última versão da major do `.nvmrc`, conferida pelo `engines.node` publicado no registro do npm. Se a mais nova de todas exigir outro Node, ela aparece junto (`2.0.0 exige Node >=24`) |
| Node | a última LTS em `nodejs.org`, quando maior que a do `.nvmrc`, lembrando de trocar junto o `engines` e as imagens Docker |

- `engines.node` com sintaxe não reconhecida aparece como "engines não verificado", em vez de ser omitido. Pacote
  sem `engines.node` não tem restrição.
- A compatibilidade garante que o pacote declara rodar no Node do projeto, não que a API continue igual: a troca de
  major é confirmada pelas verificações acima e pelo teste das telas.
- Código de saída: 0 sem sugestão, 2 com sugestão, 1 em erro (rede, `npm outdated` ou resposta inválida).

## Esteira (CI)

Há duas esteiras:

- **GitHub Actions** ([.github/workflows/ci.yml](../.github/workflows/ci.yml)), ativa: em todo push na `master` e
  em PR roda os checks (`npm ci`, `next typegen` + `typecheck`, `lint`, `test`, `check:arch`, `dist:check`); no push
  na `master`, se os checks passam, o job **Versionar** publica a versão ("Release"). Não gera build web nem APK.
- **Completa** ([scripts/ci.mjs](../scripts/ci.mjs), sem dependência): checks + builds web e APK. Roda na esteira
  emulada em Docker e nos modelos de GitHub Actions e Jenkins, que ficam como `.example` e não disparam enquanto
  não forem copiados. O restante desta seção descreve essa esteira.

| Etapa | Comando | Falha |
| --- | --- | --- |
| `install` | `npm ci` | reprova |
| `typecheck` | `next typegen` (tipos de rota, sem build) + `npm run typecheck` | reprova |
| `lint`, `test`, `check-arch`, `dist-check` | as verificações de "Verificações e testes" | reprova |
| `deps` | `npm run deps:check` | só aviso |
| `build-web` | build web do ambiente (inclui o `verify-dist`) | reprova |
| `build-apk` | `cap add android` + `npm run apk` (`apk:production` em produção) | reprova |

```bash
npm run docker:ci          # esteira emulada: todas as etapas, APK em builds/ci/
npm run docker:image:android   # só a imagem (a mesma do APK, android.Dockerfile)
```

- **Esteira emulada** ([docker/ci/docker-compose.yml](../docker/ci/docker-compose.yml)): monta a árvore de trabalho
  atual (inclui mudanças não commitadas) só leitura e roda numa cópia dentro do container, sem `node_modules`,
  saídas de build, `android/`/`ios/` (gerada na etapa do APK, como num checkout novo), `.git`, `references/`, `.secrets/` nem
  `.env*` fora dos modelos `*.example`. A árvore do host não muda; o APK sai em `builds/ci/` (ignorada pelo git).
- **Parâmetros** (variáveis do host no compose, `vars`/`secrets` no Actions, parâmetros/credenciais no Jenkins):

  | Variável | Padrão | Efeito |
  | --- | --- | --- |
  | `CI_APP_ENV` | `homolog` | ambiente dos builds (`homolog` \| `production`) |
  | `CI_ENV_FILE` | `.env.<ambiente>.example` | arquivo que vira o `.env.<ambiente>` da cópia |
  | `CI_STAGES` | todas | etapas separadas por vírgula, na ordem da tabela |
  | `ANDROID_KEYSTORE_*` | — | assinatura do APK; sem elas, homolog gera keystore automático e produção falha |

- **Resultado:** resumo com status e duração de cada etapa; na falha, a etapa e o trecho final da saída (até 1.500
  caracteres, com as senhas do keystore mascaradas) e saída 1. A primeira execução baixa dependências e Gradle; os
  volumes de cache compartilhados (`toolchain-npm-cache`, `toolchain-gradle-cache`) aceleram as seguintes.
- **Modelos:** [.github/workflows/ci.yml.example](../.github/workflows/ci.yml.example) (push na `master` e PR;
  `[skip ci]` nativo) e [Jenkinsfile.example](../Jenkinsfile.example) (agente com Docker; `[skip ci]` conferido na
  primeira etapa). Para ativar, copiar sem o `.example`. Os dois rodam o compose da esteira emulada.
- `npm run ci:run` roda as etapas direto na árvore atual, sem cópia (para um runner que já faz o checkout): usa o
  `.env.<ambiente>` existente ou cria a partir do `CI_ENV_FILE`, e o `npm ci` recria o `node_modules`.
- A esteira completa só valida e gera artefato: não versiona, não publica nem faz push.

## Release

Há duas versões do front:

| Versão | Onde fica | Quando sobe | Identifica |
| --- | --- | --- | --- |
| **Aplicação** | `version` do `package.json` + tag `vX.Y.Z` | a cada push na `master` com checks verdes, pelo job **Versionar** da esteira do GitHub | o código web e mobile gerado pelo commit (e o pacote da atualização remota) |
| **Nativa** | `nativeVersion` em [scripts/mobile-apps.json](../scripts/mobile-apps.json) | à mão, só em versão de loja (camada nativa: plugin, permissão, Capacitor, identidade) | o app nas lojas: `versionName` e `versionCode` ([Identidade do app por marca](#identidade-do-app-por-marca)) |

A versão nativa nunca desce nem se repete: a loja recusa `versionCode` igual ou menor.

### Versão da aplicação

[Versionamento semântico](https://semver.org/lang/pt-BR/) `MAJOR.MINOR.PATCH` com o
[semantic-release](https://semantic-release.gitbook.io/) ([.releaserc.json](../.releaserc.json)). No job
**Versionar**, ele calcula a versão pelos commits desde a última tag `v*`, atualiza `CHANGELOG.md`, `package.json` e
`package-lock.json`, cria a tag `vX.Y.Z` e empurra o commit `chore(release): X.Y.Z [skip ci]` para a `master` (o
`[skip ci]` impede nova execução). Vários commits num push geram **uma** versão, com o maior bump entre eles.

| Commit (Conventional Commits, `tipo: emoji descrição`) | Bump |
| --- | --- |
| `tipo!:` ou rodapé `BREAKING CHANGE:` | major — **minor na fase beta** |
| `feat` | minor |
| `fix`, `perf`, `refactor`, `docs`, `ci`, `chore`, `build` | patch |
| outros (`style`, `test`…) | nenhum |

```bash
npm run release:dry-run    # próxima versão e notas, sem tag nem commit (local)
npm run release:history    # versões reconstruídas do histórico da master (JSON; --markdown gera a tabela)
```

**Fase beta (`0.y.z`).** A aplicação está em fase beta: não há major, e quebra de compatibilidade sobe o minor
(regra `breaking → minor` no `.releaserc.json`). Para declarar a `1.0.0`, remova essa regra no mesmo commit da
quebra (`feat!:`) que marca a versão estável. Release é ação de publicação:
[conduta](./conduta-agentes.md) → "Autorizações".

**Histórico reconstruído.** As versões anteriores à esteira foram calculadas por
[scripts/release/calcular-versao-historico.mjs](../scripts/release/calcular-versao-historico.mjs) (mesma regra do
release: um dia com commits na `master` = uma versão, com o maior bump do dia; commits fora do padrão classificados
por palavra-chave em português) e marcadas com tags retroativas:

| Data | Versão | Bump | Commit |
| --- | --- | --- | --- |
| 2026-07-17 | `v0.3.0` | major (minor na fase beta) | `0322f85` |
| 2026-06-03 | `v0.2.0` | major (minor na fase beta) | `424af4a` |
| 2026-06-01 | `v0.1.0` | primeira | `0d8ed77` |

A partir delas, cada versão vem do job **Versionar**.

Voltar ao [índice](./README.md).
