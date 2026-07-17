/**
 * Baixa um CSV no navegador (acao "Exportar" da listagem). Equivalente web do
 * `shareCsv` da base mobile (que abre o compartilhamento nativo).
 */
export async function downloadCsv(filename: string, csv: string): Promise<void> {
  if (typeof window === "undefined") {
    throw new Error("Exportacao indisponivel neste ambiente.");
  }

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
