import { isRouteReleased } from "@/lib/auth/mobile-release";
import { hasAllPermissions, hasAnyRole } from "@/lib/auth/user";
import type { Permission, Role, User } from "@/types/user";

export const HEADER_NAV_LIMIT = 5;
/** Teto de células no CELULAR (usabilidade: acima disso a barra fica apertada). */
export const MOBILE_NAV_LIMIT = 5;
/** Teto absoluto da barra (tablet/janela larga na view mobile): a largura libera células extras. */
export const MOBILE_NAV_MAX = 7;

// Barra mobile de até 5 atalhos: home · slots dinâmicos · Menu (fim). O Menu
// abre a gaveta com a conta (perfil) no topo e a navegação completa abaixo —
// ver getMobileNavigationGroups. (MOBILE_BAR_SLOTS: legado do modelo antigo.)
export const MOBILE_BAR_SLOTS = 4;

/** Perfil: não ocupa célula na barra — vive no topo da gaveta do Menu. */
export const MOBILE_PINNED_HREF = "/portal/profile";

// Navegação hierárquica por barras contextuais (footer mobile).
// Cada barra exibe no máximo CONTEXT_ITEMS_PER_BAR itens e são exibidas até
// CONTEXT_UPPER_BARS barras adicionais acima da barra principal. Quando um
// contexto excede a capacidade visível, a última posição vira o item "Mais",
// que gera a próxima página — por isso o passo (STRIDE) reserva uma vaga.
export const CONTEXT_ITEMS_PER_BAR = 5;
export const CONTEXT_UPPER_BARS = 4;
export const CONTEXT_PAGE_CAP = CONTEXT_ITEMS_PER_BAR * CONTEXT_UPPER_BARS;
export const CONTEXT_PAGE_STRIDE = CONTEXT_PAGE_CAP - 1;

// Identificador do nó sintético que representa o Menu (raiz do overflow).
export const MENU_NODE_ID = "__menu__";

export type NavLabelKey = "analytics" | "approvals" | "documentation" | "home" | "login" | "operations" | "persons" | "portal" | "profile" | "reports";
export type NavIconKey =
  | "analytics"
  | "approvals"
  | "audit"
  | "auditDetail"
  | "documentation"
  | "home"
  | "key"
  | "login"
  | "operations"
  | "portal"
  | "profile"
  | "reports"
  | "users"
  | "more"
  // Ícones de módulos de negócio (disponíveis para o produto).
  | "register"
  | "search"
  | "finance"
  | "contract"
  | "pending"
  | "security"
  | "integration"
  | "processing"
  | "archive"
  | "webservice"
  | "card"
  | "admin";

export type NavigationItem = {
  href: string;
  icon: NavIconKey;
  labelKey?: NavLabelKey;
  // Rótulo literal, usado quando o item não tem uma chave no dicionário.
  label?: string;
  // Marca os itens que ocupam a barra principal (posições fixas ao redor do
  // botão central de Menu). Os demais itens vão para o contexto do Menu.
  primary?: boolean;
  children?: NavigationItem[];
  mobileOnly?: boolean;
  // RBAC de menu: exige permissões (todas) e/ou papéis (qualquer) do usuário.
  requiredPermissions?: Permission[];
  requiredRoles?: Role[];
};

// Item visível se satisfaz as permissões (todas) e os papéis (qualquer) exigidos.
function canSeeNavItem(item: NavigationItem, user: User | null): boolean {
  // No app, folha de página não publicada sai do menu (contêiner: pela poda dos filhos).
  if (!item.children?.length && !isRouteReleased(item.href)) {
    return false;
  }
  const permOk = !item.requiredPermissions?.length || hasAllPermissions(user, item.requiredPermissions);
  const roleOk = !item.requiredRoles?.length || hasAnyRole(user, item.requiredRoles);
  return permOk && roleOk;
}

