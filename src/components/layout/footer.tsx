"use client";

import { useEffect, useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";

import { ApiVersion } from "@/components/api-version";
import { Tooltip } from "@/components/tooltip";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/contexts/LanguageContext";
import { useSystemContext } from "@/contexts/SystemContext";
import { cn } from "@/lib/utils";
import { Navigation } from "@/components/navigation";
import { useNavigation } from "@/contexts/NavigationContext";

export function Footer({
                           className,
                       }: {
    className?: string;
}) {
    const { dictionary } = useLanguage();
    const { layout, footerHeight, footerReserveSpace, zIndexFooter, chrome, isMobile, isAuthenticated } =
        useSystemContext();

    const { placement } = useNavigation();

    const {
        mobileActionsEl,
        setMobileActionsEl,
        actionButtonCount,
        backButtonCount,
        mobileActionsOpen,
        setMobileActionsOpen,
    } = chrome;

    const hasFooter = placement === "footer";
    // Com navbar, a saída (type="back") vira célula da navbar — a barra de ações
    // só conta operações. Sem navbar, a saída também mora na barra de ações.
    const actionsActive = hasFooter ? actionButtonCount > 0 : actionButtonCount + backButtonCount > 0;

    // Segunda barra de ações: fecha ao trocar de rota (no SystemContext), ao tocar
    // numa ação (os botões chegam por portal: escuta no DOM) e no Esc.
    useEffect(() => {
        if (!mobileActionsEl || !mobileActionsOpen) {
            return;
        }
        const onClick = (event: MouseEvent) => {
            if ((event.target as HTMLElement | null)?.closest("button")) {
                setMobileActionsOpen(false);
            }
        };
        const onKey = (event: KeyboardEvent) => {
            if (event.key === "Escape") {
                setMobileActionsOpen(false);
            }
        };
        mobileActionsEl.addEventListener("click", onClick);
        window.addEventListener("keydown", onKey);
        return () => {
            mobileActionsEl.removeEventListener("click", onClick);
            window.removeEventListener("keydown", onKey);
        };
    }, [mobileActionsEl, mobileActionsOpen, setMobileActionsOpen]);

    const canCollapse = !isMobile && isAuthenticated;

    const [isCollapsed, setIsCollapsed] = useState(canCollapse);
    const [prevCanCollapse, setPrevCanCollapse] = useState(canCollapse);

    if (prevCanCollapse !== canCollapse) {
        setPrevCanCollapse(canCollapse);
        setIsCollapsed(canCollapse);
    }

    /**
     * Renderiza uma região vazia quando o footer está oculto,
     * preservando opcionalmente o espaço reservado pelo layout.
     */
    function renderHiddenFooter() {
        if (!footerReserveSpace) {
            return null;
        }

        return (
            <footer
                data-layout-region="footer"
                className={cn("shrink-0", className)}
                style={{
                    height: footerHeight,
                    zIndex: zIndexFooter,
                }}
            />
        );
    }

    /**
     * Renderiza o footer tradicional para desktop e tablet.
     */
    function renderDesktopFooter() {
        return (
            <footer
                data-layout-region="footer"
                className={cn("shrink-0", className)}
                style={{
                    height: isCollapsed ? footerHeight : "auto",
                    zIndex: zIndexFooter,
                }}
            >
                <div
                    id="footer"
                    className={cn(
                        "relative border-t border-[color:var(--color-footer-border)]",
                        "bg-[color:var(--color-footer-background)]",
                        canCollapse && isCollapsed && "overflow-hidden",
                    )}
                >
                    <div
                        className={cn(
                            "mx-auto max-w-6xl px-6 text-sm text-[color:var(--color-footer-foreground)]",
                            !isCollapsed && "pt-4",
                        )}
                    >
                        {!isCollapsed ? (
                            <div className="mb-2 flex items-center justify-between gap-3">
                                <span><ApiVersion /></span>
                                <span>{dictionary.tagline}</span>
                            </div>
                        ) : null}

                        {/* Linha principal com a altura do footer recolhido (descontada a
                            borda superior): o texto fica centralizado na vertical em vez de
                            ser cortado. Grid de 3 colunas centraliza a versao. */}
                        <div
                            className="grid grid-cols-[1fr_auto_1fr] items-center gap-3"
                            style={{ height: footerHeight - 1 }}
                        >
                            <span>{"2015 @Copyright"}</span>
                            <span className="text-center"><ApiVersion prefix="versão: " /></span>

                            {canCollapse ? (
                                <Tooltip className="justify-self-end" content={isCollapsed ? "Expandir" : "Recolher"}>
                                    <Button
                                        aria-label={isCollapsed ? "Expandir" : "Recolher"}
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => setIsCollapsed((current) => !current)}
                                    >
                                        {isCollapsed ? (
                                            <ChevronUp className="h-4 w-4" />
                                        ) : (
                                            <ChevronDown className="h-4 w-4" />
                                        )}
                                    </Button>
                                </Tooltip>
                            ) : (
                                <span className="text-right">{dictionary.tagline}</span>
                            )}
                        </div>
                    </div>
                </div>
            </footer>
        );
    }

    /**
     * Renderiza o footer estrutural do mobile.
     *
     * Com navegação, a navbar NUNCA sai (o usuário não fica preso): se a tela tem
     * ações, a navbar vira `Home · Ações · Menu` e as ações moram numa SEGUNDA
     * BARRA logo acima, aberta pelo botão central (dois toques, sem toque
     * acidental, sem misturar navegação e ação). Sem navegação (página pública),
     * as ações ocupam a barra direto, como antes.
     */
    function renderMobileFooter() {
        // Renderiza quando há navegação (placement footer) OU quando a página
        // montou ações (Button type="action") — ex.: Voltar numa página pública.
        if (!hasFooter && !actionsActive) {
            return null;
        }

        const actionsVisible = hasFooter ? actionsActive && mobileActionsOpen : actionsActive;

        return (
            <footer
                data-layout-region="footer-mobile"
                // No mobile o footer é a navbar principal: mesma identidade da
                // sidebar esquerda (tokens --color-left-sidebar-*), para a faixa
                // de safe-area também acompanhar o fundo escuro da navegação.
                className="shrink-0 bg-[color:var(--color-left-sidebar-background)] pb-[var(--app-safe-bottom)]"
            >
                {/* Slot footer.end: ações tipadas da página (Button type=action).
                    Sempre no DOM (alvo dos portais); visível como segunda barra só
                    quando aberta. Aparência em `[data-region="actions"]`. */}
                <div
                    ref={setMobileActionsEl}
                    id="mobile-actions-bar"
                    role="toolbar"
                    aria-label={dictionary.nav.actions}
                    data-region="actions"
                    data-second-bar={hasFooter ? "true" : undefined}
                    hidden={!actionsVisible}
                />

                {/* Navegação principal — com ações, em modo Home · Ações · Menu. */}
                {hasFooter ? <Navigation /> : null}
            </footer>
        );
    }

    /**
     * Decide qual estrutura deve ser utilizada de acordo com o dispositivo.
     */
    function renderView() {
        if (isMobile) {
            return renderMobileFooter();
        }

        return renderDesktopFooter();
    }

    if (!layout.footer) {
        return renderHiddenFooter();
    }

    return renderView();
}
