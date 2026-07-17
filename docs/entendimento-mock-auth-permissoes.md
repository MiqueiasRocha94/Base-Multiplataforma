# Entendimento do Projeto — Mock, Usuário, Autenticação e Permissões

> Documento de referência para montar um script/roteiro de apresentação (ou onboarding técnico)
> com foco nos quatro eixos pedidos: **mock (backend de desenvolvimento)**, **usuário**,
> **autenticação** e **permissões**. Cada seção aponta os arquivos-fonte reais.

---

## 0. Contexto em uma frase

É uma **base multiplataforma** (Next.js 16 + React 19 + Capacitor 8) que roda como web e como
app mobile encapsulado, a partir de uma única base de código. Para os quatro eixos deste
documento, o ponto central é: **o projeto ainda não tem backend real**, então tudo funciona hoje
sobre um **mock local (Dev Backend)** e uma **sessão de demonstração no cliente**. A arquitetura,
porém, já está desenhada para trocar o mock por uma API REST real **sem mexer na UI**.

Há **dois modelos de "usuário" distintos e propositalmente separados**:

1. **Usuário autenticado / principal da sessão** (`AuthUser`) — *quem está logado*.
2. **Usuário como entidade CRUD** (`User`) — *um registro editável de exemplo* na tela de Usuários.

Não confundir os dois é a chave para entender toda a área de autenticação e permissões.

---

## 1. MOCK — o "Dev Backend"

### 1.1. Ideia central

O mock **não é dado espalhado pela UI**. Ele é um *backend de desenvolvimento* que implementa
**o mesmo contrato** que a API de produção implementaria. A UI conversa com uma interface
(`EntityDataProvider`) e **não sabe** se está falando com o mock ou com a API real.

```
UI (useEntity)  ->  EntityDataProvider (interface)  ->  { devDataProvider  |  apiDataProvider }
```

Arquivos:

- `src/core/entity-runtime/types.ts` — a interface `EntityDataProvider` (contrato comum).
- `src/dev-backend/dev-data-provider.ts` — implementação **mock** (dados locais em `localStorage`).
- `src/core/entity-runtime/api-data-provider.ts` — implementação **REST** (produção; ainda sem servidor).
- `src/core/entity-runtime/entity-provider.ts` — **decide qual dos dois usar** em runtime.

### 1.2. Como o mock decide entrar em cena

`getEntityDataProvider()` em `src/core/entity-runtime/entity-provider.ts`:

- **Sem `NEXT_PUBLIC_API_BASE_URL` configurado** → usa o **Dev Backend** (padrão funcional hoje).
- **Com API configurada + flag `mockedDataEnabled` no Developer Mode desligada** → usa a **API real**.
- **Com API configurada + `mockedDataEnabled` ligada** → volta a usar o mock (útil para demo/testes).

Ou seja: o modo mock é o **default** enquanto não houver `API_BASE_URL`.

### 1.3. Como uma entidade é registrada no mock

Cada entidade de exemplo registra um **contrato + dados-semente (seed)**:

- `src/dev-backend/registry.ts` — registro genérico (`registerDevEntity` / `getDevEntity`).
- `src/dev-backend/index.ts` — registra as entidades. Hoje: `registerDevEntity({ url: "users", contract: USERS_CONTRACT, seed: usersSeed })`.
- `src/dev-backend/entities/users.ts` — o **contrato** de `users` (`USERS_CONTRACT`) e o **seed** (4 usuários de exemplo).

O `dev-data-provider` é **genérico**: não conhece "users" especificamente. Ele lê a entidade do
registry pela URL, aplica o contrato (ordenação, filtros, paginação) e persiste a coleção em
`localStorage` sob o prefixo `@multiplataforma-base/dev-backend/<url>`.

### 1.4. O que o mock sabe fazer (CRUD completo)

