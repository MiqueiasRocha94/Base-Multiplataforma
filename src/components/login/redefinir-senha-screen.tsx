"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { KeyRound } from "lucide-react";

import { TrocarSenhaForm } from "@/components/login/trocar-senha-form";
import { Card } from "@/components/ui/card";
import { useLanguage } from "@/contexts/LanguageContext";

/**
 * Troca VOLUNTARIA da senha de acesso (`/portal/redefinir-senha`, menu CONTA).
 * Mesma rota da senha expirada (`POST /auth/senha`); dentro do portal, com o
 * chrome do app — "Voltar"/"Alterar senha" sao acoes do shell (footer no mobile,
 * barra de acoes no web). A resposta substitui o token e o usuario fica na tela
 * com o aviso.
 */
export function RedefinirSenhaScreen() {
  const router = useRouter();
  const { dictionary } = useLanguage();
  const [done, setDone] = useState(false);

  const t = dictionary.senha;

  return (
    <div className="flex w-full justify-center px-4 py-8">
      <Card className="grid w-full max-w-md gap-5 p-6">
        <div className="grid gap-1">
          <div className="flex items-center gap-2">
            <KeyRound className="size-5 text-primary" />
            <h1 className="text-2xl font-semibold tracking-tight">{t.changeTitle}</h1>
          </div>
          <p className="text-sm leading-6 text-text-muted">{t.changeSubtitle}</p>
        </div>

        {done ? (
          <p role="status" className="text-sm text-success">
            {t.success}
          </p>
        ) : null}

        {/* Ações no chrome: no mobile ocupam o footer (no lugar da navegação). */}
        <TrocarSenhaForm
          actions="chrome"
          cancelLabel={t.back}
          onCancel={() => router.back()}
          onDone={() => setDone(true)}
        />
      </Card>
    </div>
  );
}
