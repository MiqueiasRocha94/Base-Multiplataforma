"use client";

import { useRouter } from "next/navigation";

import { AuthShell } from "@/components/login/auth-shell";
import { TrocarSenhaForm } from "@/components/login/trocar-senha-form";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { caminhoDaTela } from "@/lib/auth/acesso";

/**
 * Troca de senha EXPIRADA (`/portal/alterar-senha-expirada`). O `PortalGate`
 * prende aqui a sessao com `senhaExpirada: true` (vencida ou recebida pelo
 * "esqueci a senha"): a API recusa `/private` ate a troca. Rota `minimal`, na
 * moldura do login.
 */
export function SenhaExpiradaScreen() {
  const router = useRouter();
  const { dictionary } = useLanguage();
  const { session, signOut } = useAuth();

  const t = dictionary.senha;

  return (
    <AuthShell>
      <div className="grid gap-5">
        <div className="space-y-2 text-center">
          <h1 className="text-2xl font-semibold tracking-tight text-text">{t.expiredTitle}</h1>
          <p className="text-sm text-text-muted">{t.expiredSubtitle}</p>
          {session ? (
            <p className="text-sm font-medium text-text">
              {session.username} <span className="text-text-muted">({session.login})</span>
            </p>
          ) : null}
        </div>

        <TrocarSenhaForm
          cancelLabel={dictionary.common.signOut}
          onCancel={() => {
            signOut();
            router.replace("/login");
          }}
          onDone={(tela) => router.replace(caminhoDaTela(tela))}
        />
      </div>
    </AuthShell>
  );
}
