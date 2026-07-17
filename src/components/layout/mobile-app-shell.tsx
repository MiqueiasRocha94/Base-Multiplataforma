"use client";

import { usePathname } from "next/navigation";

import { BreadCrumb } from "@/components/bread-crumb";
import { BrandButton } from "@/components/brand-button";
import { Navigation } from "@/components/navigation";
import { NotificationButton } from "@/components/notification-button";
import { RouteLoadingOverlay } from "@/components/route-loading-overlay";
import { useNavigation } from "@/contexts/NavigationContext";
import { useSystemContext } from "@/contexts/SystemContext";
import { cn } from "@/lib/utils";

export function MobileAppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { placement, isPublicAuthScreen } = useNavigation();
  const { footerHeight, chrome } = useSystemContext();
  const {
    setHeaderLeftEl,
    setHeaderRightEl,
    setFooterEl,
    setMobileActionsEl,
    headerActive,
    footerActive,
    headerActionActive,
    topButtonCount,
    actionButtonCount,
  } = chrome;
  // Botao especial default do header: BM (conta) apenas na home do portal;
  // nas demais telas, o botao de notificacao.
  const defaultHeaderButton = pathname === "/portal/home" ? <BrandButton /> : <NotificationButton />;
  // Slots ativos por flag legada (ScreenLayout) OU por botoes tipados montados.
  const topActive = headerActionActive || topButtonCount > 0;
  const actionsActive = actionButtonCount > 0;
  // A barra de navegação segue apenas a regra de navegação (placement), como no
  // web: quando há destinos suficientes ela aparece mesmo nas telas públicas. O
  // caso trivial (só Home/Login) já é resolvido em `placement === "hidden"`.
  const hasFooter = placement === "footer";
  const bottomOffset = hasFooter ? Math.max(footerHeight, 70) : 0;

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-background">
      {isPublicAuthScreen ? null : (
        <header className="shrink-0 border-b border-[color:var(--color-header-border)] bg-[color:var(--color-header-background)] text-[color:var(--color-header-foreground)] px-3 pt-[max(env(safe-area-inset-top),0px)]">
          <div className="flex min-h-14 items-center justify-between gap-3">
            {/* Slot do titulo da tela (substitui o breadcrumb quando ativo). */}
            <div ref={setHeaderLeftEl} className={cn("min-w-0 flex-1", !headerActive && "hidden")} />
            {!headerActive ? <BreadCrumb mode="lite" /> : null}

            <div className="flex items-center gap-2">
              {/* Botao especial: o da pagina (ex.: excluir) OU o default (BM/notificacao). */}
              <div ref={setHeaderRightEl} className={cn("flex items-center gap-2", !topActive && "hidden")} />
              {!topActive ? defaultHeaderButton : null}
            </div>
          </div>
        </header>
      )}

      <main className="relative min-h-0 flex-1 overflow-hidden">
        <div
          data-layout-scroll="content"
          className="h-full overflow-y-auto overflow-x-hidden"
          style={{ paddingBottom: bottomOffset }}
        >
          {children}
        </div>
        <RouteLoadingOverlay />
      </main>

      {hasFooter ? (
        <footer className="shrink-0 bg-[color:var(--color-footer-background)] pb-[max(env(safe-area-inset-bottom),0px)]">
          {/* Slot legado da barra de acoes da tela (substitui a navegacao quando ativo). */}
          <div ref={setFooterEl} className={cn(!footerActive && "hidden")} />
          {/* Regiao de acoes dos botoes tipados (type="action"): mesma barra da antiga BottomActionBar. */}
          <div
            ref={setMobileActionsEl}
            className={cn(
              "flex gap-3 border-t border-border bg-surface px-4 py-3 [&>button]:h-auto [&>button]:flex-1 [&>button]:py-3 [&>button]:text-sm",
              !actionsActive && "hidden",
            )}
          />
          {!footerActive && !actionsActive ? <Navigation /> : null}
        </footer>
      ) : null}
    </div>
  );
}
