"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { useLanguage } from "@/contexts/LanguageContext";

type BackButtonProps = {
  canGoBack?: boolean;
  disabled?: boolean;
  title?: string;
  onBack?: () => void;
  onExit?: () => void;
  showLoadingOnPress?: boolean;
  loadingText?: string;
  loadingAutoHideMs?: number;
};

export function BackButton({
  canGoBack = false,
  disabled = false,
  title,
  onBack,
  onExit,
  showLoadingOnPress = false,
  loadingText,
  loadingAutoHideMs = 900,
}: BackButtonProps) {
  const router = useRouter();
  const { dictionary } = useLanguage();
  const [isLoading, setIsLoading] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, []);

  const isBackAction = canGoBack;
  const resolvedTitle = title ?? (isBackAction ? "Voltar" : dictionary.common.signOut);
  const resolvedLoadingText = loadingText ?? "Saindo...";

  function triggerAction() {
    if (isBackAction) {
      if (onBack) {
        onBack();
        return;
      }
      router.back();
      return;
    }

    if (onExit) {
      onExit();
      return;
    }

    router.push("/");
  }

  function handleClick() {
    if (!showLoadingOnPress || isBackAction) {
      triggerAction();
      return;
    }

    setIsLoading(true);
    timerRef.current = setTimeout(() => {
      setIsLoading(false);
    }, loadingAutoHideMs);
    triggerAction();
  }

  return (
    <div className="relative">
      <Button disabled={disabled} variant="outline" onClick={handleClick} className="gap-2">
        <span aria-hidden="true">{isBackAction ? "←" : "⎋"}</span>
        <span>{resolvedTitle}</span>
      </Button>
      {isLoading ? (
        <div className="absolute left-1/2 top-full z-20 mt-3 -translate-x-1/2 rounded-xl border border-border bg-white px-4 py-3 text-sm font-semibold shadow-lg">
          {resolvedLoadingText}
        </div>
      ) : null}
    </div>
  );
}
