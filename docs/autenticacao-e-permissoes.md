# Autenticação e permissões

Como o front autentica na API, guarda e renova a sessão, protege a área do
portal e decide o que cada usuário vê. O **contrato** que o front espera do auth
está em [types/acesso.ts](../src/types/acesso.ts); o produto que usa a base
documenta o contrato da sua API numa spec ([specs](./specs/README.md)).

## Sessão e fluxo de acesso

- **Service** [src/services/acesso.ts](../src/services/acesso.ts): `login`,
  `trocarSenha`, `esqueciSenha`, `me`, `renovar`, `sair` e `proximaTela`, sobre
  as rotas `/auth/login`, `/auth/senha`, `/auth/esqueci-senha`, `/auth/me`,
  `/auth/refresh` e `/auth/logout`. A raiz é `ACESSO_API_URL` =
  `NEXT_PUBLIC_ACESSO_API_URL`, **separada** da API do portal e sem fallback
  entre elas ([comunicação com a API](./comunicacao-api.md)); vazia → mock
  [dev-backend/acesso.ts](../src/dev-backend/acesso.ts) (mesmo contrato sobre os
  usuários de demonstração de [demo-users.ts](../src/dev-backend/demo-users.ts) (só em dev);
  senha `expirada` simula a expiração).
- **Resposta do auth** (`SessaoAcesso`): token e validade, `tokenType`, refresh
  (só nativo no corpo), identidade (`login`, `nome`, `email`, `telefone`),
  `papeis`, `permissoes` e `senhaExpirada`. Papéis e permissões são decididos
  pelo backend.
- **Conversão** para o base em [lib/auth/acesso.ts](../src/lib/auth/acesso.ts):
  `toUser` (`papeis` → `Role[]`, `permissoes` → `Permission[]`), rotas do fluxo e
  `caminhoDaTela`.
- **Sessão** em [src/lib/auth/session.ts](../src/lib/auth/session.ts):
  `AuthSession` (token, `tokenType`, `expiresAt`, `refreshToken` só no nativo,
  `refreshExpiresAt`, `senhaExpirada`). Toda
  resposta com `token` substitui o guardado; a sessão vive enquanto o refresh
  valer (`sessaoRenovavel()`). Web = `sessionStorage` (fechar a aba apaga a
  sessão local), nativo = storage do app (`getSessionItem`); sem cookies de
  sessão no JS. `subscribeSession` avisa o AuthContext das renovações feitas
  pelo transporte. `deviceid` do login vem de `getLoginDeviceId`
  ([plataforma nativa](./plataforma-nativa.md)).
- [AuthContext.tsx](../src/contexts/AuthContext.tsx) expõe `signIn(login, senha,
  captcha)` e `changePassword(senhaAntiga, senha)` — os dois devolvem a
  `ProximaTela` e rejeitam com `HttpError` (a tela mostra `message`; 401 derruba a
  sessão). `refreshSession` revalida a sessão em `/me` na abertura;
  renovação **proativa** 60 s antes de vencer; `signOut` chama `sair` sem esperar
  a rede. Derivado: `requiresPasswordChange`.
- **Fluxo:** login → (`senhaExpirada`) `/portal/alterar-senha-expirada` →
  `/portal/home`. A tela intermediária é `minimal` e o `PortalGate` prende a
  sessão nela.
