# Modelo de pedido de tarefa

O modelo (campos Objetivo · Cenário atual · Esperado · Escopo · Restrições ·
Conclusão) e um exemplo estão em `docs/conduta-agentes.md` → "Como pedir uma
tarefa". Feature nova usa a spec (`docs/specs/_template.md`).

Ao receber um pedido nesse formato: siga o "Fluxo obrigatório" de
`docs/conduta-agentes.md` — investigue o fluxo existente e as soluções a
reutilizar, apresente o plano e aguarde aprovação; depois implemente, rode as
verificações e informe separadamente melhorias independentes, sem
implementá-las. Se faltar um campo e houver ambiguidade que afete regra de
negócio, contrato ou permissão, pergunte só o necessário; o resto, resolva pelo
padrão do projeto.
