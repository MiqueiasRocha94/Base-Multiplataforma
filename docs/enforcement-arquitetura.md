# Enforcement de arquitetura

Como o projeto garante que o código de `src/` siga as regras de
[estrutura do projeto](./estrutura-projeto.md) ("Módulos arquiteturais de src" e
"Regra de colocação"), inclusive
quando quem edita é um agente de IA, e o que fazer quando uma exceção é
inevitável.

## Camadas de enforcement

Documentação sozinha o agente "esquece". O que funciona é a mesma ideia das
*rules* do Cursor: **regra curta carregada pelo caminho do arquivo** + **checagem
automática que devolve o erro para o agente**. São 5 camadas, da mais fraca à
mais forte:

| Camada | Arquivo | O que faz |
| --- | --- | --- |
| 1. Entrada única | [índice](./README.md) e [conduta](./conduta-agentes.md) → gerados por [sync-agents.mjs](../scripts/agents/sync-agents.mjs) | Ordem de leitura para qualquer agente; as regras ficam em `docs/`. Gera `CLAUDE.md`/`GEMINI.md` (com `@import` dos docs), `AGENTS.md` e `.github/copilot-instructions.md` (com a conduta incorporada) e `.cursor/rules/fonte-unica.mdc` ([conduta](./conduta-agentes.md) → "Instruções de agentes"). |
| 2. Lembretes por caminho | [.agents/rules/](../.agents/rules) (`globs:`) → gerado em `.claude/rules` (`paths`), `.cursor/rules/*.mdc` (`globs`) e `.github/instructions` (`applyTo`) pelo mesmo script | Só entram no contexto quando o agente mexe em arquivo que casa com o glob. Não repetem regra: apontam a seção de `docs/`. |
| 3. Lint de fronteira | [eslint.config.mjs](../eslint.config.mjs) (`no-restricted-imports`, `no-restricted-syntax`) | Bloqueia import proibido por módulo, runtime em `types/` e, nas telas (`src/components` e `src/app`, fora de `components/ui` e `components/swagger`), `<table>`, `<select>`, `<input type="date\|month">` e `window.confirm` feitos à mão ([componentes de UI](./componentes-ui.md) → "Design único"). Mensagem cita o doc. Roda no `npm run lint` e no editor. |
| 4. Checagem estrutural | [scripts/check-architecture.mjs](../scripts/check-architecture.mjs) (`npm run check:arch`) | Pasta `_*` e `[param]` em `app`, `.tsx` fora de módulo de view, kebab-case, `page.tsx` longo (aviso). Também roda `agents:check` (gerados de `docs/` e `.agents/rules/`) e `gen-src-map --check` (árvore do [mapa de src](./mapa-src.md) = disco). |
| 5. Hook do agente | [.claude/settings.json](../.claude/settings.json) → [scripts/agent-guard.mjs](../scripts/agent-guard.mjs) | **PostToolUse** em `Edit/Write` (Claude Code): roda 3 + 4 só no arquivo editado; violação → exit 2 e o erro volta para o agente na hora. Só regras de arquitetura (erros antigos de outras regras não travam). Também: editar `.agents/rules/`, `docs/README.md` ou a conduta regenera os gerados; editar um gerado é revertido e bloqueado. |

## Exceção intencional

- **Não afrouxar a regra para passar.** Nem em `eslint.config.mjs`, nem em
  `check-architecture.mjs`.
- Exceção inevitável = `eslint-disable-next-line <regra> -- Dxx (desvio
  conhecido): <motivo>` **na linha**. O comentário se explica sozinho: diz por
  que a regra é quebrada ali e o que a corrige. O `Dxx` é só um identificador
  para rastrear a correção.
- Nome fora do padrão que não pode ser corrigido na mesma mudança entra em `KNOWN` do
  `check-architecture.mjs` (vira aviso, não erro).
- **Não copie código marcado com `Dxx`**: é dívida, não exemplo.
- Ao corrigir: remova o comentário (e a entrada em `KNOWN`).

## Recursos de desenvolvimento fora dos artefatos

| Trava | Quando roda | O que barra |
| --- | --- | --- |
| `check:arch` | sempre | marcador `@dev-only` ou `@app-update` sem par ou aninhado; import de `@/dev-tools`, `@/dev-backend` ou pacote só de dev fora de região `@dev-only`; import de `@/app-update` ou do plugin `@capawesome/capacitor-live-update` fora de região `@app-update` (inclusive no `next.config.ts`) |
| `prepare-dist-source.mjs` (`npm run dist:check`) | todo build de homolog/produção | vestígio na entrada limpa; entrada que não compila sem o código de dev |
| `verify-dist.mjs` | fim de todo build de homolog/produção (web, `out/`, APK) | arquivo, trace/manifest ou texto de dev no artefato |
| `validate-build-env.mjs` | início do build de homolog/produção | flag ou credencial de dev definida; API não configurada |

Mecanismo e limites: [ferramentas de desenvolvimento](./ferramentas-dev.md) → "Fora dos artefatos". As mesmas
travas removem a atualização remota dos artefatos gerados sem ela
([ambiente e build](./ambiente-e-build.md) → "Atualização remota do app").

## Zona cinzenta (permitido)

Telas de `components/{modulo}` chamam funções de `services/` (`getAnalyticsOverview`,
`getBrandInfo`…). Isso é **permitido** — o que `components` não pode é fazer
HTTP direto (`apiFetch`) ou importar `dev-backend`. Regiões de
`components/layout` não leem sessão nem rota (ver
[shell adaptativo](./shell-adaptativo.md) → "`AppStructure` única").

## Manter útil

- Regra nova de arquitetura entra **primeiro** na [estrutura do projeto](./estrutura-projeto.md), depois vira lint/check;
  se precisar de lembrete por caminho, a rule em `.agents/rules/` só aponta a
  seção (+ `npm run agents:sync`). A rule nunca é a fonte.
- Lint e `check:arch` valem para qualquer editor/agente (Cursor, Codex…); o hook
  automático é do Claude Code. `npm run check:arch` também falha se os gerados
  estiverem dessincronizados de `docs/` e `.agents/rules/`.

## Onde está no código

| Peça | Onde |
| --- | --- |
| Lint de fronteira | [eslint.config.mjs](../eslint.config.mjs) |
| Checagem estrutural | [scripts/check-architecture.mjs](../scripts/check-architecture.mjs) |
| Hook do Claude Code | [.claude/settings.json](../.claude/settings.json), [scripts/agent-guard.mjs](../scripts/agent-guard.mjs) |
| Gerador das instruções de agentes | [scripts/agents/sync-agents.mjs](../scripts/agents/sync-agents.mjs) |
| Mapa de `src` | [scripts/gen-src-map.mjs](../scripts/gen-src-map.mjs) |
| Travas de dev fora dos artefatos | [scripts/prepare-dist-source.mjs](../scripts/prepare-dist-source.mjs), [scripts/verify-dist.mjs](../scripts/verify-dist.mjs), [scripts/validate-build-env.mjs](../scripts/validate-build-env.mjs) |
- Em CI/pre-commit (opcional): `npm run lint && npm run check:arch`.

Voltar ao [índice](./README.md).
