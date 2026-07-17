export type MainContentMode = "full" | "card";
export type SidebarSide = "left" | "right";
export type SidebarDisplayMode = "full" | "card" | "card-full";
export type SidebarLayoutMode = "structural" | "overlay";

export interface SystemLayoutConfig {
  headerVisible: boolean;
  leftSidebarVisible: boolean;
  rightSidebarVisible: boolean;
  footerVisible: boolean;
  /**
   * Quando a regiao esta oculta (Visivel = false), decide se o espaco dela
   * no layout continua reservado (vazio) ou e liberado para o resto do
   * conteudo. Sem efeito quando a regiao esta visivel.
   */
  headerReserveSpace: boolean;
  leftSidebarReserveSpace: boolean;
  rightSidebarReserveSpace: boolean;
  footerReserveSpace: boolean;
  headerHeight: number;
  footerHeight: number;
  leftSidebarWidth: number;
  rightSidebarWidth: number;
  leftSidebarDisplayMode: SidebarDisplayMode;
  rightSidebarDisplayMode: SidebarDisplayMode;
  leftSidebarLayoutMode: SidebarLayoutMode;
  rightSidebarLayoutMode: SidebarLayoutMode;
  sidebarCardMargin: number;
  mainContentMode: MainContentMode;
  mainContentCardMargin: number;
  zIndexHeader: number;
  zIndexFooter: number;
}
