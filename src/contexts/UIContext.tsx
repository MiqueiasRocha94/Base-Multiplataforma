"use client";

import { createContext, useContext, useMemo, useState } from "react";

type UIContextValue = {
  navigationOpen: boolean;
  setNavigationOpen: (open: boolean) => void;
};

const UIContext = createContext<UIContextValue | null>(null);

export function UIProvider({ children }: { children: React.ReactNode }) {
  const [navigationOpen, setNavigationOpen] = useState(false);

  const value = useMemo<UIContextValue>(
    () => ({
      navigationOpen,
      setNavigationOpen,
    }),
    [navigationOpen],
  );

  return <UIContext.Provider value={value}>{children}</UIContext.Provider>;
}

export function useUI() {
  const context = useContext(UIContext);

  if (!context) {
    throw new Error("useUI must be used within UIProvider.");
  }

  return context;
}
