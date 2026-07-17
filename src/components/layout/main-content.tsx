"use client";

import { useDevice } from "@/contexts/DeviceContext";
import { useNavigation } from "@/contexts/NavigationContext";
import { useSystemContext } from "@/contexts/SystemContext";
import { BreadCrumb } from "@/components/bread-crumb";
import { RouteLoadingOverlay } from "@/components/route-loading-overlay";
import { cn } from "@/lib/utils";

/**
 * Conteudo principal do layout web: flex column com tres regioes.
 * 1. Topo (fixo): breadcrumb a esquerda + botoes tipados destructive/special a
 *    direita (portalizados pelo Button via chrome do SystemContext).
 * 2. Miolo: UNICO elemento com scroll vertical.
 * 3. Acoes (fixa, condicional): so existe quando ha >= 1 botao `type: action`
 *    montado na pagina.
 */
export function MainContent({
  children,
  className,
  contentClassName,
  mobile = false,
}: {
  children?: React.ReactNode;
  className?: string;
  contentClassName?: string;
  mobile?: boolean;
}) {
  const { view } = useDevice();
  const { placement, isPublicAuthScreen } = useNavigation();
  const { footerHeight, mainContentCardMargin, mainContentMode, chrome } = useSystemContext();
  const { setWebTopRightEl, setWebActionsEl, actionButtonCount } = chrome;
  const isCardMode = mainContentMode === "card";
  const containerPadding = isCardMode ? mainContentCardMargin : 0;
  const mobileFooterOffset = view === "mobile" && placement === "footer" ? Math.max(footerHeight, 70) : 0;
  // Telas publicas de auth nao mostram o chrome do app (fonte unica em Navigation).
  const showTopBar = !mobile && !isPublicAuthScreen;
  const showActionsBar = !mobile && actionButtonCount > 0;
  const innerContentClassName = cn(
    "flex min-h-0 flex-1 flex-col overflow-y-auto overflow-x-hidden",
    mobile
      ? "w-full px-4 py-4"
      : cn("w-full px-6 py-6", isCardMode ? "mx-auto max-w-6xl" : "max-w-none"),
    contentClassName,
  );

  return (
    <main
      data-layout-region="main-content"
      data-mode={mainContentMode}
      className={cn("relative flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden", className)}
    >
      <div
        className="flex min-h-0 flex-1 flex-col overflow-hidden"
        style={{ padding: containerPadding }}
      >
        <div
          className={cn(
            "flex min-h-0 flex-1 flex-col overflow-hidden bg-surface",
            isCardMode && "rounded-[var(--radius-2xl)] border border-border shadow-[var(--shadow-soft)]",
          )}
        >
          {showTopBar ? (
            <div
              data-layout-region="content-top"
              className="flex shrink-0 items-center justify-between gap-3 border-b border-border bg-surface px-6 py-3"
            >
              <BreadCrumb mode="full" className="min-w-0" />
              <div ref={setWebTopRightEl} className="flex items-center gap-2" />
            </div>
          ) : null}

          <div
            data-layout-scroll="content"
            className={innerContentClassName}
            style={{ paddingBottom: mobileFooterOffset || undefined }}
          >
            {children}
          </div>

          {showActionsBar ? (
            <div
              data-layout-region="content-actions"
              ref={setWebActionsEl}
              className="flex shrink-0 items-center justify-center gap-3 border-t border-border bg-surface px-4 py-3 [&>button]:h-auto [&>button]:min-w-36 [&>button]:px-8 [&>button]:py-3 [&>button]:text-sm"
            />
          ) : null}
        </div>
      </div>
      <RouteLoadingOverlay />
    </main>
  );
}
