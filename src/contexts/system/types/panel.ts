export type SpecialPanelId = "developer" | "menu" | "system";

export type SpecialPanelState = {
  activeItemId: string | null;
  isOpen: boolean;
  label: string;
  view: string;
};
