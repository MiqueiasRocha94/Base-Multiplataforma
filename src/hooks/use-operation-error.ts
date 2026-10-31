"use client";

import { useCallback, useState } from "react";
import { isServerError, toError } from "@/lib/http";

export function useOperationError() {
  const [error, setError] = useState<Error | null>(null);
  const clearError = useCallback(() => setError(null), []);
  const reportError = useCallback((reason: unknown) => setError(toError(reason)), []);
  if (isServerError(error)) throw error;
  return { operationError: error?.message ?? null, clearError, reportError };
}
