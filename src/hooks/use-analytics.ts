"use client";

import { useEffect, useState } from "react";

import { getAnalyticsOverview } from "@/services/analytics";
import type { AnalyticsOverview } from "@/types/analytics";

/** Carrega o overview de Analytics (dev mock ou backend real). */
export function useAnalytics(): AnalyticsOverview | null {
  const [data, setData] = useState<AnalyticsOverview | null>(null);

  useEffect(() => {
    let active = true;
    void getAnalyticsOverview().then((overview) => {
      if (active) {
        setData(overview);
      }
    });
    return () => {
      active = false;
    };
  }, []);

  return data;
}