`DevDataProvider` implementa: `getContract`, `list`, `getById`, `create`, `update`, `remove`,
`search` — com paginação, ordenação (`ui.sort`) e busca sobre os campos de `ui.filters`. Toda
operação passa por `logMockApi(...)`, que loga como se fosse uma chamada HTTP (`GET /users`,
`POST /users`, etc.) — reforçando a ilusão de API real para depuração.

Persistência via `readMockCollection` / `writeMockCollection` (`src/lib/mock-collection`), que
usa o `localStorage`. Isso significa: **os dados sobrevivem ao reload**, e apagar o storage
recarrega o seed.

### 1.5. Ponto importante para o roteiro

> "Trocar o mock pela API real é trocar 1 linha de ambiente, não reescrever a UI."
> A UI (tela de Usuários) foi construída **schema-driven**: ela lê o contrato e se monta sozinha.

---

## 2. O CONTRATO (elo entre mock, usuário-CRUD e permissões)

Definido em `src/core/contracts/index.ts`. É o coração da arquitetura "orientada a contrato".

Um `EntityContract` tem quatro blocos:

| Bloco | O que descreve |
|---|---|
| `version` | versão do contrato (cacheável/invalidável) |
| `schema` | `primaryKey` + `fields[]` (tipo, label, required, máscara, enum, relação…) |
| `ui` | `columns`, `filters`, `sort`, `actions` (o que a interface mostra) |
| `permissions` | `create/update/delete/view/export` — o que o **usuário** pode fazer na entidade |

Separação canônica importante:

- `GET /{entidade}/contract` → **definição estática** (schema/ui/permissions/relations) — cacheável.
- `GET /{entidade}` → **dados** (`{ data, pagination }`) — muda a cada consulta. **Paginação nunca mora no contrato.**

O contrato é **a mesma coisa** independentemente de vir do mock ou da API. É ele que dirige o
formulário dinâmico, as colunas da tabela, os filtros, as validações e — crucialmente para este
documento — **as permissões da entidade**.

---

## 3. USUÁRIO — os dois modelos

### 3.1. `AuthUser` — o usuário autenticado (quem está logado)

Arquivo: `src/types/auth-user.ts` (tipo) + `src/lib/auth/auth-user.ts` (helpers + mock de referência).

É um payload rico, no **formato esperado do backend**, com blocos:

- **Identificação**: `id`, `code`, `username`, `name`, `displayName`, `email`, `phone`, `avatar`, `status`.
- **`authentication`**: `provider` (LOCAL/GOOGLE/MICROSOFT/LDAP/SSO), `authenticated`, `mfa`, `sessionId`, `authenticatedAt`.
- **`authorization`**: `roles[]` (ex.: `"ADMIN"`, `"FINANCEIRO"`) e `permissions[]` (ex.: `"usuario.editar"`, `"pedido.aprovar"`).
- **`organization`**: multi-tenant (`tenant`, `document`, `bond`…).
- **`preferences`**: `theme`, `language`, `homePage`, `pageSize`.
- **`localization`**: `locale`, `timezone`, `currency`.
- **`metadata`**: `apiVersion`, `environment`, `issuedAt`.

Existe um **`MOCK_AUTH_USER`** de referência (João da Silva, roles `ADMIN`+`FINANCEIRO`) que
serve como fixture/exemplo de payload. **Atenção:** hoje esse `MOCK_AUTH_USER` é apenas um
*fixture de referência*; a sessão real de demonstração (seção 4) é mais simples e **não** carrega
esse payload completo ainda. Esse é o ponto de expansão natural quando o backend existir.

Helpers puros (sem efeito colateral, seguros para SSR/testes) em `src/lib/auth/auth-user.ts`:

- `hasRole(user, role)` / `hasAnyRole(user, roles)`
- `hasPermission(user, permission)` / `hasAllPermissions(user, permissions)`
- `preferredName(user)`

### 3.2. `User` — a entidade CRUD de exemplo

Arquivo: `src/types/user.ts` + contrato/seed em `src/dev-backend/entities/users.ts`.

