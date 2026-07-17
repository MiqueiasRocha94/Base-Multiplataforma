import type {
  MainContentMode,
  SidebarDisplayMode,
  SidebarLayoutMode,
  SidebarSide,
  SystemLayoutConfig,
} from "./layout";
import type { SpecialPanelId, SpecialPanelState } from "./panel";
import type { ScreenChrome } from "./chrome";

export type SystemContextState = SystemLayoutConfig & {
  /** Snapshot limpo do layout (sem os campos derivados) para exportar a config. */
  layoutConfig: SystemLayoutConfig;
  canRenderSidebars: boolean;
  developerPanel: SpecialPanelState;
  leftSidebarInLayout: boolean;
  menuPanel: SpecialPanelState;
  rightSidebarInLayout: boolean;
  systemPanel: SpecialPanelState;
  /** Slots de header/footer da tela + captura de botoes tipados ("layout e afins"). */
  chrome: ScreenChrome;
};

export type SystemContextActions = {
  closePanel: (panelId: SpecialPanelId) => void;
  openPanel: (panelId: SpecialPanelId) => void;
  resetConfig: () => void;
  setSidebarEnabled: (side: SidebarSide, enabled: boolean) => void;
  setMainContentCardMargin: (value: number) => void;
  setMainContentMode: (value: MainContentMode) => void;
  setSidebarDisplayMode: (side: SidebarSide, value: SidebarDisplayMode) => void;
  setSidebarLayoutMode: (side: SidebarSide, value: SidebarLayoutMode) => void;
  updateConfig: (patch: Partial<SystemLayoutConfig>) => void;
};

export type SystemContextValue = SystemContextState & SystemContextActions;
