"use client";

import * as React from "react";

import { Button, type ButtonProps } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type BrandButtonProps = ButtonProps & {
  badge?: React.ReactNode;
};

export const BrandButton = React.forwardRef<HTMLButtonElement, BrandButtonProps>(function BrandButton(
  { badge = "BM", children, className, variant = "ghost", ...props },
  ref,
) {
  return (
    <Button
      ref={ref}
      variant={variant}
      className={cn("gap-3 border border-border/60 bg-surface/80 backdrop-blur hover:bg-[color:var(--color-surface-strong)]", className)}
      {...props}
    >
      <span className="flex h-7 min-w-7 items-center justify-center rounded-full bg-primary px-2 text-xs font-bold uppercase tracking-[0.14em] text-white">
        {badge}
      </span>
      <span className="truncate">{children}</span>
    </Button>
  );
});
