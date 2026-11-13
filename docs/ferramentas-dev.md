# Ferramentas de desenvolvimento

O **modo desenvolvedor**, o **painel do sistema** e os demais recursos de dev
existem só no desenvolvimento local (`npm run dev`). São ferramentas do time —
não viram navegação nem lógica de produto — e **não podem estar nos artefatos de
homologação e produção** (web, Docker, APK): nem desligados, nem escondidos, nem
inacessíveis.

> **Regra geral (segurança):** **qualquer** recurso de desenvolvimento — painel,
> flag, atalho de login, captcha desligado, dados mockados (dev-backend), ignorar
> TLS, diagnóstico técnico de erro, substituto de WebCrypto, proxy de API — mora
> em `src/dev-tools` (ou `src/dev-backend`) e só entra no produto por **regiões
> `@dev-only`**, que a entrada de build de homologação/produção remove antes de
> compilar (ver "Fora dos artefatos"). Gate de runtime (`if (devMode)`,
> `return null`) **não** conta como exclusão. Conduta:
> [conduta-agentes](./conduta-agentes.md) → "Recurso de desenvolvimento só em desenvolvimento".

## Módulo dev-tools

| Pasta | Conteúdo |
| --- | --- |
| [src/dev-tools/ui](../src/dev-tools/ui) | React: modo desenvolvedor (contexto + painel), painel do sistema, acesso rápido do login, dicionário de dev. Entrada `@/dev-tools/ui`. |
| [src/dev-tools/runtime](../src/dev-tools/runtime) | Sem React: diagnóstico de erro, credenciais do acesso rápido, flag do painel do sistema, proxy de API, chave de teste do captcha, substituto de WebCrypto. Entrada `@/dev-tools/runtime`; não importa components, contexts, services nem dev-backend (lint de fronteira), porque `lib/` e `services/` a usam. |
| [src/dev-tools/locales](../src/dev-tools/locales) | Textos dos painéis e do acesso rápido (`pt-br`, `en`, `es-es`), fora de `public/locales`. |

O [dev-backend](./comunicacao-api.md) (falso backend e usuários demo) também é
exclusivo de dev e segue as mesmas regras.

**Onde o produto toca o dev** — sempre numa região marcada, pequena, com o
comportamento de produção no código que sobra:

```ts
// @dev-only:start
import { devApiBase } from "@/dev-tools/runtime";
// @dev-only:end

let raiz = ACESSO_API_URL;
// @dev-only:start
raiz = devApiBase(raiz);
// @dev-only:end
```

- **Linhas:** `// @dev-only:start` … `// @dev-only:end` (em JSX,
  `{/* @dev-only:start */}` … `{/* @dev-only:end */}`) — some do começo ao fim,
  inclusive as linhas dos marcadores.
- **Dentro da linha:** `/* @dev-only:start */ … /* @dev-only:end */`
  (ex.: `sitekey: /* @dev-only:start */ devTurnstileSiteKey() ?? /* @dev-only:end */ "0x4…"`).
- Sem aninhar. O `check:arch` falha com marcador sem par/aninhado e com import de
  `@/dev-tools`, `@/dev-backend` ou pacote só de dev (`@noble/*`, `@faker-js/faker`)
  fora de região — o mesmo vale para o `next.config.ts`.
- **Auditar ou remover recursos dev** = procurar `@dev-only` e `@/dev-tools`.
- Lista única do que é dev (pastas, imports, pacotes, marcadores):
  [scripts/dev-only.mjs](../scripts/dev-only.mjs). As rotas de demonstração
  `/portal/demo400` e `/portal/demo500` (texto aleatório do faker) e as rotas do
  canal de atualização do APK debug (`/api/dev`) estão nela.

## O que são

- **Modo desenvolvedor** ([developer-mode-context.tsx](../src/dev-tools/ui/developer-mode-context.tsx)
  + [developer-mode-painel.tsx](../src/dev-tools/ui/developer-mode-painel.tsx)):
  painel com flags (acesso rápido, blocos de formulário, Zod, dados mockados,
  ignorar TLS, desabilitar captcha), persistidas no storage, e o
  `WhitelabelSwitcher`, que troca a marca ao vivo
  ([tema e marca](./tema-marca-e-idioma.md) → "Marca").
