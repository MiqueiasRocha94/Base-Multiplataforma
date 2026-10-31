"use client";

import { LucidePlus, LucideTrash2 } from "lucide-react";

import { useImageCapture } from "@/hooks/use-image-capture";
import type { FileItem } from "@/types/file-item";

export type ImageGalleryLabels = {
  add: string;
  empty: string;
};

const DEFAULT_LABELS: ImageGalleryLabels = {
  add: "Adicionar foto",
  empty: "Nenhuma foto.",
};

/**
 * Galeria de arquivos (lista de imagens). Adicionar via captura cross-platform;
 * clicar abre o visualizador; remover por item. Porta a galeria do form da base
 * mobile (lista de Cards com foto).
 */
export function ImageGallery({
  label,
  items,
  editable = true,
  onChange,
  onView,
  labels = DEFAULT_LABELS,
}: {
  label: string;
  items: FileItem[];
  editable?: boolean;
  onChange?: (items: FileItem[]) => void;
  onView?: (item: FileItem) => void;
  labels?: ImageGalleryLabels;
}) {
  const { open } = useImageCapture((file) => onChange?.([...items, file]));

  return (
    <div className="grid gap-2">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-text-muted">{label}</p>
        {editable ? (
          <button
            type="button"
            onClick={() => void open()}
            className="flex items-center gap-1.5 text-xs font-semibold text-primary transition hover:underline"
          >
            <LucidePlus className="size-4" />
            {labels.add}
          </button>
        ) : null}
      </div>

      {items.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-border px-4 py-6 text-center text-xs text-text-muted">{labels.empty}</p>
      ) : (
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
          {items.map((file) => (
            <div key={file.id} className="relative aspect-square overflow-hidden rounded-xl border border-border bg-surface">
              <button type="button" onClick={() => onView?.(file)} className="size-full">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={file.uri} alt={file.name} className="size-full object-cover" />
              </button>
              {editable ? (
                <button
                  type="button"
                  aria-label={`${label} — ${file.name}`}
                  onClick={() => onChange?.(items.filter((item) => item.id !== file.id))}
                  className="absolute right-1 top-1 inline-flex size-7 items-center justify-center rounded-full bg-black/55 text-white transition hover:bg-danger"
                >
                  <LucideTrash2 className="size-3.5" />
                </button>
              ) : null}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
