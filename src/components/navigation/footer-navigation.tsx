"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, LayoutGrid, Search, X } from "lucide-react";

import { DrawerSectionLabel, ProfileDrawerSection } from "@/components/profile-panel";

import { useAuth } from "@/contexts/AuthContext";
import { useDevice } from "@/contexts/DeviceContext";
import { useSystemContext } from "@/contexts/SystemContext";
import type { AppDictionary } from "@/lib/i18n/dictionaries";
import {
  findActiveChild,
  getMobileNavigationGroups,
  isNavigationItemActive,
  MOBILE_NAV_LIMIT,
  MOBILE_NAV_MAX,
  MOBILE_PINNED_HREF,
  mobileDynamicSlots,
  resolvePinnedSlots,
  type NavIconKey,
  type PinnedSlot,
  type NavigationItem,
} from "@/lib/navigation";
import { countNavigationLeaves, filterNavigationByQuery, resolveLabel } from "@/lib/navigation-helpers";
import { getMobileNavPins, setMobileNavPins, toggleMobileNavPin } from "@/lib/navigation-pins";
import { cn } from "@/lib/utils";

import { DrawerNavigationItem } from "./drawer-navigation";
import { NAV_ICONS } from "./icons";

const FOOTER_NAV_CLASS =
  "sticky bottom-0 z-[90] border-t border-[color:var(--color-left-sidebar-border)] bg-[color:var(--color-left-sidebar-background)] text-[color:var(--color-left-sidebar-foreground)]";

const PROBE_REM = 10; // largura do probe (rem) p/ medir 1rem real em px
const BASE_FONT_PX = 16; // 100% = 16px

// Pontos fixos por escala da fonte (como a maioria dos apps): <120% → 5 slots;
// 120% → 4; 150% → 3; 200%+ → 2. O excedente sempre cai no Menu (gaveta).
const SCALE_STEPS: Array<{ maxScale: number; cells: number }> = [
  { maxScale: 1.2, cells: 5 },
  { maxScale: 1.5, cells: 4 },
  { maxScale: 2, cells: 3 },
  { maxScale: Number.POSITIVE_INFINITY, cells: 2 },
];

// Largura mínima de uma célula, em `rem` (acompanha a escala da fonte). 4.5rem
// reproduz os pontos acima num celular (360–430px) e, numa barra larga (tablet
// em retrato, janela estreita), libera células extras.
const CELL_MIN_REM = 4.5;

function cellsForScale(scale: number): number {
  return (SCALE_STEPS.find((step) => scale < step.maxScale) ?? SCALE_STEPS[SCALE_STEPS.length - 1]).cells;
}

/**
 * Células da barra = o que a fonte garante OU o que a largura comporta (o maior),
 * limitado por aparelho: celular até MOBILE_NAV_LIMIT (5, usabilidade); tablet e
 * janelas largas até MOBILE_NAV_MAX.
 */
function cellsForBar(barPx: number, remPx: number, isPhone: boolean): number {
  const byScale = cellsForScale(remPx / BASE_FONT_PX);
  const byWidth = Math.floor(barPx / (CELL_MIN_REM * remPx));
  return Math.min(isPhone ? MOBILE_NAV_LIMIT : MOBILE_NAV_MAX, Math.max(byScale, byWidth));
}

