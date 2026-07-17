import { hasAllPermissions, hasAnyRole } from "@/lib/auth/user";
import type { Permission, Role, User } from "@/types/user";

export const HEADER_NAV_LIMIT = 5;
export const MOBILE_NAV_LIMIT = 5;

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
  | "login"
  | "operations"
  | "portal"
  | "profile"
  | "reports"
  | "users"
  | "more";

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
  const permOk = !item.requiredPermissions?.length || hasAllPermissions(user, item.requiredPermissions);
  const roleOk = !item.requiredRoles?.length || hasAnyRole(user, item.requiredRoles);
  return permOk && roleOk;
}

// Filtra recursivamente a árvore de navegação pelas permissões do usuário logado.
function filterNavigation(items: NavigationItem[], user: User | null): NavigationItem[] {
  return items
    .filter((item) => canSeeNavItem(item, user))
    .map((item) => (item.children ? { ...item, children: filterNavigation(item.children, user) } : item));
}

export function getAppNavigationItems(hasSession: boolean, user: User | null = null): NavigationItem[] {
  const publicItems: NavigationItem[] = [
    { href: "/home", icon: "home", labelKey: "home", primary: true },
    { href: "/documentation", icon: "documentation", labelKey: "documentation", primary: true },
  ];

  if (!hasSession) {
    return publicItems;
  }
    const subMenu = Array.from({ length: 40 }, (_, index): NavigationItem => ({
        href: `/portal/audit/item-${index + 1}`,
        icon: "portal",
        label: `Item ${index + 1}`,
    }));

  const menuModules = Array.from({ length: 40 }, (_, index): NavigationItem => ({
    href: `/portal/modulo-${index + 1}`,
    icon: "portal",
    label: `Módulo ${index + 1}`,
    requiredRoles: ["ADMIN"],
  }));

  return filterNavigation([
    // Barra principal (itens marcados como primary).
    { href: "/portal/home", icon: "home", labelKey: "portal", primary: true },
    { href: "/portal/persons", icon: "users", labelKey: "persons", primary: true, requiredPermissions: ["pessoa.visualizar"] },
    { href: "/portal/analytics", icon: "analytics", labelKey: "analytics", primary: true, requiredRoles: ["ANALISTA", "ADMIN"] },
    { href: "/portal/profile", icon: "profile", labelKey: "profile", mobileOnly: true, primary: true },
    { href: "/portal/demo400", icon: "analytics", label: "Demo 400", requiredRoles: ["ADMIN"] },
    { href: "/portal/demo500", icon: "analytics", label: "Demo 500", requiredRoles: ["ADMIN"] },

    // Auditoria concentra as demais opções como subitens (container: não navega,
    // clicar expande/colapsa; ver SidebarNavigationItem).
    {
      href: "/portal/audit",
      icon: "audit",
      label: "Auditoria",
      requiredRoles: ["ADMIN"],
      children: [
        { href: "/portal/audit/reports", icon: "reports", labelKey: "reports" },
        { href: "/portal/audit/approvals", icon: "approvals", labelKey: "approvals" },
        { href: "/portal/audit/operations", icon: "operations", labelKey: "operations" },
        { href: "/portal/audit/detalhe", icon: "auditDetail", label: "Detalhe da auditoria" },
          ...subMenu
      ],
    },
    ...menuModules,
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

export function getMobileNavigationGroups(items: NavigationItem[]) {
  const primary = items.filter((item) => item.primary);
  const overflow = items.filter((item) => !item.primary);

  // Sem itens no Menu: a barra principal recebe os itens primários (ou todos,
  // caso nenhum tenha sido marcado).
  if (overflow.length === 0) {
    return {
      left: primary.length > 0 ? primary : items,
      overflow: [] as NavigationItem[],
      right: [] as NavigationItem[],
    };
  }

  const base = primary.length > 0 ? primary : items;

  return {
    left: base.slice(0, 2),
    overflow,
    right: base.slice(2, 4),
  };
}

export type MobileNavigationGroups = ReturnType<typeof getMobileNavigationGroups>;

/**
 * Garante que a página atual apareça na barra principal do footer: quando o
 * item ativo está no overflow (Menu), ele substitui o último slot não fixo da
 * barra — o anterior ao último item da direita (Profile, que é fixo). Sem
 * estado: ao navegar para uma página visível, a barra volta ao padrão sozinha.
 */
export function getMobileGroupsForPath(groups: MobileNavigationGroups, pathname: string): MobileNavigationGroups {
  const { left, right, overflow } = groups;

  if ([...left, ...right].some((item) => isNavigationItemActive(pathname, item))) {
    return groups;
  }

  const active = overflow.find((item) => isNavigationItemActive(pathname, item));

  if (!active) {
    return groups;
  }

  if (right.length >= 2) {
    const nextRight = [...right];
    nextRight[right.length - 2] = active;
    return { ...groups, right: nextRight };
  }

  if (left.length > 0) {
    const nextLeft = [...left];
    nextLeft[left.length - 1] = active;
    return { ...groups, left: nextLeft };
  }

  return groups;
}
