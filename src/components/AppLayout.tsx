"use client";

import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { ContentWrapper } from "@/components/ContentWrapper";
import { TopBar } from "@/components/TopBar";
import { BottomBar } from "@/components/BottomBar";
import { WebSidebar } from "@/components/WebSidebar";
import { DeveloperModeOverlay } from "@/components/developer-mode/DeveloperModeOverlay";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { DeveloperModeProvider } from "@/contexts/DeveloperModeContext";
import { DeviceProvider, useDevice } from "@/contexts/DeviceContext";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { ThemeProvider } from "@/contexts/ThemeProvider";
import { UIProvider } from "@/contexts/UIContext";
import { getAppNavigationItems, shouldUseSidebar } from "@/lib/navigation";

function DesktopShell({ children }: { children: React.ReactNode }) {
  const { session } = useAuth();
  const navigationItems = getAppNavigationItems(Boolean(session));
  const shouldRenderSidebar = shouldUseSidebar(navigationItems);

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <ContentWrapper>
        {shouldRenderSidebar ? (
          <div className="flex w-full items-start gap-6">
            <WebSidebar items={navigationItems} />
            <div className="min-w-0 flex-1">{children}</div>
          </div>
        ) : (
          children
        )}
      </ContentWrapper>
      <Footer />
    </div>
  );
}

function MobileShell({ children }: { children: React.ReactNode }) {
  const { session } = useAuth();
  const showMobileChrome = Boolean(session);

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {showMobileChrome ? <TopBar /> : null}
      <ContentWrapper mobile>{children}</ContentWrapper>
      {showMobileChrome ? <BottomBar /> : null}
    </div>
  );
}

function AppShell({ children }: { children: React.ReactNode }) {
  const { shellMode } = useDevice();

  return shellMode === "mobile" ? <MobileShell>{children}</MobileShell> : <DesktopShell>{children}</DesktopShell>;
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <LanguageProvider>
        <AuthProvider>
          <DeviceProvider>
            <DeveloperModeProvider>
              <UIProvider>
                <AppShell>{children}</AppShell>
                <DeveloperModeOverlay />
              </UIProvider>
            </DeveloperModeProvider>
          </DeviceProvider>
        </AuthProvider>
      </LanguageProvider>
    </ThemeProvider>
  );
}
