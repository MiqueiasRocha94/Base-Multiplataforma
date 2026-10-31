# Comunicação com a API

Como o front fala com o backend: os clientes HTTP, as duas raízes de API, o
tratamento de erro, o `dev-backend` e a regra "front consome, backend decide".
O contrato de cada rota está na spec do módulo ([specs](./specs/README.md)).

## Raízes de API

| Variável | Atende | Vazia |
| --- | --- | --- |
| `NEXT_PUBLIC_ACESSO_API_URL` | auth (login, sessão, senha), as rotas `/private` dos services do produto e as **entidades `/private`** (ex.: `/private/pedidos`, provider de [services/entidades.ts](../src/services/entidades.ts)) | `dev-backend` |
| `NEXT_PUBLIC_API_BASE_URL` | demais módulos de entidade (provider REST padrão do entity-runtime) | `dev-backend` |

As duas são **independentes, sem fallback entre si**: o login pode ir à API real
com as entidades no mock, ou o contrário.

## Clientes HTTP

- **API autenticada** (auth + `/private`): sempre por `chamarApi` em
  [services/api/cliente.ts](../src/services/api/cliente.ts), que monta
  `Authorization` (Bearer/DPoP), a prova DPoP e a renovação — não montar o header
  à mão ([autenticação](./autenticacao-e-permissoes.md) → "Canais").
  [services/api/recursos.ts](../src/services/api/recursos.ts) dá os atalhos dos
  services: `usaApi()`, `getJson`, `postJson`, `comQuery` e `baixarArquivo`
  (download como blob).
- **Genérico:** [src/lib/http.ts](../src/lib/http.ts) — `apiFetch(path, options)`
  centraliza o transporte e preserva headers, signal e resposta de sucesso.
  Define Content-Type JSON para corpos string quando não informado. É o cliente
  do adapter de entidades. `services/api/index.ts` reexporta-o por compatibilidade.
- **Erros:** `HttpError` preserva status, mensagem, payload e os headers da
  resposta. 4xx são apresentados pela UI (a `message` da API); 5xx das operações de
  entidades — e contrato de entidade fora do formato (`InvalidContractError`, 2xx
  sem `schema/ui/permissions`) — são lançados durante a renderização para
  alcançar o boundary da rota (card 500). Rejeições em eventos/efeitos exigem
  captura.
- **Falha de carga sem o que mostrar** (ex.: 4xx no contrato da entidade): a tela
  vira o [LoadErrorScreen](../src/components/load-error-screen.tsx) — o mesmo
  `StatusScreen` das telas 400/500, com código, "Voltar ao início" e "Tentar
  novamente". 404 = "Recurso indisponível" (rota planejada, sem o texto técnico
  do servidor); 403 = sem permissão; demais 4xx = `message` da API. Erro de
  operação com a tela já montada continua no aviso inline (`InlineError`).
- **Carga de dados de tela → [`useCarga`](../src/hooks/use-carga.ts)** (chave +
  `recarregar`, resposta atrasada descartada): 401 → logout; 5xx lançado no
  render (boundary); 4xx/rede em `erro`. Sem o que mostrar → `LoadErrorScreen`;
  falha de um bloco com o resto da tela visível → `LoadRetry`. Mensagem exibível
  de um erro: `mensagemDeErro` ([lib/http-errors.ts](../src/lib/http-errors.ts)).
- **Card 500 no modo desenvolvedor:** mostra o erro real e a origem
  (backend/front); fora dele e em homolog/produção, só a mensagem tratada
  ([ferramentas de desenvolvimento](./ferramentas-dev.md)).
- **Quem chama:** telas chamam funções de `src/services/`; `components` não faz
  HTTP direto (`apiFetch`) nem importa `dev-backend`
  ([enforcement](./enforcement-arquitetura.md) → "Zona cinzenta").

## Front consome, backend decide (regra transversal)

- **Regra de negócio fica no backend:** cálculo, cor por faixa, quais colunas
  mostrar, geração de PDF/CSV. O front cuida de UX e apresentação. Campo ausente
  na resposta → a UI **omite**; não calcula nem inventa valor.
- **Tela pronta antes do backend:** a tela é construída pela regra da spec
  chamando o endpoint **planejado** da API. Até ele existir, o 404 é
  esperado — não se esconde a UI nem se trata isso como defeito. A spec marca a
  rota como "planejada".
- **Contrato enxuto:** sem rota auxiliar quando o `GET` com parâmetros resolve;
  versão da API (ex.: `v1`) aparece só na URL, nunca em nome de arquivo, função
  ou tipo.

## dev-backend

[src/dev-backend](../src/dev-backend) é o "falso backend": em **desenvolvimento**
responde **o mesmo contrato** da API quando a URL correspondente não está
configurada. É requisito do projeto (desenvolver e demonstrar sem backend), não
um fallback especulativo. É recurso de dev: fora de dev não existe (a API é
obrigatória) e não vai nos artefatos
([ferramentas de desenvolvimento](./ferramentas-dev.md) → "Fora dos artefatos").

- **Acesso** ([acesso.ts](../src/dev-backend/acesso.ts)): login sobre os usuários
  de demonstração (comum, analista, admin) de
  [demo-users.ts](../src/dev-backend/demo-users.ts), com atalhos por perfil no
  login de demo; senha `expirada` simula a expiração.
- **Formato de erro** ([api-format.ts](../src/dev-backend/api-format.ts)): `erroApi`
  devolve o erro no formato da API (`{message, codigo, erros[]}`).
- **Entidades** (`entities/*` + `registerDevEntity`): contrato + seed de cada
  módulo CRUD ([módulos de entidade](./modulos-entidade.md)).
- **Analytics** ([analytics.ts](../src/dev-backend/analytics.ts)): overview da
  demo; fora de dev o service chama `GET /analytics/overview` (planejado).

Nos services, o desvio para o dev-backend (`if (!usaApi())`) fica numa região
`@dev-only`: em dev, com URL → API, sem → dev-backend; fora de dev, sempre a API.
O `BrandInfo` institucional não é mock: fica em
[config/brand-info.ts](../src/config/brand-info.ts) ([tema e marca](./tema-marca-e-idioma.md)).

## Onde está no código

| Peça | Onde |
| --- | --- |
| Cliente da API autenticada | [src/services/api/cliente.ts](../src/services/api/cliente.ts) |
| Atalhos dos services | [src/services/api/recursos.ts](../src/services/api/recursos.ts) |
| Cliente genérico | [src/lib/http.ts](../src/lib/http.ts) |
| Erros HTTP | [src/lib/http-errors.ts](../src/lib/http-errors.ts) |
| Provider de entidades | [src/services/entidades.ts](../src/services/entidades.ts) |
| Tela de erro de carga | [src/components/load-error-screen.tsx](../src/components/load-error-screen.tsx) |
| dev-backend | [src/dev-backend/](../src/dev-backend/) |

Voltar ao [índice](./README.md).
