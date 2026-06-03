"use client";

import { cn } from "@/lib/utils";

export function ContentWrapper({
  children,
  mobile = false,
}: {
  children: React.ReactNode;
  mobile?: boolean;
}) {
  return (
    <main
      className={cn(
        "flex flex-1",
        mobile
          ? "min-h-[calc(100vh-8rem)] w-full px-4 py-4"
          : "mx-auto min-h-[calc(100vh-10rem)] w-full max-w-6xl px-6 py-6",
      )}
    >
      {children}
    </main>
  );
}
