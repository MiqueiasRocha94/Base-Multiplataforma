# Specs de módulos

Uma spec descreve **o que** um módulo ou feature entrega: perfis, rotas, contrato
da API, estados de tela e critérios de aceite. É escrita para humanos; os agentes
de IA leem a mesma spec ([conduta](../conduta-agentes.md) → "Fluxo obrigatório"). Mudança
transversal, que não é de um módulo, é spec de mudança em `.agents/specs/`
([conduta](../conduta-agentes.md) → "Especificação de mudança").

**Definições comuns ficam em `docs/` e entram por referência**, sem cópia:
arquitetura e onde fica cada arquivo ([estrutura](../estrutura-projeto.md)),
presets de layout e navbar mobile ([shell adaptativo](../shell-adaptativo.md)),
transporte, DPoP, sessão, gate e permissões
([autenticação](../autenticacao-e-permissoes.md)), "front consome, backend decide" e 404
de rota planejada ([comunicação com a API](../comunicacao-api.md)). A spec
acrescenta só o que é do escopo dela: rotas, campos e erros do contrato, estados
de tela, critérios de aceite e decisões.

**Status** (linha no topo de cada spec): `rascunho` (proposta, nada a assumir
como pronto) · `validada` (aceita, a implementar) · `em implementação` ·
`concluída`. Rota ou endpoint marcado **planejado** não existe no backend: a tela
pode estar pronta e receber 404.

## Fluxo

1. **Antes de codar:** copiar [`_template.md`](./_template.md) para
   `<modulo>.md` e preencher com o que se sabe (tela de referência, guia da API).
   Status `rascunho` → validar com o time → `validada`.
2. **Durante:** a implementação segue os critérios de aceite. Mudou rota,
   contrato, permissão ou estado de tela → atualizar a spec no mesmo passo. O
   andamento (o que já passou, o que falta validar, pendências com o backend)
   **não** entra na spec: fica no acompanhamento local dos agentes.
3. **Ao concluir:** status `concluída`; o código cita a spec, não o handoff nem o
   guia do backend.

## Specs

A base não traz specs de módulo: cada produto cria as suas a partir do
[template](./_template.md) e as lista aqui.

| Spec | Escopo |
| --- | --- |

Voltar ao [índice](../README.md).
