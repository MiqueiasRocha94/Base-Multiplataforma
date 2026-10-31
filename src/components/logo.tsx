"use client";

import Link from "next/link";

import { cn } from "@/lib/utils";
import { useBrand } from "@/contexts/BrandContext";
import { useAuth } from "@/contexts/AuthContext";

type LogoProps = {
  className?: string;
  href?: string;
};

export function Logo({ className, href = "/login" }: LogoProps) {
  const { brand } = useBrand();
  const { user } = useAuth();
  // O rotulo ao lado da marca reflete a organizacao do usuario; deslogado (ou
  // sem organizacao), a marca.
  const label = user?.organization.name || brand.name;

  return (
    <Link
      href={href}
      aria-label={brand.name}
      className={cn("inline-flex min-w-0 items-center gap-3 rounded-full transition hover:opacity-90", className)}
    >
      <img
        src={brand.logo}
        alt={brand.name}
        className="h-9 w-auto max-w-[30rem] shrink-0 object-contain"
      />
      <span className="block min-w-0 truncate text-base font-semibold tracking-tight">{label}</span>
    </Link>
  );
}
