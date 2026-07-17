"use client";

import { Bug } from "lucide-react";

import { MarkerOverlay } from "@/components/marker-overlay";
import { SidebarPanelFrame } from "@/components/sidebar";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useDeveloperMode, type DeveloperModeSettings } from "@/contexts/DeveloperModeContext";
import { useDevice } from "@/contexts/DeviceContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useSystemContext } from "@/contexts/SystemContext";

type SettingKey = keyof DeveloperModeSettings;

type SettingItem = {
  key: SettingKey;
  title: string;
  description: string;
};

function SettingSwitch({
  checked,
  description,
  label,
  onChange,
}: {
  checked: boolean;
  description: string;
  label: string;
  onChange: (value: boolean) => void;
}) {
  return (
    <label className="flex items-start justify-between gap-4 rounded-[var(--radius-xl)] border border-border bg-[color:var(--color-surface-strong)] px-4 py-4">
      <span className="grid gap-1">
        <span className="text-sm font-semibold text-text">{label}</span>
        <span className="text-sm leading-6 text-text-muted">{description}</span>
      </span>
      <Switch checked={checked} onCheckedChange={onChange} className="mt-1" />
    </label>
  );
}

export function DeveloperModePainel() {
  const { developerModeEnabled } = useDeveloperMode();
  const { dictionary } = useLanguage();
  const { view } = useDevice();
  const { closePanel, developerPanel, openPanel } = useSystemContext();

  if (!developerModeEnabled) {
    return null;
  }

  if (view !== "mobile") {
    return null;
  }

  return (
    <MarkerOverlay
      open={developerPanel.isOpen}
      onOpen={() => openPanel("developer")}
      onClose={() => closePanel("developer")}
      contentWrapperClassName="max-w-2xl"
      markerClassName="size-12 !min-h-0 !rounded-full !p-0"
      markerProps={{
        icon: <Bug className="size-5" />,
        itemId: developerPanel.activeItemId ?? undefined,
        label: developerPanel.label,
        mode: "custom",
        position: "none",
        title: dictionary.developer.open,
        view: developerPanel.view,
      }}
    >
      <SidebarPanelFrame id="developer" title={dictionary.developer.title} onClose={() => closePanel("developer")}>
        <DeveloperModePanelContent onClose={() => closePanel("developer")} />
      </SidebarPanelFrame>
    </MarkerOverlay>
  );
}

export function DeveloperModePanelContent({
  onClose,
}: {
  onClose: () => void;
}) {
  const { developerModeEnabled, resetSettings, settings, updateSetting } = useDeveloperMode();
  const { dictionary } = useLanguage();
  const { view } = useDevice();

  if (!developerModeEnabled) {
    return null;
  }

  const settingItems: SettingItem[] = [
    {
      key: "quickAccessEnabled",
      title: dictionary.developer.quickAccess,
      description: dictionary.developer.quickAccessDescription,
    },
    {
      key: "formBlocksEnabled",
      title: dictionary.developer.formBlocks,
      description: dictionary.developer.formBlocksDescription,
    },
    {
      key: "zodEnabled",
      title: dictionary.developer.zodValidation,
      description: dictionary.developer.zodValidationDescription,
    },
    {
      key: "mockedDataEnabled",
      title: dictionary.developer.mockedData,
      description: dictionary.developer.mockedDataDescription,
    },
    {
      key: "ignoreTlsEnabled",
      title: dictionary.developer.ignoreTls,
      description: dictionary.developer.ignoreTlsDescription,
    },
  ];

  return (
    <>
      <div className="grid gap-1 rounded-[var(--radius-xl)] border border-dashed border-border bg-background px-4 py-3 text-sm text-text-muted">
        <p>{dictionary.developer.description}</p>
        <p>
          {view === "mobile" ? dictionary.developer.mobileShell : dictionary.developer.webShell}
        </p>
      </div>

      <div className="grid gap-3">
        {settingItems.map((settingItem) => (
          <SettingSwitch
            key={settingItem.key}
            checked={settings[settingItem.key]}
            label={settingItem.title}
            description={settingItem.description}
            onChange={(value) => updateSetting(settingItem.key, value)}
          />
        ))}
      </div>

      <div className="flex flex-wrap justify-end gap-3">
        <Button variant="outline" onClick={resetSettings}>
          {dictionary.developer.reset}
        </Button>
        <Button onClick={onClose}>{dictionary.developer.close}</Button>
      </div>
    </>
  );
}
