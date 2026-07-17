"use client";

import { useEffect, useState } from "react";
import { LucideExternalLink, LucideX } from "lucide-react";

import { renderMarkdown } from "@/lib/docs/markdown";
import type { FileItem } from "@/types/file-item";
import { cn } from "@/lib/utils";

/**
 * Leitor de documentos central da base (equivalente web do DocumentReader da
 * base mobile). Um único componente decide como apresentar o arquivo pelo tipo:
 *
 * - imagem  → zoom por clique
 * - markdown (.md) → renderizado como conteúdo rico (`.doc-prose`)
 * - pdf     → embutido em `<iframe>`
 * - csv / xlsx / outros → abrem no aplicativo externo (fallback)
 *
 * Usos:
 * - `variant="modal"` (padrão): overlay em tela cheia, com cabeçalho e fechar.
 * - `variant="inline"`: renderiza só o conteúdo, para embutir em uma página
 *   (é assim que a página de Documentação reaproveita este leitor para os .md).
 *
 * Para markdown, o texto pode ser passado direto em `content` (ex.: lido em
 * tempo de build); sem ele, o leitor busca o texto a partir de `file.uri`.
 */

export type DocumentKind = "image" | "markdown" | "pdf" | "csv" | "other";

const IMAGE_EXTENSIONS = ["png", "jpg", "jpeg", "gif", "webp", "svg", "avif", "bmp"];

export function resolveDocumentKind(file: FileItem): DocumentKind {
  const name = file.name.toLowerCase();
  const mime = (file.mimeType ?? "").toLowerCase();
  const ext = /\.(\w+)$/.exec(name)?.[1] ?? "";

  if (mime.startsWith("image/") || IMAGE_EXTENSIONS.includes(ext)) {
    return "image";
  }
  if (mime.includes("markdown") || ext === "md" || ext === "markdown") {
    return "markdown";
  }
  if (mime === "application/pdf" || ext === "pdf") {
    return "pdf";
  }
  if (mime.includes("csv") || ext === "csv") {
    return "csv";
  }
  // Sem mime e sem extensão reconhecível: mantém o comportamento antigo (imagem).
  if (!mime && ext === "") {
    return "image";
  }
  return "other";
}

type DocumentReaderProps = {
  file: FileItem | null;
  onClose?: () => void;
  variant?: "modal" | "inline";
  /** Conteúdo textual já conhecido (usado para markdown lido no build). */
  content?: string;
  closeLabel?: string;
  openLabel?: string;
  className?: string;
};

export function DocumentReader({
  file,
  onClose,
  variant = "modal",
  content,
  closeLabel = "Fechar",
  openLabel = "Abrir arquivo",
  className,
}: DocumentReaderProps) {
  const [zoomed, setZoomed] = useState(false);
  // Guarda o texto buscado junto da uri de origem, para nunca exibir o conteúdo
  // de um arquivo anterior enquanto o novo ainda carrega.
  const [fetched, setFetched] = useState<{ uri: string; text: string } | null>(null);

  const kind = file ? resolveDocumentKind(file) : "other";
  // `content` (prop) tem prioridade e sempre reflete o documento atual; o texto
  // buscado só entra quando o conteúdo não foi passado e corresponde ao arquivo.
  const markdownSource = content ?? (file && fetched?.uri === file.uri ? fetched.text : null);

  // Markdown sem `content` explícito: busca o texto do arquivo (http/blob/data).
  useEffect(() => {
    if (!file || kind !== "markdown" || content != null) {
      return;
    }
    let active = true;
    const { uri } = file;
    fetch(uri)
      .then((response) => response.text())
      .then((value) => {
        if (active) setFetched({ uri, text: value });
      })
      .catch(() => {
        if (active) setFetched({ uri, text: "" });
      });
    return () => {
      active = false;
    };
  }, [file, kind, content]);

  if (!file) {
    return null;
  }

  const externalFallback = (
    <a
      href={file.uri}
      target="_blank"
      rel="noreferrer"
      className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-semibold text-black"
    >
      <LucideExternalLink className="size-4" />
      {openLabel}
    </a>
  );

  const body = (() => {
    switch (kind) {
      case "image":
        return (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={file.uri}
            alt={file.name}
            onClick={() => setZoomed((current) => !current)}
            className={
              zoomed
                ? "max-w-none cursor-zoom-out rounded-lg"
                : "max-h-full max-w-full cursor-zoom-in rounded-lg object-contain"
            }
            style={zoomed ? { width: "180%" } : undefined}
          />
        );
      case "markdown":
        return markdownSource == null ? (
          <p className="text-sm text-text-muted">…</p>
        ) : (
          <article className="doc-prose w-full" dangerouslySetInnerHTML={{ __html: renderMarkdown(markdownSource) }} />
        );
      case "pdf":
        return <iframe src={file.uri} title={file.name} className="h-full w-full rounded-lg border-0 bg-white" />;
      default:
        return externalFallback;
    }
  })();

  // Modo embutido: só o conteúdo, sem overlay nem cabeçalho.
  if (variant === "inline") {
    return <div className={cn("doc-reader w-full", className)}>{body}</div>;
  }

  const isFullBleed = kind === "markdown" || kind === "pdf";

  return (
    <div
      className={cn("fixed inset-0 z-[1300] flex flex-col bg-black/85 backdrop-blur-sm", className)}
      onClick={onClose}
    >
      <div className="flex items-center justify-between gap-3 px-4 py-3 text-white">
        <span className="min-w-0 truncate text-sm">{file.name}</span>
        <button
          type="button"
          onClick={onClose}
          aria-label={closeLabel}
          className="inline-flex size-9 items-center justify-center rounded-full border border-white/30 text-white transition hover:bg-white/10"
        >
          <LucideX className="size-4" />
        </button>
      </div>

      <div
        className={cn(
          "flex flex-1 overflow-auto p-4",
          isFullBleed ? "items-stretch justify-center" : "items-center justify-center",
        )}
        onClick={(event) => event.stopPropagation()}
      >
        {kind === "markdown" ? (
          <div className="mx-auto w-full max-w-3xl rounded-2xl bg-surface p-6 sm:p-8">{body}</div>
        ) : (
          body
        )}
      </div>
    </div>
  );
}
