import { isDesktopViewport, isNativePlatform } from "@/lib/platform/capacitor";

/** Blob → base64 puro (sem o prefixo `data:...;base64,`), para o Filesystem. */
function blobParaBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const leitor = new FileReader();
    leitor.onload = () => resolve(String(leitor.result).split(",", 2)[1] ?? "");
    leitor.onerror = () => reject(leitor.error ?? new Error("Falha ao ler o arquivo."));
    leitor.readAsDataURL(blob);
  });
}

/** Cancelamento da folha de compartilhamento (Capacitor ou Web Share) — não é falha. */
function foiCancelado(erro: unknown) {
  return (erro instanceof DOMException && erro.name === "AbortError") || (erro instanceof Error && /cancel/i.test(erro.message));
}

/**
 * Entrega um arquivo gerado (PDF/CSV do backend) ao usuário:
 * - mobile → folha de COMPARTILHAMENTO nativa (salvar, abrir no leitor, enviar):
 *   no APK/iOS pelo plugin Share (o WebView ignora download; o arquivo vai para o
 *   cache do app); no navegador em visão mobile pela Web Share API, quando ela
 *   aceita arquivos;
 * - web (desktop, ou navegador sem Web Share de arquivo) → janela de DOWNLOAD.
 *
 * Fechar a folha de compartilhamento sem escolher nada não é erro.
 */
export async function saveFile(blob: Blob, nome: string): Promise<void> {
  if (typeof window === "undefined") {
    throw new Error("Download indisponível neste ambiente.");
  }

  if (!isNativePlatform()) {
    if (!isDesktopViewport() && typeof navigator.canShare === "function") {
      const arquivo = new File([blob], nome, { type: blob.type });
      if (navigator.canShare({ files: [arquivo] })) {
        try {
          await navigator.share({ files: [arquivo], title: nome });
        } catch (erro) {
          if (!foiCancelado(erro)) throw erro;
        }
        return;
      }
    }

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = nome;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    // Revoga depois do clique ser processado (Safari cancela se for imediato).
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    return;
  }

  const [{ Directory, Filesystem }, { Share }] = await Promise.all([
    import("@capacitor/filesystem"),
    import("@capacitor/share"),
  ]);
  const { uri } = await Filesystem.writeFile({
    path: nome,
    data: await blobParaBase64(blob),
    directory: Directory.Cache,
  });
  try {
    await Share.share({ title: nome, files: [uri] });
  } catch (erro) {
    if (!foiCancelado(erro)) throw erro;
  }
}