function getInitials(value: string) {
  return value
    .split(/[\s@._-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

function footerIcon(icon: NavIconKey) {
  return (
    <span aria-hidden="true" className="inline-flex items-center justify-center leading-none">
      {NAV_ICONS[icon]}
    </span>
  );
}

function footerCellClass(active: boolean) {
  return cn(
    "flex min-h-14 flex-col items-center justify-center gap-1 rounded-2xl px-2 text-xs font-medium transition",
    active
      ? "bg-primary-strong text-on-primary-strong"
      : "text-[color:var(--color-left-sidebar-foreground)] hover:bg-[color:color-mix(in_srgb,var(--color-left-sidebar-foreground)_12%,transparent)]",
  );
}

export function FooterNavigation({
  className,
  dictionary,
  items,
  pathname,
}: {
  className?: string;
  dictionary: AppDictionary;
  items: NavigationItem[];
  pathname: string;
}) {
  const [menuOpenFull, setMenuOpenFull] = useState(false);
  const [menuClosing, setMenuClosing] = useState(false);
  const [menuQuery, setMenuQuery] = useState("");
  // Módulo em foco ao abrir a gaveta a partir de uma célula (null = botão Menu).
  const [menuFocusHref, setMenuFocusHref] = useState<string | null>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const drawerScrollRef = useRef<HTMLDivElement>(null);
  const menuAnimationMs = 240;

  const openMenu = (focusHref: string | null = null) => {
    if (closeTimer.current) {
      clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
    setMenuClosing(false);
    setMenuFocusHref(focusHref);
    setMenuOpenFull(true);
  };

  const closeMenu = () => {
    if (menuClosing) {
      return;
    }
    setMenuClosing(true);
    closeTimer.current = setTimeout(() => {
      setMenuOpenFull(false);
      setMenuClosing(false);
      setMenuQuery("");
      setMenuFocusHref(null);
      closeTimer.current = null;
    }, menuAnimationMs);
  };

  // Nº de slots por escala da fonte + largura da barra. O probe (largura em `rem`)
  // dispara o observer quando a escala muda; a barra, quando a largura muda.
  const probeRef = useRef<HTMLSpanElement>(null);
  const barRef = useRef<HTMLElement>(null);
  const { isPhone } = useDevice();
  const [maxCells, setMaxCells] = useState(MOBILE_NAV_LIMIT);

  useEffect(() => {
    const probe = probeRef.current;
    const bar = barRef.current;
    if (!probe || !bar) {
      return;
    }
    const measure = () => {
      const remPx = probe.getBoundingClientRect().width / PROBE_REM || BASE_FONT_PX;
      setMaxCells(cellsForBar(bar.clientWidth, remPx, isPhone));
    };
    measure();
    // RO cobre mudança de escala da fonte (probe em `rem`) e de largura (rotação,
    // janela); o listener de resize é o fallback (zoom do browser, dynamic type).
    const observer = new ResizeObserver(measure);
    observer.observe(probe);
    observer.observe(bar);
    window.addEventListener("resize", measure);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [isPhone]);

  // Ações da tela (contagem + segunda barra) vêm do chrome do SystemContext.
  const { actionButtonCount, backButtonCount, mobileActionsOpen, setMobileActionsOpen, setMobileBackEl } =
    useSystemContext().chrome;

  // Páginas fixadas pelo usuário nos slots dinâmicos (preferência local por login).
  const { session } = useAuth();
  const userKey = session?.login ?? null;
  const [pins, setPins] = useState<PinnedSlot[]>([]);

  useEffect(() => {
    // setState via função local (mesmo idioma do AccountMenu) p/ o lint set-state-in-effect.
    const loadPins = () => setPins(userKey ? getMobileNavPins(userKey) : []);
    loadPins();
  }, [userKey]);

  // Busca: resultados colados no campo — rola até o fim a cada tecla (quando a
  // lista passa da altura da gaveta). Sem busca, a gaveta abre no topo (CONTA).
  useEffect(() => {
    const container = drawerScrollRef.current;
    if (!container) {
      return;
    }
    container.scrollTop = menuQuery.trim() ? container.scrollHeight : 0;
  }, [menuQuery]);

  const togglePin = (href: string) => {
    if (!userKey) {
      return;
    }
    // Limite = slots dinâmicos desta barra (celular 3), contando só os pins que o
    // usuário vê (os ocultos ficam guardados).
    const next = toggleMobileNavPin(
      pins,
      href,
      (pinned) => resolvePinnedSlots(items, [{ href: pinned, slot: 1 }]).length > 0,
      mobileDynamicSlots(items, maxCells),
    );
    setMobileNavPins(userKey, next);
    setPins(next);
  };

  // Barra adaptada por escala: home · dinâmicos · Menu+Perfil (sempre no fim).
  // O excedente fica na gaveta do Menu.
  const barGroups = useMemo(() => getMobileNavigationGroups(items, maxCells, pins), [items, maxCells, pins]);
  const fixedLeft = barGroups.left;

  // Célula da barra: um módulo (item com filhos) abre a GAVETA focada nele (mesmo
  // padrão do Menu); uma folha é um link normal. Sem mais barras contextuais.
  const fixedCell = (item: NavigationItem) => {
    const focusedOpen = menuOpenFull && menuFocusHref === item.href;
    const active = isNavigationItemActive(pathname, item) || focusedOpen;

    if (item.children?.length) {
      // Enquanto a rota está num filho, a célula mostra o filho ativo (nome+ícone).
      const shown = findActiveChild(pathname, item) || item;
      return (
        <button
          key={item.href}
          type="button"
          aria-expanded={focusedOpen}
          onClick={() => openMenu(item.href)}
          className={footerCellClass(active)}
        >
          {footerIcon(shown.icon)}
          <span className="max-w-full truncate">{resolveLabel(shown, dictionary)}</span>
        </button>
      );
    }

    return (
      <Link key={item.href} href={item.href} className={footerCellClass(active)}>
        {footerIcon(item.icon)}
        <span className="max-w-full truncate">{resolveLabel(item, dictionary)}</span>
      </Link>
    );
  };

  const menuFiltering = menuQuery.trim().length > 0;
  // Aberta por uma célula de módulo → mostra SÓ aquele módulo; pelo botão Menu → tudo.
  // Fora da árvore: Profile (a conta já aparece no topo da gaveta) e Home (link
  // fixo da barra). O Home só sai quando está de fato na barra (âncora).
  const homeAnchorHref = fixedLeft.length > 0 && fixedLeft[0].href === items.find((item) => item.href !== MOBILE_PINNED_HREF)?.href ? fixedLeft[0].href : null;
  const navItems = items.filter((item) => item.href !== MOBILE_PINNED_HREF && item.href !== homeAnchorHref);
  // Selo do pin na gaveta = slot dele na barra (mesma resolução; só os que o
  // usuário vê — pins de páginas fora do menu dele não aparecem).
  const pinSlots = Object.fromEntries(
    resolvePinnedSlots(items, pins, homeAnchorHref ? [homeAnchorHref] : []).map((pin) => [pin.item.href, pin.slot]),
  );
  const menuSource = menuFocusHref ? navItems.filter((item) => item.href === menuFocusHref) : navItems;
  const menuItems = filterNavigationByQuery(menuSource, menuQuery, dictionary);
  // Conta (perfil) no topo só na gaveta "completa" (botão Menu, sem busca).
  const showProfile = !menuFocusHref && !menuFiltering;
  const resultCount = menuFiltering ? countNavigationLeaves(menuItems) : 0;
  const drawer = menuOpenFull ? (
    <div
      data-menu-drawer
      data-closing={menuClosing ? "true" : undefined}
      className="fixed inset-0 z-[1050] flex flex-col bg-[color:var(--color-left-sidebar-background)] text-[color:var(--color-left-sidebar-foreground)] pt-[var(--app-safe-top)] pb-[var(--app-safe-bottom)]"
    >
      {/* Coluna rolável na MESMA ordem do desktop, de cima para baixo: CONTA →
          NAVEGAÇÃO. Com busca, a CONTA sai e o espaçador flex-1 cola os
          resultados na busca (perto do polegar) SEM inverter a ordem; o rótulo
          vira "RESULTADOS (n)" e a lista rola até o fim a cada tecla.
          Aberta por célula de módulo → só o módulo, sem rótulo. */}
      <div ref={drawerScrollRef} className="flex min-h-0 flex-1 flex-col overflow-y-auto px-3 pb-3">
        {showProfile ? <ProfileDrawerSection onNavigate={closeMenu} /> : null}
        <div className="flex-1" />
        {showProfile ? <DrawerSectionLabel>{dictionary.nav.sectionNavigation}</DrawerSectionLabel> : null}
        {menuFiltering ? (
          <DrawerSectionLabel>
            <span aria-live="polite">{`${dictionary.nav.results} (${resultCount})`}</span>
          </DrawerSectionLabel>
        ) : null}
        <nav aria-label={dictionary.nav.title} className="flex flex-col gap-1">
          {menuItems.length > 0 ? (
            menuItems.map((item) => (
              <DrawerNavigationItem
                key={item.href}
                item={item}
                pathname={pathname}
                forceExpanded={menuFiltering}
                focusHref={menuFocusHref ?? undefined}
                onNavigate={closeMenu}
                pins={userKey ? pinSlots : undefined}
                onTogglePin={togglePin}
                anchorHrefs={homeAnchorHref ? [homeAnchorHref] : undefined}
              />
            ))
          ) : (
            <p className="px-4 py-6 text-center text-sm opacity-70">{dictionary.nav.empty}</p>
          )}
        </nav>
      </div>

      <div className="flex shrink-0 items-center gap-2 border-t border-[color:var(--color-left-sidebar-border)] px-3 py-3">
        <div className="relative flex-1">
          <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 opacity-70" />
          <input
            type="search"
            value={menuQuery}
            onChange={(event) => setMenuQuery(event.target.value)}
            placeholder={dictionary.nav.search}
            aria-label={dictionary.nav.search}
            className="w-full rounded-[var(--radius-lg)] border border-[color:var(--color-left-sidebar-border)] bg-[color:color-mix(in_srgb,var(--color-left-sidebar-foreground)_8%,transparent)] py-2.5 pl-10 pr-3 text-sm text-[color:var(--color-left-sidebar-foreground)] outline-none placeholder:opacity-60 focus:border-[color:var(--color-primary-strong)]"
          />
        </div>
        <button
          type="button"
          onClick={closeMenu}
          aria-label={dictionary.common.close}
          className="inline-flex size-11 shrink-0 items-center justify-center rounded-full border border-[color:var(--color-left-sidebar-border)] transition hover:bg-[color:color-mix(in_srgb,var(--color-left-sidebar-foreground)_12%,transparent)]"
        >
          <X className="h-5 w-5" />
        </button>
      </div>
    </div>
  ) : null;

  const menuActive = (menuOpenFull && menuFocusHref === null) || pathname.startsWith(MOBILE_PINNED_HREF);
  const initials = getInitials(session?.username || session?.email || dictionary.nav.title);

  // Tela com saída (type="back") e/ou ações (type="action") → modo CONTEXTUAL:
  // `Home · Voltar · Ações · Menu`. Voltar é navegação (um toque, célula própria);
  // Ações abre a SEGUNDA BARRA só com operações (dois toques: seguro e sem
  // misturar destino com comando). Os dinâmicos/pins saem enquanto durar o modo.
  // Pouco espaço (fonte grande): Menu e Ações nunca caem; cai primeiro o Home,
  // depois o Voltar (que segue no header e, sem célula, vai para a 2ª barra).
  const hasActions = actionButtonCount > 0;
  const contextMode = hasActions || backButtonCount > 0;
  const homeItem = items.find((item) => item.href !== MOBILE_PINNED_HREF && !item.children?.length) ?? null;
  let livres = maxCells - 1 - (hasActions ? 1 : 0);
  const showBack = contextMode && backButtonCount > 0 && livres > 0;
  if (showBack) livres -= 1;
  const showHome = contextMode && homeItem != null && livres > 0;

  // Colunas = células presentes + Menu (sempre).
  const barColumns = contextMode
    ? 1 + (hasActions ? 1 : 0) + (showBack ? 1 : 0) + (showHome ? 1 : 0)
    : fixedLeft.length + 1;

  return (
    <>
      {drawer}

      <nav ref={barRef} className={cn(FOOTER_NAV_CLASS, className)}>
        {/* Probe invisível em `rem`: acompanha a escala da raiz (mesma dos rótulos
            text-xs) e dispara o ResizeObserver quando a fonte muda. */}
        <span ref={probeRef} aria-hidden="true" className="pointer-events-none absolute h-0 w-[10rem] opacity-0" />
        <div
          className="grid gap-1 px-2 py-2"
          style={{ gridTemplateColumns: `repeat(${Math.max(barColumns, 1)}, minmax(0, 1fr))` }}
        >
          {contextMode ? (
            <>
              {showHome && homeItem ? (
                <Link href={homeItem.href} className={footerCellClass(isNavigationItemActive(pathname, homeItem))}>
                  {footerIcon(homeItem.icon)}
                  <span className="max-w-full truncate">{resolveLabel(homeItem, dictionary)}</span>
                </Link>
              ) : null}

              {/* Célula de saída: o Button type="back" da tela chega por portal. */}
              {showBack ? <div ref={setMobileBackEl} className="contents" /> : null}

              {/* Botão central indicado: abre/fecha a segunda barra de ações. */}
              {hasActions ? (
              <button
                type="button"
                aria-expanded={mobileActionsOpen}
                aria-controls="mobile-actions-bar"
                onClick={() => setMobileActionsOpen((aberto) => !aberto)}
                className={cn(
                  footerCellClass(mobileActionsOpen),
                  !mobileActionsOpen &&
                    "ring-1 ring-inset ring-[color:color-mix(in_srgb,var(--color-left-sidebar-foreground)_35%,transparent)]",
                )}
              >
                <span aria-hidden="true" className="inline-flex items-center justify-center leading-none">
                  {mobileActionsOpen ? <ChevronDown className="size-5" /> : <LayoutGrid className="size-5" />}
                </span>
                <span className="max-w-full truncate">{dictionary.nav.actions}</span>
              </button>
              ) : null}
            </>
          ) : (
            fixedLeft.map(fixedCell)
          )}

          {/* Menu + Perfil: avatar do usuário; abre a gaveta com a conta no topo. */}
          <button
            type="button"
            aria-expanded={menuOpenFull && menuFocusHref === null}
            onClick={() => openMenu()}
            className={footerCellClass(menuActive)}
          >
            <span
              aria-hidden="true"
              className={cn(
                "inline-flex size-6 items-center justify-center rounded-full text-[10px] font-bold leading-none",
                menuActive ? "bg-on-primary-strong text-primary-strong" : "bg-primary text-white",
              )}
            >
              {initials}
            </span>
            <span className="max-w-full truncate">{dictionary.nav.title}</span>
          </button>
        </div>
      </nav>
    </>
  );
}
