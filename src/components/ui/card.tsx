"use client";

import * as React from "react";

import { cn } from "@/lib/utils";

export const Card = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(function Card(
  { className, ...props },
  ref,
) {
  return (
    <div
      ref={ref}
      className={cn("rounded-[var(--radius-2xl)] border border-border bg-surface shadow-[var(--shadow-soft)]", className)}
      {...props}
    />
  );
});

export const CardHeader = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(function CardHeader(
  { className, ...props },
  ref,
) {
  return <div ref={ref} className={cn("grid gap-2 p-6", className)} {...props} />;
});

export const CardTitle = React.forwardRef<HTMLHeadingElement, React.HTMLAttributes<HTMLHeadingElement>>(function CardTitle(
  { className, ...props },
  ref,
) {
  return <h2 ref={ref} className={cn("typo-heading tracking-tight", className)} {...props} />;
});

export const CardDescription = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(
  function CardDescription({ className, ...props }, ref) {
    return <p ref={ref} className={cn("text-sm leading-6 text-text-muted", className)} {...props} />;
  },
);

/**
 * Variação do header com regiões `left` / `center` / `right`. O layout segue o
 * número de regiões preenchidas (não-nulas):
 * - 0 ou 1 → comportamento padrão (sem divisão): delega ao `CardHeader` com a
 *   região única ou os `children` (empilhado, `p-6`);
 * - 2 → divide em dois independentes (recomendado usar `left` + `right`);
 * - 3 → divide em três, cada valor na sua posição (`left` / `center` / `right`).
 *
 * No modo dividido não há padding default (o `cn()` do projeto não faz merge, só
 * concatena): o consumidor passa o padding pela `className` (Card → `p-6`;
 * lista da tabela → `px-4 py-2.5`).
 */
export const CardHeaderSplit = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    left?: React.ReactNode;
    center?: React.ReactNode;
    right?: React.ReactNode;
  }
>(function CardHeaderSplit({ left, center, right, className, children, ...props }, ref) {
  const regions = [left, center, right].filter((region) => region != null);

  // 0 ou 1 região: comportamento padrão do CardHeader (conteúdo único).
  if (regions.length <= 1) {
    return (
      <CardHeader ref={ref} className={className} {...props}>
        {regions.length === 1 ? regions[0] : children}
      </CardHeader>
    );
  }

  return (
    <div ref={ref} className={cn("flex items-center justify-between gap-3", className)} {...props}>
      {left != null ? <div className="min-w-0 flex-1">{left}</div> : null}
      {center != null ? <div className="min-w-0 flex-1 text-center">{center}</div> : null}
      {right != null ? <div className="shrink-0">{right}</div> : null}
    </div>
  );
});

export const CardContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(function CardContent(
  { className, ...props },
  ref,
) {
  return <div ref={ref} className={cn("p-6 pt-0", className)} {...props} />;
});

export const CardFooter = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(function CardFooter(
  { className, ...props },
  ref,
) {
  return <div ref={ref} className={cn("flex items-center gap-3 p-6 pt-0", className)} {...props} />;
});
