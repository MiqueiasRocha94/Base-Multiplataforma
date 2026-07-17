"use client";

import { SystemContextPanelContent } from "@/components/system/system-context-panel";
import { useLanguage } from "@/contexts/LanguageContext";
import { useSystemContext } from "@/contexts/SystemContext";
import { useMounted } from "@/hooks/use-mounted";
import { getPublicEnv } from "@/lib/env/public";
import { Sidebar } from "@/components/sidebar";
import {SidebarItem} from "@/components/sidebar-item";
import {Bug, PanelsTopLeft} from "lucide-react";
import {DeveloperModePanelContent} from "@/components/developer-mode/developer-mode-painel";

export function RightSidebar({
  className,
}: {
  className?: string;
}) {
  const mounted = useMounted();
  const { dictionary } = useLanguage();
  const { systemPanelEnabled } = getPublicEnv();
  const {
    closePanel,
    rightSidebarDisplayMode,
    rightSidebarInLayout,
    rightSidebarLayoutMode,
    rightSidebarReserveSpace,
    rightSidebarWidth,
    sidebarCardMargin,
  } = useSystemContext();
  const systemEnabled = mounted ? systemPanelEnabled : false;

  return (
    <Sidebar
      className={className}
      displayMode={rightSidebarDisplayMode}
      layoutMode={rightSidebarLayoutMode}
      margin={sidebarCardMargin}
      reserveSpace={rightSidebarReserveSpace}
      side="right"
      visible={rightSidebarInLayout}
      width={rightSidebarWidth}
    >
        {systemEnabled ? (
            <SidebarItem id="system" title={dictionary.system.title} markerTitle={dictionary.system.open} icon={<PanelsTopLeft className="size-5" />}>
                <SystemContextPanelContent disabled={false} onClose={() => closePanel("system")} />
            </SidebarItem>
        ) : null}
        <SidebarItem id="developer" title={dictionary.developer.title} markerTitle={dictionary.developer.open} icon={<Bug />}>
            <DeveloperModePanelContent onClose={() => closePanel("developer")} />
        </SidebarItem>
    </Sidebar>
  );
}
