"use client";

import { createContext, useCallback, useContext, useMemo, useState, type Dispatch, type SetStateAction } from "react";
import { usePathname } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { useDevice } from "@/contexts/DeviceContext";
import { systemConfig } from "@/lib/config/system-config";
import { resolveSystemConfig } from "@/lib/system/resolve-system-config";
import { getRouteMeta } from "@/lib/system/route-meta";
import type {
  MainContentMode,
  ScreenChrome,
  SidebarDisplayMode,
  SidebarLayoutMode,
  SidebarSide,
  SpecialPanelId,
  SpecialPanelState,
  SystemContextValue,
  SystemLayoutConfig,
  TypedButtonRegion,
} from "./system/types";

export type {
  MainContentMode,
  ScreenChrome,
  SidebarDisplayMode,
  SidebarLayoutMode,
  SidebarSide,
  SpecialPanelId,
  SpecialPanelState,
  SystemContextValue,
  SystemLayoutConfig,
  TypedButtonRegion,
} from "./system/types";

// Baseline vem do arquivo estatico (fonte unica); ver src/lib/config/system-config.
const defaultConfig: SystemLayoutConfig = systemConfig.layout;

// @dev-only:start
const defaultDeveloperPanelState: SpecialPanelState = {
  activeItemId: null,
  label: "Developer",
  isOpen: false,
  view: "developer",
};

const defaultSystemPanelState: SpecialPanelState = {
  activeItemId: null,
  label: "System",
  isOpen: false,
  view: "system",
};
// @dev-only:end

// O menu (navegação) nasce aberto: quando a navbar vai para a sidebar esquerda,
// ela já aparece ativa por default e só vira marker se o usuário fechar no X.
const defaultMenuPanelState: SpecialPanelState = {
  activeItemId: "menu",
  label: "Menu",
  isOpen: true,
  view: "menu",
};

const noop = () => undefined;
const defaultChrome: ScreenChrome = {
  headerLeftEl: null,
  headerRightEl: null,
  setHeaderLeftEl: noop,
  setHeaderRightEl: noop,
  headerActive: false,
  setHeaderActive: noop,
  webTopRightEl: null,
  setWebTopRightEl: noop,
  webActionsEl: null,
  setWebActionsEl: noop,
  webBackEl: null,
  setWebBackEl: noop,
  webFooterEl: null,
  setWebFooterEl: noop,
  footerContentCount: 0,
  registerFooterContent: () => () => undefined,
  mobileActionsEl: null,
  setMobileActionsEl: noop,
  mobileBackEl: null,
  setMobileBackEl: noop,
  topButtonCount: 0,
  actionButtonCount: 0,
  backButtonCount: 0,
  registerTypedButton: () => () => undefined,
  mobileActionsOpen: false,
  setMobileActionsOpen: noop,
};

const SystemContext = createContext<SystemContextValue>({
  ...defaultConfig,
  layoutConfig: defaultConfig,
  layout: {
    header: defaultConfig.headerVisible,
    leftSidebar: false,
    rightSidebar: true,
    footer: defaultConfig.footerVisible,
    main: true,
  },
  isMobile: false,
  isAuthenticated: false,
  mainContentBare: false,
  canRenderSidebars: true,
  menuPanel: defaultMenuPanelState,
  // @dev-only:start
  developerPanel: defaultDeveloperPanelState,
  systemPanel: defaultSystemPanelState,
  // @dev-only:end
  chrome: defaultChrome,
  closePanel: () => undefined,
  openPanel: () => undefined,
  resetConfig: () => undefined,
  setSidebarEnabled: () => undefined,
  setMainContentCardMargin: () => undefined,
  setMainContentMode: () => undefined,
  setSidebarDisplayMode: () => undefined,
  setSidebarLayoutMode: () => undefined,
  updateConfig: () => undefined,
});

export function useSystemContext() {
  return useContext(SystemContext);
}

