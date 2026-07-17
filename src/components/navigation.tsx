"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { BookOpen, ChartColumn, ChevronDown, ChevronUp, ClipboardList, CircleCheck, Cog, FileSearch, FileText, Grid3X3, Home, LogIn, MoreHorizontal, User, Users } from "lucide-react";

import { useLanguage } from "@/contexts/LanguageContext";
import { useNavigation } from "@/contexts/NavigationContext";
import { CONTEXT_ITEMS_PER_BAR, isNavigationItemActive, type NavIconKey, type NavigationItem } from "@/lib/navigation";
import { cn } from "@/lib/utils";
import type { AppDictionary } from "@/lib/i18n/dictionaries";

type NavigationProps = {
  className?: string;
  variant?: "auto" | "header" | "sidebar" | "footer";
};

const FOOTER_NAV_CLASS =
  "sticky bottom-0 z-[90] border-t border-[color:var(--color-footer-border)] bg-[color:color-mix(in_srgb,var(--color-footer-background)_95%,transparent)] text-[color:var(--color-footer-foreground)] backdrop-blur";

function resolveLabel(item: NavigationItem, dictionary: AppDictionary) {
  return item.label ?? (item.labelKey ? dictionary.nav[item.labelKey] : item.href);
}

function isActiveHref(pathname: string, href?: string) {
  if (!href) {
    return false;
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

const NAV_ICONS: Record<NavIconKey, React.ReactNode> = {
  analytics: <ChartColumn className="h-5 w-5" />,
  approvals: <CircleCheck className="h-5 w-5" />,
  audit: <ClipboardList className="h-5 w-5" />,
  auditDetail: <FileSearch className="h-5 w-5" />,
  documentation: <BookOpen className="h-5 w-5" />,
  home: <Home className="h-5 w-5" />,
  login: <LogIn className="h-5 w-5" />,
  operations: <Cog className="h-5 w-5" />,
  portal: <Grid3X3 className="h-5 w-5" />,
  profile: <User className="h-5 w-5" />,
  reports: <FileText className="h-5 w-5" />,
  users: <Users className="h-5 w-5" />,
  more: <MoreHorizontal className="h-5 w-5" />,
};

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
      : "text-[color:var(--color-footer-foreground)] hover:bg-[color:var(--color-surface-strong)]",
  );
}

function NavigationLabel({ item }: { item: NavigationItem }) {
  const { dictionary } = useLanguage();

  return <>{resolveLabel(item, dictionary)}</>;
}

// O rotulo fica colapsado (largura 0) ate o grupo `nav-rail` receber hover ou
// foco — mesmo idioma visual do `Marker` (icone fixo, texto revelado ao lado).
const RAIL_LABEL_CLASS =
  "max-w-0 overflow-hidden whitespace-nowrap opacity-0 transition-all duration-200 group-hover/nav-rail:max-w-[10rem] group-hover/nav-rail:opacity-100 group-focus-within/nav-rail:max-w-[10rem] group-focus-within/nav-rail:opacity-100";

const RAIL_ROW_CLASS = "nav-rail-item flex items-center gap-3 rounded-[var(--radius-lg)] px-4 py-3 text-sm font-medium transition";
const RAIL_ROW_ACTIVE = "bg-primary-strong text-on-primary-strong";
const RAIL_ROW_INACTIVE = "text-text-muted hover:bg-[color:var(--color-surface-strong)] hover:text-text";

