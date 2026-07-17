"use client";

import * as React from "react";

import { cn } from "@/lib/utils";

export const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(function Input(
  { className, type = "text", ...props },
  ref,
) {
  return (
    <input
      ref={ref}
      type={type}
      className={cn(
        "h-12 w-full rounded-2xl border border-border bg-surface px-4 text-base text-text outline-none transition placeholder:text-text-muted focus:border-primary",
        className,
      )}
      {...props}
    />
  );
});
