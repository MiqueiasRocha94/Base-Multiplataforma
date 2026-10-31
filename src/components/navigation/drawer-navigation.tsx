"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ChevronDown, Pin } from "lucide-react";

import { useLanguage } from "@/contexts/LanguageContext";
import { isNavigationItemActive, MOBILE_PINNED_HREF, type NavigationItem } from "@/lib/navigation";
import { cn } from "@/lib/utils";

import { NAV_ICONS } from "./icons";
import { NavigationLabel } from "./navigation-label";

// Exportados: as linhas da conta (ProfilePanel na gaveta) usam o mesmo estilo.
export const DRAWER_ROW_CLASS = "flex items-center gap-3 rounded-[var(--radius-lg)] px-4 py-3 text-sm font-medium transition";
export const DRAWER_ROW_ACTIVE = "bg-primary-strong text-on-primary-strong";
export const DRAWER_ROW_INACTIVE = "text-[color:var(--color-left-sidebar-foreground)] hover:bg-[color:color-mix(in_srgb,var(--color-left-sidebar-foreground)_12%,transparent)]";

export function DrawerNavigationItem({
  item,
  pathname,
  onNavigate,
  forceExpanded = false,
  focusHref,
  pins,
  onTogglePin,
  anchorHrefs,
}: {
  item: NavigationItem;
  pathname: string;
  onNavigate: () => void;
  forceExpanded?: boolean;
  /** Módulo em foco ao abrir a gaveta (célula da navbar): expande e rola até ele. */
  focusHref?: string;
  /** Páginas fixadas → slot na barra; ausente = sem opção de fixar (ex.: sem sessão). */
  pins?: Record<string, number>;
  onTogglePin?: (href: string) => void;
  /** Âncoras da barra (home/profile): já ficam sempre visíveis, sem opção de fixar. */
  anchorHrefs?: string[];
}) {
  const { dictionary } = useLanguage();
  const active = isNavigationItemActive(pathname, item);
  const hasChildren = Boolean(item.children?.length);
  const focused = Boolean(focusHref) && item.href === focusHref;
  const [expanded, setExpanded] = useState((active || focused) && hasChildren);
  const isExpanded = forceExpanded || expanded;
  const groupRef = useRef<HTMLButtonElement | null>(null);

  // Ao abrir focada num módulo, traz o grupo pro centro da viewport da gaveta.
  useEffect(() => {
    if (focused && groupRef.current) {
      groupRef.current.scrollIntoView({ block: "center" });
    }
  }, [focused]);

  if (!hasChildren) {
    // Âncoras (home/profile) já estão sempre na barra — não ocupam slot dinâmico.
    const canPin = Boolean(pins && onTogglePin) && item.href !== MOBILE_PINNED_HREF && !anchorHrefs?.includes(item.href);
    // Posição do fixado = slot dinâmico que ele ocupa na barra (1 = logo após o home).
    const pinPosition = pins?.[item.href] ?? 0;
    const pinned = pinPosition > 0;
    const pinLabel = pinned ? `${dictionary.nav.unpin} (${pinPosition})` : dictionary.nav.pin;

    return (
      <div className="flex items-center gap-1">
        <Link
          href={item.href}
          onClick={onNavigate}
          className={cn(DRAWER_ROW_CLASS, "min-w-0 flex-1", active ? DRAWER_ROW_ACTIVE : DRAWER_ROW_INACTIVE)}
        >
          <span aria-hidden="true" className="flex shrink-0 items-center justify-center">
            {NAV_ICONS[item.icon]}
          </span>
          <span className="flex-1 truncate">
            <NavigationLabel item={item} />
          </span>
        </Link>
        {canPin ? (
          <button
            type="button"
            onClick={() => onTogglePin!(item.href)}
            aria-pressed={pinned}
            aria-label={pinLabel}
            title={pinLabel}
            className={cn(
              "relative inline-flex size-10 shrink-0 items-center justify-center rounded-full transition",
              "hover:bg-[color:color-mix(in_srgb,var(--color-left-sidebar-foreground)_12%,transparent)]",
              // Fixado: alfinete preenchido na cor da marca (sem círculo cheio,
              // para não competir com o item ativo). Solto: contorno discreto.
              pinned
                ? "text-primary"
                : "text-[color:color-mix(in_srgb,var(--color-left-sidebar-foreground)_45%,transparent)]",
            )}
          >
            <Pin className={cn("size-4", pinned && "fill-current")} />
            {pinned ? (
              <span
                aria-hidden="true"
                className="absolute right-0.5 top-0.5 inline-flex min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[0.625rem] font-bold leading-4 text-on-primary"
              >
                {pinPosition}
              </span>
            ) : null}
          </button>
        ) : null}
      </div>
    );
  }

  return (
    <div className="grid gap-1">
      <button
        ref={groupRef}
        type="button"
        onClick={() => setExpanded((current) => !current)}
        aria-expanded={isExpanded}
        className={cn(DRAWER_ROW_CLASS, "w-full text-left", active ? DRAWER_ROW_ACTIVE : DRAWER_ROW_INACTIVE)}
      >
        <span aria-hidden="true" className="flex shrink-0 items-center justify-center">
          {NAV_ICONS[item.icon]}
        </span>
        <span className="flex-1 truncate">
          <NavigationLabel item={item} />
        </span>
        <ChevronDown aria-hidden="true" className={cn("ml-auto size-4 shrink-0 transition-transform", isExpanded && "rotate-180")} />
      </button>
      {isExpanded ? (
        <div className="ml-3 grid gap-1 border-l border-[color:var(--color-left-sidebar-border)]/60 pl-3">
          {item.children!.map((child) => (
            <DrawerNavigationItem key={child.href} item={child} pathname={pathname} onNavigate={onNavigate} forceExpanded={forceExpanded} focusHref={focusHref} pins={pins} onTogglePin={onTogglePin} anchorHrefs={anchorHrefs} />
          ))}
        </div>
      ) : null}
    </div>
  );
}