- **Painel do sistema** ([system-context-panel.tsx](../src/dev-tools/ui/system-context-panel.tsx)):
  edita em runtime a geometria do `SystemContext` (alturas, larguras,
  visibilidade, z-index), os esquemas de cores (as 3 marcas e as cores por área)
  e salva a baseline no `system-config.json`
  ([tema e marca](./tema-marca-e-idioma.md) → "Configuração estática").

Os dois abrem pela sidebar direita no desktop e por botões flutuantes no topo no
mobile ([shell adaptativo](./shell-adaptativo.md)); os painéis `developer` e
`system` do `SystemContext` também são regiões `@dev-only`.

- **Diagnóstico do card de 500** ([error-diagnostics.ts](../src/dev-tools/runtime/error-diagnostics.ts)):
  só no erro de sistema (500, [app/error.tsx](../src/app/error.tsx)) e na falha
  de carga ([load-error-screen.tsx](../src/components/load-error-screen.tsx)), e
  só com o modo desenvolvedor ligado, o card mostra o erro real (nome, mensagem, status) e
  a origem — **Backend · API {status}**, **Backend · API (resposta fora do
  contrato)** ou **Front · web / web mobile / app mobile**. Modo desligado → volta
  a mensagem tratada; fora de dev só existe a mensagem tratada.

## Quando estão habilitados

Só no build de desenvolvimento (`npm run dev`, `mobile:debug`, builds com
`--env=development`). Dentro dele:

- modo desenvolvedor: `NEXT_PUBLIC_DEVELOPER_MODE=true` **ou** `NODE_ENV !== production`;
- painel do sistema: `NEXT_PUBLIC_SYSTEM_PANEL_ENABLED=true`.

## Fora dos artefatos

**Critério de aceite:** nenhum conteúdo exclusivo de dev (código, componentes,
mocks, imports, rotas, nomes de módulo, flags, textos, traduções, assets,
configurações, dependências, source maps) nos artefatos distribuídos de
homologação e produção — web, imagem Docker e APK.

**Estratégia:** a exclusão acontece **antes** de compilar, numa entrada de build
já sem o código de dev. Os fontes originais não mudam.

1. **Entrada limpa** — [prepare-dist-source.mjs](../scripts/prepare-dist-source.mjs):
   copia `src`, `public`, `package.json` e configs para `.dist-build/source`
   (sem `.env`, `node_modules`, `.next`, docs), apaga as pastas de dev e
   `public/docs` (diagramas da documentação), remove as regiões `@dev-only` e
   **falha** se sobrar marcador, import de dev ou pacote só de dev; então roda
   `next typegen` + `tsc` na cópia. `npm run dist:check` faz só isso.
2. **Build** — [build-target.mjs](../scripts/build-target.mjs) com `--env=homolog`
   ou `--env=production` (todos os fluxos: `npm run start`/`production`, APK,
   Docker): valida o ambiente (falha com flag/credencial de dev; sem
   `NEXT_PUBLIC_ACESSO_API_URL`, já que não há falso backend), compila a cópia com
   `.next` novo (sem cache do dev), monta o artefato — web em `dist/web`
   (standalone + `.next/static` + `public`, `package.json` só com nome/versão, sem
   `.map` nem os `.env*` que o standalone copia), mobile em `out/` — verifica e apaga a cópia (também em erro).
   Desenvolvimento compila os fontes como estão.