É um **registro editável genérico** (não é quem está logado). Campos: `id`, `name`, `email`,
`role` (`admin`/`editor`/`viewer`), `active`, `phone`, `department` (relação), `createdAt`,
`photo`/`photos` (arquivos). Existe para **exercitar a base**: tabela adaptativa (tabela no
desktop, cards no mobile), formulário dinâmico, filtros, exportação CSV.

> **No roteiro, deixe claro:** o `role` da entidade `User` (`admin/editor/viewer`) é só um **campo
> de dado**. Ele **não** é o mesmo que os `roles` de autorização do `AuthUser`. São universos
> diferentes que por acaso usam a palavra "role".

---

## 4. AUTENTICAÇÃO

### 4.1. Natureza atual: sessão de demonstração no cliente

Como não há backend, a autenticação é **local, no cliente** (`"static export" friendly`). O
servidor não participa: `src/lib/auth/session.server.ts` sempre retorna `null` (decisão de auth
fica no cliente por causa do `output: export`/APK).

### 4.2. A sessão (`DemoSession`)

Arquivo: `src/lib/auth/session.ts`.

```ts
type DemoSession = {
  email, accessToken, username,
  profile: "portal",
  allowedRoutes: string[],   // hoje: ["portal"]
  loggedAt,
}
```

- `signIn(email, biometricOptIn)` — **não valida senha contra backend**; gera um
  `accessToken` fake (`demo-token-xxxx`), monta a sessão e persiste em **dois lugares**:
  - `localStorage` (`@multiplataforma-base/session`)
  - **cookies** (`mp_access_token`, `mp_username`, `mp_profile`, `mp_allowed_routes`) com `max-age` 8h.
- `getSession()` — lê primeiro o `localStorage`; se falhar, reconstrói a partir dos cookies.
- `signOut()` / `clearSession()` — limpam storage e cookies.
- **Preferência biométrica** por login: `setBiometricPreference` / `getBiometricPreference`
  (guardadas por e-mail em `localStorage`).

### 4.3. O provider global de auth (`AuthContext`)

Arquivo: `src/contexts/AuthContext.tsx`. Expõe via `useAuth()`:

- `isReady`, `session`, `biometricEnabled`
- `signIn`, `signOut`, `refreshSession`, `setBiometricEnabled`
- `resolveAccessMode()` e `hasProtectedSession()` (delegam para `protected-access.ts`)

No boot, ele hidrata a sessão a partir do storage/cookies. É montado na árvore de providers do
`AppStructure` (ordem: Theme → Language → **Auth** → Device → …).

### 4.4. Tela de login

Arquivo: `src/app/(Public)/login/page.tsx`.

- Campos **estáticos** (`email`, `password`, e `biometricOptIn` só no nativo), montados com o
  mesmo `DynamicForm` do CRUD, e validados por **Zod** (`src/lib/auth/login.schema.ts`:
  e-mail válido + senha ≥ 6). A validação é **de formato apenas** — qualquer e-mail/senha válidos "entram".
- Modos da tela: `loading` → `form` → `biometric`.
- **Atalhos de acesso rápido** (analista/gestor) aparecem **somente** com Developer Mode ligado
  e `quickAccessEnabled` — chamam `signIn` direto com e-mails demo (`analista@demo.local`,
  `gestor@demo.local`).
- Ao logar: redireciona para `/portal/home`.

### 4.5. Proteção de rota (o "gate" do portal)

Arquivos: `src/app/(Portal)/portal/layout.tsx` → `src/components/portal-gate.tsx`.

Todo o grupo `(Portal)` é embrulhado pelo `PortalGate`, que:

- Se **não há sessão** → `router.replace("/login")`.
- Se **há sessão** e é **web** → libera (`unlocked`).
- Se **há sessão** e é **nativo com biometria habilitada** → tranca (`locked`) e pede
  autenticação biométrica; ao voltar do background, **re-tranca** (via `subscribeAppVisibility`).

