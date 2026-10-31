---
description: Chamadas à API, clientes HTTP e dev-backend
globs:
  - "src/services/**"
  - "src/lib/http.ts"
  - "src/lib/http-errors.ts"
  - "src/dev-backend/**"
---

# Serviços e API

Ao mexer nestes caminhos, leia em `docs/`:

- `docs/comunicacao-api.md` → "Clientes HTTP", "Front consome, backend decide (regra transversal)" e "dev-backend"
- `docs/specs/README.md` → "Fluxo" (o contrato consumido fica na spec do módulo)
- `docs/autenticacao-e-permissoes.md` → "Canais, vinculação e renovação do token", se a mudança tocar o transporte
