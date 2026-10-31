"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import { ProfilePanel } from "@/components/profile-panel";
import { useDevice } from "@/contexts/DeviceContext";
import { requestOpenAccountMenu } from "@/lib/account-menu-signal";

export default function ProfilePage() {
  const router = useRouter();
  const { view, resolved } = useDevice();

  // Profile é uma tela MOBILE-only: no desktop/tablet a conta vive no AccountMenu
  // (dropdown do header). Ao cair aqui numa tela maior — incluindo crescer o
  // viewport estando na tela — volta para a Home e abre o menu da conta.
  // Espera `resolved` para não redirecionar sobre a view determinística do SSR.
  // No mobile o mesmo conteúdo também aparece no topo da gaveta do Menu.
  useEffect(() => {
    if (resolved && view !== "mobile") {
      router.replace("/portal/home");
      requestOpenAccountMenu();
    }
  }, [resolved, view, router]);

  if (view !== "mobile") {
    return null;
  }

  return <ProfilePanel className="px-0 py-3" />;
}
