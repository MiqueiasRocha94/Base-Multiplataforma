"use client";

import { useEffect } from "react";
import { LucideTriangleAlert } from "lucide-react";

import { StatusScreen } from "@/components/status-screen";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const { session } = useAuth();
  const { dictionary } = useLanguage();
  const home = session ? "/portal/home" : "/home";

  useEffect(() => {
    console.error("Erro capturado:", error);
  }, [error]);

  return (
    <StatusScreen
      code="500"
      tone="error"
      icon={<LucideTriangleAlert className="size-8" />}
      title={dictionary.error.title}
      description={dictionary.error.description}
      digest={error.digest}
      actions={[
        { label: dictionary.error.back, href: home, variant: "outline" },
        { label: dictionary.error.retry, onClick: () => reset() },
      ]}
    />
  );
}
