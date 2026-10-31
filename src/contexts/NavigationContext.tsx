"use client";

import { usePathname } from "next/navigation";
import { createContext, useCallback, useContext, useMemo, useState } from "react";

import { useAuth } from "@/contexts/AuthContext";
import { useDevice } from "@/contexts/DeviceContext";
import {
  getAppNavigationItems,
  getContextWindow,
  getDesktopNavigationItems,
  getMobileGroupsForPath,
  getMobileNavigationGroups,
  getMobileNavigationItems,
  hasNestedNavigation,
  MENU_NODE_ID,
  shouldUseSidebar,
  type NavigationItem,
} from "@/lib/navigation";

type DesktopNavigationMode = "header" | "sidebar" | "hidden";
type MobileNavigationMode = "footer" | "hidden";
type NavigationPlacement = "header" | "sidebar" | "footer" | "hidden";

type StackEntry = { node: NavigationItem; page: number };

// Modelo de navegação contextual (footer mobile): estado da pilha + ações,
// além de um recorte já pronto para a view (barras e centro).
type ContextualNavigation = {
  hasMenu: boolean;
  fixedLeft: NavigationItem[];
  fixedRight: NavigationItem[];
  isOpen: boolean;
  centerNode: NavigationItem | null;
  centerPage: number;
  isMenuRoot: boolean;
  // href do nó RAIZ da pilha aberta: identifica DE ONDE o submenu foi aberto
  // (o botão Menu central ou um slot fixo), para o toggle ficar na origem.
  rootHref: string | null;
  pageItems: NavigationItem[];
  showMore: boolean;
  onCenter: () => void;
  onNextPage: () => void;
  onOpenNode: (node: NavigationItem) => void;
  onCollapse: () => void;
};

type NavigationContextValue = {
  desktopMode: DesktopNavigationMode;
  hasNestedItems: boolean;
  items: NavigationItem[];
  mobileMode: MobileNavigationMode;
  mobileLeftItems: NavigationItem[];
  mobileOverflowItems: NavigationItem[];
  mobileRightItems: NavigationItem[];
  placement: NavigationPlacement;
  contextualNav: ContextualNavigation;
};

const NavigationContext = createContext<NavigationContextValue | null>(null);

export function NavigationProvider({ children }: { children: React.ReactNode }) {
  const { session, user } = useAuth();
  const { view } = useDevice();
  const pathname = usePathname();
  const [stack, setStack] = useState<StackEntry[]>([]);

  const derived = useMemo(() => {
    const items = getAppNavigationItems(Boolean(session), user);
    const desktopItems = getDesktopNavigationItems(items);
    const mobileItems = getMobileNavigationItems(items);
    const mobileGroups = getMobileNavigationGroups(mobileItems);
    // Sem sessão, só faz sentido mostrar navegação quando há mais de um destino
    // público. Com apenas Home (ou só Login) não existe para onde navegar, então
    // a barra é ocultada — tanto no header desktop quanto no footer mobile.
    const hasMultipleDesktopDestinations = Boolean(session) || desktopItems.length > 1;
    const hasMultiplePublicDestinations = mobileItems.length > 1;
    const desktopMode: DesktopNavigationMode = !hasMultipleDesktopDestinations
      ? "hidden"
      : shouldUseSidebar(desktopItems)
        ? "sidebar"
        : "header";
    const mobileMode: MobileNavigationMode = session || hasMultiplePublicDestinations ? "footer" : "hidden";

    // Nó sintético que representa o Menu: seus filhos são os itens de overflow.
    const menuRoot: NavigationItem = { href: MENU_NODE_ID, icon: "more", children: mobileGroups.overflow };

    return {
      desktopMode,
      hasNestedItems: hasNestedNavigation(view === "mobile" ? mobileItems : desktopItems),
      items: view === "mobile" ? mobileItems : desktopItems,
      mobileMode,
      mobileGroups,
      menuRoot,
      placement: (view === "mobile" ? mobileMode : desktopMode) as NavigationPlacement,
    };
  }, [session, user, view]);

  const onCollapse = useCallback(() => setStack([]), []);

  const onCenter = useCallback(() => {
    setStack((current) => {
      if (!current.length) {
        return [{ node: derived.menuRoot, page: 0 }];
      }

      const entry = current[current.length - 1];

      if (entry.page > 0) {
        return [...current.slice(0, -1), { ...entry, page: entry.page - 1 }];
      }

      return current.slice(0, -1);
    });
  }, [derived.menuRoot]);

  const onNextPage = useCallback(() => {
    setStack((current) => {
      if (!current.length) {
        return current;
      }

      const entry = current[current.length - 1];

      return [...current.slice(0, -1), { ...entry, page: entry.page + 1 }];
    });
  }, []);

  const onOpenNode = useCallback((node: NavigationItem) => {
    if (!node.children?.length) {
      return;
    }

    setStack((current) => [...current, { node, page: 0 }]);
  }, []);

  const value = useMemo<NavigationContextValue>(() => {
    const top = stack.length ? stack[stack.length - 1] : null;
    const window = top ? getContextWindow(top.node.children ?? [], top.page) : { items: [], more: false };
    // Barra principal com a página atual sempre visível (item do Menu entra no
    // slot não fixo enquanto a rota estiver ativa).
    const mobileGroups = getMobileGroupsForPath(derived.mobileGroups, pathname);

    const contextualNav: ContextualNavigation = {
      hasMenu: mobileGroups.overflow.length > 0,
      fixedLeft: mobileGroups.left,
      fixedRight: mobileGroups.right,
      isOpen: Boolean(top),
      centerNode: top ? top.node : null,
      centerPage: top ? top.page : 0,
      isMenuRoot: top?.node.href === MENU_NODE_ID,
      rootHref: stack.length ? stack[0].node.href : null,
      pageItems: window.items,
      showMore: window.more,
      onCenter,
      onNextPage,
      onOpenNode,
      onCollapse,
    };

    return {
      desktopMode: derived.desktopMode,
      hasNestedItems: derived.hasNestedItems,
      items: derived.items,
      mobileMode: derived.mobileMode,
      mobileLeftItems: mobileGroups.left,
      mobileOverflowItems: mobileGroups.overflow,
      mobileRightItems: mobileGroups.right,
      placement: derived.placement,
      contextualNav,
    };
  }, [derived, stack, pathname, onCenter, onNextPage, onOpenNode, onCollapse]);

  return <NavigationContext.Provider value={value}>{children}</NavigationContext.Provider>;
}

export function useNavigation() {
  const context = useContext(NavigationContext);

  if (!context) {
    throw new Error("useNavigation must be used within NavigationProvider.");
  }

  return context;
}
