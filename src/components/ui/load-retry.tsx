"use client";

import { Button } from "@/components/ui/button";
import { useLanguage } from "@/contexts/LanguageContext";

/**
 * Falha ao carregar um BLOCO de uma tela que já tem o que mostrar (ex.: o
 * histórico dentro de um detalhe): mensagem + "Tentar novamente". Tela sem o que
 * mostrar usa o `LoadErrorScreen` (docs/comunicacao-api.md).
 */
export function LoadRetry({ message, onRetry }: { message: string; onRetry: () => void }) {
  const { dictionary } = useLanguage();
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 py-2 text-sm">
      <span className="text-error">{message}</span>
      <Button variant="outline" size="sm" onClick={onRetry}>
        {dictionary.error.retry}
      </Button>
    </div>
  );
}
