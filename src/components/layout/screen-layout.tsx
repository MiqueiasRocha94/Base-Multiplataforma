"use client";

import { useEffect, type ReactNode } from "react";
import { createPortal } from "react-dom";

import { useSystemContext } from "@/contexts/SystemContext";

/**
 * Layout de tela: injeta `header` (titulo/voltar) no header do app mobile via
 * slot do shell. No web o `header` e ignorado — o topo fixo do MainContent ja
 * exibe o breadcrumb da rota. Botoes de acao NAO passam por aqui: a pagina
 * declara `<Button type="destructive|special|action">` e a captura e feita
 * centralmente (chrome do SystemContext + portais nas regioes fixas).
 */
export function ScreenLayout({
  header,
  children,
}: {
  header?: ReactNode;
  children: ReactNode;
}) {
  const { headerLeftEl, setHeaderActive } = useSystemContext().chrome;

  useEffect(() => {
    setHeaderActive(true);
    return () => setHeaderActive(false);
  }, [setHeaderActive]);

  return (
    <>
      {headerLeftEl && header ? createPortal(header, headerLeftEl) : null}
      {children}
    </>
  );
}
