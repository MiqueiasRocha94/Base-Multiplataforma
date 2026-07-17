"use client";

import { LucideShieldX } from "lucide-react";

import { StatusScreen } from "@/components/status-screen";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";

export default function UnauthorizedPage() {
  const { session } = useAuth();
  const { dictionary } = useLanguage();
  const home = session ? "/portal/home" : "/home";

  return (
    <StatusScreen
      code="403"
      tone="error"
      icon={<LucideShieldX className="size-8" />}
      title={dictionary.unauthorized.title}
      description={dictionary.unauthorized.description}
      actions={[{ label: dictionary.unauthorized.button, href: home }]}
    />
  );
}
