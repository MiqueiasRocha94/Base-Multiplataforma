"use client";

import { useSystemContext } from "@/contexts/SystemContext";
import { Sidebar } from "@/components/sidebar";
// @dev-only:start
import { Bug, PanelsTopLeft } from "lucide-react";

import { SidebarItem } from "@/components/sidebar-item";
import { systemPanelEnabled } from "@/dev-tools/runtime";
import { DeveloperModePanelContent, SystemContextPanelContent, useDevDictionary, useDeveloperMode } from "@/dev-tools/ui";
import { useMounted } from "@/hooks/use-mounted";
// @dev-only:end

export function RightSidebar({
  className,
}: {
  className?: string;
}) {
  // @dev-only:start
  const mounted = useMounted();
  const devDictionary = useDevDictionary();
  const systemEnabled = mounted ? systemPanelEnabled() : false;
  const { developerModeEnabled } = useDeveloperMode();
  // @dev-only:end
  const {
    closePanel,
    rightSidebarDisplayMode,
    layout,
    rightSidebarLayoutMode,
    rightSidebarReserveSpace,
    rightSidebarWidth,
    sidebarCardMargin,
  } = useSystemContext();

  return (
    <Sidebar
      className={className}
      displayMode={rightSidebarDisplayMode}
      layoutMode={rightSidebarLayoutMode}
      margin={sidebarCardMargin}
      reserveSpace={rightSidebarReserveSpace}
      side="right"
      visible={layout.rightSidebar}
      width={rightSidebarWidth}
    >
        {/* @dev-only:start */}
        {systemEnabled ? (
            <SidebarItem id="system" title={devDictionary.system.title} markerTitle={devDictionary.system.open} icon={<PanelsTopLeft className="size-5" />}>
                <SystemContextPanelContent disabled={false} onClose={() => closePanel("system")} />
            </SidebarItem>
        ) : null}
        {developerModeEnabled ? (
            <SidebarItem id="developer" title={devDictionary.developer.title} markerTitle={devDictionary.developer.open} icon={<Bug />}>
                <DeveloperModePanelContent onClose={() => closePanel("developer")} />
            </SidebarItem>
        ) : null}
        {/* @dev-only:end */}
    </Sidebar>
  );
}
