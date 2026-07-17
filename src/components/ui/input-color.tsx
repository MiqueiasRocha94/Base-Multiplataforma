"use client";

import * as React from "react";

import { cn } from "@/lib/utils";

export type InputColorProps = Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange" | "type" | "value"> & {
  value: string;
  onChange: (value: string) => void;
};

function isHexColor(value: string) {
  return /^#[0-9a-fA-F]{6}$/.test(value);
}

export const InputColor = React.forwardRef<HTMLInputElement, InputColorProps>(function InputColor(
  { className, onChange, value, ...props },
  ref,
) {
  return (
    <span className={cn("inline-flex size-10 items-center justify-center rounded-[var(--radius-lg)] border border-border bg-surface p-1", className)}>
      <input
        ref={ref}
        type="color"
        value={isHexColor(value) ? value : "#000000"}
        className="size-7 cursor-pointer appearance-none rounded border border-border bg-transparent p-0 disabled:cursor-not-allowed disabled:opacity-60 [&::-moz-color-swatch]:rounded [&::-moz-color-swatch]:border-0 [&::-webkit-color-swatch]:rounded [&::-webkit-color-swatch]:border-0 [&::-webkit-color-swatch-wrapper]:p-0"
        onChange={(event) => onChange(event.target.value)}
        {...props}
      />
    </span>
  );
});
