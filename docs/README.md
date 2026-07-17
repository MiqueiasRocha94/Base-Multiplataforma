# Documentação — Base Multiplataforma

Guia de **uso** desta base reutilizável (Next.js 16 / React 19 + Capacitor 8 +
TypeScript). O foco é explicar como construir um produto a partir daqui — em
especial a **arquitetura de shell adaptativo orientada a estrutura**, em que o
mesmo código entrega uma experiência **web (desktop)** e uma experiência
**mobile encapsulada**, com a malha física da tela (Header, Sidebars, Conteúdo,
Footer) controlada em runtime pelo `SystemContext`.

> Convenção do projeto: **código em inglês**, **documentação em pt-BR**
> (ver [AGENTS.md](../AGENTS.md)). Esta é uma base de **plataforma**, não um site
> isolado: fortalecer a base, não fragmentá-la.

## Índice

| Doc | Conteúdo |
| --- | --- |
| [01 — Visão geral](./01-visao-geral.md) | O que é a base, stack e arquitetura em camadas. |
| [02 — Primeiros passos](./02-primeiros-passos.md) | Instalar, rodar, ambientes (`.env`), build web/mobile e o Modo desenvolvedor. |
| [03 — Estrutura do projeto](./03-estrutura-projeto.md) | Pastas, App Router (route groups `(Public)`/`(Portal)`), rotas e onde mexer. |
| [04 — Shell adaptativo e estrutura](./04-shell-adaptativo.md) | **★ Principal.** `AppStructure`, providers, decisão desktop×mobile, malha física e o `SystemContext` (geometria + painéis). |
| [05 — Infraestrutura](./05-infraestrutura.md) | Tema/tokens, i18n, fonte, auth/biometria/RBAC, storage, camada nativa (Capacitor), HTTP, navegação e Modo desenvolvedor. |
| [06 — Componentes adaptativos](./06-componentes-adaptativos.md) | Mesmo componente, comportamento por plataforma: `GenericTable` (tabela no desktop, lista estilo Expo no mobile) e o módulo Pessoas (schema-driven). |
| [07 — Scaffold e módulos](./07-scaffold-modulos.md) | Arquitetura orientada a contrato (Entity Runtime), anatomia de um módulo CRUD e como o scaffold gera/gerará as páginas a partir do contrato. |

## Atalho: "quero criar uma tela/rota nova"

Crie uma pasta de rota no grupo certo do App Router — `src/app/(Public)/...` para
área pública ou `src/app/(Portal)/portal/...` para área autenticada — com seu
`page.tsx`. Use componentes de [src/components/ui](../src/components/ui) como
primeira fonte de reutilização e tokens semânticos (não cores fixas). Para que a
rota apareça na navegação, registre-a em
[src/lib/navigation.ts](../src/lib/navigation.ts). Detalhes em
[03 — Estrutura do projeto](./03-estrutura-projeto.md) e
[04 — Shell adaptativo](./04-shell-adaptativo.md).