// Filtra recursivamente a árvore de navegação pelas permissões do usuário logado.
// Contêiner (item com `children`) cujos filhos foram todos filtrados é descartado —
// evita módulo de menu vazio para quem não tem nenhuma ação dele.
function filterNavigation(items: NavigationItem[], user: User | null): NavigationItem[] {
  return items
    .filter((item) => canSeeNavItem(item, user))
    .map((item) => (item.children ? { ...item, children: filterNavigation(item.children, user) } : item))
    .filter((item) => !item.children || item.children.length > 0);
}

export function getAppNavigationItems(hasSession: boolean, user: User | null = null): NavigationItem[] {
  // Rotas públicas são apenas login e start (transição do APK) — telas "nuas",
  // sem navegação. Portanto, sem sessão, não há itens de menu.
  if (!hasSession) {
    return [];
  }

  // Menu de demonstração da base: cada produto substitui pela sua árvore.
  return filterNavigation([
    // Barra principal (itens marcados como primary).
    { href: "/portal/home", icon: "home", labelKey: "portal", primary: true },
    { href: "/portal/persons", icon: "users", labelKey: "persons", primary: true, requiredPermissions: ["pessoa.visualizar"] },
    { href: "/portal/analytics", icon: "analytics", labelKey: "analytics", primary: true, requiredRoles: ["ANALISTA", "ADMIN"] },
    { href: "/portal/profile", icon: "profile", labelKey: "profile", mobileOnly: true, primary: true },
    { href: "/portal/audit", icon: "audit", label: "Auditoria", requiredRoles: ["ADMIN"] },
    // @dev-only:start
    { href: "/portal/demo400", icon: "analytics", label: "Demo 400", requiredRoles: ["ADMIN"] },
    { href: "/portal/demo500", icon: "analytics", label: "Demo 500", requiredRoles: ["ADMIN"] },
    // @dev-only:end
  ], user);
}

export function getDesktopNavigationItems(items: NavigationItem[]) {
  return items.filter((item) => item.mobileOnly !== true);
}

export function getMobileNavigationItems(items: NavigationItem[]) {
  return items;
}

export function hasNestedNavigation(items: NavigationItem[]) {
  return items.some((item) => item.children && item.children.length > 0);
}

export function shouldUseSidebar(items: NavigationItem[]) {
  return items.length > HEADER_NAV_LIMIT || hasNestedNavigation(items);
}

export function isNavigationItemActive(pathname: string, item: NavigationItem): boolean {
  if (pathname === item.href || pathname.startsWith(`${item.href}/`)) {
    return true;
  }

  return item.children?.some((child) => isNavigationItemActive(pathname, child)) ?? false;
}

// Descendente (folha) atualmente na rota, dentro de um contêiner. Usado na barra
// mobile: o slot de um módulo exibe o FILHO ativo (nome+ícone) enquanto ele está
// selecionado, voltando ao módulo quando a rota sai dele.
export function findActiveChild(pathname: string, item: NavigationItem): NavigationItem | null {
  for (const child of item.children ?? []) {
    if (pathname === child.href || pathname.startsWith(`${child.href}/`)) {
      return findActiveChild(pathname, child) ?? child;
    }
    const deeper = findActiveChild(pathname, child);
    if (deeper) {
      return deeper;
    }
  }
  return null;
}

// Folha (página sem filhos) com o href dado, em qualquer nível da árvore.
export function findNavigationLeaf(items: NavigationItem[], href: string): NavigationItem | null {
  for (const item of items) {
    if (item.children?.length) {
      const found = findNavigationLeaf(item.children, href);
      if (found) {
        return found;
      }
    } else if (item.href === href) {
      return item;
    }
  }
  return null;
}

export function flattenNavigationItems(items: NavigationItem[]) {
  return items.flatMap((item) => [item, ...(item.children ?? [])]);
}

