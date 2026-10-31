"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

import { useLanguage } from "@/contexts/LanguageContext";
import { ScreenTitle } from "@/components/layout/screen-title";
import { cn } from "@/lib/utils";

export type BreadCrumbMode = "full" | "lite";

type BreadCrumbItem = {
  href: string;
  label: string;
};

type BreadCrumbProps = {
  className?: string;
  fallbackHref?: string;
  mode?: BreadCrumbMode;
};

function formatSegmentLabel(segment: string) {
  return segment
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function BreadCrumb({
  className,
  fallbackHref = "/",
  mode = "full",
}: BreadCrumbProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { dictionary } = useLanguage();

  const segmentLabels: Record<string, string> = {
    home: dictionary.nav.home,
    login: dictionary.nav.login,
    portal: dictionary.nav.portal,
    profile: dictionary.nav.profile,
    register: dictionary.register.title,
    start: dictionary.nav.start,
  };

  const normalizedPath = pathname === "/" ? "/" : pathname.replace(/\/+$/, "");
  const segments = normalizedPath === "/" ? [] : normalizedPath.split("/").filter(Boolean);
  const items: BreadCrumbItem[] =
    segments.length === 0
      ? [{ href: "/", label: dictionary.appName }]
      : segments.map((segment, index) => ({
          href: `/${segments.slice(0, index + 1).join("/")}`,
          label: segmentLabels[segment] ?? formatSegmentLabel(segment),
        }));

  const currentItem = items[items.length - 1];

  function handleLiteClick() {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
      return;
    }

    router.push(fallbackHref);
  }

  if (!currentItem) {
    return null;
  }

  if (mode === "lite") {
    // Mesmo título/voltar das telas (ScreenTitle): seta ← e cor do header.
    return <ScreenTitle title={currentItem.label} onBack={handleLiteClick} className={className} />;
  }

  return (
    <nav aria-label="Breadcrumb" className={cn("min-w-0", className)}>
      <ol className="flex min-w-0 flex-wrap items-center gap-2 text-sm text-text-muted">
        {items.map((item, index) => {
          const isCurrent = index === items.length - 1;

          return (
            <li key={item.href} className="flex min-w-0 items-center gap-2">
              {isCurrent ? (
                <span aria-current="page" className="truncate font-medium text-text">
                  {item.label}
                </span>
              ) : (
                <Link
                  href={item.href}
                  className="truncate rounded-full px-2 py-1 transition hover:bg-[color:var(--color-surface-strong)] hover:text-text"
                >
                  {item.label}
                </Link>
              )}
              {!isCurrent ? (
                <span aria-hidden="true" className="text-text-muted/70">
                  /
                </span>
              ) : null}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
