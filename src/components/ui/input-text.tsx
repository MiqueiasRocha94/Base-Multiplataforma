"use client";

import * as React from "react";

import { Input } from "@/components/ui/input";

export type InputTextProps = Omit<React.ComponentProps<typeof Input>, "onChange" | "type" | "value"> & {
  value: string;
  onChange: (value: string) => void;
};

export const InputText = React.forwardRef<HTMLInputElement, InputTextProps>(function InputText(
  { onChange, value, ...props },
  ref,
) {
  return (
    <Input
      ref={ref}
      type="text"
      value={value}
      onChange={(event) => onChange(event.target.value)}
      {...props}
    />
  );
});
