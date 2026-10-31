"use client";

import { useEffect, useState } from "react";
import { loadDocument } from "@/lib/docs/load-document";
import { toError } from "@/lib/http";

type DocumentResult = { uri: string; attempt: number; text: string | null; error: string | null };

export function useDocumentContent(uri: string | null) {
  const [attempt, setAttempt] = useState(0);
  const [result, setResult] = useState<DocumentResult | null>(null);
  useEffect(() => {
    if (!uri) return;
    const controller = new AbortController();
    void loadDocument(uri, controller.signal).then((text) => {
      if (!controller.signal.aborted) setResult({ uri, attempt, text, error: null });
    }).catch((error) => {
      if (!controller.signal.aborted) setResult({ uri, attempt, text: null, error: toError(error).message });
    });
    return () => controller.abort();
  }, [uri, attempt]);
  const current = result?.uri === uri && result.attempt === attempt ? result : null;
  return {
    text: current?.text ?? null,
    error: current?.error ?? null,
    retry: () => setAttempt((value) => value + 1),
  };
}
