"use client";

import { LucideCamera, LucideImage, LucideRefreshCw, LucideTrash2 } from "lucide-react";

import { useImageCapture } from "@/hooks/use-image-capture";
import type { FileItem } from "@/types/file-item";

export type ImageFieldLabels = {
  choose: string;
  change: string;
  remove: string;
};

const DEFAULT_LABELS: ImageFieldLabels = {
  choose: "Escolher imagem",
  change: "Trocar imagem",
  remove: "Remover",
};

/**
 * Campo generico de imagem unica (atributo do tipo arquivo). Clicar na imagem
 * abre o visualizador (onView); trocar/remover via botoes. Porta o ImageField da
 * base mobile, usando a captura cross-platform (camera nativa / seletor web).
 */
export function ImageField({
  label,
  value,
  editable = true,
  onChange,
  onView,
  labels = DEFAULT_LABELS,
}: {
  label: string;
  value: FileItem | null;
  editable?: boolean;
  onChange?: (value: FileItem | null) => void;
  onView?: (value: FileItem) => void;
  labels?: ImageFieldLabels;
}) {
  const { open } = useImageCapture((file) => onChange?.(file));

  return (
    <div className="grid gap-2">
      <p className="text-sm font-medium text-text-muted">{label}</p>

      <button
        type="button"
        disabled={!value && !editable}
        onClick={() => (value && onView ? onView(value) : editable ? void open() : undefined)}
        className="relative flex h-40 items-center justify-center overflow-hidden rounded-2xl border border-border bg-surface"
      >
        {value?.uri ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={value.uri} alt={value.name} className="size-full object-cover" />
        ) : (
          <span className="flex flex-col items-center gap-1 text-text-muted">
            {editable ? <LucideCamera className="size-7" /> : <LucideImage className="size-7" />}
            {editable ? <span className="text-xs font-medium">{labels.choose}</span> : null}
          </span>
        )}
      </button>

      {editable ? (
        <div className="flex gap-2.5">
          <button
            type="button"
            onClick={() => void open()}
            className="flex items-center gap-1.5 rounded-xl border border-primary px-3 py-2 text-xs font-semibold text-primary transition hover:bg-[color:var(--color-surface-strong)]"
          >
            {value ? <LucideRefreshCw className="size-4" /> : <LucideCamera className="size-4" />}
            {value ? labels.change : labels.choose}
          </button>

          {value ? (
            <button
              type="button"
              onClick={() => onChange?.(null)}
              className="flex items-center gap-1.5 rounded-xl border border-danger px-3 py-2 text-xs font-semibold text-danger transition hover:bg-[color:var(--color-surface-strong)]"
            >
              <LucideTrash2 className="size-4" />
              {labels.remove}
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