### 4.6. Modo de acesso protegido / biometria

Arquivo: `src/lib/auth/protected-access.ts`.

`resolveProtectedAccessMode()` retorna:

- `"web-session"` — plataforma web (basta ter sessão).
- `"biometric"` — nativo + biometria disponível **e** habilitada pelo usuário.
- `"none"` — sem sessão ou sem biometria utilizável.

Biometria real via Capacitor (`@aparajita/capacitor-biometric-auth`), abstraída em
`src/lib/platform/biometrics.ts` e exposta pelo `DeviceContext`.

### 4.7. Resumo de fluxo (para o roteiro)

```
Login (form Zod)          Portal (rota protegida)
   |                          |
signIn(email)  ->  DemoSession (localStorage + cookies)  ->  PortalGate
                                                              |-- web:    libera
                                                              |-- nativo: biometria -> libera/tranca
```

---

## 5. PERMISSÕES

> Ponto que costuma confundir: **existem DOIS sistemas de permissão** na base, em camadas
> diferentes. É importante separar no roteiro.

### 5.1. Permissões de ENTIDADE (contrato × UI) — este é o que está *ativo* hoje

Fluxo real usado pela tela de Usuários:

1. O **contrato** da entidade declara `permissions` (`create/update/delete/view/export`) — ex.:
   em `USERS_CONTRACT` está tudo `true`. Isso representa *"o que o usuário logado pode fazer nesta entidade"* (viria do backend).
2. O **contrato** também declara `ui.actions` (`create/edit/delete/view/export`) — *"o que a
   interface habilita"*.
3. `resolveActions(permissions, ui)` (`src/core/module-engine/module-engine.ts`) faz o **E lógico**
   entre os dois:

   ```
   ação disponível = permissão do usuário (contrato)  E  habilitada na ui
   edit  = permissions.update && ui.actions.edit
   delete= permissions.delete && ui.actions.delete
   ...
   ```

4. O `useEntity` expõe o resultado como `actions`, e a tela
   (`src/app/(Portal)/portal/users/page.tsx`) **liga/desliga cada botão** conforme:
   `if (actions?.edit) {...}`, `if (actions?.delete) {...}`, `onCreate={actions?.create ? … : undefined}`,
   exportação só se `actions?.export`, etc.

Então: **as permissões que hoje realmente controlam a UI vêm do CONTRATO da entidade**, não do
`AuthUser`. Como o mock devolve tudo `true`, todos os botões aparecem. Trocar valores no
`USERS_CONTRACT.permissions` já muda o comportamento da tela — é a forma de demonstrar isso.

### 5.2. Permissões do USUÁRIO (roles/permissions do `AuthUser`) — infraestrutura pronta, ainda não plugada na UI

O `AuthUser.authorization` traz `roles[]` e `permissions[]` granulares (`"recurso.acao"`), e há
helpers prontos (`hasRole`, `hasPermission`, `hasAllPermissions`…). Essa é a camada de
autorização **por usuário** (RBAC/ABAC), pensada para quando houver backend.

Hoje ela **existe como modelo e utilitários**, mas a `DemoSession` real ainda não carrega esse
payload, então a UI não a consome diretamente. É o **próximo ponto de integração**: o backend
devolveria o `AuthUser` completo no login, e as `permissions` do contrato de cada entidade
seriam calculadas **em função** dos roles/permissions desse usuário.

### 5.3. `allowedRoutes` — permissão de navegação (embrionária)

A `DemoSession` tem `allowedRoutes` (hoje fixo `["portal"]`). É o gancho para autorização
**por rota** — ainda não é enforçado além do gate binário (tem sessão / não tem).

### 5.4. Navegação e sessão

`src/lib/navigation.ts` monta os itens de menu **em função de haver sessão** (`getAppNavigationItems(hasSession)`):
sem sessão → itens públicos (home, documentação); com sessão → itens do portal (home, users,
analytics, profile, auditoria…). É uma forma leve de "permissão de visibilidade" baseada em
estar logado — ainda **não** cruza com roles/permissions.

