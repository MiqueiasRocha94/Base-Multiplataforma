"use client";

import { useLanguage } from "@/contexts/LanguageContext";
import { resolveLabel } from "@/lib/navigation-helpers";
import type { NavigationItem } from "@/lib/navigation";

export function NavigationLabel({ item }: { item: NavigationItem }) {
  const { dictionary } = useLanguage();

  return <>{resolveLabel(item, dictionary)}</>;
}