export function SystemProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { view } = useDevice();
  const { session } = useAuth();
  const pathname = usePathname();
  // SystemContext = dono do LAYOUT (§5.1). Ele LÊ as entradas de outros domínios
  // (Device, sessão, metadata da rota, config) e delega a decisão à função pura
  // `resolveSystemConfig`. A intenção de layout vem declarada pela rota como
  // RouteMeta (§5.2) — o resolver interpreta o token `minimal`, não conhece rotas.
  const routeMeta = getRouteMeta(pathname);
  // `mobileLayout` (quando declarado) substitui o layout no device mobile — ex.:
  // desktop `minimal` + mobile `mobile` na termo de privacidade.
  const routeLayout =
    view === "mobile" && routeMeta.mobileLayout ? routeMeta.mobileLayout : routeMeta.layout;
  // Flag resolvida para as regiões decidirem chrome de convidado (ex.: toggles de
  // tema/idioma, footer recolhível) SEM lerem `useAuth` direto (§7.1).
  const isAuthenticated = Boolean(session);
  const [config, setConfig] = useState<SystemLayoutConfig>(defaultConfig);
  const [menuPanel, setMenuPanel] = useState<SpecialPanelState>(defaultMenuPanelState);
  // @dev-only:start
  const [developerPanel, setDeveloperPanel] = useState<SpecialPanelState>(defaultDeveloperPanelState);
  const [systemPanel, setSystemPanel] = useState<SpecialPanelState>(defaultSystemPanelState);
  // @dev-only:end
  // Setters estáveis (useState), então o objeto pode ser criado uma vez.
  const [panelSetters] = useState<Record<SpecialPanelId, Dispatch<SetStateAction<SpecialPanelState>>>>(() => ({
    menu: setMenuPanel,
    // @dev-only:start
    developer: setDeveloperPanel,
    system: setSystemPanel,
    // @dev-only:end
  }));

  // Chrome de tela (slots + captura de botoes tipados). Faz parte de "layout e
  // afins", entao vive aqui em vez de num contexto separado.
  const [headerLeftEl, setHeaderLeftEl] = useState<HTMLElement | null>(null);
  const [headerRightEl, setHeaderRightEl] = useState<HTMLElement | null>(null);
  const [headerActive, setHeaderActive] = useState(false);
  const [webTopRightEl, setWebTopRightEl] = useState<HTMLElement | null>(null);
  const [webActionsEl, setWebActionsEl] = useState<HTMLElement | null>(null);
  const [webBackEl, setWebBackEl] = useState<HTMLElement | null>(null);
  const [webFooterEl, setWebFooterEl] = useState<HTMLElement | null>(null);
  const [footerContentCount, setFooterContentCount] = useState(0);
  const [mobileActionsEl, setMobileActionsEl] = useState<HTMLElement | null>(null);
  const [topButtonCount, setTopButtonCount] = useState(0);
  const [actionButtonCount, setActionButtonCount] = useState(0);
  const [backButtonCount, setBackButtonCount] = useState(0);
  const [mobileBackEl, setMobileBackEl] = useState<HTMLElement | null>(null);
  const [mobileActionsOpen, setMobileActionsOpen] = useState(false);
  // A segunda barra de ações fecha ao trocar de rota (padrão "estado anterior"
  // do React, sem efeito). É estado de layout: mora aqui, não na região (§7.1).
  const [prevPathname, setPrevPathname] = useState(pathname);
  if (prevPathname !== pathname) {
    setPrevPathname(pathname);
    setMobileActionsOpen(false);
  }

  const registerTypedButton = useCallback((region: TypedButtonRegion) => {
    const setCount = region === "top" ? setTopButtonCount : region === "back" ? setBackButtonCount : setActionButtonCount;
    setCount((count) => count + 1);
    return () => setCount((count) => count - 1);
  }, []);
  const registerFooterContent = useCallback(() => {
    setFooterContentCount((count) => count + 1);
    return () => setFooterContentCount((count) => count - 1);
  }, []);

  const chrome = useMemo<ScreenChrome>(
    () => ({
      headerLeftEl,
      headerRightEl,
      setHeaderLeftEl,
      setHeaderRightEl,
      headerActive,
      setHeaderActive,
      webTopRightEl,
      setWebTopRightEl,
      webActionsEl,
      setWebActionsEl,
      webBackEl,
      setWebBackEl,
      webFooterEl,
      setWebFooterEl,
      footerContentCount,
      registerFooterContent,
      mobileActionsEl,
      setMobileActionsEl,
      mobileBackEl,
      setMobileBackEl,
      topButtonCount,
      actionButtonCount,
      backButtonCount,
      registerTypedButton,
      // Sem ações montadas a segunda barra nunca fica "aberta" (troca de tela).
      mobileActionsOpen: mobileActionsOpen && actionButtonCount > 0,
      setMobileActionsOpen,
    }),
    [
      headerLeftEl,
      headerRightEl,
      headerActive,
      webTopRightEl,
      webActionsEl,
      webBackEl,
      webFooterEl,
      footerContentCount,
      registerFooterContent,
      mobileActionsEl,
      mobileBackEl,
      topButtonCount,
      actionButtonCount,
      backButtonCount,
      registerTypedButton,
      mobileActionsOpen,
    ],
  );

  // Resolução do layout: função PURA (§5.1). O provider só junta as entradas;
  // toda a regra (shell por Device, chrome suprimido em auth, etc.) vive no
  // resolver testável em src/lib/system/resolve-system-config.
  const { layout, isMobile, canRenderSidebars, mainContentBare } = useMemo(
    () => resolveSystemConfig({ config, view, routeLayout }),
    [config, view, routeLayout],
  );

  const updateConfig = useCallback((patch: Partial<SystemLayoutConfig>) => {
    setConfig((current) => ({ ...current, ...patch }));
  }, []);

  const closePanel = useCallback((panelId: SpecialPanelId) => {
    panelSetters[panelId]((current) => ({ ...current, isOpen: false }));
  }, [panelSetters]);

  const openPanel = useCallback((panelId: SpecialPanelId) => {
    // Menu vive na sidebar esquerda; os demais paineis, na direita. So fecha os
    // outros paineis do mesmo lado, para nao afetar a sidebar oposta.
    const sameSide = (id: SpecialPanelId) => (id === "menu") === (panelId === "menu");
    (Object.keys(panelSetters) as SpecialPanelId[])
      .filter((id) => id !== (panelId as string) && sameSide(id))
      .forEach((id) => panelSetters[id]((current) => ({ ...current, isOpen: false })));
    panelSetters[panelId]((current) => ({
      ...current,
      activeItemId: panelId,
      isOpen: true,
    }));
  }, [panelSetters]);

  const setSidebarEnabled = useCallback((side: SidebarSide, enabled: boolean) => {
    const visibilityKey = side === "left" ? "leftSidebarVisible" : "rightSidebarVisible";

    setConfig((current) => ({ ...current, [visibilityKey]: enabled }));
  }, []);

  const resetConfig = useCallback(() => {
    setConfig(defaultConfig);
    setMenuPanel(defaultMenuPanelState);
    // @dev-only:start
    setDeveloperPanel(defaultDeveloperPanelState);
    setSystemPanel(defaultSystemPanelState);
    // @dev-only:end
  }, []);

  const setMainContentMode = useCallback((value: MainContentMode) => {
    setConfig((current) => ({ ...current, mainContentMode: value }));
  }, []);

  const setMainContentCardMargin = useCallback((value: number) => {
    setConfig((current) => ({ ...current, mainContentCardMargin: Math.max(0, value) }));
  }, []);

  const setSidebarDisplayMode = useCallback((side: SidebarSide, value: SidebarDisplayMode) => {
    const key = side === "left" ? "leftSidebarDisplayMode" : "rightSidebarDisplayMode";
    setConfig((current) => ({ ...current, [key]: value }));
  }, []);

  const setSidebarLayoutMode = useCallback((side: SidebarSide, value: SidebarLayoutMode) => {
    const key = side === "left" ? "leftSidebarLayoutMode" : "rightSidebarLayoutMode";
    setConfig((current) => ({ ...current, [key]: value }));
  }, []);

  const value = useMemo<SystemContextValue>(
    () => ({
      ...config,
      // `...config` expõe o BRUTO (`*Visible`, dimensões, modos). A presença
      // RESOLVIDA vai em `layout.*` (§9); as regiões leem `layout`, o painel lê o
      // bruto/`layoutConfig`.
      layout,
      layoutConfig: config,
      isMobile,
      isAuthenticated,
      mainContentBare,
      canRenderSidebars,
      menuPanel,
      // @dev-only:start
      developerPanel,
      systemPanel,
      // @dev-only:end
      chrome,
      closePanel,
      openPanel,
      resetConfig,
      setSidebarEnabled,
      setMainContentCardMargin,
      setMainContentMode,
      setSidebarDisplayMode,
      setSidebarLayoutMode,
      updateConfig,
    }),
    [
      closePanel,
      canRenderSidebars,
      chrome,
      config,
      // @dev-only:start
      developerPanel,
      systemPanel,
      // @dev-only:end
      layout,
      isMobile,
      isAuthenticated,
      mainContentBare,
      menuPanel,
      openPanel,
      resetConfig,
      setSidebarEnabled,
      setMainContentCardMargin,
      setMainContentMode,
      setSidebarDisplayMode,
      setSidebarLayoutMode,
      updateConfig,
    ],
  );

  return <SystemContext.Provider value={value}>{children}</SystemContext.Provider>;
}
