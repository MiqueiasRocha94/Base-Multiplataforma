"use client";

import * as React from "react";

import { cn } from "@/lib/utils";

export type SwitchProps = Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "onChange"> & {
  checked: boolean;
  onCheckedChange?: (checked: boolean) => void;
};

export const Switch = React.forwardRef<HTMLButtonElement, SwitchProps>(function Switch(
  { checked, className, disabled, onCheckedChange, type = "button", ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      data-state={checked ? "checked" : "unchecked"}
      className={cn(
        "relative inline-flex h-7 w-12 shrink-0 items-center rounded-full border transition disabled:cursor-not-allowed disabled:opacity-60",
        checked
          ? "border-primary bg-primary/20 text-primary"
          : "border-border bg-background text-text-muted",
        className,
      )}
      onClick={() => {
        if (!disabled) {
          onCheckedChange?.(!checked);
        }
      }}
      {...props}
    >
      <span
        className={cn(
          "pointer-events-none inline-block size-5 rounded-full shadow-sm transition",
          checked ? "translate-x-6 bg-primary" : "translate-x-1 bg-text-muted",
        )}
      />
    </button>
  );
});
