# Spec — <Módulo / feature>

> **Status:** rascunho | validada | em implementação | concluída
> **Dono:** <pessoa/time>
> **Fontes:** <tela de referência (sistema anterior, protótipo ou print); guia do backend>
>
> Não repita definições comuns (layout, transporte/DPoP, sessão, papéis): cite a
> seção de `docs/` (ver [README](./README.md)). Aqui só o que é deste módulo.

## 1. Objetivo

O que o usuário consegue fazer e por quê. 2–4 linhas.

## 2. Perfis e permissões

| Perfil | Acesso | Permissão (`requiredPermissions`) |
| --- | --- | --- |
| <perfil> | ver · operar · — | `recurso.acao` |

## 3. Rotas e layout

| Rota | Arquivo | Preset (`RouteMeta`) | Observação |
| --- | --- | --- | --- |
| `/portal/<rota>` | `src/app/(Portal)/portal/<rota>/page.tsx` | padrão · `minimal` · `mobile` | detalhe por `?id=` |

Item de navegação: `src/lib/navigation.ts` (placement, ícone, pin).

## 4. Contrato da API

- Fonte: guia do backend (recebido pelo agente). Aqui fica só o que o front consome.
- Endpoints consumidos (função em `src/services/<modulo>.ts`):

| Função | Método e rota | Erros tratados |
| --- | --- | --- |
| `getX()` | `GET /private/...` | 401 → login · 403 → sem acesso · 409 → mostrar `message` · 503 → tentar de novo |

- Sem backend: equivalente em `src/dev-backend/<modulo>.ts` (mesmo contrato).
- **Regra de negócio fica no backend.** Campo ausente → a UI omite (não calcula).

## 5. Telas e estados

**Forma da tela de referência** (quando houver; [componentes de UI](../componentes-ui.md) item 8):
cada elemento da tela de origem e o componente que o representa aqui.

| Elemento na referência | Componente |
| --- | --- |
| tabela | `GenericTable` / `EntityListScreen` + ação de linha |
| seleção única | `SelectOne` |
| formulário | campos do formulário (`DynamicForm`) |

| Estado | Desktop | Mobile |
| --- | --- | --- |
| carregando | | |
| vazio | | |
| erro | | |
| conteúdo | | |
| ações | | (navbar: Home · Voltar · Ações · Menu) |

## 6. Onde fica cada parte (ver [estrutura](../estrutura-projeto.md))

| Parte | Arquivo |
| --- | --- |
| rota fina | `src/app/...` |
| tela | `src/components/<modulo>/<modulo>-screen.tsx` |
| helpers puros (formatação…) | `src/lib/...` |
| hook | `src/hooks/use-<...>.ts` |
| tipos | `src/types/<modulo>.ts` |
| service / mock | `src/services/<modulo>.ts` · `src/dev-backend/<modulo>.ts` |
| textos | `public/locales/*/*.json` |

## 7. Critérios de aceite

Comportamentos verificáveis do módulo (o andamento da implementação não fica aqui).

- Rota abre com o preset certo no desktop e no mobile.
- Sem permissão → item some do menu e a rota nega acesso.
- Estados carregando/vazio/erro cobertos.
- Funciona sem backend (dev-backend) e com a API real.

## 8. Fora de escopo

## 9. Decisões

Escolhas da proposta e o porquê (o que foi descartado e por quê, quando ajuda).
