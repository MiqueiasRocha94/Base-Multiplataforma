"use client";

import { useNavigation } from "@/contexts/NavigationContext";
import { useSystemContext } from "@/contexts/SystemContext";
import { resolveAccountPlacement } from "@/lib/system/account-placement";

/**
 * Onde o perfil renderiza agora (`header` | `menu` | `null` no mobile) e se há
 * menu na sidebar — a mesma resposta para o Header, a sidebar esquerda e o
 * painel estrutural (que só oferece a escolha quando há menu).
 */
export function useAccountPlacement() {
  const { accountPlacement, layout, isMobile } = useSystemContext();
  const { desktopMode } = useNavigation();
  const menuAvailable = layout.leftSidebar && desktopMode === "sidebar";

  return {
    menuAvailable,
    placement: resolveAccountPlacement({
      placement: accountPlacement,
      isMobile,
      headerVisible: layout.header,
      menuAvailable,
    }),
  };
}