export function getMobileVisibleItems(items: NavigationItem[]) {
  if (items.length <= MOBILE_NAV_LIMIT) {
    return {
      left: items,
      overflow: [] as NavigationItem[],
      right: [] as NavigationItem[],
    };
  }

  return {
    left: items.slice(0, 2),
    overflow: items.slice(2, -2),
    right: items.slice(-2),
  };
}

// Janela de itens (paginação) de um contexto. Reserva uma vaga para o item
// "Mais" sempre que ainda houver itens além da página atual.
export function getContextWindow(children: NavigationItem[], page: number) {
  if (children.length <= CONTEXT_PAGE_CAP) {
    return { items: children, more: false };
  }

  const start = page * CONTEXT_PAGE_STRIDE;

  return { items: children.slice(start, start + CONTEXT_PAGE_STRIDE), more: children.length > start + CONTEXT_PAGE_STRIDE };
}

export function getContextPageCount(children: NavigationItem[]) {
  return children.length <= CONTEXT_PAGE_CAP ? 1 : Math.ceil(children.length / CONTEXT_PAGE_STRIDE);
}

/**
 * Página fixada pelo usuário num slot dinâmico da barra (`slot` 1 = logo após o
 * home). O slot é da página: desafixar o 1 libera o 1, sem mexer nos outros.
 */
export type PinnedSlot = { href: string; slot: number };

/**
 * Pins que valem para o usuário, com o slot efetivo: resolvidos na árvore JÁ
 * filtrada por permissão (pin de página sem acesso salvo no storage some
 * sozinho), sem âncoras (home/profile). Slot repetido (pin
 * oculto que voltou a valer): o mais antigo fica, o outro vai ao próximo livre.
 * Ordenados pelo slot.
 */
export function resolvePinnedSlots(
  items: NavigationItem[],
  pins: PinnedSlot[],
  anchorHrefs: string[] = [],
): { item: NavigationItem; slot: number }[] {
  const anchors = new Set([...anchorHrefs, MOBILE_PINNED_HREF]);
  const taken = new Set<number>();
  const resolved: { item: NavigationItem; slot: number }[] = [];
  for (const pin of pins) {
    const item = anchors.has(pin.href) ? null : findNavigationLeaf(items, pin.href);
    if (!item) continue;
    let slot = Math.max(1, Math.floor(pin.slot) || 1);
    while (taken.has(slot)) slot += 1;
    taken.add(slot);
    resolved.push({ item, slot });
  }
  return resolved.sort((a, b) => a.slot - b.slot);
}

/** Células da barra (`maxCells` limitado a 1..MOBILE_NAV_MAX) e quantas são dinâmicas (sem home e menu). */
function mobileCells(items: NavigationItem[], maxCells: number) {
  const rest = items.filter((item) => item.href !== MOBILE_PINNED_HREF);
  const cells = Math.max(1, Math.min(MOBILE_NAV_MAX, Math.floor(maxCells) || MOBILE_NAV_LIMIT));
  const hasHome = cells >= 2 && rest.length > 0;
  return { rest, hasHome, dynCells: Math.max(0, cells - 1 - (hasHome ? 1 : 0)) };
}

/** Slots dinâmicos da barra atual (= limite de pins nesta tela: celular 3, tablet até 5). */
export function mobileDynamicSlots(items: NavigationItem[], maxCells: number = MOBILE_NAV_LIMIT): number {
  return mobileCells(items, maxCells).dynCells;
}

