import type { AccountPlacement } from "@/contexts/system/types";

/**
 * Onde o perfil (menu de conta) renderiza no web — regra pura (docs/shell-adaptativo.md):
 *
 * - sem menu na sidebar esquerda → sempre no **header** (a opção nem aparece);
 * - header oculto → no **menu** (o perfil não pode sumir);
 * - senão: `menu` fixa no menu; `auto`/`header` → header.
 *
 * Mobile: `null` — o perfil é a tela `/portal/profile`, não este menu.
 */
export function resolveAccountPlacement(input: {
  placement: AccountPlacement;
  isMobile: boolean;
  headerVisible: boolean;
  menuAvailable: boolean;
}): "header" | "menu" | null {
  if (input.isMobile) return null;
  if (!input.menuAvailable) return "header";
  if (!input.headerVisible) return "menu";
  return input.placement === "menu" ? "menu" : "header";
}
