# Navegação

Sidebars genéricas (`Sidebar`, `SidebarItem`, `Marker`), a árvore de navegação, a página de módulo e o *placement* do
menu por device. A malha física e as regiões onde a navegação é montada estão no
[shell adaptativo](./shell-adaptativo.md); quem vê cada item, em [autenticação e permissões](./autenticacao-e-permissoes.md)
→ "Permissões".

## Sidebars, SidebarItem e Marker

As sidebars são genéricas e dirigidas por conteúdo
([sidebar.tsx](../src/components/sidebar.tsx)):

- A `Sidebar` recebe `SidebarItem`s como filhos. Cada
  [SidebarItem](../src/components/sidebar-item.tsx) é **apenas declarativo**
  (`id`, `title`, `markerTitle`, `icon`, `children`) — não renderiza nada
  sozinho; a `Sidebar` lê suas props.
- Quando **nenhum** painel está aberto, a `Sidebar` mostra um
  [Marker](../src/components/marker.tsx) por item (atalho de borda). Clicar chama
  `openPanel(id)`.
- Quando um item está aberto, ela renderiza o conteúdo dentro de
  `SidebarPanelFrame` (cartão com título + botão de fechar → `closePanel`).
- `layoutMode: overlay` posiciona a sidebar em `absolute` (sobreposta), de modo
  que a **direita não empurra horizontalmente** o `MainContent`; `structural`
  participa do fluxo como coluna.

Montagem concreta:

- [left-sidebar.tsx](../src/components/layout/left-sidebar.tsx) — exibe a navegação
  como item `menu` quando `NavigationContext.desktopMode === "sidebar"`.
- [right-sidebar.tsx](../src/components/layout/right-sidebar.tsx) — itens `system`
  (se `NEXT_PUBLIC_SYSTEM_PANEL_ENABLED`) e `developer`.

## Navegação

A navegação é **conteúdo montado dentro das regiões**, separado da malha física.

**Árvore** ([navigation.ts](../src/lib/navigation.ts)): itens por sessão
(`getAppNavigationItems`). Módulo é **contêiner** (toggle, não navega); cada
filho aparece se o usuário tiver permissão; módulo sem filho visível some. Tela
sem implementação usa `components/portal/module-placeholder` (rota e RBAC já
prontos).

**Página do módulo** ([module-hub.tsx](../src/components/portal/module-hub.tsx)):
no menu o módulo é toggle, mas a rota dele (`/portal/<módulo>`, destino do
breadcrumb e da URL direta) é o `ModuleHub`, que lista em cards os filhos do
módulo **que o usuário vê** — os mesmos do menu, já filtrados por permissão; não
tem configuração própria. O `page.tsx` do módulo só passa o `href`
(`<ModuleHub href="/portal/<módulo>" />`). Módulo novo no menu → `page.tsx` com o
`ModuleHub`. Recurso novo do módulo → só a folha em `navigation.ts`.

Quais módulos existem e as regras de visibilidade são do produto (a base traz um
menu de demonstração); como o gate por permissão decide: [autenticação](./autenticacao-e-permissoes.md)
→ "Permissões".

***Placement*** ([NavigationContext.tsx](../src/contexts/NavigationContext.tsx)):

- **desktop** → `header` (≤ `HEADER_NAV_LIMIT` = 5 itens, sem aninhamento) ou
  `sidebar` (mais itens ou itens com filhos); sem sessão e com um só destino, oculto;
- **mobile** → `footer` (com sessão ou >1 destino público) ou `hidden`.

[Navigation.tsx](../src/components/navigation.tsx) renderiza a variante
(`header` / `sidebar` / `footer`) conforme o `placement`; `isNavigationItemActive`
marca o item ativo. Regras da barra mobile: [shell adaptativo](./shell-adaptativo.md) → "Regiões no mobile".

![Placement da navegação: no desktop/tablet, sem sessão e com um só destino fica oculto; senão, > 5 itens ou aninhado vai para sidebar, e o resto para o header. No mobile, com sessão ou >1 item público vai para o footer, senão fica oculto.](/docs/navegacao-placement.svg)

## Onde está no código

| Peça | Onde |
| --- | --- |
| Sidebar genérica | [src/components/sidebar.tsx](../src/components/sidebar.tsx), [sidebar-item.tsx](../src/components/sidebar-item.tsx), [marker.tsx](../src/components/marker.tsx) |
| Sidebars montadas | [src/components/layout/left-sidebar.tsx](../src/components/layout/left-sidebar.tsx), [right-sidebar.tsx](../src/components/layout/right-sidebar.tsx) |
| Árvore de navegação | [src/lib/navigation.ts](../src/lib/navigation.ts) |
| Placement | [src/contexts/NavigationContext.tsx](../src/contexts/NavigationContext.tsx) |
| Variantes do menu | [src/components/navigation.tsx](../src/components/navigation.tsx), [src/components/navigation/](../src/components/navigation) |
| Página do módulo | [src/components/portal/module-hub.tsx](../src/components/portal/module-hub.tsx) |

Voltar ao [índice](./README.md).