- **Senha de acesso:** um formulário só (`components/login/trocar-senha-form`)
  para a expirada (`SenhaExpiradaScreen`, moldura do login) e a voluntária
  (`/portal/redefinir-senha`, menu CONTA, com o chrome do app — "Voltar"/"Alterar
  senha" são `Button type="action"`). "Esqueci a senha" é o modo `recover` do
  login; a senha recebida já vem expirada → troca obrigatória com ela em
  `senhaAntiga`.

### Gate da área protegida

[PortalGate](../src/components/portal-gate.tsx), usado em
[(Portal)/portal/layout.tsx](<../src/app/(Portal)/portal/layout.tsx>): sem sessão
→ `/login`; senha expirada → tela de troca; rota sem permissão →
`/portal/home`. O gate não pede biometria ([Biometria](#biometria)).

![Fluxo do PortalGate: sem sessão vai para /login; com senha expirada vai para a tela de troca; rota sem permissão volta para /portal/home; senão renderiza o conteúdo.](/docs/portal-gate-fluxo.svg)

### Perfis no app

No app de homologação/produção só entram os perfis de `profiles` em
[src/config/mobile-release.json](../src/config/mobile-release.json) (lista vazia,
o padrão da base, = todos). Sessão completa de outro perfil é encerrada pelo gate
e o login mostra "Este perfil ainda não está disponível no aplicativo. Use o
portal web." (`login.profileUnavailable`). Sessão ainda sem perfil segue o fluxo.
Rota fora de `routes` (quando a lista tem itens) não entra no menu e o acesso por
rota a recusa. Na web nada disso vale. A lista e o corte das páginas no build:
[ambiente e build](./ambiente-e-build.md) → "Páginas publicadas no app".

### Biometria

A biometria **substitui só o formulário de login** no app. Ao abrir o app com sessão salva e biometria ligada, o
login mostra o [BiometricPrompt](../src/components/login/biometric-prompt.tsx), que pede a digital (ou a credencial
do aparelho) na hora. Depois dela o fluxo é o do login com senha (senha expirada leva à troca). Sem biometria
ligada, a sessão salva não basta e o login pede o formulário. Modos em
[protected-access.ts](../src/lib/auth/protected-access.ts): `biometric` | `web-session` | `none`.

A tela de biometria tem três ações: **Entrar com biometria**; **Outro usuário**, que mostra o formulário sem apagar o
acesso salvo (com atalho da digital para voltar; se outra conta entrar, a sessão anterior é encerrada no servidor); e
**Sair**, que encerra a sessão de fato.

**"Sair" do menu da conta** (gaveta do Menu, tela de perfil, menu da conta) usa `leaveSession` do `AuthContext`: com
a biometria ativa no app, volta ao login **mantendo a sessão**, e nessa volta a tela de biometria não pede a digital
sozinha — espera o toque. Sem biometria (e sempre na web), encerra a sessão. A troca de senha expirada sempre
encerra de fato. Enquanto a pessoa não toca em "Sair" no login, a sessão continua no aparelho, protegida pela
digital, até expirar.

É preferência do login no aparelho e só existe no app com biometria disponível. Liga-se no login ("Manter conectado
com biometria") ou em **Configurações** (gaveta do Menu e tela de perfil), que confirma a digital antes de salvar;
desligar não pede confirmação. Enquanto está desligada, o menu sinaliza: a linha de acesso sob o avatar fica na cor
de aviso e a linha Configurações ganha um ponto
([use-biometric-setting.ts](../src/hooks/use-biometric-setting.ts)).

## Canais, vinculação e renovação do token

Quem pode chamar o quê. Detalhes internos do backend (nginx, claims, banco) são
do time do backend.

| Prefixo | Quem usa | Como se identifica |
| --- | --- | --- |
| `/auth/*` | todos (aberto) | credenciais; o **tipo** de token emitido depende do cliente |
| `/private/*` | **só** o portal web e o app mobile | token de usuário (`cid` = `portal-web` \| `app-mobile`) |
| `/public/*` | **só** parceiros e integrações | token de parceiro (client credentials) |

Um domínio só: o nginx roteia por prefixo (`/auth`, `/private`, `/public` →
backend; o resto → Next). O front **não** é gateway: o app mobile chama a API
direto, e nenhuma regra de acesso depende de header "sou mobile" (qualquer
cliente forja). A prova vem do token e da chave da instalação:

- **Os dois canais** — OAuth 2.1 + **DPoP** (RFC 9449) em **toda** chamada,
  inclusive login e refresh. Token de usuário sai vinculado à chave
  (`cnf.jkt`, `tokenType: "DPoP"`, 15 min); em `Bearer` o backend recusa.
- **Web** (`portal-web`) — refresh rotativo em **cookie HttpOnly** (o JS nunca
  vê) + **Turnstile** validado pelo backend no login e no "esqueci a senha".
- **Mobile** (`app-mobile`) — refresh rotativo no corpo, vinculado à chave;
  **Play Integrity / App Attest** no login (peça "Atestado").

| Peça | Arquivo | Papel |
| --- | --- | --- |
| Canal | [lib/auth/canal.ts](../src/lib/auth/canal.ts) | `clienteApp()` (`portal-web`/`app-mobile`), `usaCookieDeRenovacao()` (web). |
| DPoP | [lib/auth/dpop.ts](../src/lib/auth/dpop.ts) | Par ECDSA P-256 **não exportável** (WebCrypto) no IndexedDB, web e app; `criarProvaDpop(método, url, {token, nonce})` com `ath`; `obterJktDpop()`; `tokenVinculado(token)` lê `cnf.jkt`. No app a chave fica no storage do WebView (sandbox), **não** em hardware — ponto de troca: plugin de Keystore/Secure Enclave. Sem contexto seguro (HTTP fora de localhost) não há WebCrypto: só em dev um substituto faz o mesmo ES256 ([ferramentas de desenvolvimento](./ferramentas-dev.md) → "Acesso pela rede"); fora de dev a prova falha. |
| Atestado | [lib/platform/app-attestation.ts](../src/lib/platform/app-attestation.ts) | `obterAtestadoApp(jkt)` com `requestHash = jkt`. Devolve `null` sem plugin nativo de atestado; o backend aceita a ausência no modo "monitorar". |
| Transporte | [services/api/cliente.ts](../src/services/api/cliente.ts) | `chamarApi(caminho, {token})`: esquema `Bearer`/`DPoP`, prova DPoP, `DPoP-Nonce` (repete 1× só com `use_dpop_nonce`), `credentials: include` no `/auth` web, **401 com sessão renovável → renova 1× e repete**. `renovarSessao()` é única por vez; refresh recusado derruba a sessão. **Logout automático:** 401 que persiste numa chamada autenticada (sem renovação possível ou repetido após renovar) encerra a sessão (`clearSession` → AuthContext → `PortalGate` leva ao `/login`), em qualquer tela — inclusive as listas de entidade. Não vale para login (sem token), chamadas com `renovar: false` (refresh, logout) nem para resposta atrasada de um token que já não é o da sessão. |
| Formulários | `components/login/*` | Enviam o token do Turnstile e **remontam o widget** após cada envio (token de uso único). Captcha exigido: [use-captcha-required.ts](../src/hooks/use-captcha-required.ts). |

Regras:

- **Login nunca é repetido automaticamente** — nem pelo nonce: o backend
  responde `use_dpop_nonce` **antes** de conferir a senha (não conta tentativa).
  O retry só dispara com `use_dpop_nonce`.
- **`htu`** = `NEXT_PUBLIC_ACESSO_API_URL` + caminho, sem query. Tem que ser a
  mesma URL que o backend reconstrói (URL pública da API + caminho, com o contexto
  da aplicação se houver) — senão toda prova falha com 401.
- **Limites do DPoP no web:** token copiado não serve fora do navegador, mas um
  XSS ativo consegue usar a chave enquanto roda — CSP continua necessária.
  Limpar os dados do site apaga a chave (próximo login = aparelho novo).
- **O `deviceid` do login é descritivo** (marca/modelo/SO/push). A identidade
  estável do aparelho no backend é o `jkt` da chave DPoP — o push token muda
  (reinstalação, renovação do FCM) e não prova posse.

## Permissões

**Autorização por papel e por código de permissão**, ambos vindos do backend na
sessão. O menu, o acesso por rota e as ações consultam o mesmo `User`:

| Peça | Papel |
| --- | --- |
| [types/user.ts](../src/types/user.ts) | `Role` (na base: `USER` \| `ANALISTA` \| `ADMIN`) e `Permission = PermissaoConhecida \| (string & {})`: aceita qualquer código do backend e mantém autocomplete do vocabulário `recurso.acao` conhecido (na base, `pessoa.*`). |
| [lib/auth/user.ts](../src/lib/auth/user.ts) | Guardas puras: `hasRole`, `hasAnyRole`, `hasPermission`, `hasAllPermissions`. |
| [lib/navigation.ts](../src/lib/navigation.ts) | Gate da árvore: cada item exige as `requiredPermissions` (todas) e um dos `requiredRoles`; contêiner sem filhos visíveis some. |
| [lib/auth/route-access.ts](../src/lib/auth/route-access.ts) | Acesso por rota (o `PortalGate` usa), com as mesmas exigências do item de menu; `exact` casa só a própria rota (página do módulo). |
| [lib/actions](../src/lib/actions) + [entity-policy.ts](../src/lib/auth/entity-policy.ts) | Ações exibidas por permissão ([módulos de entidade](./modulos-entidade.md)). |

O gate do front decide **o que aparece**; quem autoriza a operação é o backend.

Perfis de demonstração (dev-backend, [demo-users.ts](../src/dev-backend/demo-users.ts)):

| Perfil | Papel | Permissões |
| --- | --- | --- |
| comum | `USER` | `pessoa.visualizar` |
| analista | `ANALISTA` | `pessoa.visualizar`, `pessoa.exportar` |
| admin | `ADMIN` | todas de `pessoa.*` |

## Onde está no código

| Peça | Onde |
| --- | --- |
| Sessão e fluxo de acesso | [src/contexts/AuthContext.tsx](../src/contexts/AuthContext.tsx) |
| Chamadas de acesso | [src/lib/auth/acesso.ts](../src/lib/auth/acesso.ts) |
| Canal e DPoP | [src/lib/auth/canal.ts](../src/lib/auth/canal.ts) |
| Gate da área protegida | [src/components/portal-gate.tsx](../src/components/portal-gate.tsx) |
| Acesso por rota | [src/lib/auth/route-access.ts](../src/lib/auth/route-access.ts) |
| Páginas e perfis do app | [src/lib/auth/mobile-release.ts](../src/lib/auth/mobile-release.ts) |
| Biometria | [src/components/login/biometric-prompt.tsx](../src/components/login/biometric-prompt.tsx) · [src/hooks/use-biometric-setting.ts](../src/hooks/use-biometric-setting.ts) |
| Permissões | [src/lib/auth/user.ts](../src/lib/auth/user.ts) |
| Ações por permissão | [src/lib/actions/](../src/lib/actions/) |

Voltar ao [índice](./README.md).
