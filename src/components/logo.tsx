"use client";

import Link from "next/link";

import { useLanguage } from "@/contexts/LanguageContext";
import { cn } from "@/lib/utils";

type LogoProps = {
  className?: string;
  href?: string;
};

export function Logo({ className, href = "/home" }: LogoProps) {
  const { dictionary } = useLanguage();

  return (
    <Link
      href={href}
      aria-label={dictionary.appName}
      className={cn("inline-flex min-w-0 items-center gap-3 rounded-full transition hover:opacity-90", className)}
    >
      <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary font-semibold text-white shadow-[var(--shadow-soft)]">
        BM
      </span>
      <span className="min-w-0">
        <span className="block truncate text-base font-semibold tracking-tight text-text">{dictionary.appName}</span>
      </span>
    </Link>
  );
}
