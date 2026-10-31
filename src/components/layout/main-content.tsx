"use client";

import { useSystemContext } from "@/contexts/SystemContext";
import { BreadCrumb } from "@/components/bread-crumb";
import { RouteLoadingOverlay } from "@/components/route-loading-overlay";
import { cn } from "@/lib/utils";

/**
 * Conteudo principal do layout web: flex column com tres regioes.
 * 1. Topo (fixo): breadcrumb a esquerda + botoes tipados destructive/special
 *    (acoes especificas da tela) no centro/direita, portalizados pelo Button via
 *    chrome do SystemContext. Notificacoes ficam no Header, junto do perfil.
 * 2. Miolo: UNICO elemento com scroll vertical.
 * 3. Rodape (fixo, condicional): Voltar · centro (`ScreenFooter`) · acoes; so
 *    existe quando a pagina montou algum deles.
 */
export function MainContent({
  children,
  className,
  contentClassName,
}: {
  children?: React.ReactNode;
  className?: string;
  contentClassName?: string;
  mobile?: boolean;
}) {
  const { mainContentCardMargin, mainContentMode, mainContentBare, chrome, isMobile } = useSystemContext();
  const {
    setWebTopRightEl,
    setWebActionsEl,
    setWebBackEl,
    setWebFooterEl,
    actionButtonCount,
    backButtonCount,
    footerContentCount,
  } = chrome;
  // Telas publicas de auth (login/start): o MainContent e a UNICA regiao visivel
  // e o conteudo ocupa toda a area, sem padding, card ou top bar (full-bleed).
  const publicFull = mainContentBare;
  const isCardMode = mainContentMode === "card" && !publicFull;
  const containerPadding = isCardMode ? mainContentCardMargin : 0;
  const showTopBar = !isMobile && !mainContentBare;
  const showActionsBar = !isMobile && actionButtonCount + backButtonCount + footerContentCount > 0;
  const innerContentClassName = cn(
    "flex min-h-0 flex-1 flex-col overflow-y-auto overflow-x-hidden",
    // Respiro de 2px entre a área rolável e o rodapé (barra de ações no web,
    // navbar no mobile): o conteúdo rolando não encosta na borda da barra.
    !publicFull && "mb-2",
    publicFull
      ? "w-full"
      : isMobile
        ? "w-full px-2 py-3 wide:px-4 wide:py-4"
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
              className="flex min-h-[var(--layout-content-top-height)] shrink-0 items-center justify-between gap-3 border-b border-border bg-surface px-6 py-3"
            >
              <BreadCrumb mode="full" className="min-w-0" />
              {/* Centro/direita: ações específicas da tela (`type="special"`/
                  `"destructive"`) e, futuramente, ações em lote. Notificações
                  ficam no header, junto do perfil. */}
              <div ref={setWebTopRightEl} className="flex min-w-0 flex-1 items-center justify-end gap-2" />
            </div>
          ) : null}

          <div data-layout-scroll="content" className={innerContentClassName}>
            {children}
          </div>

          {showActionsBar ? (
            // Rodapé em três: saída (`back`) à esquerda · `main.footer` (ex.:
            // total e paginação) ao centro · ações à direita. Aparência dos
            // botões: `[data-region="actions"]` em globals.css.
            <div
              data-layout-region="content-actions"
              className="grid shrink-0 grid-cols-[1fr_auto_1fr] items-center gap-3 border-t border-border bg-surface px-4"
            >
              <div ref={setWebBackEl} data-region="actions" data-footer-slot="start" />
              <div ref={setWebFooterEl} className="flex min-w-0 items-center justify-center gap-2 text-sm text-text-muted" />
              <div ref={setWebActionsEl} data-region="actions" data-footer-slot="end" />
            </div>
          ) : null}
        </div>
      </div>
      <RouteLoadingOverlay />
    </main>
  );
}
