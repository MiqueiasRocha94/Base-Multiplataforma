"use client";

import { AuthProvider } from "@/contexts/AuthContext";
import { BrandProvider } from "@/contexts/BrandContext";
import { DeviceProvider } from "@/contexts/DeviceContext";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { NavigationProvider } from "@/contexts/NavigationContext";
import { ThemeProvider } from "@/contexts/ThemeProvider";
import { SystemProvider} from "@/contexts/SystemContext";
import { Footer as LayoutFooter } from "@/components/layout/footer";
import { Header } from "@/components/layout/header";
import { LeftSidebar } from "@/components/layout/left-sidebar";
import { MainContent } from "@/components/layout/main-content";
import { RightSidebar } from "@/components/layout/right-sidebar";
import { SystemBackHandler } from "@/components/system-back-handler";
import { ConfirmHost } from "@/components/ui/confirm-dialog";
import { Toaster } from "@/components/ui/toaster";
// @dev-only:start
import { DeveloperModePainel, DeveloperModeProvider, SystemContextPanel, useDeveloperMode } from "@/dev-tools/ui";
import { systemPanelEnabled } from "@/dev-tools/runtime";
import { useDevice } from "@/contexts/DeviceContext";
import { useMounted } from "@/hooks/use-mounted";

// Botoes flutuantes de dev/sistema (mesmos em todos os shells).
function FloatingDevButtons() {
  const { view } = useDevice();
  const { developerModeEnabled } = useDeveloperMode();
  const mounted = useMounted();
  if (!mounted || view !== "mobile" || (!developerModeEnabled && !systemPanelEnabled())) return null;
  return (
    <div data-layout-region="dev-tools" className="pointer-events-none fixed inset-x-0 top-4 z-[1100] flex justify-center">
      <div className="pointer-events-auto flex gap-2">
        <DeveloperModePainel />
        <SystemContextPanel />
      </div>
    </div>
  );
}
// @dev-only:end
// @app-update:start
// Atualização remota: só no app gerado com ela (docs/ambiente-e-build.md → "Atualização remota do app").
import { AppUpdateGate } from "@/app-update/ui";
// @app-update:end

export default function AppStructure({ children }: { children: React.ReactNode }) {
  return (
    // BrandProvider envolve o ThemeProvider: a marca (whitelabel) é a ENTRADA das
    // cores; o ThemeProvider continua a fonte única que aplica/persiste — ele
    // consome `useBrand()`, não o contrário.
    <BrandProvider>
      <ThemeProvider>
        <LanguageProvider>
          <AuthProvider>
            <DeviceProvider>
              {/* @dev-only:start */}
              <DeveloperModeProvider>
              {/* @dev-only:end */}
                {/* System resolve o layout lendo Device + sessão (Auth) + rota;
                    Navigation não decide layout. A ordem aqui é indiferente. */}
                <NavigationProvider>
                  <SystemProvider>
                      <div data-layout-structure className="flex h-dvh flex-col overflow-hidden bg-background">
                          {/* @dev-only:start */}
                          <FloatingDevButtons />
                          {/* @dev-only:end */}
                          {/* @app-update:start */}
                          <AppUpdateGate />
                          {/* @app-update:end */}
                          <Header />
                          <div data-layout-body className="flex min-h-0 flex-1 flex-col">
                              <div data-layout-body-inner className="relative flex min-h-0 flex-1 w-full items-stretch">
                                  <LeftSidebar />
                                  <MainContent>
                                      {/* Coluna flex: repassa a altura do scroll às telas
                                          (zonas de ergonomia — ScreenZones). */}
                                      <div className="flex min-h-0 min-w-0 flex-1 flex-col">{children}</div>
                                  </MainContent>
                                  <RightSidebar />
                              </div>
                          </div>
                          <LayoutFooter />
                          {/* Camadas globais: aviso rápido, confirmação e voltar do sistema. */}
                          <Toaster />
                          <ConfirmHost />
                          <SystemBackHandler />
                      </div>
                  </SystemProvider>
                </NavigationProvider>
              {/* @dev-only:start */}
              </DeveloperModeProvider>
              {/* @dev-only:end */}
            </DeviceProvider>
          </AuthProvider>
        </LanguageProvider>
      </ThemeProvider>
    </BrandProvider>
  );
}
