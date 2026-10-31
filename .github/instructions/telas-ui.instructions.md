---
description: Telas (web e mobile) montadas com o design system — GenericTable, SelectOne, DateField; sem tabela/cards/select à mão
applyTo: "src/components/**,src/app/**"
---

<!-- GERADO por npm run agents:sync a partir de docs/ e .agents/rules/ — não edite. -->

# Telas e componentes de UI

Antes de criar ou alterar uma tela, leia:

- `docs/componentes-ui.md` → "Design único web/mobile" (itens 1–9: listagem,
  escolha única, data, confirmação, tela com referência) e o "Catálogo" de
  `components/ui` — reutilizar antes de criar.
- `docs/shell-adaptativo.md` → "Apresentação por device" (o que pode variar por
  `useDevice().view` e o que fica no CSS).
- Tela com referência: `docs/conduta-agentes.md` → "Fluxo obrigatório", passo 2.5
  (abrir a tela de origem).
- Linhas marcadas `Dxx (desvio conhecido)` são dívida; não copie o padrão delas
  (`docs/enforcement-arquitetura.md` → "Exceção intencional").
