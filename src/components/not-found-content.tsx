"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { LucideCompass } from "lucide-react";

import { StatusScreen } from "@/components/status-screen";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";

const REDIRECT_MS = 90_000;

/**
 * Conteúdo da tela 404, reutilizado pela `not-found.tsx` (chamadas de
 * `notFound()`) e pelo catch-all de rotas não casadas — para que ambos rendam
 * dentro do shell, via navegação CLIENT (sem hard navigation / flash).
 */
export function NotFoundContent() {
  const router = useRouter();
  const { session } = useAuth();
  const { dictionary } = useLanguage();
  const home = session ? "/portal/home" : "/home";

  useEffect(() => {
    const timeout = setTimeout(() => router.push(home), REDIRECT_MS);
    return () => clearTimeout(timeout);
  }, [home, router]);

  return (
    <StatusScreen
      code="404"
      icon={<LucideCompass className="size-8" />}
      title={dictionary.notFound.title}
      description={dictionary.notFound.description}
      actions={[{ label: dictionary.notFound.button, href: home }]}
    />
  );
}
