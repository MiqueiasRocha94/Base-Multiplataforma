// "Chrome" da tela: slots que uma pagina preenche para injetar conteudo no header
// (titulo + acoes) e no footer (barra de acoes), no lugar do breadcrumb/navegacao
// padrao. Tambem centraliza a captura dos botoes tipados (`Button type=...`): os
// shells registram os elementos-alvo das regioes e os botoes registram presenca,
// permitindo que as regioes condicionais so existam quando ha botoes para exibir.
//
// Faz parte de "layout e afins" — por isso vive dentro do SystemContext.
export type TypedButtonRegion = "top" | "actions";

export type ScreenChrome = {
  headerLeftEl: HTMLElement | null;
  headerRightEl: HTMLElement | null;
  footerEl: HTMLElement | null;
  setHeaderLeftEl: (el: HTMLElement | null) => void;
  setHeaderRightEl: (el: HTMLElement | null) => void;
  setFooterEl: (el: HTMLElement | null) => void;
  headerActive: boolean;
  footerActive: boolean;
  /** A pagina forneceu um botao especial para o header (substitui o default). */
  headerActionActive: boolean;
  setHeaderActive: (active: boolean) => void;
  setFooterActive: (active: boolean) => void;
  setHeaderActionActive: (active: boolean) => void;
  /** Alvo web (MainContent): lado direito da regiao de topo. */
  webTopRightEl: HTMLElement | null;
  setWebTopRightEl: (el: HTMLElement | null) => void;
  /** Alvo web (MainContent): barra fixa de acoes no rodape. */
  webActionsEl: HTMLElement | null;
  setWebActionsEl: (el: HTMLElement | null) => void;
  /** Alvo mobile (MobileAppShell): barra de acoes dentro do footer. */
  mobileActionsEl: HTMLElement | null;
  setMobileActionsEl: (el: HTMLElement | null) => void;
  /** Botoes montados com type destructive/special (regiao de topo). */
  topButtonCount: number;
  /** Botoes montados com type action (regiao de acoes). */
  actionButtonCount: number;
  /** Registra presenca de um botao tipado; retorna o unregister. */
  registerTypedButton: (region: TypedButtonRegion) => () => void;
};
