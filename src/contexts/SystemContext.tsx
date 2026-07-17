"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { useDevice } from "@/contexts/DeviceContext";
import { systemConfig } from "@/lib/config/system-config";
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

const defaultDeveloperPanelState: SpecialPanelState = {
  activeItemId: null,
  label: "Developer",
  isOpen: false,
  view: "developer",
};

// O menu (navegação) nasce aberto: quando a navbar vai para a sidebar esquerda,
// ela já aparece ativa por default e só vira marker se o usuário fechar no X.
const defaultMenuPanelState: SpecialPanelState = {
  activeItemId: "menu",
  label: "Menu",
  isOpen: true,
  view: "menu",
};

const defaultSystemPanelState: SpecialPanelState = {
  activeItemId: null,
  label: "System",
  isOpen: false,
  view: "system",
};

const noop = () => undefined;
const defaultChrome: ScreenChrome = {
  headerLeftEl: null,
  headerRightEl: null,
  footerEl: null,
  setHeaderLeftEl: noop,
  setHeaderRightEl: noop,
  setFooterEl: noop,
  headerActive: false,
  footerActive: false,
  headerActionActive: false,
  setHeaderActive: noop,
  setFooterActive: noop,
  setHeaderActionActive: noop,
  webTopRightEl: null,
  setWebTopRightEl: noop,
  webActionsEl: null,
  setWebActionsEl: noop,
  mobileActionsEl: null,
  setMobileActionsEl: noop,
  topButtonCount: 0,
  actionButtonCount: 0,
  registerTypedButton: () => () => undefined,
};

const SystemContext = createContext<SystemContextValue>({
  ...defaultConfig,
  layoutConfig: defaultConfig,
  canRenderSidebars: true,
  developerPanel: defaultDeveloperPanelState,
  leftSidebarInLayout: false,
  menuPanel: defaultMenuPanelState,
  rightSidebarInLayout: true,
  systemPanel: defaultSystemPanelState,
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
  const [config, setConfig] = useState<SystemLayoutConfig>(defaultConfig);
  const [developerPanel, setDeveloperPanel] = useState<SpecialPanelState>(defaultDeveloperPanelState);
  const [menuPanel, setMenuPanel] = useState<SpecialPanelState>(defaultMenuPanelState);
  const [systemPanel, setSystemPanel] = useState<SpecialPanelState>(defaultSystemPanelState);

  // Chrome de tela (slots + captura de botoes tipados). Faz parte de "layout e
  // afins", entao vive aqui em vez de num contexto separado.
  const [headerLeftEl, setHeaderLeftEl] = useState<HTMLElement | null>(null);
  const [headerRightEl, setHeaderRightEl] = useState<HTMLElement | null>(null);
  const [footerEl, setFooterEl] = useState<HTMLElement | null>(null);
  const [headerActive, setHeaderActive] = useState(false);
  const [footerActive, setFooterActive] = useState(false);
  const [headerActionActive, setHeaderActionActive] = useState(false);
  const [webTopRightEl, setWebTopRightEl] = useState<HTMLElement | null>(null);
  const [webActionsEl, setWebActionsEl] = useState<HTMLElement | null>(null);
  const [mobileActionsEl, setMobileActionsEl] = useState<HTMLElement | null>(null);
  const [topButtonCount, setTopButtonCount] = useState(0);
  const [actionButtonCount, setActionButtonCount] = useState(0);

  const registerTypedButton = useCallback((region: TypedButtonRegion) => {
    const setCount = region === "top" ? setTopButtonCount : setActionButtonCount;
    setCount((count) => count + 1);
    return () => setCount((count) => count - 1);
  }, []);

  const chrome = useMemo<ScreenChrome>(
    () => ({
      headerLeftEl,
      headerRightEl,
      footerEl,
      setHeaderLeftEl,
      setHeaderRightEl,
      setFooterEl,
      headerActive,
      footerActive,
      headerActionActive,
      setHeaderActive,
      setFooterActive,
      setHeaderActionActive,
      webTopRightEl,
      setWebTopRightEl,
      webActionsEl,
      setWebActionsEl,
      mobileActionsEl,
      setMobileActionsEl,
      topButtonCount,
      actionButtonCount,
      registerTypedButton,
    }),
    [
      headerLeftEl,
      headerRightEl,
      footerEl,
      headerActive,
      footerActive,
      headerActionActive,
      webTopRightEl,
      webActionsEl,
      mobileActionsEl,
      topButtonCount,
      actionButtonCount,
      registerTypedButton,
    ],
  );

  const canRenderSidebars = view !== "mobile";
  const leftSidebarInLayout = canRenderSidebars && config.leftSidebarVisible;
  const rightSidebarInLayout = canRenderSidebars && config.rightSidebarVisible;

  const updateConfig = useCallback((patch: Partial<SystemLayoutConfig>) => {
    setConfig((current) => ({ ...current, ...patch }));
  }, []);

  const closePanel = useCallback((panelId: SpecialPanelId) => {
    const setter = panelId === "developer"
      ? setDeveloperPanel
      : panelId === "menu"
        ? setMenuPanel
        : setSystemPanel;

    setter((current) => ({ ...current, isOpen: false }));
  }, []);

  const openPanel = useCallback((panelId: SpecialPanelId) => {
    const setter = panelId === "developer"
      ? setDeveloperPanel
      : panelId === "menu"
        ? setMenuPanel
        : setSystemPanel;
    // Menu vive na sidebar esquerda; developer/system vivem na direita. So
    // fecha os outros paineis do mesmo lado, para nao afetar a sidebar oposta.
    const otherSetters =
      panelId === "developer"
        ? [setSystemPanel]
        : panelId === "menu"
          ? []
          : [setDeveloperPanel];

    otherSetters.forEach((otherSetter) => {
      otherSetter((current) => ({ ...current, isOpen: false }));
    });
    setter((current) => ({
      ...current,
      activeItemId: panelId,
      isOpen: true,
    }));
  }, []);

  const setSidebarEnabled = useCallback((side: SidebarSide, enabled: boolean) => {
    const visibilityKey = side === "left" ? "leftSidebarVisible" : "rightSidebarVisible";

    setConfig((current) => ({ ...current, [visibilityKey]: enabled }));
  }, []);

  const resetConfig = useCallback(() => {
    setConfig(defaultConfig);
    setDeveloperPanel(defaultDeveloperPanelState);
    setMenuPanel(defaultMenuPanelState);
    setSystemPanel(defaultSystemPanelState);
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
      layoutConfig: config,
      canRenderSidebars,
      developerPanel,
      leftSidebarInLayout,
      menuPanel,
      rightSidebarInLayout,
      systemPanel,
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
      developerPanel,
      leftSidebarInLayout,
      menuPanel,
      openPanel,
      resetConfig,
      rightSidebarInLayout,
      setSidebarEnabled,
      setMainContentCardMargin,
      setMainContentMode,
      setSidebarDisplayMode,
      setSidebarLayoutMode,
      systemPanel,
      updateConfig,
    ],
  );

  return <SystemContext.Provider value={value}>{children}</SystemContext.Provider>;
}
