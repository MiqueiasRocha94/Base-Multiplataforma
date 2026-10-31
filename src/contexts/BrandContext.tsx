"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

import { ACTIVE_BRAND_ID, BRANDS, brandThemeContract, type BrandId, type BrandProfile } from "@/config/brand";
// @dev-only:start
import { BRAND_OVERRIDE_STORAGE_KEY } from "@/config/brand";
// @dev-only:end
import { getBrandInfo } from "@/services/brand";
import type { BrandInfo } from "@/types/brand";
import type { BrandThemeContract } from "@/lib/theme/color-scheme";

/**
 * Marca ativa (whitelabel). É a ENTRADA da identidade do produto:
 * - `brand` (id/nome/cores/assets) — consumido por telas e pelo ThemeProvider
 *   (que é a fonte única das cores: ele lê `useBrand()`, não o contrário).
 * - Identidade do documento (title + favicon) em runtime, complementando o
 *   metadata do build.
 *
 * Valor padrão = `ACTIVE_BRAND_ID` (fixado no build).
 */

type BrandContextValue = {
  brandId: BrandId;
  brand: BrandProfile;
  /**
   * Informações institucionais do WL (razão social, CNPJ, contato, termos…),
   * recuperadas do backend por marca. `null` enquanto carrega ou se falhar — os
   * consumidores devem cair no `brand` síncrono. Ver `services/brand`.
   */
  info: BrandInfo | null;
  /**
   * Contrato PÚBLICO consumido pelo ThemeContext: id da marca + default da WL
   * (encapsulado). É o único canal Brand -> Theme; o Theme não lê `brand.colors`.
   */
  themeContract: BrandThemeContract;
  // @dev-only:start
  /** Troca a marca ativa (switcher do modo desenvolvedor; persiste o override). */
  setBrand: (id: BrandId) => void;
  // @dev-only:end
};

const BrandContext = createContext<BrandContextValue | null>(null);

export function BrandProvider({ children }: { children: React.ReactNode }) {
  // Inicia determinístico (bate com o SSR); o override de dev entra após montar.
  const [brandId, setBrandId] = useState<BrandId>(ACTIVE_BRAND_ID);
  // Informações do WL: carregadas do backend (mock) por marca, após montar.
  const [info, setInfo] = useState<BrandInfo | null>(null);

  // @dev-only:start
  useEffect(() => {
    // Hidratação do override de dev (pós-montagem, SSR-safe). O setState vai por
    // função local para não cair no `set-state-in-effect` — mesmo idioma do
    // DeviceContext.
    const applyOverride = () => {
      try {
        const saved = window.localStorage.getItem(BRAND_OVERRIDE_STORAGE_KEY);
        if (saved && saved in BRANDS) {
          setBrandId(saved as BrandId);
        }
      } catch {
        /* storage indisponível — mantém a marca do build */
      }
    };
    applyOverride();
  }, []);
  // @dev-only:end

  // Identidade do documento (title + favicon) segue a marca em runtime,
  // complementando o metadata do build (que cobre o SSR/produção). Mantém title
  // e favicon SEMPRE juntos — evita a inconsistência de um mudar e o outro não.
  // Marca sem favicon mantém o ícone que estiver no <head>.
  useEffect(() => {
    const brand = BRANDS[brandId];

    // Aplica a identidade da marca (título + favicon). O favicon atualiza TODOS os
    // `link[rel=icon]` — inclusive o que o Next renderiza a partir do metadata
    // (`icons: activeBrand.favicon`), evitando que sobrem dois ícones concorrentes.
    const applyIdentity = () => {
      if (document.title !== brand.name) {
        document.title = brand.name;
      }
      const favicon = brand.favicon;
      if (!favicon) {
        return;
      }
      const icons = document.querySelectorAll<HTMLLinkElement>('link[rel="icon"]');
      if (icons.length === 0) {
        const link = document.createElement("link");
        link.rel = "icon";
        link.href = favicon;
        document.head.appendChild(link);
        return;
      }
      icons.forEach((link) => {
        if (link.getAttribute("href") !== favicon) {
          link.setAttribute("href", favicon);
        }
      });
    };

    applyIdentity();

    // @dev-only:start
    // Em DEV, o override de marca troca título/favicon em runtime, mas o Next
    // reaplica UMA vez o title + o icon do metadata (activeBrand) logo após a
    // hidratação, sobrescrevendo a marca. Um observer curto reafirma a identidade
    // e se desliga. Fora de dev a marca é fixa no build (metadata bate).
    const observer = new MutationObserver(applyIdentity);
    observer.observe(document.head, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["href"],
      characterData: true,
    });
    const stop = window.setTimeout(() => observer.disconnect(), 2000);
    return () => {
      observer.disconnect();
      window.clearTimeout(stop);
    };
    // @dev-only:end
  }, [brandId]);

  // Consumo da API de white-label: recupera as informações da marca ativa.
  // Hoje resolve pelo Dev Backend (mock); vira `apiFetch` quando o backend real
  // existir. Refaz a cada troca de marca (dev switcher) e descarta respostas
  // obsoletas se a marca mudar no meio do caminho.
  useEffect(() => {
    let active = true;
    // setState só nos callbacks async (não no corpo do efeito). `active` descarta
    // a resposta se a marca mudar antes de resolver. Info antiga persiste durante
    // o carregamento (resolução instantânea no mock; consumidores caem no `brand`).
    const loadInfo = () => {
      getBrandInfo(brandId)
        .then((data) => {
          if (active) {
            setInfo(data);
          }
        })
        .catch(() => {
          if (active) {
            setInfo(null);
          }
        });
    };
    loadInfo();
    return () => {
      active = false;
    };
  }, [brandId]);

  // @dev-only:start
  const setBrand = useCallback((id: BrandId) => {
    setBrandId(id);
    try {
      window.localStorage.setItem(BRAND_OVERRIDE_STORAGE_KEY, id);
    } catch {
      /* noop */
    }
  }, []);
  // @dev-only:end

  const value = useMemo<BrandContextValue>(
    () => ({
      brandId,
      brand: BRANDS[brandId],
      info,
      themeContract: brandThemeContract(BRANDS[brandId]),
      // @dev-only:start
      setBrand,
      // @dev-only:end
    }),
    [brandId, info, /* @dev-only:start */ setBrand /* @dev-only:end */],
  );

  return <BrandContext.Provider value={value}>{children}</BrandContext.Provider>;
}

export function useBrand() {
  const context = useContext(BrandContext);
  if (!context) {
    throw new Error("useBrand must be used within BrandProvider.");
  }
  return context;
}
