"use client";

import Link from "next/link";
import { useState } from "react";
import { ChevronDown } from "lucide-react";

import { isNavigationItemActive, type NavigationItem } from "@/lib/navigation";
import { cn } from "@/lib/utils";

import { NAV_ICONS } from "./icons";
import { NavigationLabel } from "./navigation-label";

const RAIL_LABEL_CLASS =
  "max-w-0 overflow-hidden whitespace-nowrap opacity-0 transition-all duration-200 group-hover/nav-rail:max-w-[10rem] group-hover/nav-rail:opacity-100 group-focus-within/nav-rail:max-w-[10rem] group-focus-within/nav-rail:opacity-100";

const RAIL_ROW_CLASS = "nav-rail-item flex items-center gap-3 rounded-[var(--radius-lg)] px-4 py-3 text-sm font-medium transition";
const RAIL_ROW_ACTIVE = "bg-primary-strong text-on-primary-strong";
// Cores derivadas do foreground da sidebar (não dos tokens da página): a marca
// pode deixar a sidebar escura no tema claro, e surface-strong/text-text da
// página ficariam sem contraste sobre ela.
const RAIL_TEXT_MUTED = "text-[color:color-mix(in_srgb,var(--color-left-sidebar-foreground)_70%,transparent)]";
const RAIL_TEXT = "text-[color:var(--color-left-sidebar-foreground)]";
const RAIL_HOVER_BG = "hover:bg-[color:color-mix(in_srgb,var(--color-left-sidebar-foreground)_12%,transparent)]";
const RAIL_ROW_INACTIVE = `${RAIL_TEXT_MUTED} ${RAIL_HOVER_BG} hover:text-[color:var(--color-left-sidebar-foreground)]`;

function SidebarNavigationItem({ item, pathname }: { item: NavigationItem; pathname: string }) {
  const active = isNavigationItemActive(pathname, item);
  const hasChildren = Boolean(item.children?.length);
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
        <div className="ml-3 grid gap-1 border-l border-[color:var(--color-left-sidebar-border)] pl-3">
          {item.children!.map((child) => {
            const childActive = isNavigationItemActive(pathname, child);

            return (
              <Link
                key={child.href}
                href={child.href}
                className={cn(
                  "nav-rail-item flex items-center gap-3 rounded-[var(--radius-lg)] px-3 py-2.5 text-sm transition",
                  childActive
                    ? `bg-[color:color-mix(in_srgb,var(--color-left-sidebar-foreground)_12%,transparent)] font-medium ${RAIL_TEXT}`
                    : RAIL_ROW_INACTIVE,
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

export function SidebarNavigation({
  className,
  items,
  pathname,
}: {
  className?: string;
  items: NavigationItem[];
  pathname: string;
}) {
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
