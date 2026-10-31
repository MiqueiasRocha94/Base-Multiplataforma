## O que muda e por quê

<!-- Objetivo da mudança e a relação de cada alteração com ele. Spec/issue: -->

## Como foi validado

<!-- Comandos executados e resultado. Ex.: npm run typecheck ✅ · npm run lint ✅ · npm test ✅ · npm run check:arch ✅ · testado em desktop/mobile -->

## Não verificado / limitações

<!-- O que ficou sem teste e por quê. Falhas preexistentes ≠ introduzidas. -->

## Encontrado, mas fora do escopo

<!-- Problemas independentes vistos no caminho e NÃO corrigidos aqui. -->

## Checklist de revisão (docs/conduta-agentes.md → "Como revisar o resultado")

- [ ] A tarefa original foi resolvida por completo
- [ ] Cada alteração tem relação necessária com o objetivo
- [ ] Reutilizou o que existia (`components/ui`, `hooks`, `lib`, `services`)
- [ ] Nenhum contrato, permissão, validação ou aparência mudou sem pedido
- [ ] Complexidade/dependência nova tem justificativa concreta
- [ ] Trabalho anterior preservado (nada revertido sem motivo)
- [ ] Validação cobre o comportamento pedido, não só a compilação
- [ ] Correção, refatoração e formatação não estão misturadas
- [ ] Recurso de desenvolvimento novo fica fora do build de homolog/produção (alias para o stub + gate de runtime — docs/ferramentas-dev.md)
