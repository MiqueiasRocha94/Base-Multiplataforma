export type SpecialPanelId = "menu" /* @dev-only:start */ | "developer" | "system" /* @dev-only:end */;

export type SpecialPanelState = {
  activeItemId: string | null;
  isOpen: boolean;
  label: string;
  view: string;
};
