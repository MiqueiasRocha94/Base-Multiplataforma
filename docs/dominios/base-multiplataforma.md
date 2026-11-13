# Domínio da Base Multiplataforma

Atores, conceitos e regras do domínio **de demonstração** que a base traz para exercitar o shell, o RBAC e o módulo
de entidade. Cada produto troca este doc pelo seu (`docs/dominios/<produto>.md`) e remove ou substitui os módulos de
exemplo ([visão geral](../visao-geral.md) → "Base e produto"). A mecânica fica nos docs técnicos:
sessão e permissões em [autenticação e permissões](../autenticacao-e-permissoes.md), CRUD por contrato em
[módulos de entidade](../modulos-entidade.md) e o contrato da API em [specs](../specs/README.md).

## Atores

| Ator | Papel |
| --- | --- |
| Visitante | acessa as telas públicas (`/start`, `/login`) |
| Usuário autenticado | usa o portal (`/portal/...`) conforme o perfil |
| Backend do produto | decide regras, permissões e dados; em desenvolvimento sem API, o `src/dev-backend` faz esse papel ([comunicação com a API](../comunicacao-api.md) → "dev-backend") |

## Perfis

Três perfis de demonstração, um por papel. A tabela de permissões de cada um fica em
[autenticação e permissões](../autenticacao-e-permissoes.md) → "Permissões"; os usuários de login estão em
[demo-users.ts](../../src/dev-backend/demo-users.ts) (só desenvolvimento).

| Perfil | Papel | Uso na demonstração |
| --- | --- | --- |
| comum | `USER` | só consulta Pessoas |
| analista | `ANALISTA` | consulta e exporta Pessoas; vê Analytics |
| admin | `ADMIN` | CRUD completo de Pessoas; vê Analytics, Auditoria e as demos de erro |

## Conceitos

| Termo | Significado | No código |
| --- | --- | --- |
| Usuário | identidade autenticada, com papéis e permissões vindos do backend | `User` ([types/user.ts](../../src/types/user.ts)) |
| Papel | agrupamento de acesso (`USER`, `ANALISTA`, `ADMIN` na base) | `Role` |
| Permissão | código `recurso.acao` devolvido pelo backend (na base, `pessoa.*`) | `Permission` |
| Pessoa | entidade de exemplo do módulo de entidade | `Person` ([types/model/person.ts](../../src/types/model/person.ts)), rota `/portal/persons` |
| Marca | identidade white-label (nome, cores, assets) aplicada ao mesmo código | [tema, marca e idioma](../tema-marca-e-idioma.md) → "Marca (white-label)" |

## Ciclo de vida

A entidade de exemplo não tem estados nem transições: o CRUD de Pessoa cria, edita e remove registros, e o que o
formulário pede vem do contrato (`GET /persons/contract`). A sessão tem o único ciclo próprio da base: login →
(senha expirada) troca de senha → portal ([autenticação e permissões](../autenticacao-e-permissoes.md) → "Sessão e
fluxo de acesso").

## Regras de negócio

**Acesso**
- O que aparece no menu e nas ações depende das permissões e dos papéis devolvidos pelo backend; o front não cria
  permissão nem papel.
- Item de menu sem permissão some; contêiner sem filhos visíveis some.

**Dados**
- Regra de negócio fica no backend; campo ausente na resposta é omitido na tela ([comunicação com a
  API](../comunicacao-api.md) → "Front consome, backend decide (regra transversal)").

## Onde a regra mora

| Regra | Onde |
| --- | --- |
| Permissões e papéis do usuário | backend do produto (`/auth/me`); em dev, `src/dev-backend/demo-users.ts` |
| Gate do menu por permissão/papel | [lib/navigation.ts](../../src/lib/navigation.ts) |
| Ações por permissão na entidade | [lib/auth/entity-policy.ts](../../src/lib/auth/entity-policy.ts) |
| Campos e validação da entidade | contrato da API (`EntityContract`, [módulos de entidade](../modulos-entidade.md)) |
