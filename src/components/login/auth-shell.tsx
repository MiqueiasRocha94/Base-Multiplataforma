"use client";

import { useLayoutEffect, useRef, type ReactNode } from "react";

import { useBrand } from "@/contexts/BrandContext";
import { useDevice } from "@/contexts/DeviceContext";

import { LOGO_MOVE, START_LOGO_HEIGHT_PX, finishLoginIntro, loginIntroPending } from "./login-intro";

const CONTENT_FADE_MS = 400;

/**
 * Fim da transição de abertura do APK (StartTransition): o logo parte do centro
 * da tela, no tamanho da /start, e desliza até a posição dele; depois o resto da
 * moldura aparece. Roda antes da pintura, então o login nunca pisca no estado
 * final. Sem o logo visível (view desktop), só o fade.
 */
function useLoginIntro() {
  const logoRef = useRef<HTMLImageElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const footerRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (!loginIntroPending()) return;
    const faded = [contentRef.current, footerRef.current].filter((element): element is HTMLDivElement => element !== null);
    const fadeIn = () =>
      faded.map((element) =>
        element.animate([{ opacity: 0 }, { opacity: 1 }], { duration: CONTENT_FADE_MS, easing: "ease-out", fill: "backwards" }),
      );

    const logo = logoRef.current;
    if (!logo || logo.offsetParent === null) {
      finishLoginIntro();
      fadeIn();
      return;
    }
    const rect = logo.getBoundingClientRect();
    const dx = window.innerWidth / 2 - (rect.left + rect.width / 2);
    const dy = window.innerHeight / 2 - (rect.top + rect.height / 2);
    const scale = START_LOGO_HEIGHT_PX / rect.height;
    // Moldura escondida enquanto o logo se move; o fade assume no fim.
    const hidden = faded.map((element) => element.animate([{ opacity: 0 }, { opacity: 0 }], { duration: 1, fill: "forwards" }));
    const move = logo.animate(
      [{ transform: `translate(${dx}px, ${dy}px) scale(${scale})` }, { transform: "none" }],
      { ...LOGO_MOVE, fill: "backwards" },
    );
    move.finished.then(
      () => {
        finishLoginIntro();
        fadeIn();
        hidden.forEach((animation) => animation.cancel());
      },
      // Rejeita só quando a limpeza do efeito cancela a animação (desmontagem):
      // o sinal continua pendente para a próxima montagem.
      () => undefined,
    );
    return () => {
      move.cancel();
      hidden.forEach((animation) => animation.cancel());
    };
  }, []);

  return { logoRef, contentRef, footerRef };
}

// Badges das lojas — SÓ web (no apk não faz sentido baixar o app; `isNative`) e
// por loja habilitada no WL (`info.stores`, vindo da API de marca). Enquanto
// `info` não carrega, não renderiza nada (evita piscar uma badge que some).
function StoreBadges() {
  const { isNative } = useDevice();
  const { info } = useBrand();

  if (isNative || !info) {
    return null;
  }

  const { appStore, playStore } = info.stores;
  if (!appStore && !playStore) {
    return null;
  }

  return (
    <div className="flex items-center justify-center gap-4">
      {appStore ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src="/badges/app-store.png" alt="App Store" className="h-10 w-auto" />
      ) : null}
      {playStore ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src="/badges/google-play.png" alt="Google Play" className="h-10 w-auto" />
      ) : null}
    </div>
  );
}

/**
 * Moldura comum das telas de autenticação (login, biometria, recuperação).
 *
 * View `desktop`: split em duas colunas (painel
 * de marca + coluna do conteúdo); view `mobile`, versão "app" (logo no topo +
 * conteúdo). Segue a VIEW do device (variantes `desktop:`), igual ao resto do
 * shell — tablet em retrato = app; deitado = split. As views só fornecem o
 * miolo (`children`); a moldura cuida de marca, badges e copyright.
 */
export function AuthShell({ children }: { children: ReactNode }) {
  const { brand, info } = useBrand();
  const { logoRef, contentRef, footerRef } = useLoginIntro();

  return (
    <div className="grid min-h-screen w-full desktop:grid-cols-2">
      {/* Painel "hero" da marca — SÓ na view desktop. No mobile (celular,
          tablet em retrato) ele não aparece; a logo vai no topo do conteúdo. */}
      <aside
        className="relative z-10 hidden desktop:block shadow-[6px_0_16px_-2px_rgba(0,0,0,0.45)]"
        style={{ background: brand.heroBg }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={brand.loginImage}
          alt={brand.name}
          className={
            brand.heroFit === "contain"
              ? "absolute inset-0 h-full w-full object-contain p-12"
              : "absolute inset-0 h-full w-full object-cover"
          }
        />
      </aside>

      {/* Coluna do conteúdo em 3 partes: logo (só view mobile) + miolo
          centralizados no espaço disponível; badges + copyright fixos ao fundo. */}
      <div className="flex min-h-screen flex-col px-5 py-8 desktop:px-10">
        <div className="flex flex-1 flex-col items-center justify-center">
          <div className="mb-8 flex justify-center desktop:hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img ref={logoRef} src={brand.logo} alt={brand.name} className="h-14 w-auto" />
          </div>
          <div ref={contentRef} className="w-full max-w-md">
            {children}
          </div>
        </div>

        <div ref={footerRef} className="mx-auto w-full max-w-md">
          <StoreBadges />
          <div className="mt-6 border-t border-border/60 pt-5 text-center">
            {/* Razão social vem da API de WL (info); fallback no nome sync. */}
            <p className="text-xs text-text-muted">© 2007 {info?.legalName ?? brand.name}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
