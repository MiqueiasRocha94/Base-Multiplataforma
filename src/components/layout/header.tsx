"use client";

import { AccountMenu } from "@/components/account-menu";
import { LocaleSwitcher } from "@/components/locale-switcher";
import { ThemeToggleButton } from "@/components/theme-toggle-button";
import { useAuth } from "@/contexts/AuthContext";
import { useSystemContext } from "@/contexts/SystemContext";
import { cn } from "@/lib/utils";
import {BreadCrumb} from "@/components/bread-crumb";
import {Logo} from "@/components/logo";
import {BrandButton} from "@/components/brand-button";
import {Navigation} from "@/components/navigation";
import { useDevice } from "@/contexts/DeviceContext";
import { useNavigation } from "@/contexts/NavigationContext";
import { usePathname } from 'next/navigation';

export function Header({ className }: { className?: string }) {
    const { session } = useAuth();
    const { headerVisible, headerHeight, headerReserveSpace, zIndexHeader } = useSystemContext();
    const { desktopMode } = useNavigation();
    const pathname = usePathname();
    const { view } = useDevice();
    const isMobile = view === "mobile";
    // Sem destinos suficientes (ex.: só Home pública), a navegação some do header.
    const showHeaderNav = !isMobile && desktopMode !== "hidden";

    if (!headerVisible) {
        // Oculto: mantem o espaco reservado (vazio) se configurado, senao remove
        // a regiao por completo do layout.
        return headerReserveSpace ? (
            <header data-layout-region="header" className={cn("shrink-0", className)} style={{ height: headerHeight, zIndex: zIndexHeader }} />
        ) : null;
    }

    const leftWidth = "250px";
    const centerWidth = "1fr";
    const rightWidth = "250px";
    const loginPage = pathname.includes("login");

    const leftContent = (isMobile ? <BreadCrumb mode="lite" /> : <Logo />);
    const rightContent = (isMobile ? <BrandButton /> :
        (
            <>
                {!session ? (
                    <>
                        <div className="px-2">
                            <ThemeToggleButton />
                        </div>
                        <div className="px-2">
                            <LocaleSwitcher />
                        </div>
                    </>
                ) : null}
                {!loginPage? (<AccountMenu />): null }
            </>
        )
    );

    return (
      <header
          data-layout-region="header"
          className={cn("shrink-0", className)}
          style={{ height: headerHeight, zIndex: zIndexHeader }}
      >
          {!session && isMobile ? null:
          <div className="sticky top-0 z-10 h-full border-b border-[color:var(--color-header-border)] bg-[color:color-mix(in_srgb,var(--color-header-background)_85%,transparent)] text-[color:var(--color-header-foreground)] backdrop-blur">
              <div className="mx-auto h-full w-full px-18">
                  <div
                      className="grid h-full items-center"
                      style={{
                          gridTemplateColumns: `${leftWidth} ${centerWidth} ${rightWidth}`,
                      }}
                  >
                      <div
                          data-layout-region="header-left"
                          className="flex items-center justify-start"
                      >
                          {leftContent}
                      </div>

                      {showHeaderNav ? (
                          <div
                              data-layout-region="header-center"
                              className="flex items-center justify-center"
                          >
                                <Navigation variant="header" />
                          </div>
                      ) : (
                          <div data-layout-region="header-center" />
                      )}

                      <div
                          data-layout-region="header-right"
                          className="flex items-center justify-end"
                      >
                          {rightContent}
                      </div>
                  </div>
              </div>
          </div>
          }
      </header>
  );
}
