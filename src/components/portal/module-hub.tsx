"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { LucideChevronRight } from "lucide-react";

import { NAV_ICONS } from "@/components/navigation/icons";
import { useLanguage } from "@/contexts/LanguageContext";
import { useNavigation } from "@/contexts/NavigationContext";
import { resolveLabel } from "@/lib/navigation-helpers";

/**
 * Página de um módulo do menu (ex.: `/portal/<modulo>`): lista os recursos do
 * módulo que o usuário logado vê — os MESMOS filhos do menu, já filtrados por
 * permissão em `lib/navigation.ts` (sem configuração própria). Sem título: o
 * breadcrumb do MainContent já nomeia o módulo.
 */
export function ModuleHub({ href }: { href: string }) {
  const { items } = useNavigation();
  const { dictionary } = useLanguage();
  const resources = items.find((item) => item.href === href)?.children ?? [];

  return (
    <section className="mx-auto grid w-full max-w-4xl gap-3 p-4 sm:grid-cols-2 lg:grid-cols-3 lg:py-8">
      {resources.map((item) => (
        <QuickAccessCard key={item.href} icon={NAV_ICONS[item.icon]} label={resolveLabel(item, dictionary)} href={item.href} />
      ))}
    </section>
  );
}

function QuickAccessCard({ icon, label, href }: { icon: ReactNode; label: string; href: string }) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 rounded-[var(--radius-xl)] border border-border bg-surface p-4 transition hover:-translate-y-1 hover:border-primary hover:shadow-[var(--shadow-soft)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-primary)]"
    >
      <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-xl bg-[color:var(--color-surface-strong)] text-primary">{icon}</span>
      <span className="min-w-0 flex-1 truncate text-sm font-semibold text-text">{label}</span>
      <LucideChevronRight className="size-4 shrink-0 text-text-muted" />
    </Link>
  );
}
