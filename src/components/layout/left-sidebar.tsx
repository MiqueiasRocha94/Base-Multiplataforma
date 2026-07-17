"use client";

import { AccountMenu } from "@/components/account-menu";
import { Sidebar } from "@/components/sidebar";
import { Navigation } from "@/components/navigation";
import { SidebarItem } from "@/components/sidebar-item";
import { useLanguage } from "@/contexts/LanguageContext";
import { useNavigation } from "@/contexts/NavigationContext";
import { useSystemContext } from "@/contexts/SystemContext";
import { LucideTextAlignJustify } from "lucide-react";

export function LeftSidebar({
  className,
}: {
  className?: string;
}) {
  const { dictionary } = useLanguage();
  const { desktopMode } = useNavigation();
  const {
    headerVisible,
    leftSidebarDisplayMode,
    leftSidebarInLayout,
    leftSidebarLayoutMode,
    leftSidebarReserveSpace,
    leftSidebarWidth,
    sidebarCardMargin,
  } = useSystemContext();

  return (
    <Sidebar
      className={className}
      displayMode={leftSidebarDisplayMode}
      layoutMode={leftSidebarLayoutMode}
      margin={sidebarCardMargin}
      reserveSpace={leftSidebarReserveSpace}
      side="left"
      visible={leftSidebarInLayout }
      width={leftSidebarWidth}
    >
        {desktopMode === "sidebar" ?
          <SidebarItem
            id="menu"
            title={dictionary.nav.title}
            markerTitle={dictionary.nav.title}
            icon={<LucideTextAlignJustify />}
            headerExtra={!headerVisible ? <AccountMenu /> : undefined}
            headerCollapsed={!headerVisible ? <AccountMenu compact /> : undefined}
          >
            <Navigation variant="sidebar" />
          </SidebarItem> : null
        }
    </Sidebar>
  );
}