function SidebarNavigationItem({ item, pathname }: { item: NavigationItem; pathname: string }) {
  const active = isNavigationItemActive(pathname, item);
  const hasChildren = Boolean(item.children?.length);
  // Subitens começam colapsados por padrão; o item pai vira um toggle (não navega).
  const [expanded, setExpanded] = useState(false);

  if (!hasChildren) {
    return (
      <Link href={item.href} className={cn(RAIL_ROW_CLASS, active ? RAIL_ROW_ACTIVE : RAIL_ROW_INACTIVE)}>
        <span aria-hidden="true" className="flex shrink-0 items-center justify-center">
          {NAV_ICONS[item.icon]}
        </span>
        <span className={RAIL_LABEL_CLASS}>
          <NavigationLabel item={item} />
        </span>
      </Link>
    );
  }

  return (
    <div className="grid gap-1">
      <button
        type="button"
        onClick={() => setExpanded((current) => !current)}
        aria-expanded={expanded}
        className={cn(RAIL_ROW_CLASS, "w-full text-left", active ? RAIL_ROW_ACTIVE : RAIL_ROW_INACTIVE)}
      >
        <span aria-hidden="true" className="flex shrink-0 items-center justify-center">
          {NAV_ICONS[item.icon]}
        </span>
        <span className={RAIL_LABEL_CLASS}>
          <NavigationLabel item={item} />
        </span>
        <ChevronDown
          aria-hidden="true"
          className={cn(
            "ml-auto size-4 shrink-0 opacity-0 transition-all duration-200 group-hover/nav-rail:opacity-100 group-focus-within/nav-rail:opacity-100",
            expanded && "rotate-180",
          )}
        />
      </button>
      {expanded ? (
        <div className="ml-3 grid gap-1 border-l border-border/60 pl-3">
          {item.children!.map((child) => {
            const childActive = isNavigationItemActive(pathname, child);

            return (
              <Link
                key={child.href}
                href={child.href}
                className={cn(
                  "nav-rail-item flex items-center gap-3 rounded-[var(--radius-lg)] px-3 py-2.5 text-sm transition",
                  childActive
                    ? "bg-[color:var(--color-surface-strong)] font-medium text-text"
                    : "text-text-muted hover:bg-[color:var(--color-surface-strong)] hover:text-text",
                )}
              >
                <span aria-hidden="true" className="flex shrink-0 items-center justify-center">
                  {NAV_ICONS[child.icon]}
                </span>
                <span className={RAIL_LABEL_CLASS}>
                  <NavigationLabel item={child} />
                </span>
              </Link>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

export function Navigation({ className, variant = "auto" }: NavigationProps) {
  const pathname = usePathname();
  const { dictionary } = useLanguage();
  const { items, placement, contextualNav } = useNavigation();
  const resolvedVariant = variant === "auto" ? placement : variant;

  if (resolvedVariant === "header") {
    if (placement !== "header" || items.length === 0) {
      return null;
    }

    return (
      <nav className={cn("flex items-center gap-2 text-sm font-medium text-text-muted", className)}>
        {items.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="rounded-full px-3 py-2 transition hover:bg-[color:var(--color-surface-strong)]"
          >
            <NavigationLabel item={item} />
          </Link>
        ))}
      </nav>
    );
  }

  if (resolvedVariant === "sidebar") {
    if (placement !== "sidebar" || items.length === 0) {
      return null;
    }

    return (
      <div className={cn("nav-rail-body h-full w-full p-3", className)}>
        <nav className="grid gap-1">
          {items.map((item) => (
            <SidebarNavigationItem key={item.href} item={item} pathname={pathname} />
          ))}
        </nav>
      </div>
    );
  }

  if (resolvedVariant !== "footer" || items.length <= 1) {
    return null;
  }

  // Navegação hierárquica por barras contextuais (footer mobile). Toda a lógica
  // (pilha, página, item "Mais", voltar) vem pronta do NavigationContext via
  // contextualNav; aqui é apenas renderização.
  const {
    hasMenu,
    fixedLeft,
    fixedRight,
    isOpen,
    centerNode,
    centerPage,
    isMenuRoot,
    pageItems,
    showMore,
    onCenter,
    onNextPage,
    onOpenNode,
    onCollapse,
  } = contextualNav;

  const fixedLink = (item: NavigationItem) => (
    <Link
      key={item.href}
      href={item.href}
      onClick={onCollapse}
      className={footerCellClass(!isOpen && isActiveHref(pathname, item.href))}
    >
      {footerIcon(item.icon)}
      <span className="max-w-full truncate">{resolveLabel(item, dictionary)}</span>
    </Link>
  );

  if (!hasMenu) {
    return (
      <nav className={cn(FOOTER_NAV_CLASS, className)}>
        <div className="grid gap-1 px-2 py-2" style={{ gridTemplateColumns: `repeat(${fixedLeft.length}, minmax(0, 1fr))` }}>
          {fixedLeft.map(fixedLink)}
        </div>
      </nav>
    );
  }

  let upperBars: React.ReactNode = null;

  if (isOpen) {
    const cells: React.ReactNode[] = pageItems.map((child) =>
      child.children?.length ? (
        <button key={child.href} type="button" onClick={() => onOpenNode(child)} className={footerCellClass(false)}>
          {footerIcon(child.icon)}
          <span className="max-w-full truncate">{resolveLabel(child, dictionary)}</span>
        </button>
      ) : (
        <Link key={child.href} href={child.href} onClick={onCollapse} className={footerCellClass(isActiveHref(pathname, child.href))}>
          {footerIcon(child.icon)}
          <span className="max-w-full truncate">{resolveLabel(child, dictionary)}</span>
        </Link>
      ),
    );

    if (showMore) {
      cells.push(
        <button
          key="__more__"
          type="button"
          onClick={onNextPage}
          className={cn(footerCellClass(false), "border border-dashed border-[color:var(--color-footer-border)]")}
        >
          <MoreHorizontal className="h-5 w-5" />
          <span>{dictionary.nav.title}</span>
        </button>,
      );
    }

    while (cells.length % CONTEXT_ITEMS_PER_BAR !== 0) {
      cells.push(<span key={`spacer-${cells.length}`} aria-hidden="true" className="min-h-14" />);
    }

    const rows: React.ReactNode[][] = [];

    for (let index = 0; index < cells.length; index += CONTEXT_ITEMS_PER_BAR) {
      rows.push(cells.slice(index, index + CONTEXT_ITEMS_PER_BAR));
    }

    upperBars = (
      <div className="absolute inset-x-2 bottom-full mb-2 flex flex-col-reverse gap-2">
        {rows.map((row, index) => (
          <div
            key={index}
            className="grid grid-cols-5 gap-1 rounded-[var(--radius-2xl)] border border-[color:var(--color-footer-border)] bg-[color:var(--color-footer-background)] p-1 shadow-[var(--shadow-soft)]"
          >
            {row}
          </div>
        ))}
      </div>
    );
  }

  const centerLabel = isOpen
    ? `${isMenuRoot || !centerNode ? dictionary.nav.title : resolveLabel(centerNode, dictionary)}${centerPage > 0 ? ` ${centerPage + 1}` : ""}`
    : dictionary.nav.title;

  return (
    <>
      {isOpen ? <div className="fixed inset-0 z-[85] bg-black/20" onClick={onCollapse} /> : null}

      <nav className={cn(FOOTER_NAV_CLASS, className)}>
        <div className="relative">
          {upperBars}

          <div className="grid grid-cols-5 gap-1 px-2 py-2">
            {fixedLeft.map(fixedLink)}

            <button
              type="button"
              aria-expanded={isOpen}
              onClick={onCenter}
              className={cn(
                "flex min-h-14 flex-col items-center justify-center gap-1 rounded-2xl px-2 text-xs font-medium transition",
                // So fica "forte" enquanto aberto; fechado usa contorno para nao
                // competir com o item selecionado (que usa a primaria forte).
                isOpen
                  ? "bg-primary-strong text-on-primary-strong"
                  : "border border-[color:var(--color-footer-border)] text-[color:var(--color-footer-foreground)]",
              )}
            >
              {isOpen ? <ChevronUp className="h-5 w-5" /> : <MoreHorizontal className="h-5 w-5" />}
              <span className="max-w-full truncate">{centerLabel}</span>
            </button>

            {fixedRight.map(fixedLink)}
          </div>
        </div>
      </nav>
    </>
  );
}
