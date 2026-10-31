import type {
  LayoutFlags,
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
  /** Presença RESOLVIDA das regiões (§9): `layout.header`, `layout.leftSidebar`,
   *  … + `layout.main` sempre `true`. É o que as regiões leem; o bruto fica em
   *  `layoutConfig`/campos `*Visible`. */
  layout: LayoutFlags;
  /** `true` = viewport mobile. */
  isMobile: boolean;
  /** Sessão presente. Flag resolvida para as regiões evitarem `useAuth` (§7.1). */
  isAuthenticated: boolean;
  /** MainContent "nu" (rota minimal no desktop): sem top bar, full-bleed. */
  mainContentBare: boolean;
  canRenderSidebars: boolean;
  menuPanel: SpecialPanelState;
  // @dev-only:start
  developerPanel: SpecialPanelState;
  systemPanel: SpecialPanelState;
  // @dev-only:end
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
