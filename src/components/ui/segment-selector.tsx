"use client";

import { Button } from "@/components/ui/button";

export type SegmentSelectorOption<Value extends string> = {
  label: string;
  value: Value;
};

export type SegmentSelectorProps<Value extends string> = {
  disabled?: boolean;
  options: Array<SegmentSelectorOption<Value>>;
  value: Value;
  onChange: (value: Value) => void;
};

export function SegmentSelector<Value extends string>({
  disabled = false,
  options,
  value,
  onChange,
}: SegmentSelectorProps<Value>) {
  return (
    <div className="inline-grid rounded-full border border-border bg-background p-1 shadow-inner" style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}>
      {options.map((option) => (
        <Button
          key={option.value}
          variant="ghost"
          disabled={disabled}
          className={option.value === value ? "h-9 rounded-full bg-primary px-5 text-white hover:bg-primary" : "h-9 rounded-full px-5"}
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </Button>
      ))}
    </div>
  );
}
