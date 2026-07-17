"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";

import { Tooltip } from "@/components/tooltip";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useDevice } from "@/contexts/DeviceContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useSystemContext } from "@/contexts/SystemContext";
import { cn } from "@/lib/utils";

export function Footer({
  className,
}: {
  className?: string;
}) {
  const { session } = useAuth();
  const { footerVisible, footerHeight, footerReserveSpace, zIndexFooter } = useSystemContext();
  const { view } = useDevice();
  const { dictionary } = useLanguage();
  // Este footer so e montado no layout desktop/tablet: no mobile a navegacao
  // fica no MobileAppShell. Recolhivel apenas quando ha sessao.
  const canCollapse = view !== "mobile" && Boolean(session);
  const [isCollapsed, setIsCollapsed] = useState(canCollapse);
  // Ajuste em render (nao em efeito): quando `canCollapse` muda (login/logout,
  // troca de viewport), o footer recolhe/expande por padrao sem cascata de efeito.
  const [prevCanCollapse, setPrevCanCollapse] = useState(canCollapse);
  if (prevCanCollapse !== canCollapse) {
    setPrevCanCollapse(canCollapse);
    setIsCollapsed(canCollapse);
  }

  if (!footerVisible) {
    // Oculto: mantem o espaco reservado (vazio) se configurado, senao remove
    // a regiao por completo do layout. Usa a altura configurada, ja que sem
    // conteudo nao ha como medir a altura "auto".
    return footerReserveSpace ? (
      <footer data-layout-region="footer" className={cn("shrink-0", className)} style={{ height: footerHeight, zIndex: zIndexFooter }} />
    ) : null;
  }

  return (
    <footer
      data-layout-region="footer"
      className={cn("shrink-0", className)}
      style={{ height: isCollapsed ? footerHeight : "auto", zIndex: zIndexFooter }}
    >
      <div id="footer" className={cn("relative border-t border-[color:var(--color-footer-border)] bg-[color:color-mix(in_srgb,var(--color-footer-background)_80%,transparent)]", canCollapse && isCollapsed && "overflow-hidden")}>
        <div className="mx-auto max-w-6xl px-6 py-4 text-sm text-[color:var(--color-footer-foreground)]">
          {!isCollapsed ? (
            <div className="mb-4 flex items-center justify-between gap-3">
              <span>{dictionary.appName}</span>
              <span>{dictionary.tagline}</span>
            </div>
          ) : null}

          <div className="flex items-center justify-between gap-3">
            <span>{dictionary.appName}</span>

            {canCollapse ? (
              <Tooltip content={isCollapsed ? "Expandir" : "Recolher"}>
                <Button
                  aria-label={isCollapsed ? "Expandir" : "Recolher"}
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsCollapsed((current) => !current)}
                >
                  {isCollapsed ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </Button>
              </Tooltip>
            ) : (
              <span>{dictionary.tagline}</span>
            )}
          </div>
        </div>
      </div>
    </footer>
  );
}