3. **Verificação** — [verify-dist.mjs](../scripts/verify-dist.mjs) (`npm run
   verify:dist <pasta|apk>`) falha o build ao encontrar:
   - **arquivos**: caminho de pasta/rota de dev, `.map`, `.env*`, pacote só de dev no
     `node_modules` do standalone;
   - **traces e manifests** do Next (`*.nft.json`, `*manifest*.json`,
     `required-server-files.json`) citando módulo, rota ou config de dev;
   - **texto** em todo arquivo do app (inclui `.dex`, recursos e
     `assets/public` do APK): identificadores **gerados** do código de dev
     (exports de `src/dev-tools`/`src/dev-backend` que o produto não define,
     textos de `src/dev-tools/locales` que o produto não usa) + lista fixa
     (`dev-tools`, `@dev-only`, flags `NEXT_PUBLIC_DEV*`, chave de teste do
     captcha, `@noble/*`…). Exportações de configuração de rota do Next
     (`dynamic`, `revalidate`, `runtime`, `metadata`…) não contam: aparecem em todo
     build. Falso positivo entra no `ALLOWLIST` com motivo.
   - **achados propositais** (`INTENTIONAL`): conteúdo da base que fica no artefato
     para demonstrar que a verificação funciona. Saem como `PROPOSITAL`, com o motivo
     e a contagem, e **não** reprovam; os demais achados reprovam normalmente. Hoje:
     as telas de exemplo `/portal/analytics`, `/portal/audit` e `/portal/persons`, e o
     texto "Modo desenvolvedor adaptado do Expo" do card da home. A entrada de texto
     traz o trecho exato (`context`): o mesmo identificador em outro lugar (ex.: o
     título do painel dev) continua reprovando. Produto que remover esse conteúdo
     apaga a entrada.

**Por fluxo:**

| Fluxo | Remoção do código de dev | Verificação |
| --- | --- | --- |
| `npm run dev` | nenhuma — tudo de dev disponível | — |
| `npm run start` / `production` | cópia em `.dist-build`, apagada no fim | `dist/web`; servido por [serve-dist.mjs](../scripts/serve-dist.mjs) |
| APK homolog/produção (`npm run apk*`, também no container) | cópia em `.dist-build`; `android/.../assets/public` limpo antes do `cap sync`; Gradle `clean assembleRelease` | `out/` antes do sync e o `.apk` final (descompactado) |
| Imagem Docker web | **etapa `strip`** do [web.Dockerfile](../docker/images/web.Dockerfile): `prepare-dist-source.mjs --in-place` no contexto copiado (só aceito sem `.git`, ou seja, dentro da imagem); a lista de identificadores é salva antes da remoção | `dist/web`, que é o que a imagem final copia |
| CI (quando existir) | os mesmos scripts — nenhum fluxo de homolog/produção chama `next build` direto | idem |

O mesmo mecanismo (pasta removida inteira, regiões marcadas, imports restritos e
verificação do artefato) remove a **atualização remota do app** (`src/app-update`,
regiões `@app-update`) da web sempre e do app gerado sem ela:
[ambiente e build](./ambiente-e-build.md) → "Atualização remota do app". As partes
removíveis ficam declaradas em [dev-only.mjs](../scripts/dev-only.mjs).

**Limites (dizer na entrega):** a verificação prova a ausência dos módulos de
dev na entrada de build e nos traces, e dos identificadores e arquivos conhecidos
nos artefatos. Não prova a ausência de comportamento equivalente escrito fora de
`src/dev-tools`/regiões marcadas, não cobre nomes que a minificação renomeou (por
isso a garantia principal é a entrada sem o código) e não impede engenharia
reversa do produto — o código de produção continua inspecionável.

## Captcha

`captchaDisabled` tira o Turnstile do login e do "esqueci a senha" na web, em
dev. A regra fica num lugar só, [use-captcha-required.ts](../src/hooks/use-captcha-required.ts):
fora de dev a região do modo desenvolvedor não existe e o captcha é **sempre**
exigido na web.

## Acesso rápido

Os botões "Entrar como …" do login ([quick-access.tsx](../src/dev-tools/ui/quick-access.tsx))
aparecem com o modo desenvolvedor e a flag `quickAccessEnabled`. Sem API
configurada, entram com os usuários fictícios do dev-backend
([demo-users.ts](../src/dev-backend/demo-users.ts), senha `demo`).

**Contra uma API real** (ex.: o backend local apontando para homolog): com
`NEXT_PUBLIC_ACESSO_API_URL` definida e estas variáveis preenchidas, aparece
"Entrar com a API", que usa as credenciais delas, que **cada dev coloca no próprio
`.env`** de desenvolvimento (ignorado pelo git; nunca no `.env.example` nem em código):

