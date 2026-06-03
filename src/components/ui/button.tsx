"use client";

import * as React from "react";

import { useDevice } from "@/contexts/DeviceContext";
import { cn } from "@/lib/utils";

type ButtonVariant = "default" | "outline" | "secondary" | "ghost" | "danger";
type ButtonSize = "default" | "sm" | "lg" | "icon";

const variantClasses: Record<ButtonVariant, string> = {
  default: "bg-primary text-white hover:bg-primary-strong",
  outline: "border border-border bg-white text-[color:var(--color-text)] hover:bg-[color:var(--color-surface-strong)]",
  secondary: "bg-secondary text-[color:var(--color-text)] hover:brightness-95",
  ghost: "text-[color:var(--color-text)] hover:bg-[color:var(--color-surface-strong)]",
  danger: "bg-error text-white hover:brightness-95",
};

const sizeClasses: Record<ButtonSize, string> = {
  default: "h-12 px-5",
  sm: "h-10 px-4 text-sm",
  lg: "h-14 px-6 text-base",
  icon: "size-10 px-0",
};

export type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fixed?: boolean;
  special?: boolean;
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, variant = "default", size = "default", type = "button", fixed = true, special = false, ...props },
  ref,
) {
  const { shellMode } = useDevice();
  const adaptiveOnMobile = fixed === false && shellMode === "mobile";
  const mobileSlot = adaptiveOnMobile ? (special ? "top" : "bottom") : "inline";

  return (
    <button
      ref={ref}
      type={type}
      data-fixed={fixed}
      data-special={special}
      data-shell-mode={shellMode}
      data-mobile-slot={mobileSlot}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-2xl font-semibold transition disabled:cursor-not-allowed disabled:opacity-60",
        adaptiveOnMobile && !special && "w-full",
        variantClasses[variant],
        sizeClasses[size],
        className,
      )}
      {...props}
    />
  );
});
