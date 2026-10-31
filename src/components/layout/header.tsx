"use client";

import { AccountMenu } from "@/components/account-menu";
import { LocaleSwitcher } from "@/components/locale-switcher";
import { ThemeToggleButton } from "@/components/theme-toggle-button";
import { useSystemContext } from "@/contexts/SystemContext";
import { cn } from "@/lib/utils";
import {BreadCrumb} from "@/components/bread-crumb";
import {Logo} from "@/components/logo";
import {NotificationButton} from "@/components/notification-button";
import {Navigation} from "@/components/navigation";
import { useNavigation } from "@/contexts/NavigationContext";
import { useAccountPlacement } from "@/hooks/use-account-placement";

export function Header({ className }: { className?: string }) {
    const { layout, headerHeight, headerReserveSpace, zIndexHeader, isMobile, isAuthenticated, chrome } = useSystemContext();
    const { setHeaderLeftEl, setHeaderRightEl, headerActive, topButtonCount } = chrome;
    const { desktopMode } = useNavigation();
    const accountPlacement = useAccountPlacement().placement;
    // Sem destinos suficientes (ex.: só Home pública), a navegação some do header.
    const showHeaderNav = !isMobile && desktopMode !== "hidden";
    // Slot header.end ativo quando a página montou botões tipados "top".
    const topActive = topButtonCount > 0;

    if (!layout.header) {
        // Oculto: mantem o espaco reservado (vazio) se configurado, senao remove
        // a regiao por completo do layout.
        return headerReserveSpace ? (
            <header data-layout-region="header" className={cn("shrink-0", className)} style={{ height: headerHeight, zIndex: zIndexHeader }} />
        ) : null;
    }

    const leftWidth = "400px";
    const centerWidth = "1fr";
    // Notificações + conta: cresce com o conteúdo, a partir de 250px.
    const rightWidth = "minmax(250px, auto)";

    // Mobile: slot header.start (título/voltar da tela via ScreenLayout) com
    // fallback para o breadcrumb quando nenhuma tela injeta título.
    const leftContent = isMobile ? (
        <>
            <div ref={setHeaderLeftEl} className={cn("min-w-0 flex-1", !headerActive && "hidden")} />
            {!headerActive ? <BreadCrumb mode="lite" /> : null}
        </>
    ) : (
        <Logo />
    );
    // Mobile: slot header.end (botões tipados "top": special/destructive) com
    // fallback para o NotificationButton (botão definitivo) quando a página não
    // montou nenhum especial — o especial da página tem prioridade e ocupa a vaga.
    const rightContent = isMobile ? (
        <>
            <div ref={setHeaderRightEl} className={cn("flex items-center justify-end gap-2", !topActive && "hidden")} />
            {!topActive && isAuthenticated ? <NotificationButton tone="header" /> : null}
        </>
    ) : (
        <>
            {!isAuthenticated ? (
                <>
                    <div className="px-2">
                        <ThemeToggleButton />
                    </div>
                    <div className="px-2">
                        <LocaleSwitcher />
                    </div>
                </>
            ) : null}
            {/* Notificações ficam no header, junto do perfil (padrão de UX). O topo
                do MainContent é do breadcrumb e das ações da tela. */}
            {isAuthenticated ? (
                <div className="px-2">
                    <NotificationButton tone="header" />
                </div>
            ) : null}
            {/* Perfil no header, salvo quando o painel estrutural o pôs no menu. */}
            {accountPlacement !== "menu" ? <AccountMenu /> : null}
        </>
    );

    // Público no mobile fica sem header, EXCETO quando a tela injeta um
    // título/voltar via ScreenLayout (headerActive) — ex.: termo de
    // privacidade no preset `mobile`.
    const showBar = !(!isAuthenticated && isMobile && !headerActive);

    return (
      <header
          data-layout-region="header"
          className={cn("shrink-0", className)}
          // A barra estende o fundo sob a barra de status do SO (área segura do topo).
          style={{ height: showBar ? `calc(${headerHeight}px + var(--app-safe-top))` : headerHeight, zIndex: zIndexHeader }}
      >
          {!showBar ? null:
          // Região `header`: no mobile, os tokens da página apontam para as
          // cores do header (globals.css) — conteúdo injetado pelas telas
          // (título, botões "top") segue o esquema de cores sem estilo próprio.
          <div data-region="header" className="sticky top-0 z-10 h-full border-b border-[color:var(--color-header-border)] bg-[color:var(--color-header-background)] pt-[var(--app-safe-top)] text-[color:var(--color-header-foreground)]">
              <div className="mx-auto h-full w-full px-4 sm:px-6 lg:px-18">
                  <div
                      className="grid h-full items-center gap-2"
                      style={{
                          // Mobile: colunas fluidas (título trunca à esquerda, ações à
                          // direita) — nunca as fixas de 250px, que estouram a tela.
                          gridTemplateColumns: isMobile
                              ? "minmax(0, 1fr) auto auto"
                              : `${leftWidth} ${centerWidth} ${rightWidth}`,
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
