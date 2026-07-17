"use client";

import { AuthProvider } from "@/contexts/AuthContext";
import { DeveloperModeProvider } from "@/contexts/DeveloperModeContext";
import { DeviceProvider } from "@/contexts/DeviceContext";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { NavigationProvider } from "@/contexts/NavigationContext";
import { ThemeProvider } from "@/contexts/ThemeProvider";
import { SystemProvider } from "@/contexts/SystemContext";
import { Footer as LayoutFooter } from "@/components/layout/footer";
import { Header } from "@/components/layout/header";
import { LeftSidebar } from "@/components/layout/left-sidebar";
import { MainContent } from "@/components/layout/main-content";
import { MobileAppShell } from "@/components/layout/mobile-app-shell";
import { RightSidebar } from "@/components/layout/right-sidebar";
import { DeveloperModePainel } from "@/components/developer-mode/developer-mode-painel";
import { SystemContextPanel } from "@/components/system/system-context-panel";
import { useDevice } from "@/contexts/DeviceContext";

function AppStructureContent({ children }: { children: React.ReactNode }) {
  const { view } = useDevice();

  if (view === "mobile") {
    return (
      <>
        <MobileAppShell>{children}</MobileAppShell>
        <div className="pointer-events-none fixed inset-x-0 top-4 z-[1100] flex justify-center">
          <div className="pointer-events-auto flex gap-2">
            <DeveloperModePainel />
            <SystemContextPanel />
          </div>
        </div>
      </>
    );
  }

  return (
    <div data-layout-structure className="flex h-screen flex-col overflow-hidden bg-background">
      <Header />
      <div data-layout-body className="flex min-h-0 flex-1 flex-col">
        <div data-layout-body-inner className="relative flex min-h-0 flex-1 w-full items-stretch">
          <LeftSidebar/>
          <MainContent>
            <div className="min-h-0 min-w-0 flex-1">{children}</div>
          </MainContent>
          <RightSidebar/>
        </div>
      </div>
      <LayoutFooter />
      <div className="pointer-events-none fixed inset-x-0 top-4 z-[1100] flex justify-center">
        <div className="pointer-events-auto flex gap-2">
          <DeveloperModePainel />
          <SystemContextPanel />
        </div>
      </div>
    </div>
  );
}

export default function AppStructure({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <LanguageProvider>
        <AuthProvider>
          <DeviceProvider>
            <DeveloperModeProvider>
              <SystemProvider>
                <NavigationProvider>
                  <AppStructureContent>{children}</AppStructureContent>
                </NavigationProvider>
              </SystemProvider>
            </DeveloperModeProvider>
          </DeviceProvider>
        </AuthProvider>
      </LanguageProvider>
    </ThemeProvider>
  );
}
