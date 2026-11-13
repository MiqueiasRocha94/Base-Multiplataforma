# Documentação — Base Multiplataforma

**`docs/` é a documentação permanente do projeto:** arquitetura,
responsabilidades, contratos, regras vigentes e funcionamento atual (inclusive
das partes legadas ainda usadas), para pessoas e para agentes de IA. Cada
documento cobre **um assunto**; regra nova ou mudança de regra entra no
documento do assunto. Os arquivos de cada ferramenta de IA são gerados daqui
([conduta](./conduta-agentes.md) → "Instruções de agentes").

Registro de trabalho — planos, andamento, handoffs, resultados de verificação,
pendências — **não** fica aqui: vive na área local dos agentes
([conduta](./conduta-agentes.md) → "Entrega"). As [specs](./specs/README.md)
descrevem o que cada módulo deve entregar; a linha `Status` diz em que ponto do
ciclo está.

A base é reutilizável (Next.js 16 / React 19 + Capacitor 8 + Tauri 2 + TypeScript): o
mesmo código entrega web, mobile encapsulado e app desktop, com a malha física da tela
controlada em runtime pelo `SystemContext`.

> Convenção: **código em inglês**, **documentação em pt-BR**. É uma base de
> **plataforma**: fortalecer a base, não fragmentá-la.

Se um doc divergir do código, nenhum dos dois sozinho prova o comportamento
desejado: a divergência vira pergunta ao responsável
([conduta](./conduta-agentes.md) → "Critério de documentação").

## Ordem inicial de leitura

Antes de qualquer tarefa:

1. [conduta-agentes.md](./conduta-agentes.md) — **obrigatória**: fluxo esclarecer → plano → aprovação, autorizações,
   regras de implementação, validação e entrega. Docs e `.agents/` vão em commit e PR separados do código.
