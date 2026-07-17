# 01 — Visão geral

## O que é

Base reutilizável para produtos digitais **multiplataforma** em **Next.js 16
(App Router) / React 19 + TypeScript**, com empacotamento mobile via
**Capacitor 8**. Traz a infraestrutura comum pronta (tema dinâmico, i18n,
escala/preset de fonte, autenticação demo com biometria, storage, wrappers de
recursos nativos, cliente HTTP, Modo desenvolvedor e scripts de build web/mobile)
**sem regra de negócio**. O esqueleto já roda: **start → home pública → login →
portal (área autenticada)**.

O diferencial é a **arquitetura de shell adaptativo orientada a estrutura**: o
mesmo código entrega uma experiência **desktop** e uma experiência **mobile**
(escolhidas em runtime pelo `DeviceContext`), e a **malha física da tela**
(Header, LeftSidebar, MainContent, RightSidebar, Footer) é configurável em runtime
pelo `SystemContext`. Ver [04 — Shell adaptativo](./04-shell-adaptativo.md).

## Stack

- Next.js 16.2.6 (App Router) / React 19.2.4 / TypeScript 5
- Capacitor 8.3.4 (Android / iOS) — consome o export estático do Next (`webDir: "out"`)
- Tailwind CSS 4 + CSS variables semânticas ([src/styles/tokens.css](../src/styles/tokens.css))
- i18next 26 + react-i18next (pt-BR / en / es-ES)
- Zod 4 (validação de formulários) · lucide-react (ícones)
- Plugins nativos: camera, filesystem, local/push-notifications, file-picker, biometric-auth

## Arquitetura em camadas

![Arquitetura em camadas: src/app → AppStructure → contexts globais, e a escolha de shell (mobile × desktop) pelo DeviceContext, com SystemContext na malha física.](/docs/arquitetura-camadas.svg)

**Princípio de roteamento:** o App Router organiza a aplicação por **grupos de
rota** (`(Public)` e `(Portal)`) sem alterar a URL. O `layout.tsx` raiz é mínimo e
delega toda a composição de UI para `AppStructure`. Pastas privadas
(`_components`, `_lib`) guardam implementação não-roteável colocada perto da rota.
Exemplos:

- [src/app/(Public)/home/page.tsx](<../src/app/(Public)/home/page.tsx>) → home pública
- [src/app/(Portal)/portal/layout.tsx](<../src/app/(Portal)/portal/layout.tsx>) → gate de sessão da área protegida

## Camadas do shell adaptativo (resumo)

![Camadas do shell: app/layout → AppStructure → providers → DeviceContext decide entre MobileAppShell e a malha desktop, que consome o SystemContext.](/docs/camadas-shell.svg)

## Conceitos-chave

| Conceito | Onde | Para quê |
| --- | --- | --- |
| Orquestrador de UI | [AppStructure.tsx](../src/components/layout/AppStructure.tsx) | Monta os providers e escolhe o shell (mobile × desktop). |
| Decisão de plataforma | [DeviceContext.tsx](../src/contexts/DeviceContext.tsx) | `view: mobile / tablet / desktop` a partir de viewport + Capacitor. |
| Camada estrutural | [SystemContext.tsx](../src/contexts/SystemContext.tsx) | Geometria da malha + estado dos painéis especiais (developer/menu/system). |
| Malha física | [src/components/layout](../src/components/layout) | `Header`, `LeftSidebar`, `MainContent`, `RightSidebar`, `Footer`, `MobileAppShell`. |
| Navegação | [navigation.ts](../src/lib/navigation.ts) + [NavigationContext.tsx](../src/contexts/NavigationContext.tsx) | Itens e *placement* (header / sidebar / footer) por sessão e plataforma. |
| Tema e tokens | [ThemeProvider.tsx](../src/contexts/ThemeProvider.tsx) + [tokens.css](../src/styles/tokens.css) | `data-theme`/`data-font` no `html` + CSS variables semânticas. |
| Camada nativa | [src/lib/platform](../src/lib/platform) | Wrappers de Capacitor (biometria, câmera, arquivos, notificações, storage). |
| Env público | [src/lib/env/public.ts](../src/lib/env/public.ts) | Leitura estática de `NEXT_PUBLIC_*`. |

Continue em [02 — Primeiros passos](./02-primeiros-passos.md).
