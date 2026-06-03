"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { useLanguage } from "@/contexts/LanguageContext";
import { isNavigationItemActive, type NavigationItem } from "@/lib/navigation";
import { cn } from "@/lib/utils";

export function WebSidebar({ items }: { items: NavigationItem[] }) {
  const pathname = usePathname();
  const { dictionary } = useLanguage();

  return (
    <aside className="sticky top-24 h-fit w-72 shrink-0 rounded-[var(--radius-2xl)] border border-border bg-surface p-3 shadow-[var(--shadow-soft)]">
      <nav className="grid gap-1">
        {items.map((item) => {
          const active = isNavigationItemActive(pathname, item);

          return (
            <div key={item.href} className="grid gap-1">
              <Link
                href={item.href}
                className={cn(
                  "rounded-[var(--radius-lg)] px-4 py-3 text-sm font-medium transition",
                  active ? "bg-primary text-white" : "text-text-muted hover:bg-[color:var(--color-surface-strong)] hover:text-text",
                )}
              >
                {dictionary.nav[item.labelKey]}
              </Link>
              {item.children?.length ? (
                <div className="ml-3 grid gap-1 border-l border-border/60 pl-3">
                  {item.children.map((child) => {
                    const childActive = isNavigationItemActive(pathname, child);

                    return (
                      <Link
                        key={child.href}
                        href={child.href}
                        className={cn(
                          "rounded-[var(--radius-lg)] px-4 py-2.5 text-sm transition",
                          childActive ? "bg-[color:var(--color-surface-strong)] font-medium text-text" : "text-text-muted hover:bg-[color:var(--color-surface-strong)] hover:text-text",
                        )}
                      >
                        {dictionary.nav[child.labelKey]}
                      </Link>
                    );
                  })}
                </div>
              ) : null}
            </div>
          );
        })}
      </nav>
    </aside>
  );
}
