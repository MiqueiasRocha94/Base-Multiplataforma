"use client";

import { cn } from "@/lib/utils";

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
    // Colunas `auto-fit`/`minmax`: ocupa a largura do container e QUEBRA em mais
    // linhas quando os rótulos não cabem numa só (ex.: painel estreito com 4
    // opções ou rótulos longos como "Sistema") — em vez de espremer/truncar.
    // <button> simples (não o Button de ui): o `size` do Button força px-5 e
    // esmagaria o texto neste espaço estreito.
    <div
      className="grid w-full gap-1 rounded-2xl border border-border bg-background p-1 shadow-inner"
      style={{ gridTemplateColumns: "repeat(auto-fit, minmax(50px, 1fr))" }}
    >
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          disabled={disabled}
          onClick={() => onChange(option.value)}
          className={cn(
            "flex h-9 min-w-0 items-center justify-center rounded-2xl px-1 text-xs font-medium transition disabled:cursor-not-allowed disabled:opacity-60",
            option.value === value
              ? "bg-primary text-white"
              : "text-[color:var(--color-text)] hover:bg-[color:var(--color-surface-strong)]",
          )}
        >
          <span className="truncate">{option.label}</span>
        </button>
      ))}
    </div>
  );
}
