"use client";

import {
    Children,
    isValidElement,
    type CSSProperties,
    type ReactElement,
    type ReactNode,
    useMemo,
} from "react";

import {
    type SidebarDisplayMode,
    type SidebarLayoutMode,
    type SidebarSide,
    type SpecialPanelId,
    type SpecialPanelState,
    useSystemContext,
} from "@/contexts/SystemContext";

import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LucideX } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { Marker } from "@/components/marker";
import { SidebarItem, type SidebarItemProps } from "@/components/sidebar-item";

type SidebarProps = {
    children?: ReactNode;
    className?: string;
    displayMode: SidebarDisplayMode;
    layoutMode: SidebarLayoutMode;
    margin: number;
    /** Mantem o espaco (vazio) reservado no layout quando `visible` for false. */
    reserveSpace?: boolean;
    side: SidebarSide;
    visible: boolean;
    width: number;
};

type SidebarPanelFrameProps = {
    children?: ReactNode;
    className?: string;
    contentClassName?: string;
    displayMode?: SidebarDisplayMode;
    headerExtra?: ReactNode;
    headerCollapsed?: ReactNode;
    id: SpecialPanelId;
    onClose?: () => void;
    side?: SidebarSide;
    title: string;
};

function resolveShellClass(side: SidebarSide, layoutMode: SidebarLayoutMode) {
    if (layoutMode === "overlay") {
        return side === "left"
            ? "absolute inset-y-0 left-0 z-30"
            : "absolute inset-y-0 right-0 z-30";
    }

    return "relative min-h-0 shrink-0";
}

function resolvePanelFrameClass(displayMode: SidebarDisplayMode, side: SidebarSide) {
    if (displayMode === "full") {
        return "h-full w-full !rounded-none";
    }

    if (displayMode === "card-full") {
        return cn(
            "h-full w-full",
            side === "left"
                ? "!rounded-l-none !rounded-r-[var(--radius-2xl)]"
                : "!rounded-l-[var(--radius-2xl)] !rounded-r-none"
        );
    }

    return "h-full w-full";
}

function resolvePadding(
    side: SidebarSide,
    displayMode: SidebarDisplayMode,
    margin: number
) {
    if (["full", "card-full"].includes(displayMode)) {
        return {
            paddingTop: 0,
            paddingRight: 0,
            paddingBottom: 0,
            paddingLeft: 0,
        };
    }

    return {
        paddingBottom: margin,
        paddingLeft: side === "left" ? 0 : margin,
        paddingRight: side === "right" ? 0 : margin,
        paddingTop: margin,
    };
}

export function Sidebar({
                            children,
                            className,
                            displayMode,
                            layoutMode,
                            margin,
                            reserveSpace = false,
                            side,
                            visible,
                            width,
                        }: SidebarProps) {
    const {
        openPanel,
        closePanel,
        menuPanel,
        // @dev-only:start
        developerPanel,
        systemPanel,
        // @dev-only:end
    } = useSystemContext();
    const panels: Record<SpecialPanelId, SpecialPanelState> = {
        menu: menuPanel,
        // @dev-only:start
        developer: developerPanel,
        system: systemPanel,
        // @dev-only:end
    };
    const getPanel = (id: SpecialPanelId) => panels[id];

    const items = useMemo(() => {
        return Children.toArray(children)
            .filter(isValidElement)
            .filter(
                (child): child is ReactElement<SidebarItemProps> =>
                    child.type === SidebarItem
            )
            .map((child) => ({
                id: child.props.id as SpecialPanelId,
                title: child.props.title,
                markerTitle: child.props.markerTitle,
                icon: child.props.icon,
                content: child.props.children,
                headerExtra: child.props.headerExtra,
                headerCollapsed: child.props.headerCollapsed,
            }));
    }, [children]);

    const activeItem = items.find((item) => getPanel(item.id).isOpen);
    const activePanel = activeItem ? getPanel(activeItem.id) : null;
    // O painel "menu" (navegacao) vira um rail: colapsado (so icones) por
    // padrao, expandindo para a largura configurada ao passar o mouse/focar.
    // Outros paineis mantem a largura fixa de sempre.
    const isNavRail = activeItem?.id === "menu";

    if (!visible) {
        // Oculto: mantem o espaco reservado (vazio) se configurado, senao remove
        // a regiao por completo do layout.
        return reserveSpace ? (
            <aside
                data-layout-region={side === "left" ? "left-sidebar" : "right-sidebar"}
                className={cn(resolveShellClass(side, layoutMode), className)}
                style={{ width }}
            />
        ) : null;
    }

    // Visivel mas sem "Reservar espaco" e sem painel aberto: o rail vira
    // overlay (nao ocupa largura no flex) — mainContent fica com a tela
    // toda e o marcador so flutua por cima. Ao abrir um painel, volta a
    // reservar espaco de verdade (estrutural), encolhendo o mainContent.
    const overlayWhileClosed = !reserveSpace && !activeItem;
    const effectiveLayoutMode = overlayWhileClosed ? "overlay" : layoutMode;

    return (
        <aside
            data-layout-region={side === "left" ? "left-sidebar" : "right-sidebar"}
            data-layout-mode={effectiveLayoutMode}
            data-display-mode={displayMode}
            data-panel-state={activeItem ? "open" : "closed"}
            data-nav-rail={isNavRail || undefined}
            className={cn(
                resolveShellClass(side, effectiveLayoutMode),
                isNavRail && "group/nav-rail",
                // Fechada (so markers): o aside vira uma faixa invisivel por cima
                // do conteudo — deixa os cliques atravessarem; os Markers sao
                // fixed e reativam os proprios pointer-events.
                !activeItem && "pointer-events-none",
                className,
            )}
            style={
                isNavRail
                    ? ({ "--rail-collapsed-width": "80px", "--rail-expanded-width": `${width}px` } as CSSProperties)
                    : { width }
            }
        >
            <div
                className="h-full w-full min-w-0"
                style={resolvePadding(side, displayMode, margin)}
            >

                {activeItem && activePanel?.isOpen ? (
                    <SidebarPanelFrame
                        displayMode={displayMode}
                        headerExtra={activeItem.headerExtra}
                        headerCollapsed={activeItem.headerCollapsed}
                        id={activeItem.id}
                        side={side}
                        title={activeItem.title}
                        onClose={() => closePanel(activeItem.id)}
                    >
                        {activeItem.content}
                    </SidebarPanelFrame>
                ) : (
                    <div className="flex flex-col gap-2">
                        {items.map((item, index) => (
                            <Marker
                                key={item.id}
                                icon={item.icon}
                                itemId={item.id}
                                label={item.title}
                                position={side}
                                positionOffset={(index - (items.length - 1) / 2) * 112}
                                view={getPanel(item.id).view}
                                title={item.markerTitle}
                                onClick={() => openPanel(item.id)}
                                mode="custom"
                            />
                        ))}
                    </div>
                )}

            </div>
        </aside>
    );
}

