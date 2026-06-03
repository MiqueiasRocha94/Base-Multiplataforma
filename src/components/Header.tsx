"use client";

import Link from "next/link";

import { AccountMenu } from "@/components/AccountMenu";
import { LocaleSwitcher } from "@/components/LocaleSwitcher";
import { ThemeToggleButton } from "@/components/ThemeToggleButton";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { getAppNavigationItems, shouldUseSidebar } from "@/lib/navigation";

export function Header() {
  const { dictionary } = useLanguage();
  const { session } = useAuth();
  const navigationItems = getAppNavigationItems(Boolean(session));
  const shouldRenderHeaderNav = !shouldUseSidebar(navigationItems);

  return (
    <header className="sticky top-0 z-10 border-b border-border bg-surface/85 backdrop-blur">
      <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-4 px-6 py-4">
        <div>
          <Link href="/" className="text-lg font-semibold tracking-tight">
            {dictionary.appName}
          </Link>
          <p className="text-sm text-text-muted">{dictionary.tagline}</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {shouldRenderHeaderNav ? (
            <nav className="flex items-center gap-2 text-sm font-medium text-text-muted">
              {navigationItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="rounded-full px-3 py-2 transition hover:bg-[color:var(--color-surface-strong)]"
                >
                  {dictionary.nav[item.labelKey]}
                </Link>
              ))}
            </nav>
          ) : null}
          <AccountMenu />
          {!session ? (
            <>
              <ThemeToggleButton />
              <LocaleSwitcher />
            </>
          ) : null}
        </div>
      </div>
    </header>
  );
}
