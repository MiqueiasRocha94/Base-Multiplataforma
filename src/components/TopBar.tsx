"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { useLanguage } from "@/contexts/LanguageContext";

function resolveTitle(pathname: string, dictionary: ReturnType<typeof useLanguage>["dictionary"]) {
  if (pathname.startsWith("/portal/profile")) {
    return dictionary.nav.profile;
  }

  if (pathname.startsWith("/portal/home")) {
    return dictionary.portal.title;
  }

  if (pathname.startsWith("/portal")) {
    return dictionary.nav.portal;
  }

  return dictionary.appName;
}

export function TopBar() {
  const pathname = usePathname();
  const { dictionary } = useLanguage();
  const title = resolveTitle(pathname, dictionary);

  return (
    <header className="sticky top-0 z-20 border-b border-border bg-surface/95 backdrop-blur">
      <div className="flex items-center justify-between gap-3 px-4 py-3">
        <div className="min-w-0">
          <Link href="/portal/home" className="block text-base font-semibold tracking-tight">
            {dictionary.appName}
          </Link>
          <p className="truncate text-xs text-text-muted">{title}</p>
        </div>
      </div>
    </header>
  );
}
