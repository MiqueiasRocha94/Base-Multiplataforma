"use client";

import { useEffect, type ReactNode } from "react";
import { createPortal } from "react-dom";

import { ScreenTitle } from "@/components/layout/screen-title";
import { ScreenZones } from "@/components/layout/screen-zones";
import { useSystemContext } from "@/contexts/SystemContext";

/**
 * Layout de tela: injeta o titulo/voltar no header do app mobile via
 * slot do shell. No web o `header` e ignorado — o topo fixo do MainContent ja
 * exibe o breadcrumb da rota. Botoes de acao NAO passam por aqui: a pagina
 * declara `<Button type="destructive|special|action">` e a captura e feita
 * centralmente (chrome do SystemContext + portais nas regioes fixas).
 *
 * Padrao: `title` (+ `onBack`) → `ScreenTitle`, o mesmo do breadcrumb (seta ←,
 * cor do header). `header` e a saida para uma tela que precise fugir do padrao.
 * `top`/`reach` ligam as zonas de ergonomia (`ScreenZones`): leitura em cima,
 * alcance do polegar embaixo — sugestao, nao limite (conteudo longo rola).
 */
export function ScreenLayout({
  title,
  onBack,
  backLabel,
  header,
  top,
  reach = false,
  children,
}: {
  title?: string;
  onBack?: () => void;
  backLabel?: string;
  header?: ReactNode;
  /** Zona de LEITURA (difícil alcance). Informar liga as zonas (`ScreenZones`). */
  top?: ReactNode;
  /** Conteúdo na zona de ALCANCE (assenta perto da navegação quando sobra espaço). */
  reach?: boolean;
  children: ReactNode;
}) {
  const { headerLeftEl, setHeaderActive } = useSystemContext().chrome;

  useEffect(() => {
    setHeaderActive(true);
    return () => setHeaderActive(false);
  }, [setHeaderActive]);

  const content = header ?? (title ? <ScreenTitle title={title} onBack={onBack} backLabel={backLabel} /> : null);

  return (
    <>
      {headerLeftEl && content ? createPortal(content, headerLeftEl) : null}
      {top != null || reach ? <ScreenZones top={top}>{children}</ScreenZones> : children}
    </>
  );
}