/**
 * Agrupa os itens da barra mobile em `maxCells` células (ADAPTATIVO: o nº de
 * células vem da escala da fonte e da largura da barra, medidas no componente —
 * fonte maior ⇒ menos slots; barra larga (tablet) ⇒ mais, até MOBILE_NAV_MAX). Âncoras: `home` no início e o **Menu+Perfil** (gaveta com a conta no
 * topo) SEMPRE no fim — o Profile não ocupa célula própria (vive na gaveta).
 * As células entre eles são slots dinâmicos. Ordem de queda: dinâmico → home
 * (o Menu nunca cai):
 *   5 = home·dinâmico·dinâmico·dinâmico·menu
 *   4 = home·dinâmico·dinâmico·menu
 *   3 = home·dinâmico·menu
 *   2 = home·menu
 *   1 = menu
 *
 * `left` = home + dinâmicos; `right` fica vazio (mantido p/ compatibilidade);
 * `overflow` = o que não coube (sempre alcançável pela gaveta).
 *
 * `pinnedHrefs`: páginas (folhas, em qualquer nível) que o usuário fixou — ocupam
 * os slots dinâmicos primeiro, na ordem; slots restantes seguem o padrão.
 */
export function getMobileNavigationGroups(
  items: NavigationItem[],
  maxCells: number = MOBILE_NAV_LIMIT,
  pins: PinnedSlot[] = [],
) {
  // Profile sai da barra: a conta fica no topo da gaveta do Menu.
  const { rest, hasHome, dynCells } = mobileCells(items, maxCells);
  const home = hasHome ? rest.slice(0, 1) : [];
  const pool = hasHome ? rest.slice(1) : rest; // dinâmicos vêm após o home

  // Fixados pelo usuário (só os que ele vê), cada um no seu slot; âncoras
  // (home/profile) não entram. Slot livre (ex.: pin 1 desafixado) = padrão.
  const userPinned = resolvePinnedSlots(items, pins, home.map((item) => item.href));
  const pinnedSet = new Set(userPinned.map((pin) => pin.item.href));
  const fillers = pool.filter((item) => !pinnedSet.has(item.href));

  const dyn: NavigationItem[] = [];
  for (let slot = 1; slot <= dynCells; slot += 1) {
    const next = userPinned.find((pin) => pin.slot === slot)?.item ?? fillers.shift();
    if (next) dyn.push(next);
  }
  const dynSet = new Set(dyn.map((item) => item.href));

  return {
    left: [...home, ...dyn],
    overflow: pool.filter((item) => !dynSet.has(item.href)),
    right: [] as NavigationItem[],
  };
}

export type MobileNavigationGroups = ReturnType<typeof getMobileNavigationGroups>;

/**
 * Slot 4 da barra: por padrão exibe um LINK (o 1º item do Menu); quando a página
 * ativa vem do Menu (overflow), o slot 4 passa a mostrá-la; ao sair para uma
 * página fixa (slots 1-2), volta ao link padrão. O Perfil fica sempre no slot 5.
 * Sem estado — tudo derivado do pathname.
 */
export function getMobileGroupsForPath(groups: MobileNavigationGroups, pathname: string): MobileNavigationGroups {
  const { left, right, overflow } = groups;

  // Sem Menu: barra no padrão (não há slot 4 dinâmico).
  if (overflow.length === 0) {
    return groups;
  }

  const pinned = right.filter((item) => item.href === MOBILE_PINNED_HREF);
  // Barra mínima (Menu + Perfil) não reservou slot dinâmico — nada a atualizar.
  if (right.length <= pinned.length) {
    return groups;
  }
  // Se um slot FIXO (esquerda) já está ativo na rota, a página ativa já aparece
  // na barra — o slot dinâmico NÃO pode duplicá-la. Isso acontece quando a mesma
  // folha é compartilhada por mais de um módulo (ex.: "Saldo devedor" em Consulta
  // e Pendência): sem isto, o slot fixo mostraria via Consulta e o slot 4 via
  // Pendência. Nesse caso o slot 4 mantém o link padrão (1º do overflow).
  const activeOnLeft = left.some((item) => isNavigationItemActive(pathname, item));
  const slot4 =
    (activeOnLeft ? undefined : overflow.find((item) => isNavigationItemActive(pathname, item))) ?? overflow[0];

  return { ...groups, right: slot4 ? [slot4, ...pinned] : pinned };
}
