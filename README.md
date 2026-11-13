# Base Multiplataforma

![Next.js](https://img.shields.io/badge/framework-next.js_16.2.6-000000)
![React](https://img.shields.io/badge/ui-react_19.2.4-61DAFB)
![Capacitor](https://img.shields.io/badge/mobile-capacitor_8.3.4-119EFF)
![Tauri](https://img.shields.io/badge/desktop-tauri_2-24C8D8)
![TypeScript](https://img.shields.io/badge/language-typescript_5-3178C6)
![Zod](https://img.shields.io/badge/validation-zod_4.4.3-3E67B1)
![Tailwind](https://img.shields.io/badge/style-tailwindcss_4-38BDF8)
![i18next](https://img.shields.io/badge/i18n-i18next_26.3.0-26A69A)
![Node.js](https://img.shields.io/badge/node-%3E%3D22-5FA04E)

Base reutilizável para produtos **multiplataforma** em `Next.js` (App Router) com
`Capacitor` e `Tauri`. O mesmo código entrega uma experiência **web (desktop)**, uma
**mobile encapsulada** (APK) e um **app desktop** (Windows/Linux), com a malha física da tela (Header, Sidebars,
Conteúdo, Footer) controlada em runtime pelo `SystemContext`. Cada produto é
construído sobre ela e consome a sua própria API ([comunicação com a API](./docs/comunicacao-api.md)).

> Código em inglês, documentação em pt-BR.

## 1. Requisitos

- Node.js **>= 22** (`.nvmrc`) e npm
- Android Studio / Android SDK (e JDK 21 para o Gradle), para o APK local
- macOS com Xcode, para iOS
- Docker (opcional), para os builds de web e APK em contêiner
- Nenhum backend em desenvolvimento: sem as variáveis de API, login e telas usam o `dev-backend`

## 2. Início rápido

```bash
npm install
npm run dev          # http://localhost:3000 (sem API configurada usa o dev-backend)
```

Variáveis de ambiente e acesso pela rede local: [ambiente e build](./docs/ambiente-e-build.md) → "Ambientes".

## 3. Estrutura do projeto

```text
src/app/                 rotas finas (page.tsx → tela em components/), layouts e boundaries
src/components/          telas por módulo; ui/ = design system; layout/ = malha física
src/contexts/            providers globais (System, Device, Auth, Theme, Brand, Language, Navigation)
src/core/                entity-runtime, module-engine e contratos
src/services/            chamadas à API
src/dev-backend/         falso backend de desenvolvimento
src/dev-tools/           recursos só de desenvolvimento (ausentes dos artefatos)
src/lib/ src/hooks/      helpers, plataforma nativa, auth, navegação; hooks compartilhados
public/                  estáticos, locales, marcas, diagramas dos docs
docker/                  imagens (images/) e composes por ambiente (develop, homolog, production)
scripts/                 build, verificações e o gerador das instruções de agentes
docs/                    documentação permanente (índice em docs/README.md)
.agents/                 rules por caminho, specs de mudança e prompts de agentes
```

Módulos, regra de colocação e rotas: [estrutura do projeto](./docs/estrutura-projeto.md); árvore completa no
[mapa de src](./docs/mapa-src.md).

## 4. Verificações antes de concluir

```bash
npm run typecheck && npm run lint && npm test && npm run check:arch
```

`check:arch` cobre as fronteiras de `src/`, os arquivos gerados de agentes e o mapa de `src`. Não há teste de
componente: desktop × mobile e perfis são conferidos à mão
([ambiente e build](./docs/ambiente-e-build.md) → "Verificações e testes").

## 5. Ambientes e build

| Alvo | Comando | Saída |
| --- | --- | --- |
| web (dev) | `npm run dev` | servidor local |
| web (homologação / produção) | `npm run start` / `npm run production` | `dist/web` + servidor |
| APK (debug / homologação / produção) | `npm run mobile:debug` / `npm run apk` / `npm run apk:production` | `builds/apk/` |
| app desktop (debug / homologação / produção) | `npm run desktop:debug` / `npm run desktop` / `npm run desktop:production` | `builds/desktop/` |
| Docker por ambiente | `npm run docker:<develop\|homolog>:<app\|desktop:windows\|desktop:linux>`, `npm run docker:homolog:web` | APK, executável/instalador ou imagem web |
| Docker de produção | `npm run docker:production:web`, `npm run docker:production:desktop:<windows\|linux>` | imagem web ou instalador desktop |

> **Não rode os composes de produção localmente nem publique artefato sem pedido.** Eles exigem a marca
> (`NEXT_PUBLIC_BRAND`) e usam o `.env.production`. Lojas e PWA ficam preparados para o produto ativar
> ([visão geral](./docs/visao-geral.md) → "Base e produto").

- **Esteira:** `npm run docker:ci` emula a esteira em Docker; modelos de GitHub Actions e Jenkins em `.example`
  ([ambiente e build](./docs/ambiente-e-build.md) → "Esteira (CI)").
- **Release:** automático na esteira do GitHub (semantic-release, fase beta `0.y.z`); `npm run release:dry-run` mostra a próxima versão ([ambiente e build](./docs/ambiente-e-build.md) → "Release").
- **Commits:** Conventional Commits em português com emoji (`feat: ✨ …`, `fix: 🐛 …`, `docs: 📝 …`); docs e
  `.agents/` em commit e PR próprios.

Detalhes em [ambiente e build](./docs/ambiente-e-build.md).

## 6. Instruções de agentes de IA

`AGENTS.md`, `CLAUDE.md`, `GEMINI.md`, `.github/copilot-instructions.md`, `.github/instructions/`, `.claude/rules/` e
`.cursor/rules/` são gerados a partir de `docs/` e `.agents/rules/`:

```bash
npm run agents:sync     # gera
npm run agents:check    # confere (também roda no check:arch)
```

Conduta, fluxo com plano aprovado e autorizações: [conduta de agentes](./docs/conduta-agentes.md).

## 7. Documentação complementar

A documentação permanente fica em [docs/](./docs/README.md), com índice e tabela "Por assunto":

- [Visão geral](./docs/visao-geral.md) e [estrutura do projeto](./docs/estrutura-projeto.md) — distribuição, stack, módulos de `src`, rotas
- [Ambiente e build](./docs/ambiente-e-build.md) — `.env`, build web/APK/Docker, verificações, release
- [Shell adaptativo](./docs/shell-adaptativo.md) e [navegação](./docs/navegacao.md) — desktop × mobile, `SystemContext`, menu
- [Componentes de UI](./docs/componentes-ui.md), [tema, marca e idioma](./docs/tema-marca-e-idioma.md) e [módulos de entidade](./docs/modulos-entidade.md)
- [Comunicação com a API](./docs/comunicacao-api.md), [autenticação e permissões](./docs/autenticacao-e-permissoes.md) e [integrações](./docs/integracoes.md)
- [Plataforma nativa](./docs/plataforma-nativa.md) e [ferramentas de desenvolvimento](./docs/ferramentas-dev.md)
- [Publicação nas lojas](./docs/publicacao-lojas.md) e [PWA e instalação](./docs/pwa-e-instalacao.md) — preparados para o produto ativar
- [Domínio da base](./docs/dominios/base-multiplataforma.md) — atores, perfis e regras da demonstração
- [Specs](./docs/specs/README.md) — o que cada módulo entrega (template para o produto)
- [Conduta de agentes](./docs/conduta-agentes.md) — fluxo, autorizações e instruções por ferramenta
