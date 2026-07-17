import type { Metadata } from "next";

import "@/app/globals.css";
import { TooltipProvider } from "@/components/tooltip";
import AppStructure from "@/components/layout/app-structure";

export const metadata: Metadata = {
  title: "Base Multiplataforma",
  description: "Template unificado com Next.js, Capacitor e dominio reaproveitavel.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR">
      <body>
        <TooltipProvider>
          <AppStructure>{children}</AppStructure>
        </TooltipProvider>
      </body>
    </html>
  );
}
