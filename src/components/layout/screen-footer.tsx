"use client";

import { useEffect, type ReactNode } from "react";
import { createPortal } from "react-dom";

import { useSystemContext } from "@/contexts/SystemContext";

/**
 * Centro do rodapé do MainContent (slot `main.footer`, só web), entre a saída
 * (`Button type="back"`, à esquerda) e as ações (`type="action"`, à direita).
 * Para informação/controle da tela que não é ação — ex.: total de registros e
 * paginação de uma tabela, sempre à vista em vez de no fim da rolagem. No mobile
 * não renderiza (a tela resolve o seu rodapé).
 */
export function ScreenFooter({ children }: { children: ReactNode }) {
  const { isMobile, chrome } = useSystemContext();
  const { webFooterEl, registerFooterContent } = chrome;

  useEffect(() => {
    if (isMobile) return;
    return registerFooterContent();
  }, [isMobile, registerFooterContent]);

  return !isMobile && webFooterEl ? createPortal(children, webFooterEl) : null;
}
