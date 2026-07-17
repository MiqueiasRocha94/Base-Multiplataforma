"use client";

import Link from "next/link";
import type { ReactNode } from "react";

import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type StatusTone = "primary" | "error";

export type StatusAction = {
  label: string;
  href?: string;
  onClick?: () => void;
  variant?: "primary" | "outline";
};

export type StatusScreenProps = {
  code?: string;
  icon?: ReactNode;
  tone?: StatusTone;
  title: string;
  description?: string;
  digest?: string;
  actions?: StatusAction[];
  className?: string;
};

const TONE_TEXT: Record<StatusTone, string> = {
  primary: "text-primary",
  error: "text-[color:var(--color-error)]",
};

const TONE_BADGE: Record<StatusTone, string> = {
  primary: "bg-[color:var(--color-surface-strong)] text-primary",
  error: "bg-[color:color-mix(in_srgb,var(--color-error)_16%,transparent)] text-[color:var(--color-error)]",
};

const ACTION_BASE = "inline-flex h-12 items-center justify-center rounded-2xl px-5 text-sm font-semibold transition";
const ACTION_VARIANT: Record<NonNullable<StatusAction["variant"]>, string> = {
  primary: "bg-primary text-white hover:bg-primary-strong",
  outline: "border border-border text-text hover:bg-[color:var(--color-surface-strong)]",
};

/**
 * Tela de status reutilizável (erro / 404 / sem permissão). Apenas apresentação,
 * dirigida por props — não depende de contexto, então funciona inclusive no
 * `global-error` (que roda sem os providers da aplicação).
 */
export function StatusScreen({
  code,
  icon,
  tone = "primary",
  title,
  description,
  digest,
  actions = [],
  className,
}: StatusScreenProps) {
  return (
    <section className={cn("mx-auto flex min-h-[70vh] w-full max-w-xl items-center justify-center px-4 py-8", className)}>
      <Card className="w-full">
        <CardContent className="grid justify-items-center gap-5 p-8 text-center">
          {icon ? (
            <span className={cn("inline-flex size-16 items-center justify-center rounded-full", TONE_BADGE[tone])}>{icon}</span>
          ) : null}
          {code ? <p className={cn("text-7xl font-black leading-none tracking-tight", TONE_TEXT[tone])}>{code}</p> : null}
          <div className="grid gap-2">
            <h1 className="text-2xl font-semibold tracking-tight text-text">{title}</h1>
            {description ? <p className="text-sm leading-6 text-text-muted">{description}</p> : null}
            {digest ? <p className="font-mono text-xs text-text-muted">#{digest}</p> : null}
          </div>
          {actions.length > 0 ? (
            <div className="flex flex-wrap items-center justify-center gap-3">
              {actions.map((action) => {
                const classes = cn(ACTION_BASE, ACTION_VARIANT[action.variant ?? "primary"]);
                return action.href ? (
                  <Link key={action.label} href={action.href} className={classes}>
                    {action.label}
                  </Link>
                ) : (
                  <button key={action.label} type="button" onClick={action.onClick} className={classes}>
                    {action.label}
                  </button>
                );
              })}
            </div>
          ) : null}
        </CardContent>
      </Card>
    </section>
  );
}
