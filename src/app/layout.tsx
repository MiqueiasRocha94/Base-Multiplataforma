import type { Metadata } from "next";

import "@/app/globals.css";
import AppLayout from "@/components/AppLayout";

export const metadata: Metadata = {
  title: "Base Multiplataforma",
  description: "Template unificado com Next.js, Capacitor e dominio reaproveitavel.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR">
      <body>
        <AppLayout>{children}</AppLayout>
      </body>
    </html>
  );
}
