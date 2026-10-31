"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { Loading } from "@/components/loading";
import { useAuth } from "@/contexts/AuthContext";
import { useDevice } from "@/contexts/DeviceContext";

import { AuthShell } from "@/components/login/auth-shell";
import { BiometricPrompt } from "@/components/login/biometric-prompt";
import { LoginForm } from "@/components/login/login-form";
import { RecoverPasswordForm } from "@/components/login/recover-password-form";
import { TARGET_PATH } from "@/config/routes";

// A tela de auth é uma máquina de modos; cada modo é uma view em `components/login`.
// `recover` (esqueci a senha) vive aqui como modo, não como rota própria: o
// conteúdo não justifica um /recuperar-senha separado e assim herda o layout
// `minimal` e a moldura (AuthShell) do login sem duplicação.
type LoginMode = "loading" | "form" | "biometric" | "recover";

export default function LoginPage() {
  const router = useRouter();
  const { isNative } = useDevice();
  const { isReady, session, hasProtectedSession, resolveAccessMode } = useAuth();

  const [mode, setMode] = useState<LoginMode>("loading");
  // "Outro usuário": formulário com o acesso salvo mantido (atalho de volta à biometria).
  const [savedAccess, setSavedAccess] = useState(false);

  useEffect(() => {
    if (!isReady) {
      return;
    }

    void (async () => {
      await Promise.resolve();

      if (!session) {
        setMode("form");
        return;
      }

      if (!isNative) {
        router.replace(TARGET_PATH);
        return;
      }

      const savedProtectedSession = await hasProtectedSession();
      if (!savedProtectedSession) {
        setMode("form");
        return;
      }

      const accessMode = await resolveAccessMode();
      if (accessMode === "biometric") {
        setMode("biometric");
        return;
      }

      router.replace(TARGET_PATH);
    })();
  }, [hasProtectedSession, isNative, isReady, resolveAccessMode, router, session]);

  let content: React.ReactNode;

  if (mode === "loading") {
    content = <Loading className="min-h-0" />;
  } else if (mode === "biometric") {
    content = (
      <BiometricPrompt
        onUseAnotherAccount={() => {
          setSavedAccess(true);
          setMode("form");
        }}
        onSignedOut={() => {
          setSavedAccess(false);
          setMode("form");
        }}
      />
    );
  } else if (mode === "recover") {
    content = <RecoverPasswordForm onBack={() => setMode("form")} />;
  } else {
    content = (
      <LoginForm
        onForgotPassword={() => setMode("recover")}
        onUseBiometric={savedAccess ? () => setMode("biometric") : undefined}
      />
    );
  }

  return <AuthShell>{content}</AuthShell>;
}
