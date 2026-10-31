---
description: Ambientes, variáveis, scripts, Docker e configuração de build
globs:
  - "package.json"
  - ".env*"
  - "scripts/**"
  - "docker/**"
  - "next.config.ts"
  - "capacitor.config.ts"
---

# Ambiente e build

Ao mexer nestes caminhos, leia em `docs/`:

- `docs/ambiente-e-build.md` → "Ambientes" e a seção do build afetado
- `docs/conduta-agentes.md` → "Autorizações" (dependência nova, build de APK/Docker, segredos)
- `docs/ferramentas-dev.md` → "Fora dos artefatos", se a mudança tocar o build de homologação/produção
