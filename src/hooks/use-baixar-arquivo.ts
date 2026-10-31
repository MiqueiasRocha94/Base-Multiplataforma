"use client";

import { useCallback, useState } from "react";

import { useAuth } from "@/contexts/AuthContext";
import { HttpError } from "@/lib/http";
import { mensagemDeErro } from "@/lib/http-errors";
import { saveFile } from "@/lib/platform/save-file";
import type { ArquivoBaixado } from "@/types/api";

/**
 * Baixa um DOCUMENTO gerado no backend (PDF/CSV) e entrega ao aparelho: download
 * no web, folha de compartilhamento no mobile (`saveFile`). Um por vez: `baixando`
 * diz qual (chave livre da tela, ex.: `"csv"`, `"autorizacao-12"`). 401 → login;
 * 4xx → `erro` com a `message` da API; 5xx → mensagem genérica.
 */
export function useBaixarArquivo() {
  const { signOut } = useAuth();
  const [baixando, setBaixando] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  const baixar = useCallback(
    async (chave: string, buscar: () => Promise<ArquivoBaixado>) => {
      setBaixando(chave);
      setErro(null);
      try {
        const arquivo = await buscar();
        await saveFile(arquivo.blob, arquivo.nome);
      } catch (falha) {
        if (falha instanceof HttpError && falha.status === 401) {
          signOut();
          return;
        }
        setErro(mensagemDeErro(falha));
      } finally {
        setBaixando(null);
      }
    },
    [signOut],
  );

  return { baixando, erro, baixar };
}
