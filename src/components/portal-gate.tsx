"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";

import { Loading } from "@/components/loading";
import { useAuth } from "@/contexts/AuthContext";
import { SENHA_EXPIRADA_PATH } from "@/lib/auth/acesso";
import { isProfileReleased, markProfileBlocked } from "@/lib/auth/mobile-release";
import { canAccessPath } from "@/lib/auth/route-access";

/**
 * Gate da área protegida: sessão, passo pendente do fluxo de acesso e permissão
 * por rota. A biometria NÃO passa por aqui: ela só substitui o formulário de
 * login ao abrir o app com sessão salva (login → BiometricPrompt).
 */
export function PortalGate({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { isReady, session, user, requiresPasswordChange, signOut } = useAuth();
  const pathname = usePathname();
  // Fluxo de acesso: sessao com senha expirada presa na troca de senha. A
  // propria tela e a excecao, senao haveria loop.
  const accessFlowPath = requiresPasswordChange ? SENHA_EXPIRADA_PATH : null;
  const blockedByAccessFlow = accessFlowPath !== null && pathname !== accessFlowPath;

  // Sem sessão (nunca entrou, saiu ou a renovação foi recusada): volta ao login.
  useEffect(() => {
    if (isReady && !session) {
      router.replace("/login");
    }
  }, [isReady, session, router]);

  // Troca de senha expirada antes de liberar o menu.
  useEffect(() => {
    if (!isReady || !session) {
      return;
    }
    if (blockedByAccessFlow && accessFlowPath) {
      router.replace(accessFlowPath);
    }
  }, [isReady, session, blockedByAccessFlow, accessFlowPath, router]);

  // Perfil ainda não publicado no app: encerra a sessão e o login mostra o aviso
  // (docs/autenticacao-e-permissoes.md → "Perfis no app"). Na web, sempre liberado.
  const profileBlocked = Boolean(session) && !isProfileReleased(user);
  useEffect(() => {
    if (isReady && profileBlocked) {
      markProfileBlocked();
      signOut();
    }
  }, [isReady, profileBlocked, signOut]);

  // Controle de acesso por rota: quem abre (inclusive por URL) uma pagina sem
  // permissao e redirecionado para a home do portal.
  useEffect(() => {
    if (!isReady || !session || profileBlocked) {
      return;
    }
    if (!canAccessPath(pathname, user)) {
      router.replace("/portal/home");
    }
  }, [isReady, session, profileBlocked, user, pathname, router]);

  // Todo estado de espera do gate usa o MESMO Loading do `app/loading.tsx`
  // (uma tela de carregamento só no app, nada de texto solto), em tela cheia:
  // antes da sessão o shell ainda está no layout público (header com "Entrar")
  // e não deve aparecer por trás.
  if (!isReady || !session || profileBlocked) {
    return <Loading fullScreen />;
  }

  // Evita "piscar" o conteudo protegido enquanto o redirecionamento acontece.
  if (!canAccessPath(pathname, user)) {
    return <Loading fullScreen />;
  }

  // Idem enquanto o gate empurra para o passo pendente do fluxo de acesso.
  if (blockedByAccessFlow) {
    return <Loading fullScreen />;
  }

  return (
    // Coluna flex (não grid): repassa a altura às zonas de ergonomia da tela.
    <div className="flex flex-1 flex-col gap-4">
      {children}
    </div>
  );
}
