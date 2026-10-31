"use client";

import Link from "next/link";

import type { NavigationItem } from "@/lib/navigation";
import { cn } from "@/lib/utils";

import { NavigationLabel } from "./navigation-label";

export function HeaderNavigation({ className, items }: { className?: string; items: NavigationItem[] }) {
  return (
    <nav className={cn("flex items-center gap-2 text-sm font-medium text-[color:color-mix(in_srgb,var(--color-header-foreground)_75%,transparent)]", className)}>
      {items.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className="rounded-full px-3 py-2 transition hover:bg-[color:color-mix(in_srgb,var(--color-header-foreground)_12%,transparent)]"
        >
          <NavigationLabel item={item} />
        </Link>
      ))}
    </nav>
  );
}
