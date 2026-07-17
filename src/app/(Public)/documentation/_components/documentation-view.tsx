"use client";

import { useCallback, useMemo, useState, type MouseEvent } from "react";
import { LucideBookOpen, LucideFileText } from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DocumentReader } from "@/components/ui/document-reader";
import type { DocEntry } from "@/lib/docs/load-docs";
import { slugify } from "@/lib/docs/markdown";
import type { FileItem } from "@/types/file-item";
import { useLanguage } from "@/contexts/LanguageContext";
import { cn } from "@/lib/utils";

type DocumentationViewProps = {
  docs: DocEntry[];
};

export function DocumentationView({ docs }: DocumentationViewProps) {
  const { dictionary } = useLanguage();
  const t = dictionary.documentation;
  const [activeSlug, setActiveSlug] = useState(() => docs[0]?.slug ?? "");

  const active = useMemo(() => docs.find((doc) => doc.slug === activeSlug) ?? docs[0], [docs, activeSlug]);
  const slugSet = useMemo(() => new Set(docs.map((doc) => doc.slug)), [docs]);

  // Cada documento é apresentado como um FileItem .md pelo leitor central.
  const activeFile = useMemo<FileItem | null>(
    () => (active ? { id: active.slug, name: `${active.slug}.md`, uri: "", mimeType: "text/markdown" } : null),
    [active],
  );

  // Referências cruzadas entre documentos usam links relativos (ex.:
  // "./04-shell-adaptativo.md"). Como os slugs derivam do mesmo nome de arquivo,
  // interceptamos esses cliques e trocamos o documento ativo em vez de navegar
  // para um .md inexistente. Demais links seguem o comportamento padrão.
  const handleContentClick = useCallback(
    (event: MouseEvent<HTMLElement>) => {
      const anchor = (event.target as HTMLElement).closest("a");
      const href = anchor?.getAttribute("href");
      if (!href || !/\.md(#.*)?$/i.test(href) || /^https?:\/\//i.test(href)) {
        return;
      }
      const fileName = href.split("/").pop()?.replace(/#.*$/, "").replace(/\.md$/i, "") ?? "";
      const targetSlug = slugify(fileName);
      if (slugSet.has(targetSlug)) {
        event.preventDefault();
        setActiveSlug(targetSlug);
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    },
    [slugSet],
  );

  if (!active) {
    return (
      <section className="mx-auto grid w-full max-w-3xl gap-6 py-8">
        <Card>
          <CardHeader>
            <CardTitle>{t.title}</CardTitle>
            <CardDescription>{t.empty}</CardDescription>
          </CardHeader>
        </Card>
      </section>
    );
  }

  return (
    <section className="mx-auto grid w-full max-w-6xl gap-6 py-8">
      <div className="grid gap-2">
        <p className="inline-flex items-center gap-2 text-sm font-medium uppercase tracking-[0.24em] text-primary">
          <LucideBookOpen className="size-4" />
          {t.badge}
        </p>
        <h1 className="text-3xl font-semibold tracking-tight">{t.title}</h1>
        <p className="max-w-3xl text-sm leading-6 text-text-muted">{t.subtitle}</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
        {/* Índice: navegação entre documentos */}
        <nav aria-label={t.indexLabel} className="lg:sticky lg:top-6 lg:self-start">
          <Card className="overflow-hidden shadow-none">
            <CardContent className="grid gap-1 p-3">
              {docs.map((doc) => {
                const isActive = doc.slug === active.slug;
                return (
                  <button
                    key={doc.slug}
                    type="button"
                    onClick={() => setActiveSlug(doc.slug)}
                    aria-current={isActive ? "page" : undefined}
                    className={cn(
                      "flex w-full min-w-0 items-start gap-2 rounded-[var(--radius-xl)] px-3 py-2 text-left text-sm font-medium transition",
                      isActive
                        ? "bg-primary-strong text-on-primary-strong"
                        : "text-text-muted hover:bg-[color:var(--color-surface-strong)] hover:text-text",
                    )}
                  >
                    <LucideFileText className="mt-0.5 size-4 shrink-0 opacity-70" />
                    <span className="min-w-0 flex-1 break-words leading-snug">{doc.title}</span>
                  </button>
                );
              })}
            </CardContent>
          </Card>
        </nav>

        {/* Conteúdo do documento: renderizado pelo leitor central da base (exemplo de uso). */}
        {/* Delegação de clique: reescreve apenas navegação entre docs; os links seguem acessíveis. */}
        <Card className="min-w-0" onClick={handleContentClick}>
          <CardContent className="p-6 sm:p-8">
            <DocumentReader variant="inline" file={activeFile} content={active.markdown} />
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