```text
NEXT_PUBLIC_DEV_QUICK_LOGIN=<login>
NEXT_PUBLIC_DEV_QUICK_PASSWORD=<senha>
```

- Lidas só por [quick-login.ts](../src/dev-tools/runtime/quick-login.ts). A
  validação de build **falha** se elas estiverem definidas num build de
  homolog/produção (por exemplo, no `.env.homolog` ou no `.env.production`).
- O login segue o mesmo caminho do formulário, **com o captcha**: sem o
  Turnstile marcado (e sem "Desabilitar captcha"), o botão mostra o aviso de
  captcha e não envia. Em dev o widget usa a chave de teste (ver "Acesso pela
  rede"), que aprova sozinha.
- Sem as variáveis, ou sem API configurada, o botão volta ao usuário do
  dev-backend.
- Como toda `NEXT_PUBLIC_*`, os valores vão para o JavaScript servido pelo dev
  server local. Use um usuário de teste e reinicie o dev server depois de
  editar o arquivo.

## Acesso pela rede

O dev server aberto por `http://<ip-da-máquina>` (celular, outra máquina,
terceiros) funciona como no `localhost`, sem configurar nada no aparelho de quem
acessa. Em desenvolvimento o `localhost`/`127.0.0.1` das URLs `NEXT_PUBLIC_*` do
`.env` vira o IP da máquina na rede ([ambiente e build](./ambiente-e-build.md) →
"Ambientes"), então o APK debug também alcança a API. Três recursos de
`@/dev-tools/runtime` cuidam do resto:

| Problema por HTTP num IP | Em dev | Em homolog/produção |
| --- | --- | --- |
| Sem contexto seguro, o navegador não expõe `crypto.subtle` e o DPoP não assina | [webcrypto.ts](../src/dev-tools/runtime/webcrypto.ts): o mesmo ES256 (P-256 + SHA-256) com `@noble/curves`/`@noble/hashes`, chave em bytes no IndexedDB. Com contexto seguro (localhost, HTTPS) continua o WebCrypto nativo | só WebCrypto; sem contexto seguro a prova falha ("a página precisa de HTTPS") |
| A chave do Turnstile só aceita os domínios cadastrados (erro 110200 no IP) | [turnstile.ts](../src/dev-tools/runtime/turnstile.ts): chave de teste da Cloudflare (`1x…AA`), vale em qualquer host e sempre aprova. O backend fora de produção não confere o token | chave real |
| `NEXT_PUBLIC_ACESSO_API_URL=http://localhost:8080` aponta para a máquina de quem acessa; CORS do backend só libera origens conhecidas | [api-proxy.ts](../src/dev-tools/runtime/api-proxy.ts): o navegador chama a mesma origem e o `rewrites` de dev do `next.config` repassa `/auth/v4/*` e `/private/v4/*` para a API. O proxy mantém o `Host` da página, então o `htu` da prova é a URL chamada | URL configurada, direto |

Limite conhecido: o cookie de renovação do web vem com `Secure`, e o navegador
não o grava numa origem HTTP fora de localhost. Pelo IP, a sessão dura o tempo
do token (15 min) e depois volta ao login. Resolver é do backend (não marcar
`Secure` fora de produção) ou usar `npm run dev:https`.

## Onde está no código

| Peça | Onde |
| --- | --- |
| Recursos com React | [src/dev-tools/ui/](../src/dev-tools/ui/) |
| Recursos sem React | [src/dev-tools/runtime/](../src/dev-tools/runtime/) |
| Textos dos painéis | [src/dev-tools/locales/](../src/dev-tools/locales/) |
| Regra do captcha | [src/hooks/use-captcha-required.ts](../src/hooks/use-captcha-required.ts) |
| Remoção do código de dev | [scripts/prepare-dist-source.mjs](../scripts/prepare-dist-source.mjs) |
| Verificação do artefato | [scripts/verify-dist.mjs](../scripts/verify-dist.mjs) |

Voltar ao [índice](./README.md).
