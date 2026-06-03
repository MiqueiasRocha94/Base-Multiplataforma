"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { getAppNavigationItems, getMobileVisibleItems, isNavigationItemActive, MOBILE_NAV_LIMIT, type NavIconKey, type NavigationItem } from "@/lib/navigation";
import { cn } from "@/lib/utils";

function NavIcon({ icon }: { icon: NavIconKey }) {
  const glyphs: Record<NavIconKey, string> = {
    home: "H",
    login: "L",
    portal: "P",
    profile: "U",
    more: "⋯",
  };

  return (
    <span aria-hidden="true" className="text-base leading-none">
      {glyphs[icon]}
    </span>
  );
}

function BottomBarLink({ item, active, children }: { item: NavigationItem; active: boolean; children?: React.ReactNode }) {
  return (
    <Link
      href={item.href}
      className={cn(
        "flex min-h-14 flex-col items-center justify-center gap-1 rounded-2xl px-2 text-xs font-medium transition",
        active ? "bg-primary text-white" : "text-text-muted hover:bg-[color:var(--color-surface-strong)]",
      )}
    >
      <NavIcon icon={item.icon} />
      <span>{children}</span>
    </Link>
  );
}

export function BottomBar() {
  const pathname = usePathname();
  const { session } = useAuth();
  const { dictionary } = useLanguage();
  const [open, setOpen] = useState(false);
  const items = getAppNavigationItems(Boolean(session));

  if (!session || items.length <= 1) {
    return null;
  }

  if (items.length <= MOBILE_NAV_LIMIT) {
    return (
      <nav className="sticky bottom-0 z-20 border-t border-border bg-surface/95 backdrop-blur">
        <div
          className="grid gap-1 px-2 py-2"
          style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}
        >
          {items.map((item) => (
            <BottomBarLink key={item.href} item={item} active={isNavigationItemActive(pathname, item)}>
              {dictionary.nav[item.labelKey]}
            </BottomBarLink>
          ))}
        </div>
      </nav>
    );
  }

  const { left, overflow, right } = getMobileVisibleItems(items);

  return (
    <>
      {open ? (
        <div className="fixed inset-0 z-30 bg-black/20" onClick={() => setOpen(false)}>
          <div
            className="absolute inset-x-4 bottom-20 rounded-[var(--radius-2xl)] border border-border bg-surface p-3 shadow-[var(--shadow-soft)]"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="grid gap-1">
              {overflow.map((item) => (
                <BottomBarLink key={item.href} item={item} active={isNavigationItemActive(pathname, item)}>
                  {dictionary.nav[item.labelKey]}
                </BottomBarLink>
              ))}
            </div>
          </div>
        </div>
      ) : null}

      <nav className="sticky bottom-0 z-40 border-t border-border bg-surface/95 backdrop-blur">
        <div className="grid grid-cols-5 gap-1 px-2 py-2">
          {left.map((item) => (
            <BottomBarLink key={item.href} item={item} active={isNavigationItemActive(pathname, item)}>
              {dictionary.nav[item.labelKey]}
            </BottomBarLink>
          ))}

          <button
            type="button"
            aria-expanded={open}
            onClick={() => setOpen((current) => !current)}
            className={cn(
              "flex min-h-14 flex-col items-center justify-center gap-1 rounded-2xl px-2 text-xs font-medium transition",
              open ? "bg-primary text-white" : "text-text-muted hover:bg-[color:var(--color-surface-strong)]",
            )}
          >
            <NavIcon icon="more" />
            <span>Mais</span>
          </button>

          {right.map((item) => (
            <BottomBarLink key={item.href} item={item} active={isNavigationItemActive(pathname, item)}>
              {dictionary.nav[item.labelKey]}
            </BottomBarLink>
          ))}
        </div>
      </nav>
    </>
  );
}