### 5.5. Resumo das camadas de permissão (para o roteiro)

| Camada | Onde | Fonte | Status |
|---|---|---|---|
| Autenticado ou não | `PortalGate` | existência de `DemoSession` | **ativo** |
| Ações por entidade | `resolveActions` → `actions` na tela | `contract.permissions` × `ui.actions` | **ativo** (mock devolve tudo `true`) |
| Roles/permissions do usuário | `hasRole`/`hasPermission` | `AuthUser.authorization` | **modelo pronto, não plugado** |
| Rotas permitidas | `DemoSession.allowedRoutes` | sessão | **embrionário** |
| Visibilidade de menu | `getAppNavigationItems` | `hasSession` | **ativo (só logado/deslogado)** |

---

## 6. Mapa de arquivos (cola rápida para o script)

**Mock / Dev Backend**
- `src/core/entity-runtime/types.ts` — interface `EntityDataProvider`
- `src/core/entity-runtime/entity-provider.ts` — escolhe mock vs API
- `src/dev-backend/dev-data-provider.ts` — CRUD mock genérico (localStorage)
- `src/dev-backend/registry.ts` / `src/dev-backend/index.ts` — registro de entidades
- `src/dev-backend/entities/users.ts` — contrato + seed de `users`
- `src/core/entity-runtime/api-data-provider.ts` — provider REST (produção)
- `src/core/contracts/index.ts` — tipos do contrato

**Usuário**
- `src/types/auth-user.ts` — tipo do usuário autenticado (`AuthUser`)
- `src/lib/auth/auth-user.ts` — helpers + `MOCK_AUTH_USER`
- `src/types/user.ts` + `src/dev-backend/entities/users.ts` — entidade CRUD `User`
- `src/app/(Portal)/portal/users/page.tsx` — tela de listagem (consome permissões)

**Autenticação**
- `src/lib/auth/session.ts` — `DemoSession`, cookies/localStorage, `signIn`/`signOut`
- `src/lib/auth/session.server.ts` — sessão no servidor (retorna `null`)
- `src/contexts/AuthContext.tsx` — provider global `useAuth`
- `src/app/(Public)/login/page.tsx` + `src/lib/auth/login.schema.ts` — login + validação Zod
- `src/app/(Portal)/portal/layout.tsx` + `src/components/portal-gate.tsx` — proteção de rota
- `src/lib/auth/protected-access.ts` — modo de acesso (web/biometric/none)
- `src/lib/platform/biometrics.ts` — biometria (Capacitor)

**Permissões**
- `src/core/module-engine/module-engine.ts` → `resolveActions` — cruzamento contrato × UI
- `src/core/entity-runtime/use-entity.ts` — expõe `actions`
- `src/lib/auth/auth-user.ts` — `hasRole`/`hasPermission` (camada de usuário)
- `src/lib/navigation.ts` — visibilidade de menu por sessão
- `src/lib/platform/storage.ts` — chaves de storage (sessão, biometria, dev-mode)

---

## 7. Frases-âncora para narrar o script

1. **"Não há backend: hoje tudo roda sobre um mock que fala o mesmo contrato da API futura."**
2. **"Existem dois usuários: quem está logado (`AuthUser`) e o registro editável de exemplo (`User`)."**
3. **"O login é local e valida só o formato (Zod); a sessão vive em localStorage + cookies por 8h."**
4. **"O portal é protegido por um gate: web basta ter sessão; no app nativo entra a biometria."**
5. **"Permissão hoje é o contrato da entidade cruzado com a UI (`resolveActions`); roles/permissions
   do usuário já têm modelo e helpers, faltando só o backend para plugar."**
6. **"Trocar mock por API real é configurar `NEXT_PUBLIC_API_BASE_URL` — a UI não muda, porque é schema-driven."**
```
