export const HEADER_NAV_LIMIT = 5;
export const MOBILE_NAV_LIMIT = 5;

export type NavLabelKey = "home" | "login" | "portal" | "profile";
export type NavIconKey = "home" | "login" | "portal" | "profile" | "more";

export type NavigationItem = {
  href: string;
  icon: NavIconKey;
  labelKey: NavLabelKey;
  children?: NavigationItem[];
};

export function getAppNavigationItems(hasSession: boolean): NavigationItem[] {
  const publicItems: NavigationItem[] = [{ href: "/home", icon: "home", labelKey: "home" }];

  if (!hasSession) {
    return publicItems;
  }

  return [
    ...publicItems,
    { href: "/portal/home", icon: "portal", labelKey: "portal" },
    { href: "/portal/profile", icon: "profile", labelKey: "profile" },
  ];
}

export function shouldUseSidebar(items: NavigationItem[]) {
  return items.length > HEADER_NAV_LIMIT || items.some((item) => item.children && item.children.length > 0);
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