export function SidebarPanelFrame({
                                      children,
                                      className,
                                      contentClassName,
                                      displayMode,
                                      headerExtra,
                                      headerCollapsed,
                                      id,
                                      onClose,
                                      side,
                                      title,
                                  }: SidebarPanelFrameProps) {
    const { dictionary } = useLanguage();
    const { closePanel } = useSystemContext();

    // Escopa as vars genericas de sidebar para as cores do lado (left/right) e
    // aplica via inline style: `cn()` aqui e so um join de strings (sem merge de
    // Tailwind), entao classes bg-*/border-* conflitantes com as do Card base
    // ficam em ordem indefinida no CSS gerado. Inline style sempre vence.
    const sideStyle = side
        ? ({
              "--color-sidebar-background": `var(--color-${side}-sidebar-background)`,
              "--color-sidebar-foreground": `var(--color-${side}-sidebar-foreground)`,
              "--color-sidebar-border": `var(--color-${side}-sidebar-border)`,
              backgroundColor: `var(--color-${side}-sidebar-background)`,
              color: `var(--color-${side}-sidebar-foreground)`,
              borderColor: `var(--color-${side}-sidebar-border)`,
          } as CSSProperties)
        : undefined;

    return (
        <Card
            style={sideStyle}
            // Região de painel: os tokens da PÁGINA (superfície, texto, borda) são
            // remapeados para as cores da sidebar (globals.css) — o conteúdo do
            // painel segue o esquema de cores da área, não o tema da página.
            data-region={side ? "sidebar-panel" : undefined}
            className={cn(
                "group flex flex-col overflow-hidden",
                displayMode && side
                    ? resolvePanelFrameClass(displayMode, side)
                    : "sticky top-24 max-h-[calc(100dvh-10rem)]",
                className
            )}
        >
            {/* min-h desconta 1px da borda superior do Card para a borda inferior
                alinhar com a do topo do MainContent. */}
            <CardHeader className="sidebar-rail-header mb-2 min-h-[calc(var(--layout-content-top-height)-1px)] content-center border-b border-border/60">
                <div className="flex items-start justify-between gap-4">
                    <div className="sidebar-rail-title grid gap-3">
                        <CardTitle>{title}</CardTitle>
                        {headerExtra}
                    </div>

                    {headerCollapsed ? (
                        <div className="sidebar-rail-collapsed-avatar">{headerCollapsed}</div>
                    ) : null}

                    <button
                        type="button"
                        onClick={onClose ?? (() => closePanel(id))}
                        className={cn(
                            "inline-flex size-10 items-center justify-center rounded-full border border-border text-text-muted transition hover:bg-[color:var(--color-surface-strong)]",
                            headerCollapsed ? "sidebar-rail-close-toggle" : undefined,
                        )}
                        aria-label={dictionary.common.close}
                    >
                        <LucideX className="h-4 w-4" />
                    </button>
                </div>
            </CardHeader>

            <CardContent
                className={cn(
                    "sidebar-rail-content grid min-h-0 flex-1 gap-4 p-4",
                    // Rail do desktop (recebe displayMode+side): rola só ao expandir
                    // no hover. Painel avulso (dev/system, ex.: overlay mobile sem
                    // hover): rola sempre, senão o conteúdo alto fica cortado.
                    displayMode && side ? "overflow-y-hidden group-hover:overflow-y-auto" : "overflow-y-auto",
                    contentClassName
                )}
            >
                {children}
            </CardContent>
        </Card>
    );
}
