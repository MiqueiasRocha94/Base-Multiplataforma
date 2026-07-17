"use client";

import "@/app/globals.css";

import { useEffect } from "react";
import { LucideTriangleAlert } from "lucide-react";

import { StatusScreen } from "@/components/status-screen";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { defaultLocale, type AppLocale } from "@/lib/i18n/settings";
import { getStorageItem, storageKeys } from "@/lib/platform/storage";

// `global-error` substitui o root layout: roda SEM os providers da aplicação.
// Por isso resolvemos o idioma direto do storage e usamos o StatusScreen (que
// não depende de contexto).
function resolveLocale(): AppLocale {
  const stored = getStorageItem(storageKeys.locale);

  if (stored === "pt-BR" || stored === "en" || stored === "es-ES") {
    return stored;
  }

  return defaultLocale;
}

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("Erro global:", error);
  }, [error]);

  const locale = resolveLocale();
  const dictionary = getDictionary(locale);

  return (
    <html lang={locale}>
      <body>
        <StatusScreen
          code="500"
          tone="error"
          icon={<LucideTriangleAlert className="size-8" />}
          title={dictionary.error.title}
          description={dictionary.error.description}
          digest={error.digest}
          actions={[
            { label: dictionary.error.back, href: "/home", variant: "outline" },
            { label: dictionary.error.retry, onClick: () => reset() },
          ]}
        />
      </body>
    </html>
  );
}
