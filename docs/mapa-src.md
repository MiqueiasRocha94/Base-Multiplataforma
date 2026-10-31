# Mapa completo de src

## Escopo e leitura

Inventario gerado por `npm run docs:src-map` a partir do disco: **194 pastas e 396 arquivos**, sem contar a propria pasta `src/`. Inclui arquivos ocultos e nao versionados presentes no diretorio. Nenhum nivel foi recolhido e nenhum arquivo foi substituido por reticencias.

Este mapa descreve o estado atual. Os comentarios indicam a responsabilidade de cada arquivo. A existencia de uma rota nao significa que sua funcionalidade esteja implementada: ha paginas demonstrativas e placeholders.

As pastas de primeiro nivel sao os modulos arquiteturais organizados por tipo. Os subdiretorios delimitam contextos dentro de cada responsabilidade. Tipos locais permanecem no modulo dono; `src/types` fica para contratos de dados efetivamente compartilhados.

## Arvore completa

```text
src/    <-- Codigo fonte da aplicacao
├── app/    <-- Rotas finas (page.tsx → tela em components), layouts e boundaries
│   ├── (Portal)/    <-- Grupo de rotas do portal; o nome do grupo nao entra na URL
│   │   └── portal/    <-- Area /portal, envolvida pelo PortalGate
│   │       ├── alterar-senha-expirada/    <-- Segmento de rota: alterar-senha-expirada
│   │       │   └── page.tsx    <-- Entrada da rota /portal/alterar-senha-expirada
│   │       ├── analytics/    <-- Segmento de rota: analytics
│   │       │   └── page.tsx    <-- Entrada da rota /portal/analytics
│   │       ├── audit/    <-- Segmento de rota: audit
│   │       │   └── page.tsx    <-- Entrada da rota /portal/audit
│   │       ├── demo400/    <-- Segmento de rota: demo400
│   │       │   └── page.tsx    <-- Entrada da rota /portal/demo400
│   │       ├── demo500/    <-- Segmento de rota: demo500
│   │       │   └── page.tsx    <-- Entrada da rota /portal/demo500
│   │       ├── home/    <-- Segmento de rota: home
│   │       │   └── page.tsx    <-- Entrada da rota /portal/home
│   │       ├── persons/    <-- Segmento de rota: persons
│   │       │   ├── detail/    <-- Segmento de rota: detail
│   │       │   │   └── page.tsx    <-- Entrada da rota /portal/persons/detail
│   │       │   ├── new/    <-- Segmento de rota: new
│   │       │   │   └── page.tsx    <-- Entrada da rota /portal/persons/new
│   │       │   └── page.tsx    <-- Entrada da rota /portal/persons
│   │       ├── profile/    <-- Segmento de rota: profile
│   │       │   └── page.tsx    <-- Entrada da rota /portal/profile
│   │       ├── redefinir-senha/    <-- Segmento de rota: redefinir-senha
│   │       │   └── page.tsx    <-- Entrada da rota /portal/redefinir-senha
│   │       ├── layout.tsx    <-- Compoe PortalGate ao redor das paginas do portal
│   │       └── page.tsx    <-- Entrada da rota /portal
│   ├── (Public)/    <-- Grupo de rotas publicas; o nome do grupo nao entra na URL
│   │   ├── login/    <-- Segmento de rota: login
│   │   │   └── page.tsx    <-- Entrada da rota /login
│   │   ├── start/    <-- Segmento de rota: start
│   │   │   └── page.tsx    <-- Entrada da rota /start
│   │   └── layout.tsx    <-- Layout compartilhado deste segmento de rotas
│   ├── [...notFound]/    <-- Rota catch-all para caminhos nao encontrados
│   │   └── page.tsx    <-- Entrada da rota /[...notFound]
│   ├── api/    <-- Segmento de rota: api
│   │   └── dev/    <-- Segmento de rota: dev
│   │       └── app-update/    <-- Segmento de rota: app-update
│   │           ├── bundle/    <-- Segmento de rota: bundle
│   │           │   └── route.ts    <-- Pacote zip do APK debug (só no npm run dev)
│   │           └── manifest/    <-- Segmento de rota: manifest
│   │               └── route.ts    <-- Manifesto do APK debug; fontes mudados geram pacote (só no npm run dev)
│   ├── error.tsx    <-- Boundary de erro da arvore de rotas
│   ├── global-error.tsx    <-- Boundary global de erro
│   ├── globals.css    <-- Estilos globais importados pelo layout raiz
│   ├── layout.tsx    <-- RootLayout: documento HTML, metadata e AppStructure
│   ├── loading.tsx    <-- Fallback de carregamento do App Router
│   ├── not-found.tsx    <-- Interface de pagina nao encontrada
│   └── page.tsx    <-- Entrada / e bootstrap da aplicacao
├── app-update/    <-- Atualização remota do app (opcional; fora dos artefatos gerados sem ela)
│   ├── locales/    <-- Textos do aviso de atualização (fora de public/locales)
│   │   ├── en.json    <-- Textos em inglês
│   │   ├── es-es.json    <-- Textos em espanhol
│   │   └── pt-br.json    <-- Textos em português
│   ├── runtime/    <-- Entrada sem React
│   │   └── index.ts    <-- Manifesto do canal, confirmação, download e aplicação do pacote
│   └── ui/    <-- Entrada com React
│       ├── app-update-gate.tsx    <-- Ciclo da atualização na abertura e aviso do pacote obrigatório
│       ├── index.ts    <-- Entrada @/app-update/ui
│       └── use-app-update-dictionary.ts    <-- Textos no idioma atual
├── components/    <-- Views e composicao visual organizadas por contexto
│   ├── analytics/    <-- Views de graficos e painel de analytics
│   │   ├── analytics-demo.tsx    <-- Componente ou composicao visual
│   │   ├── channel-pie-chart.tsx    <-- Componente ou composicao visual
│   │   ├── channel-radial-chart.tsx    <-- Componente ou composicao visual
│   │   ├── chart-card.tsx    <-- Componente ou composicao visual
│   │   ├── funnel-radar-chart.tsx    <-- Componente ou composicao visual
│   │   ├── traffic-area-chart.tsx    <-- Componente ou composicao visual
│   │   ├── traffic-bar-chart.tsx    <-- Componente ou composicao visual
│   │   └── traffic-line-chart.tsx    <-- Componente ou composicao visual
│   ├── entity/    <-- Views genericas de listagem e formulario com tratamento de erros
│   │   ├── entity-form-screen.tsx    <-- Componente ou composicao visual
│   │   └── entity-list-screen.tsx    <-- Componente ou composicao visual
│   ├── home/    <-- Views e blocos visuais da pagina inicial autenticada
│   │   └── home-screen.tsx    <-- Home de demonstracao da base (KPIs, tabela e acoes de exemplo)
│   ├── layout/    <-- Shell visual, regioes da tela e composicao de providers
│   │   ├── app-structure.tsx    <-- Componente ou composicao visual
│   │   ├── footer.tsx    <-- Footer: desktop (copyright/versão, recolhível) · mobile (navbar + segunda barra de ações)
│   │   ├── header.tsx    <-- Componente ou composicao visual
│   │   ├── left-sidebar.tsx    <-- Componente ou composicao visual
│   │   ├── main-content.tsx    <-- Componente ou composicao visual
│   │   ├── right-sidebar.tsx    <-- Componente ou composicao visual
│   │   ├── screen-footer.tsx    <-- Centro do rodapé do MainContent (web): total, paginação
│   │   ├── screen-layout.tsx    <-- Componente ou composicao visual
│   │   ├── screen-title.tsx    <-- Titulo da tela no header mobile (breadcrumb lite ou ScreenLayout), com voltar opcional
│   │   └── screen-zones.tsx    <-- Zonas de ergonomia mobile: leitura (top) e alcance do polegar (reach)
│   ├── login/    <-- Views de login, recuperacao e biometria
│   │   ├── auth-shell.tsx    <-- Componente ou composicao visual
│   │   ├── biometric-prompt.tsx    <-- Componente ou composicao visual
│   │   ├── login-form.tsx    <-- Componente ou composicao visual
│   │   ├── login-intro.ts    <-- Sinal e parâmetros da transição de abertura do APK (/start → login)
│   │   ├── recover-password-form.tsx    <-- Componente ou composicao visual
│   │   ├── redefinir-senha-screen.tsx    <-- Troca voluntaria da senha de acesso, dentro do portal
│   │   ├── senha-expirada-screen.tsx    <-- Troca obrigatoria da senha expirada, na moldura do login
│   │   ├── start-transition.tsx    <-- Tela /start do APK: logo no centro antes do login
│   │   └── trocar-senha-form.tsx    <-- Formulario unico da troca de senha (expirada e voluntaria)
│   ├── navigation/    <-- Renderizacao de menus, drawer, header, sidebar e footer
│   │   ├── drawer-navigation.tsx    <-- Componente ou composicao visual
│   │   ├── footer-navigation.tsx    <-- Componente ou composicao visual
│   │   ├── header-navigation.tsx    <-- Componente ou composicao visual
│   │   ├── icons.tsx    <-- Componente ou composicao visual
│   │   ├── navigation-label.tsx    <-- Componente ou composicao visual
│   │   ├── navigation-root.tsx    <-- Componente ou composicao visual
│   │   ├── sidebar-navigation.tsx    <-- Componente ou composicao visual
│   │   └── types.ts    <-- Tipos locais das views de navegacao
│   ├── portal/    <-- View de placeholder para modulos do portal
│   │   ├── module-hub.tsx    <-- Página do módulo: lista os recursos do menu que o usuário vê
│   │   └── module-placeholder.tsx    <-- Componente ou composicao visual
│   ├── ui/    <-- Primitivos e design do projeto, incluindo integracao visual com o shell
│   │   ├── bar.tsx    <-- Componente ou composicao visual
│   │   ├── bottom-action-bar.tsx    <-- Componente ou composicao visual
│   │   ├── button.tsx    <-- Componente ou composicao visual
│   │   ├── card.tsx    <-- Componente ou composicao visual
│   │   ├── chart.tsx    <-- Componente ou composicao visual
│   │   ├── confirm-dialog.tsx    <-- ConfirmHost: diálogo de `requestConfirm` (dialog no desktop, folha no mobile)
│   │   ├── date-field.tsx    <-- Campo de data/mês adaptativo (máscara + popover no web, tela cheia no mobile)
│   │   ├── document-reader.tsx    <-- View de documentos com carregamento delegado ao hook
│   │   ├── dynamic-form.tsx    <-- View de formulario schema-driven (contem helpers puros; usa DeviceContext)
│   │   ├── empty-state.tsx    <-- Estado vazio de lista/bloco com o texto da tela
│   │   ├── filter-modal.tsx    <-- Componente ou composicao visual
│   │   ├── form-field-input.tsx    <-- Componente ou composicao visual
│   │   ├── generic-table.tsx    <-- Tabela e cards adaptativos; depende de contexts do shell
│   │   ├── image-field.tsx    <-- Componente ou composicao visual
│   │   ├── image-gallery.tsx    <-- Componente ou composicao visual
│   │   ├── image-viewer.tsx    <-- Componente ou composicao visual
│   │   ├── inline-error.tsx    <-- Aviso de erro inline (role=alert); sem mensagem não renderiza
│   │   ├── input-color.tsx    <-- Componente ou composicao visual
│   │   ├── input-number.tsx    <-- Componente ou composicao visual
│   │   ├── input-text.tsx    <-- Componente ou composicao visual
│   │   ├── input.tsx    <-- Componente ou composicao visual
│   │   ├── label.tsx    <-- Componente ou composicao visual
│   │   ├── load-retry.tsx    <-- Falha de carga de um bloco com "Tentar novamente"
│   │   ├── segment-selector.tsx    <-- Componente ou composicao visual
│   │   ├── select-one.tsx    <-- Componente ou composicao visual
│   │   ├── select-overlay.tsx    <-- Componente ou composicao visual
│   │   ├── switch.tsx    <-- Componente ou composicao visual
│   │   └── toaster.tsx    <-- Toaster: exibe os avisos de `toast`
│   ├── account-menu.tsx    <-- Componente ou composicao visual
│   ├── api-version.tsx    <-- Versão da API da sessão (lê useAuth), hospedada pelo footer
│   ├── back-button.tsx    <-- Componente ou composicao visual
│   ├── brand-button.tsx    <-- Componente ou composicao visual
│   ├── bread-crumb.tsx    <-- Componente ou composicao visual
│   ├── Can.tsx    <-- Componente ou composicao visual
│   ├── load-error-screen.tsx    <-- Tela de falha de carga (StatusScreen 4xx/5xx) das telas sem o que mostrar
│   ├── loading.tsx    <-- Componente ou composicao visual
│   ├── locale-switcher.tsx    <-- Componente ou composicao visual
│   ├── logo.tsx    <-- Componente ou composicao visual
│   ├── marker-overlay.tsx    <-- Componente ou composicao visual
│   ├── marker.tsx    <-- Componente ou composicao visual
│   ├── navigation.tsx    <-- Fachada publica do componente de navegacao
│   ├── not-found-content.tsx    <-- Componente ou composicao visual
│   ├── notification-button.tsx    <-- Componente ou composicao visual
│   ├── portal-gate.tsx    <-- Componente ou composicao visual
│   ├── profile-page-sections.tsx    <-- Componente ou composicao visual
│   ├── profile-panel.tsx    <-- Topo da gaveta do Menu: avatar e grupo CONTA (perfil, configuracoes, senha, sair)
│   ├── route-loading-overlay.tsx    <-- Componente ou composicao visual
│   ├── sidebar-item.tsx    <-- Componente ou composicao visual
│   ├── sidebar.tsx    <-- Componente ou composicao visual
│   ├── status-screen.tsx    <-- Componente ou composicao visual
│   ├── system-back-handler.tsx    <-- política do voltar do sistema no Android (histórico, home, sair com 2 toques)
│   ├── theme-toggle-button.tsx    <-- Componente ou composicao visual
│   ├── tooltip.tsx    <-- Componente ou composicao visual
│   └── Turnstile.tsx    <-- Componente ou composicao visual
├── config/    <-- Configuracoes declarativas de marca, rotas e sistema
│   ├── brand-info.ts    <-- Dados institucionais por marca (BrandInfo), iguais em todo ambiente
│   ├── brand.ts    <-- Configuracao declarativa
│   ├── mobile-release.json    <-- Páginas e perfis publicados no app (APK); vazia = sem restrição
│   ├── routes.ts    <-- Configuracao declarativa
│   └── system-config.json    <-- Configuracao declarativa
├── contexts/    <-- Providers React e estado compartilhado da aplicacao
│   ├── system/    <-- Artefatos pertencentes ao contexto de sistema
│   │   └── types/    <-- Tipos locais do modulo de contexto de sistema
│   │       ├── chrome.ts    <-- Definicoes de tipos do contexto indicado pelo arquivo
│   │       ├── context.ts    <-- Definicoes de tipos do contexto indicado pelo arquivo
│   │       ├── index.ts    <-- Ponto de exportacao do modulo
│   │       ├── layout.ts    <-- Definicoes de tipos do contexto indicado pelo arquivo
│   │       └── panel.ts    <-- Definicoes de tipos do contexto indicado pelo arquivo
│   ├── AuthContext.tsx    <-- Provider e estado do contexto
│   ├── BrandContext.tsx    <-- Provider e estado do contexto
│   ├── DeviceContext.tsx    <-- Provider e estado do contexto
│   ├── LanguageContext.tsx    <-- Provider e estado do contexto
│   ├── NavigationContext.tsx    <-- Provider e estado do contexto
│   ├── SystemContext.tsx    <-- Provider e estado do contexto
│   └── ThemeProvider.tsx    <-- Provider e estado do contexto
├── core/    <-- Contratos e motor de UI; atualmente tambem inclui hook React e adapter HTTP
│   ├── contracts/    <-- Contratos de entidades, schema, UI e permissoes
│   │   └── index.ts    <-- Ponto de exportacao do modulo
│   ├── entity-runtime/    <-- Carregamento, cache, selecao de provider e hook de entidades
│   │   ├── api-data-provider.ts    <-- Adapter REST de entidades; organizacao preservada
│   │   ├── contract-provider.ts    <-- Apoio do modulo core/entity-runtime
│   │   ├── entity-provider.ts    <-- Apoio do modulo core/entity-runtime
│   │   ├── index.ts    <-- Ponto de exportacao do modulo
│   │   ├── types.ts    <-- Tipos pertencentes ao runtime de entidades
│   │   └── use-entity.ts    <-- Hook de entidades; organizacao preservada, com propagacao de erros
│   └── module-engine/    <-- Transformacao de contratos em campos, colunas, filtros e exportacao
│       ├── export-csv.ts    <-- Apoio do modulo core/module-engine
│       ├── index.ts    <-- Ponto de exportacao do modulo
│       ├── module-engine.ts    <-- Apoio do modulo core/module-engine
│       ├── module-registry.ts    <-- Apoio do modulo core/module-engine
│       └── relation-options.ts    <-- Apoio do modulo core/module-engine
├── dev-backend/    <-- Backend simulado: providers, contratos e dados de demonstracao
│   ├── entities/    <-- Contratos e dados simulados por entidade
│   │   └── person.ts    <-- Implementacao ou dados do backend simulado
│   ├── acesso.ts    <-- Mock do auth (login, senha, me) sobre os usuarios demo
│   ├── analytics.ts    <-- Implementacao ou dados do backend simulado
│   ├── api-format.ts    <-- Formato de erro da API (erroApi) usado pelos mocks
│   ├── demo-users.ts    <-- Usuários demo por perfil (fixtures de login do dev-backend)
│   ├── dev-data-provider.ts    <-- Implementacao ou dados do backend simulado
│   ├── index.ts    <-- Ponto de exportacao do modulo
│   └── registry.ts    <-- Implementacao ou dados do backend simulado
├── dev-tools/    <-- Recursos só de desenvolvimento (fora da entrada de build de homolog/produção)
│   ├── locales/    <-- Textos dos painéis de dev e do acesso rápido (fora de public/locales)
│   │   ├── en.json    <-- Textos de dev em inglês
│   │   ├── es-es.json    <-- Textos de dev em espanhol
│   │   └── pt-br.json    <-- Textos de dev em português
│   ├── runtime/    <-- Entrada `@/dev-tools/runtime`: recursos de dev sem React
│   │   ├── api-proxy.ts    <-- API pela mesma origem em dev (rewrites do next.config)
│   │   ├── app-update-channel.ts    <-- Canal de atualização do APK debug (servidor, rotas api/dev)
│   │   ├── error-diagnostics.ts    <-- Erro real e origem no card de 500 (modo desenvolvedor)
│   │   ├── index.ts    <-- Exports da entrada runtime
│   │   ├── quick-login.ts    <-- Credenciais do "Entrar com a API" contra API real
│   │   ├── system-panel.ts    <-- Painel do sistema ligado (dev + NEXT_PUBLIC_SYSTEM_PANEL_ENABLED)
│   │   ├── turnstile.ts    <-- Chave de teste do Turnstile (vale em qualquer host)
│   │   └── webcrypto.ts    <-- ES256 do DPoP sem contexto seguro (@noble)
│   └── ui/    <-- Entrada `@/dev-tools/ui`: recursos de dev com React
│       ├── developer-mode-context.tsx    <-- Contexto do modo desenvolvedor (flags persistidas)
│       ├── developer-mode-painel.tsx    <-- Painel do modo desenvolvedor (flags, marca)
│       ├── index.ts    <-- Exports da entrada ui
│       ├── quick-access.tsx    <-- Botões "Entrar como …" do login
│       ├── system-context-panel.tsx    <-- Painel do SystemContext (layout, cores, salvar config)
│       └── use-dev-dictionary.ts    <-- Textos de dev no idioma atual
├── hooks/    <-- Hooks React compartilhados
│   ├── use-account-placement.ts    <-- Onde o perfil renderiza no web (header × menu) e se há menu na sidebar
│   ├── use-analytics.ts    <-- Hook React compartilhado
│   ├── use-baixar-arquivo.ts    <-- Baixa um documento do backend e entrega ao aparelho (download ou compartilhar)
│   ├── use-biometric-setting.ts    <-- Biometria da conta em Configuracoes e no menu
│   ├── use-captcha-required.ts    <-- Decide se o login exige o captcha (Turnstile)
│   ├── use-carga.ts    <-- Carga de dados da tela: chave/recarregar, 401 → logout, 5xx → boundary, 4xx em erro
│   ├── use-document-content.ts    <-- Carregamento cancelavel de documento com erro e nova tentativa
│   ├── use-image-capture.ts    <-- Hook React compartilhado
│   ├── use-mounted.ts    <-- Hook React compartilhado
│   └── use-operation-error.ts    <-- Feedback de erro esperado e propagacao de 5xx ao boundary
├── lib/    <-- Helpers, validacoes, adaptadores e utilitarios por responsabilidade
│   ├── actions/    <-- Catalogo e resolucao de acoes da interface, com tipos locais
│   │   ├── registry.ts    <-- Apoio do modulo lib/actions
│   │   ├── resolve-actions.ts    <-- Apoio do modulo lib/actions
│   │   └── types.ts    <-- Tipos pertencentes ao modulo de acoes
│   ├── analytics/    <-- Apoio de configuracao dos graficos
│   │   └── chart-config.ts    <-- Apoio do modulo lib/analytics
│   ├── auth/    <-- Helpers de sessao, validacao e acesso; inclui implementacoes demo
│   │   ├── acesso.ts    <-- Conversao da sessao do auth para User e rotas do fluxo de acesso
│   │   ├── canal.ts    <-- Canal do cliente no auth (portal-web/app-mobile)
│   │   ├── dpop.ts    <-- Chave nao exportavel e prova DPoP (RFC 9449), web e nativo
│   │   ├── entity-policy.ts    <-- Apoio do modulo lib/auth
│   │   ├── login.schema.ts    <-- Validacao Zod do input de login
│   │   ├── mobile-release.ts    <-- No app: rota e perfil liberados (menu, gate) e aviso de perfil bloqueado
│   │   ├── protected-access.ts    <-- Apoio do modulo lib/auth
│   │   ├── route-access.ts    <-- Apoio do modulo lib/auth
│   │   ├── session.server.ts    <-- Apoio do modulo lib/auth
│   │   ├── session.ts    <-- Sessao demonstrativa persistida localmente
│   │   └── user.ts    <-- Apoio do modulo lib/auth
│   ├── config/    <-- Leitura e apoio das configuracoes de sistema
│   │   └── system-config.ts    <-- Apoio do modulo lib/config
│   ├── docs/    <-- Leitura e processamento de documentacao Markdown
│   │   ├── load-docs.ts    <-- Apoio do modulo lib/docs
│   │   ├── load-document.ts    <-- Carregamento de texto HTTP, blob e data
│   │   └── markdown.ts    <-- Apoio do modulo lib/docs
│   ├── entity/    <-- Helpers e rotulos de entidades
│   │   └── labels.ts    <-- Apoio do modulo lib/entity
│   ├── env/    <-- Acesso e tratamento das variaveis publicas de ambiente
│   │   └── public.ts    <-- Apoio do modulo lib/env
│   ├── i18n/    <-- Configuracao e carregamento da internacionalizacao
│   │   ├── dictionaries.ts    <-- Apoio do modulo lib/i18n
│   │   ├── index.ts    <-- Ponto de exportacao do modulo
│   │   └── settings.ts    <-- Apoio do modulo lib/i18n
│   ├── platform/    <-- Adaptadores de browser e recursos nativos via Capacitor
│   │   ├── app-attestation.ts    <-- Atestado do app (Play Integrity/App Attest); ponto de troca
│   │   ├── app-visibility.ts    <-- Apoio do modulo lib/platform
│   │   ├── back-button.ts    <-- voltar do sistema (@capacitor/app) e decisão `resolveBackAction`
│   │   ├── biometrics.ts    <-- Apoio do modulo lib/platform
│   │   ├── camera.ts    <-- Apoio do modulo lib/platform
│   │   ├── capacitor.ts    <-- Apoio do modulo lib/platform
│   │   ├── device-info.ts    <-- Tipo fisico do aparelho e deviceid enviado no login
│   │   ├── files.ts    <-- Apoio do modulo lib/platform
│   │   ├── index.ts    <-- Ponto de exportacao do modulo
│   │   ├── keyboard.ts    <-- Recolhe o teclado virtual (tira o foco do campo editavel)
│   │   ├── notifications.ts    <-- Apoio do modulo lib/platform
│   │   ├── orientation.ts    <-- Orientacao no nativo: celular em retrato, tablet livre
│   │   ├── push-notifications.ts    <-- Apoio do modulo lib/platform
│   │   ├── save-file.ts    <-- Entrega um arquivo gerado: compartilhar no mobile, download no desktop
│   │   ├── storage.ts    <-- Apoio do modulo lib/platform
│   │   ├── system-bars.ts    <-- Cor dos icones das barras do SO no app
│   │   └── view.ts    <-- Regra da view (mobile/desktop) sem dependencias, importavel no servidor
│   ├── preferences/    <-- Opcoes das preferencias da interface
│   │   └── options.ts    <-- Apoio do modulo lib/preferences
│   ├── system/    <-- Resolucao de configuracao do shell e metadados de rota
│   │   ├── account-placement.ts    <-- Regra pura do lugar do perfil (auto/header/menu)
│   │   ├── resolve-system-config.ts    <-- Apoio do modulo lib/system
│   │   └── route-meta.ts    <-- Apoio do modulo lib/system
│   ├── theme/    <-- Helpers de esquema de cores
│   │   ├── color-scheme.ts    <-- Apoio do modulo lib/theme
│   │   └── theme-bootstrap.ts    <-- Script de tema antes da primeira pintura (layout raiz)
│   ├── account-menu-signal.ts    <-- Apoio do modulo lib
│   ├── confirm.ts    <-- estado de `requestConfirm` (confirmação do design system)
│   ├── date-field.ts    <-- Helpers puros do campo de data (máscara, parse, formato, limites)
│   ├── format.ts    <-- Formatação pt-BR de apresentação: moeda, percentual, data, competência
│   ├── http-errors.ts    <-- Mensagem exibível de um erro (4xx = message da API; resto genérica)
│   ├── http.ts    <-- Cliente HTTP centralizado e erros tipados com status e payload
│   ├── mock-collection.ts    <-- Apoio do modulo lib
│   ├── mock-data.ts    <-- Apoio do modulo lib
│   ├── navigation-helpers.ts    <-- Apoio do modulo lib
│   ├── navigation-pins.ts    <-- Pins da barra mobile por usuario (slots, limite e FIFO) no localStorage
│   ├── navigation.ts    <-- Apoio do modulo lib
│   ├── toast.ts    <-- estado e API do aviso rápido (`toast.success/error/info`)
│   └── utils.ts    <-- Apoio do modulo lib
├── services/    <-- Servicos de acesso a dados: acesso e entidades falam com a API ou o dev-backend (conforme a URL); analytics e brand leem so o dev-backend
│   ├── api/    <-- Cliente da API: compatibilidade do lib/http.ts + transporte autenticado
│   │   ├── cliente.ts    <-- Transporte da API: Bearer/DPoP, nonce e renovacao do token (chamarApi)
│   │   ├── index.ts    <-- Ponto de exportacao do modulo
│   │   └── recursos.ts    <-- Atalhos dos services da API: usaApi, getJson, postJson, comQuery, baixarArquivo
│   ├── acesso.ts    <-- Auth (login, senha, me, refresh, logout)
│   ├── analytics.ts    <-- Servico de dados do contexto indicado pelo arquivo
│   ├── brand.ts    <-- Servico de dados do contexto indicado pelo arquivo
│   └── entidades.ts    <-- Provider das entidades `/private`: contrato, lista paginada, CRUD com token
├── styles/    <-- Estilos e tokens globais
│   └── tokens.css    <-- Estilos e tokens
└── types/    <-- Tipos compartilhados; tipos especificos devem acompanhar o modulo dono
    ├── model/    <-- Modelos de dados compartilhados
    │   ├── index.ts    <-- Ponto de exportacao do modulo
    │   └── person.ts    <-- Definicoes de tipos do contexto indicado pelo arquivo
    ├── acesso.ts    <-- Contrato do auth (SessaoAcesso, ProximaTela, ErroApi)
    ├── analytics.ts    <-- Definicoes de tipos do contexto indicado pelo arquivo
    ├── api.ts    <-- Formatos genericos da API (pagina {content, page})
    ├── brand.ts    <-- Definicoes de tipos do contexto indicado pelo arquivo
    ├── dynamic-form.ts    <-- Definicoes de tipos do contexto indicado pelo arquivo
    ├── file-item.ts    <-- Definicoes de tipos do contexto indicado pelo arquivo
    ├── list-query.ts    <-- Definicoes de tipos do contexto indicado pelo arquivo
    └── user.ts    <-- Definicoes de tipos do contexto indicado pelo arquivo
```

Critérios de organização: [estrutura do projeto](./estrutura-projeto.md) → "Módulos arquiteturais de src" e "Regra de colocação".

## Manutencao

A arvore e os totais sao **gerados**: ao criar, mover ou remover arquivos em `src`,
rode `npm run docs:src-map`. As descricoes (`<-- ...`) sao preservadas por caminho;
arquivo novo aparece como `(descrever)` e a descricao e escrita aqui mesmo, na linha.
`npm run check:arch` falha se a arvore nao bater com o disco.
