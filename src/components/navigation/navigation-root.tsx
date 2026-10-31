"use client";

import { usePathname } from "next/navigation";

import { useLanguage } from "@/contexts/LanguageContext";
import { useNavigation } from "@/contexts/NavigationContext";

import { FooterNavigation } from "./footer-navigation";
import { HeaderNavigation } from "./header-navigation";
import { SidebarNavigation } from "./sidebar-navigation";
import type { NavigationProps } from "./types";

export function NavigationRoot({ className, variant = "auto" }: NavigationProps) {
  const pathname = usePathname();
  const { dictionary } = useLanguage();
  const { items, placement } = useNavigation();
  const resolvedVariant = variant === "auto" ? placement : variant;

  if (resolvedVariant === "header") {
    if (placement !== "header" || items.length === 0) {
      return null;
    }

    return <HeaderNavigation className={className} items={items} />;
  }

  if (resolvedVariant === "sidebar") {
    if (placement !== "sidebar" || items.length === 0) {
      return null;
    }

    return <SidebarNavigation className={className} items={items} pathname={pathname} />;
  }

  if (resolvedVariant !== "footer" || items.length <= 1) {
    return null;
  }

  return (
    <FooterNavigation
      className={className}
      dictionary={dictionary}
      items={items}
      pathname={pathname}
    />
  );
}
