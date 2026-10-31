export type MainContentMode = "full" | "card";
export type SidebarSide = "left" | "right";
export type SidebarDisplayMode = "full" | "card" | "card-full";
export type SidebarLayoutMode = "structural" | "overlay";
/**
 * Onde o perfil (menu de conta) aparece no web: `auto` = no header quando ele
 * aparece, senão no menu da sidebar; `header`/`menu` fixam o lugar. Só vale com
 * menu na sidebar — sem ele, o perfil fica sempre no header. Mobile não usa.
 */
export type AccountPlacement = "auto" | "header" | "menu";

/** Regiões estruturais cuja presença é resolvida (§9). `main` é sempre presente. */
export type RegionKey = "header" | "leftSidebar" | "rightSidebar" | "footer";

/** Presença resolvida das regiões. `main: true` literal → imutável por tipo (§6/§9). */
export type LayoutFlags = Record<RegionKey, boolean> & { main: true };

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
  /** Onde o perfil aparece no web (ver `AccountPlacement`). */
  accountPlacement: AccountPlacement;
}
