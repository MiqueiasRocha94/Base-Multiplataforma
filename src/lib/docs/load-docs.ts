// Leitura da documentação em tempo de build (Server Component / SSG). Usa `fs`,
// então só pode ser importado por código de servidor — nunca por um Client
// Component. O resultado é serializado e passado como prop para a UI cliente.
// Funciona também no build mobile (`output: "export"`), pois a geração estática
// roda na máquina que tem o repositório.

import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

import { slugify } from "@/lib/docs/markdown";

export type DocEntry = {
  slug: string;
  title: string;
  group: "readme" | "docs";
  /** Markdown bruto; a renderização fica a cargo do leitor central (DocumentReader). */
  markdown: string;
};

// Extrai o primeiro título `# ...` como nome do documento; cai no nome do arquivo.
function extractTitle(markdown: string, fallback: string): string {
  const match = /^#\s+(.+)$/m.exec(markdown);
  return match ? match[1].trim() : fallback;
}

function toTitleCase(fileName: string): string {
  return fileName
    .replace(/\.md$/i, "")
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

// Ordena README primeiro, depois os arquivos numerados (01, 02, ...) e o resto
// em ordem alfabética.
function sortDocFiles(files: string[]): string[] {
  return files.sort((a, b) => {
    const aReadme = /^readme\.md$/i.test(a);
    const bReadme = /^readme\.md$/i.test(b);
    if (aReadme !== bReadme) {
      return aReadme ? -1 : 1;
    }
    return a.localeCompare(b, "pt-BR", { numeric: true });
  });
}

export function loadDocumentation(): DocEntry[] {
  const root = process.cwd();
  const entries: DocEntry[] = [];
  const usedSlugs = new Set<string>();

  const pushEntry = (rawSlug: string, title: string, group: DocEntry["group"], markdown: string) => {
    let slug = rawSlug || "doc";
    while (usedSlugs.has(slug)) {
      slug = `${group}-${slug}`;
    }
    usedSlugs.add(slug);
    entries.push({ slug, title, group, markdown });
  };

  // README da raiz do projeto.
  try {
    const rootReadme = readFileSync(join(root, "README.md"), "utf8");
    pushEntry("readme", extractTitle(rootReadme, "README"), "readme", rootReadme);
  } catch {
    // README ausente: segue apenas com a pasta docs/.
  }

  // Todos os .md em docs/.
  const docsDir = join(root, "docs");
  let docFiles: string[] = [];
  try {
    docFiles = readdirSync(docsDir).filter((file) => file.toLowerCase().endsWith(".md"));
  } catch {
    docFiles = [];
  }

  for (const file of sortDocFiles(docFiles)) {
    const markdown = readFileSync(join(docsDir, file), "utf8");
    const slug = slugify(file.replace(/\.md$/i, "")) || slugify(file);
    pushEntry(slug, extractTitle(markdown, toTitleCase(file)), "docs", markdown);
  }

  return entries;
}