2. [visao-geral.md](./visao-geral.md) — o que é a base e seus princípios.
3. O doc do assunto da tarefa, pela tabela [Por assunto](#por-assunto).
4. [estrutura-projeto.md](./estrutura-projeto.md) → "Onde mexer (mapa rápido)" antes de criar arquivo ou pasta.
5. Para feature ou tela: a spec do módulo em [specs/](./specs/README.md).

## Índice

**Base e arquitetura**

| Doc | Assunto |
| --- | --- |
| [Visão geral](./visao-geral.md) | O que é a base, distribuição, stack, interfaces, decisão Next × Base-Expo, conceitos-chave. |
| [Ambiente e build](./ambiente-e-build.md) | Instalar, rodar, ambientes (`.env`), build web/APK/Docker, verificações, esteira e release. |
| [Estrutura do projeto](./estrutura-projeto.md) | Módulos de `src/`, regra de colocação, App Router, rotas, onde mexer, como mover arquivos. |
| [Mapa de src](./mapa-src.md) | Árvore de `src/` **gerada** (`npm run docs:src-map`) com a descrição de cada arquivo. |
| [Enforcement de arquitetura](./enforcement-arquitetura.md) | Como as regras de estrutura são garantidas (lint, `check:arch`, hook) e como marcar uma exceção. |

**Interface**

| Doc | Assunto |
| --- | --- |
| [Shell adaptativo](./shell-adaptativo.md) | **★ Principal.** `AppStructure`, providers, `DeviceContext`, regiões desktop × mobile, composição de layout, `SystemContext`, apresentação por device. |
| [Navegação](./navegacao.md) | Sidebars genéricas, árvore de navegação, página de módulo, *placement* do menu. |
| [Componentes de UI](./componentes-ui.md) | Design único web/mobile, catálogo do design system, `GenericTable`, `DynamicForm`. |
| [Tema, marca e idioma](./tema-marca-e-idioma.md) | Tema, esquema de cores, configuração estática, white-label, fonte, i18n. |
| [Módulos de entidade](./modulos-entidade.md) | `EntityContract`, entity-runtime, module-engine, anatomia e passo a passo de um módulo CRUD. |

**Integração e plataforma**

| Doc | Assunto |
| --- | --- |
| [Comunicação com a API](./comunicacao-api.md) | Raízes de API, clientes HTTP, erros, "front consome, backend decide", `dev-backend`. |
| [Autenticação e permissões](./autenticacao-e-permissoes.md) | Sessão, fluxo de acesso, gate, canais/DPoP, permissões. |
| [Integrações](./integracoes.md) | Turnstile, push, atestado do app, arquivos (PDF/planilha). |
| [Plataforma nativa](./plataforma-nativa.md) | Wrappers de Capacitor, app desktop (Tauri) e storage. |
| [Ferramentas de desenvolvimento](./ferramentas-dev.md) | Modo desenvolvedor, painel do sistema e como ficam fora do build. |
| [Publicação nas lojas](./publicacao-lojas.md) | Preparado para o produto: Google Play e App Store, material `store/`, assinatura, validação. |
| [PWA e instalação](./pwa-e-instalacao.md) | Preparado para o produto: manifest, service worker, cache, variável que liga e desliga. |

**Produto, contratos e trabalho**

| Doc | Assunto |
| --- | --- |
| [Domínio da base](./dominios/base-multiplataforma.md) | Atores, perfis, conceitos e regras do domínio de demonstração (o produto troca pelo seu). |
| [Specs](./specs/README.md) | **O que** cada módulo entrega; [template](./specs/_template.md) para o produto criar as suas. |
| [Conduta de agentes de IA](./conduta-agentes.md) | Fluxo com plano aprovado, autorizações, docs e commits, specs, handoffs front×back e instruções por ferramenta. |

## Por assunto

| Palavras-chave | Doc | Seção |
| --- | --- | --- |
| mapa completo, árvore, inventário, todos os arquivos | [mapa de src](./mapa-src.md) | Arvore completa |
| `src`, módulo arquitetural, organização por tipo, mover arquivo | [estrutura](./estrutura-projeto.md) | Módulos arquiteturais de `src`, Regra de colocação |
| onde mexer, criar tela | [estrutura](./estrutura-projeto.md) | Onde mexer (mapa rápido) |
| rota, `page.tsx`, App Router, `(Public)`, `(Portal)`, 404, loading, error boundary, `?id=` | [estrutura](./estrutura-projeto.md) | Convenção do App Router, Rotas |
| componente, `ui`, reuso, `GenericTable`, `DynamicForm`, `SelectOne`, teclado | [componentes de UI](./componentes-ui.md) | Catálogo |
| shell, layout, `AppStructure`, Header, Footer, `SystemContext`, navbar mobile, `RouteMeta`, `minimal` | [shell adaptativo](./shell-adaptativo.md) | Composição de layout (regras) |
| context, provider, ordem dos providers | [shell adaptativo](./shell-adaptativo.md) | Providers |
| device, `data-view`, `mobile:`/`desktop:`/`wide:`, ergonomia, zonas, `sidebar-panel` | [shell adaptativo](./shell-adaptativo.md) | Apresentação por device (fonte única) |
| navegação, menu, placement, pins, `navigation.ts`, `ModuleHub` | [navegação](./navegacao.md) | Navegação |
| `Sidebar`, `SidebarItem`, `Marker`, painel lateral | [navegação](./navegacao.md) | Sidebars, SidebarItem e Marker |
| entidade, CRUD, scaffold, `EntityContract`, module-engine | [módulos de entidade](./modulos-entidade.md) | Passo a passo |
| tema, tokens, cor, dark mode, fonte, `system-config` | [tema, marca e idioma](./tema-marca-e-idioma.md) | Tema (claro/escuro/sistema), Esquema de cores (modelo) |
| marca, white-label, `NEXT_PUBLIC_BRAND` | [tema, marca e idioma](./tema-marca-e-idioma.md) | Marca (white-label) |
| i18n, tradução, `public/locales` | [tema, marca e idioma](./tema-marca-e-idioma.md) | i18n (pt-BR / en / es-ES) |
| HTTP, `apiFetch`, `chamarApi`, `HttpError`, 404 planejado | [comunicação com a API](./comunicacao-api.md) | Clientes HTTP |
| regra de negócio no front, campo ausente | [comunicação com a API](./comunicacao-api.md) | Front consome, backend decide (regra transversal) |
| dev-backend, mock, usuários de demonstração | [comunicação com a API](./comunicacao-api.md) | dev-backend |
| auth, login, sessão, senha expirada, gate, biometria, perfis no app | [autenticação e permissões](./autenticacao-e-permissoes.md) | Sessão e fluxo de acesso, Biometria, Perfis no app |
| DPoP, canal, renovação do token, `jkt` | [autenticação e permissões](./autenticacao-e-permissoes.md) | Canais, vinculação e renovação do token |
| RBAC, permissão, `requiredPermissions`, ações | [autenticação e permissões](./autenticacao-e-permissoes.md) | Permissões |
| Turnstile, captcha, push, atestado, Play Integrity, PDF, `baixarArquivo` | [integrações](./integracoes.md) | Cloudflare Turnstile (captcha), Notificações push, Importação, exportação e relatórios |
| Capacitor, câmera, arquivo, notificação, orientação, storage | [plataforma nativa](./plataforma-nativa.md) | Padrão, Storage |
| desktop, Tauri, `src-tauri`, bandeja, iniciar com o sistema, Windows, Linux | [plataforma nativa](./plataforma-nativa.md) · [ambiente e build](./ambiente-e-build.md) | Desktop (Tauri) · Build desktop (Tauri) |
| modo desenvolvedor, painel do sistema, dev tools, captcha desligado, `@dev-only` | [ferramentas de desenvolvimento](./ferramentas-dev.md) | Fora dos artefatos |
| loja, Google Play, App Store, `store/`, AAB, `store:*`, fastlane | [publicação nas lojas](./publicacao-lojas.md) | Material das lojas, Publicar |
| PWA, manifest, service worker, instalável, `pwa:validar` | [PWA e instalação](./pwa-e-instalacao.md) | Configuração, Habilitar e desabilitar |
| base × produto, recurso preparado, reaplicar o kit, `recursos-kit.json` | [visão geral](./visao-geral.md) | Base e produto |
| domínio, ator, perfil, conceito, regra de negócio | [domínio da base](./dominios/base-multiplataforma.md) | Perfis, Regras de negócio |
| env, `NEXT_PUBLIC_*`, ambientes | [ambiente e build](./ambiente-e-build.md) | Ambientes |
| build, APK, Docker, identidade do app, versão nativa, páginas do app | [ambiente e build](./ambiente-e-build.md) | Build mobile (Capacitor), Identidade do app por marca, Páginas publicadas no app, Build em Docker |
| atualização remota, live update, OTA, pacote web, `APP_UPDATE_ENABLED`, `@app-update` | [ambiente e build](./ambiente-e-build.md) | Atualização remota do app |
| área segura, edge-to-edge, barras do SO, `--app-safe-*` | [shell adaptativo](./shell-adaptativo.md) | Regiões no mobile |
| typecheck, lint, test, `check:arch` | [ambiente e build](./ambiente-e-build.md) | Verificações e testes |
| release, versão, changelog, esteira, CI | [ambiente e build](./ambiente-e-build.md) | Release, Esteira (CI) |
| desvio, fronteira, lint, `Dxx`, `eslint-disable` | [enforcement](./enforcement-arquitetura.md) | Exceção intencional |
| plano, aprovação, dúvida, esclarecer | [conduta](./conduta-agentes.md) | Fluxo obrigatório |
| discordar, análise crítica, opinião, revisão de proposta | [conduta](./conduta-agentes.md) | Análise crítica |
| compactação, contexto, `ESTADO.md` em tarefa longa | [conduta](./conduta-agentes.md) | Instruções de agentes |
| livre, proibido, dependência, APK, segredo, autorização | [conduta](./conduta-agentes.md) | Autorizações |
| commit, PR, editar docs | [conduta](./conduta-agentes.md) | Documentação e commits |
| spec de mudança, `.agents/specs` | [conduta](./conduta-agentes.md) | Especificação de mudança |
| pendência, issue, GitHub | [conduta](./conduta-agentes.md) | Pendências compartilhadas |
| reaproveitar, módulo dono, `@ts-ignore`, segurança | [conduta](./conduta-agentes.md) | Regras de implementação |
| validação, entrega, `ESTADO.md` | [conduta](./conduta-agentes.md) | Validação, Entrega |
| pedido de tarefa, revisão, PR template | [conduta](./conduta-agentes.md) | Como pedir uma tarefa, Como revisar o resultado |
| handoff, backend, `AGENTE-BACKEND-PENDENCIAS`, guia do backend | [conduta](./conduta-agentes.md) | Comunicação entre projetos |
| `CLAUDE.md`, `AGENTS.md`, `agents:sync`, `agents:check`, rules | [conduta](./conduta-agentes.md) | Instruções de agentes |

## Documentos fora de `docs/` (localização própria)

| Arquivo | Por que fica lá |
| --- | --- |
| [README.md](../README.md) (raiz) | Porta de entrada do repositório; resume e aponta para cá. |
| [.agents/](../.agents/README.md) | Rules por caminho, specs de mudança e prompts. Com `docs/README.md` e a conduta, são a fonte de `AGENTS.md`, `CLAUDE.md`, `GEMINI.md`, `.github/copilot-instructions.md`, `.github/instructions/`, `.claude/rules/`, `.cursor/rules/` — ver [conduta](./conduta-agentes.md) → "Instruções de agentes". |
| [.github/pull_request_template.md](../.github/pull_request_template.md) | Checklist de revisão ([conduta](./conduta-agentes.md) → "Como revisar o resultado"); o GitHub só o lê nesse caminho. |
| [public/docs/](../public/docs) | Diagramas usados pelos docs; os SVG são gerados por `npm run docs:diagrams` (`scripts/docs-diagrams.mjs`). Os docs os citam como `/docs/<arquivo>`, caminho que o leitor de documentação da própria aplicação ([load-docs.ts](../src/lib/docs/load-docs.ts)) resolve. |

## Atalho: "quero criar uma tela/rota nova"

Crie a pasta da rota no grupo certo — `src/app/(Public)/...` (pública) ou
`src/app/(Portal)/portal/...` (autenticada) — com seu `page.tsx` fino. A tela vai
para `src/components/{modulo}`, reutilizando [src/components/ui](../src/components/ui)
e tokens semânticos (não cores fixas). Para aparecer na navegação, registre em
[src/lib/navigation.ts](../src/lib/navigation.ts) ([navegação](./navegacao.md)). Feature com contrato de API
começa pela [spec](./specs/README.md). Detalhes em [estrutura](./estrutura-projeto.md),
[shell adaptativo](./shell-adaptativo.md) e [componentes de UI](./componentes-ui.md).
