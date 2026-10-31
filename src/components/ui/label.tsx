"use client";

import * as React from "react";

import { cn } from "@/lib/utils";

export const Label = React.forwardRef<HTMLLabelElement, React.LabelHTMLAttributes<HTMLLabelElement>>(function Label(
  { className, ...props },
  ref,
) {
  return <label ref={ref} className={cn("grid min-w-0 gap-2 text-sm", className)} {...props} />;
});
