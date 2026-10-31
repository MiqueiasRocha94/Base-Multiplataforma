---
description: Fronteiras dos módulos arquiteturais de src/ (o que cada pasta pode importar)
applyTo: "src/**"
---

<!-- GERADO por npm run agents:sync a partir de docs/ e .agents/rules/ — não edite. -->

# Arquitetura de src/

Antes de criar, mover ou editar arquivo em `src/`, leia:

- `docs/estrutura-projeto.md` → "Módulos arquiteturais de src" (módulo dono e
  o que cada pasta não pode conter) e "Regra de colocação" (inclusive ao criar ou
  mover componente).
- `docs/shell-adaptativo.md` → "Composição de layout (regras)", se a mudança
  tocar `components/layout` ou `contexts`.
- `docs/enforcement-arquitetura.md` → "Exceção intencional", se uma regra de
  fronteira bloquear a mudança (nunca afrouxe o lint/check).
- `docs/conduta-agentes.md` → "Validação" (inclui `npm run docs:src-map`
  ao criar/mover/remover arquivo).
