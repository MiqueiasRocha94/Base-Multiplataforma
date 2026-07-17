// Renderizador Markdown -> HTML mínimo, sem dependências externas (mantém a
// disciplina de bundle do projeto). O conteúdo processado é confiável: são os
// arquivos .md do próprio repositório, lidos em tempo de build. Cobre o que a
// documentação usa: títulos, parágrafos, ênfase, código inline, blocos de
// código, listas (com aninhamento), citações, tabelas (GFM), imagens, links e
// regras horizontais. Blocos ```mermaid``` caem no caminho de bloco de código.

const HTML_ESCAPES: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
};

function escapeHtml(value: string): string {
  return value.replace(/[&<>"]/g, (char) => HTML_ESCAPES[char]);
}

// Cria um identificador estável para o título (usado como âncora #id).
export function slugify(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

// Formatação inline aplicada sobre um texto já escapado para HTML.
function renderInline(text: string): string {
  let out = escapeHtml(text);

  // Código inline primeiro: preserva o conteúdo dos demais processadores.
  out = out.replace(/`([^`]+)`/g, (_match, code: string) => `<code>${code}</code>`);

  // Imagens: ![alt](src) — o src pode vir entre < >.
  out = out.replace(/!\[([^\]]*)\]\(<?([^)>]+)>?\)/g, (_match, alt: string, src: string) => {
    return `<img src="${src.trim()}" alt="${alt}" loading="lazy" />`;
  });

  // Links: [texto](href) — href pode vir entre < > (permite espaços).
  out = out.replace(/\[([^\]]+)\]\(<?([^)>]+)>?\)/g, (_match, label: string, href: string) => {
    const url = href.trim();
    const external = /^https?:\/\//i.test(url);
    const attrs = external ? ' target="_blank" rel="noreferrer noopener"' : "";
    return `<a href="${url}"${attrs}>${label}</a>`;
  });

  // Negrito, depois itálico.
  out = out.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  out = out.replace(/__([^_]+)__/g, "<strong>$1</strong>");
  out = out.replace(/\*([^*]+)\*/g, "<em>$1</em>");
  out = out.replace(/(^|[^a-zA-Z0-9_])_([^_]+)_(?=$|[^a-zA-Z0-9_])/g, "$1<em>$2</em>");

  return out;
}

type ListMarker = "ul" | "ol";

function markerOf(line: string): { indent: number; type: ListMarker; content: string } | null {
  const match = /^(\s*)([-*+]|\d+\.)\s+(.*)$/.exec(line);
  if (!match) {
    return null;
  }
  return {
    indent: match[1].length,
    type: /\d/.test(match[2]) ? "ol" : "ul",
    content: match[3],
  };
}

// Constrói listas (com aninhamento por indentação) a partir de um bloco de linhas.
function renderList(lines: string[]): string {
  const first = markerOf(lines[0]);
  if (!first) {
    return "";
  }

  const baseIndent = first.indent;
  const listType = first.type;
  const items: string[] = [];
  let index = 0;

  while (index < lines.length) {
    const marker = markerOf(lines[index]);
    if (!marker || marker.indent < baseIndent) {
      break;
    }

    // Linhas do item atual: o conteúdo do marcador + tudo mais indentado que ele.
    const itemLines = [marker.content];
    index += 1;
    const nested: string[] = [];

    while (index < lines.length) {
      const nextMarker = markerOf(lines[index]);
      const isDeeperItem = nextMarker && nextMarker.indent > baseIndent;
      const isContinuation = !nextMarker && /^\s+/.test(lines[index]) && lines[index].trim() !== "";

      if (isDeeperItem || isContinuation) {
        nested.push(lines[index].slice(baseIndent + 2));
        index += 1;
        continue;
      }
      break;
    }

    let itemHtml = renderInline(itemLines[0]);
    if (nested.length > 0) {
      // Sublista se o bloco aninhado começa com marcador; senão, texto contínuo.
      itemHtml += markerOf(nested[0]) ? renderList(nested) : ` ${renderInline(nested.join(" "))}`;
    }
    items.push(`<li>${itemHtml}</li>`);
  }

  return `<${listType}>${items.join("")}</${listType}>`;
}

function renderTable(rows: string[]): string {
  const parseCells = (row: string) =>
    row
      .trim()
      .replace(/^\||\|$/g, "")
      .split("|")
      .map((cell) => cell.trim());

  const header = parseCells(rows[0]);
  const bodyRows = rows.slice(2).map(parseCells);

  const head = header.map((cell) => `<th>${renderInline(cell)}</th>`).join("");
  const body = bodyRows
    .map((cells) => `<tr>${cells.map((cell) => `<td>${renderInline(cell)}</td>`).join("")}</tr>`)
    .join("");

  return `<div class="doc-table-scroll"><table><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table></div>`;
}

const HR_RE = /^(-{3,}|\*{3,}|_{3,})$/;
const HEADING_RE = /^(#{1,6})\s+(.*)$/;
const TABLE_SEP_RE = /^\s*\|?[\s:|-]*-[\s:|-]*\|?\s*$/;

export function renderMarkdown(markdown: string): string {
  const lines = markdown.replace(/\r\n/g, "\n").split("\n");
  const blocks: string[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Linha em branco.
    if (line.trim() === "") {
      i += 1;
      continue;
    }

    // Bloco de código cercado por ```.
    const fence = /^```\s*([\w-]*)\s*$/.exec(line);
    if (fence) {
      const lang = fence[1];
      const code: string[] = [];
      i += 1;
      while (i < lines.length && !/^```\s*$/.test(lines[i])) {
        code.push(lines[i]);
        i += 1;
      }
      i += 1; // consome o fechamento
      const langAttr = lang ? ` class="language-${lang}"` : "";
      blocks.push(`<pre><code${langAttr}>${escapeHtml(code.join("\n"))}</code></pre>`);
      continue;
    }

    // Título.
    const heading = HEADING_RE.exec(line);
    if (heading) {
      const level = heading[1].length;
      const text = heading[2].trim();
      blocks.push(`<h${level} id="${slugify(text)}">${renderInline(text)}</h${level}>`);
      i += 1;
      continue;
    }

    // Regra horizontal.
    if (HR_RE.test(line.trim())) {
      blocks.push("<hr />");
      i += 1;
      continue;
    }

    // Tabela: linha com `|` seguida de linha separadora.
    if (line.includes("|") && i + 1 < lines.length && TABLE_SEP_RE.test(lines[i + 1])) {
      const rows: string[] = [line, lines[i + 1]];
      i += 2;
      while (i < lines.length && lines[i].includes("|") && lines[i].trim() !== "") {
        rows.push(lines[i]);
        i += 1;
      }
      blocks.push(renderTable(rows));
      continue;
    }

    // Citação.
    if (/^>\s?/.test(line)) {
      const quote: string[] = [];
      while (i < lines.length && /^>\s?/.test(lines[i])) {
        quote.push(lines[i].replace(/^>\s?/, ""));
        i += 1;
      }
      blocks.push(`<blockquote>${renderMarkdown(quote.join("\n"))}</blockquote>`);
      continue;
    }

    // Lista.
    if (markerOf(line)) {
      const listLines: string[] = [];
      while (i < lines.length && (markerOf(lines[i]) || (/^\s+\S/.test(lines[i]) && lines[i].trim() !== ""))) {
        listLines.push(lines[i]);
        i += 1;
      }
      blocks.push(renderList(listLines));
      continue;
    }

    // Parágrafo: acumula linhas até uma linha em branco ou início de outro bloco.
    const paragraph: string[] = [line];
    i += 1;
    while (i < lines.length && lines[i].trim() !== "" && !HEADING_RE.test(lines[i]) && !/^```/.test(lines[i]) && !markerOf(lines[i]) && !/^>\s?/.test(lines[i]) && !HR_RE.test(lines[i].trim())) {
      paragraph.push(lines[i]);
      i += 1;
    }
    blocks.push(`<p>${renderInline(paragraph.join(" "))}</p>`);
  }

  return blocks.join("\n");
}
