"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useDeveloperMode, type DeveloperModeSettings } from "@/contexts/DeveloperModeContext";
import { useDevice } from "@/contexts/DeviceContext";
import { useLanguage } from "@/contexts/LanguageContext";

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
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="mt-1 size-5 shrink-0 accent-[var(--color-primary)]"
      />
    </label>
  );
}

export function DeveloperModeOverlay() {
  const { developerModeEnabled, resetSettings, settings, updateSetting } = useDeveloperMode();
  const { dictionary } = useLanguage();
  const { shellMode } = useDevice();
  const [open, setOpen] = useState(false);

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
      <div className="pointer-events-none fixed inset-x-0 top-0 z-40 flex justify-center">
        <div className="pointer-events-auto pt-3">
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="inline-flex size-11 items-center justify-center rounded-full border border-border bg-surface shadow-[var(--shadow-soft)] transition hover:-translate-y-0.5"
            aria-label={dictionary.developer.open}
          >
            <span aria-hidden="true" className="text-lg leading-none">
              #
            </span>
          </button>
        </div>
      </div>

      {open ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 py-8">
          <Card className="max-h-full w-full max-w-2xl overflow-hidden">
            <CardHeader className="border-b border-border/60">
              <div className="flex items-start justify-between gap-4">
                <div className="grid gap-1">
                  <CardTitle>{dictionary.developer.title}</CardTitle>
                  <CardDescription>{dictionary.developer.description}</CardDescription>
                </div>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="inline-flex size-10 items-center justify-center rounded-full border border-border text-text-muted transition hover:bg-[color:var(--color-surface-strong)]"
                  aria-label={dictionary.developer.close}
                >
                  x
                </button>
              </div>
            </CardHeader>

            <CardContent className="grid gap-4 overflow-y-auto p-6">
              <div className="rounded-[var(--radius-xl)] border border-dashed border-border bg-background px-4 py-3 text-sm text-text-muted">
                {shellMode === "mobile" ? dictionary.developer.mobileShell : dictionary.developer.webShell}
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
                <Button onClick={() => setOpen(false)}>{dictionary.developer.close}</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      ) : null}
    </>
  );
}
