"use client";

import * as React from "react";

import { Input } from "@/components/ui/input";

export type InputNumberProps = Omit<React.ComponentProps<typeof Input>, "onChange" | "type" | "value"> & {
  value: number;
  onChange: (value: number) => void;
};

export const InputNumber = React.forwardRef<HTMLInputElement, InputNumberProps>(function InputNumber(
  { min = 0, onChange, value, ...props },
  ref,
) {
  return (
    <Input
      ref={ref}
      type="number"
      value={value}
      min={min}
      onChange={(event) => onChange(Number(event.target.value) || 0)}
      {...props}
    />
  );
});
