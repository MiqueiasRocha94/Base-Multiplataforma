"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Fingerprint } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useDevice } from "@/contexts/DeviceContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { TARGET_PATH } from "@/config/routes";
import { biometricAutoPromptSkipped, clearBiometricAutoPromptSkip } from "@/lib/auth/protected-access";

/**
 * View do modo `biometric` (apk com sessão protegida salva): a digital substitui
 * SÓ o formulário de login. Depois dela o fluxo é o mesmo do login com senha
 * (o gate leva ao passo pendente, se houver).
 *
 * Ações: entrar com biometria; "Outro usuário" (formulário sem apagar o acesso
 * salvo); "Sair" (encerra a sessão de fato). Na abertura do app pede a digital
 * sozinha; na volta pelo "Sair" do menu (sessão mantida) espera o toque.
 */
export function BiometricPrompt({
  onUseAnotherAccount,
  onSignedOut,
}: {
  onUseAnotherAccount: () => void;
  onSignedOut: () => void;
}) {
  const router = useRouter();
  const { dictionary } = useLanguage();
  const { authenticateBiometric } = useDevice();
  const { signOut } = useAuth();

  const [biometricError, setBiometricError] = useState<string | null>(null);

  const requestBiometric = async () => {
    clearBiometricAutoPromptSkip();
    const authenticated = await authenticateBiometric(dictionary.portal.biometricDescription);
    if (authenticated) {
      router.replace(TARGET_PATH);
      return;
    }
    setBiometricError(dictionary.login.error);
  };

  // Pede a digital assim que a tela abre, salvo na volta pelo "Sair" do menu.
  const prompted = useRef(false);
  useEffect(() => {
    if (!prompted.current) {
      prompted.current = true;
      if (biometricAutoPromptSkipped()) {
        clearBiometricAutoPromptSkip();
      } else {
        // Fora do corpo síncrono do efeito (mesmo padrão do efeito do login).
        void (async () => {
          await Promise.resolve();
          await requestBiometric();
        })();
      }
    }
  });

  return (
    <div className="grid gap-4">
      <div className="space-y-2 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">{dictionary.portal.biometricTitle}</h1>
        <p className="text-sm leading-6 text-text-muted">{dictionary.portal.biometricDescription}</p>
      </div>

      {biometricError ? <p className="text-center text-sm text-error">{biometricError}</p> : null}

      <Button
        className="w-full"
        onClick={() => {
          setBiometricError(null);
          void requestBiometric();
        }}
      >
        <Fingerprint className="size-5" />
        {dictionary.login.useBiometric}
      </Button>

      <Button variant="outline" className="w-full" onClick={onUseAnotherAccount}>
        {dictionary.login.otherUser}
      </Button>

      <Button
        variant="ghost"
        className="w-full text-error"
        onClick={() => {
          signOut();
          onSignedOut();
        }}
      >
        {dictionary.common.signOut}
      </Button>
    </div>
  );
}
