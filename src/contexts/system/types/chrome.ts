// "Chrome" da tela: SLOTS NOMEADOS (§7.2) que uma página preenche para injetar
// conteúdo nas regiões, no lugar do breadcrumb/navegação padrão. Cada região
// monta o elemento-alvo (`ref={set...El}`); páginas/ScreenLayout portalizam para
// ele; os botões tipados (`Button type=...`) registram presença, para as regiões
// condicionais só existirem quando há o que exibir.
//
// Mapa dos slots (nome §7.2 → alvo):
//   header.start → headerLeftEl   (título/voltar da tela — mobile, via ScreenLayout)
//   header.end   → headerRightEl  (botões tipados "top" — mobile)
//   main.start   → webTopRightEl  (botões tipados "top" — web, topo do MainContent)
//   main.back    → webBackEl      (botão tipado "back" — web, esquerda do rodapé)
//   main.footer  → webFooterEl    (centro do rodapé — web, ex.: total e
//                  paginação da tabela; via ScreenFooter)
//   main.end     → webActionsEl   (botões tipados "action" — web, direita do rodapé)
//   footer.end   → mobileActionsEl(botões tipados "action" — mobile, no Footer)
//   footer.back  → mobileBackEl   (botão tipado "back" — mobile, célula da navbar)
//
// Faz parte de "layout e afins" — por isso vive dentro do SystemContext.
export type TypedButtonRegion = "top" | "actions" | "back";

export type ScreenChrome = {
  /** Slot `header.start` (mobile): alvo do título/voltar da tela (ScreenLayout). */
  headerLeftEl: HTMLElement | null;
  /** Slot `header.end` (mobile): alvo dos botões tipados "top". */
  headerRightEl: HTMLElement | null;
  setHeaderLeftEl: (el: HTMLElement | null) => void;
  setHeaderRightEl: (el: HTMLElement | null) => void;
  /** `true` quando uma tela injetou título no `header.start` (troca o breadcrumb). */
  headerActive: boolean;
  setHeaderActive: (active: boolean) => void;
  /** Slot `main.start` (web): lado direito do topo do MainContent. */
  webTopRightEl: HTMLElement | null;
  setWebTopRightEl: (el: HTMLElement | null) => void;
  /** Slot `main.end` (web): ações da tela, à direita do rodapé do MainContent. */
  webActionsEl: HTMLElement | null;
  setWebActionsEl: (el: HTMLElement | null) => void;
  /** Slot `main.back` (web): saída da tela, à esquerda do rodapé do MainContent. */
  webBackEl: HTMLElement | null;
  setWebBackEl: (el: HTMLElement | null) => void;
  /** Slot `main.footer` (web): centro do rodapé do MainContent. */
  webFooterEl: HTMLElement | null;
  setWebFooterEl: (el: HTMLElement | null) => void;
  /** Conteúdos montados no `main.footer` (o rodapé existe com botões OU com eles). */
  footerContentCount: number;
  /** Registra presença de conteúdo no `main.footer`; retorna o unregister. */
  registerFooterContent: () => () => void;
  /** Slot `footer.end` (mobile): barra de ações dentro do Footer. */
  mobileActionsEl: HTMLElement | null;
  setMobileActionsEl: (el: HTMLElement | null) => void;
  /**
   * Slot `footer.back` (mobile com navegação): célula da navbar que recebe o
   * botão de SAÍDA da tela (voltar/fechar — `Button type="back"`). Saída é
   * navegação, não ação: fica a um toque, fora da segunda barra.
   */
  mobileBackEl: HTMLElement | null;
  setMobileBackEl: (el: HTMLElement | null) => void;
  /** Botoes montados com type destructive/special (regiao de topo). */
  topButtonCount: number;
  /** Botoes montados com type action (regiao de acoes). */
  actionButtonCount: number;
  /** Botoes montados com type back (saída da tela). */
  backButtonCount: number;
  /** Registra presenca de um botao tipado; retorna o unregister. */
  registerTypedButton: (region: TypedButtonRegion) => () => void;
  /**
   * Mobile com navegação: as ações da tela ficam numa SEGUNDA BARRA, aberta pelo
   * botão "Ações" no centro da navbar (Home · Ações · Menu). Dois toques de
   * propósito: evita toque acidental e não mistura navegação com ação.
   */
  mobileActionsOpen: boolean;
  setMobileActionsOpen: (open: boolean | ((atual: boolean) => boolean)) => void;
};
