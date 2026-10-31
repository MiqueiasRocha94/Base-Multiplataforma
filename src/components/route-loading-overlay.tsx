"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";

import { Loading } from "@/components/loading";
import { cn } from "@/lib/utils";

const HIDE_AFTER_COMMIT_MS = 300;
const SAFETY_TIMEOUT_MS = 6000;
/** Rotação: esconde o loading após este tempo sem novos `resize`. */
const ROTATION_SETTLE_MS = 400;

const isLoginPath = (path: string) => path.startsWith("/login");

/**
 * Overlay global de transição. Cobre o clique em link interno (antes do commit)
 * e a troca efetiva de rota (montagem da nova página / redirects de gate),
 * evitando o flash da tela padrão e o "piscar" de conteúdo indevido.
 *
 * Escopo: por padrão cobre só a região do conteúdo (escopado ao MainContent, que
 * é o ancestral posicionado). Em qualquer transição que envolva o `/login`
 * (entrar OU sair) cobre a tela inteira. Não aparece no primeiro carregamento.
 */
export function RouteLoadingOverlay() {
  const pathname = usePathname();
  const [visible, setVisible] = useState(false);
  const [fullScreen, setFullScreen] = useState(false);
  const [rotating, setRotating] = useState(false);
  const isFirstRender = useRef(true);
  const previousPathname = useRef(pathname);
  const safetyTimeout = useRef<number | null>(null);

  useEffect(() => {
    const clearSafety = () => {
      if (safetyTimeout.current !== null) {
        window.clearTimeout(safetyTimeout.current);
        safetyTimeout.current = null;
      }
    };

    const handleClick = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
        return;
      }

      const anchor = (event.target as HTMLElement | null)?.closest?.("a");
      if (!anchor) {
        return;
      }

      const href = anchor.getAttribute("href");
      if (!href || href.startsWith("#") || anchor.getAttribute("target") === "_blank" || anchor.hasAttribute("download")) {
        return;
      }

      let url: URL;
      try {
        url = new URL(href, window.location.href);
      } catch {
        return;
      }

      if (url.origin !== window.location.origin || url.pathname === window.location.pathname) {
        return;
      }

      setFullScreen(isLoginPath(url.pathname) || isLoginPath(window.location.pathname));
      setVisible(true);
      clearSafety();
      safetyTimeout.current = window.setTimeout(() => setVisible(false), SAFETY_TIMEOUT_MS);
    };

    document.addEventListener("click", handleClick, true);

    return () => {
      document.removeEventListener("click", handleClick, true);
      clearSafety();
    };
  }, []);

  // Rotação da tela: o shell se reorganiza (no tablet a view troca entre mobile
  // e desktop) e os quadros intermediários mostrariam o layout "no meio do
  // caminho". Cobre a tela inteira com o Loading (o mesmo do `app/loading.tsx`,
  // que só aparece em navegação) até os `resize` da rotação assentarem.
  useEffect(() => {
    const portrait = window.matchMedia("(orientation: portrait)");
    let settleTimeout: number | null = null;
    let safety: number | null = null;
    let rotating = false;

    const finish = () => {
      rotating = false;
      if (settleTimeout !== null) window.clearTimeout(settleTimeout);
      if (safety !== null) window.clearTimeout(safety);
      settleTimeout = null;
      safety = null;
      setRotating(false);
    };

    const scheduleSettle = () => {
      if (settleTimeout !== null) window.clearTimeout(settleTimeout);
      settleTimeout = window.setTimeout(finish, ROTATION_SETTLE_MS);
    };

    const onOrientationChange = () => {
      rotating = true;
      setRotating(true);
      scheduleSettle();
      if (safety !== null) window.clearTimeout(safety);
      safety = window.setTimeout(finish, SAFETY_TIMEOUT_MS);
    };

    const onResize = () => {
      if (rotating) scheduleSettle();
    };

    portrait.addEventListener("change", onOrientationChange);
    window.addEventListener("resize", onResize);

    return () => {
      portrait.removeEventListener("change", onOrientationChange);
      window.removeEventListener("resize", onResize);
      if (settleTimeout !== null) window.clearTimeout(settleTimeout);
      if (safety !== null) window.clearTimeout(safety);
    };
  }, []);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      previousPathname.current = pathname;
      return;
    }

    // Transição que sai de /login (ex.: login bem-sucedido) ou entra em /login
    // deve cobrir a tela inteira; demais ficam restritas ao conteúdo.
    setFullScreen(isLoginPath(pathname) || isLoginPath(previousPathname.current));
    setVisible(true);
    previousPathname.current = pathname;
    const timeout = window.setTimeout(() => setVisible(false), HIDE_AFTER_COMMIT_MS);

    return () => window.clearTimeout(timeout);
  }, [pathname]);

  if (!visible && !rotating) {
    return null;
  }

  return (
    <div
      data-route-loading
      aria-busy="true"
      className={cn(
        "flex items-center justify-center bg-[color:var(--color-background)]",
        fullScreen || rotating ? "fixed inset-0 z-[1500]" : "absolute inset-0 z-[60]",
      )}
    >
      <Loading className="min-h-0" />
    </div>
  );
}
