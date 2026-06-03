"use client";

import { LocaleSwitcher } from "@/components/LocaleSwitcher";
import { ThemeToggleButton } from "@/components/ThemeToggleButton";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { type AppDictionary } from "@/lib/i18n/dictionaries";
import { languageLabels, type AppLocale } from "@/lib/i18n/settings";
import { fontPresets, themeOptions } from "@/lib/preferences/options";
import { cn } from "@/lib/utils";
import type { AppTheme, FontPreset } from "@/contexts/ThemeProvider";

type ProfileHeaderProps = {
  email: string | null;
  name: string;
  subtitle: string;
};

type ProfileDetailsCardProps = {
  dictionary: AppDictionary;
  email: string | null;
  expanded: boolean;
  fontPreset: FontPreset;
  locale: AppLocale;
  loggedAt: string | null;
  name: string;
  onToggleExpanded: () => void;
  theme: AppTheme;
  accessLabel: string;
};

type ProfileActionsSectionProps = {
  configExpanded: boolean;
  dictionary: AppDictionary;
  fontPreset: FontPreset;
  mobileShell: boolean;
  onLogout: () => void;
  onSetFontPreset: (preset: FontPreset) => void;
  onSetTheme: (theme: AppTheme) => void;
  onToggleExpanded: () => void;
  sessionActive: boolean;
  theme: AppTheme;
};

function getInitials(value: string) {
  return value
    .split(/[\s@._-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

function formatLoggedAt(value: string | null) {
  if (!value) {
    return "-";
  }

  const parsedDate = new Date(value);

  if (Number.isNaN(parsedDate.getTime())) {
    return value;
  }

  return parsedDate.toLocaleString("pt-BR");
}

function languageLabel(locale: AppLocale) {
  return languageLabels[locale];
}

export function ProfileHeader({ email, name, subtitle }: ProfileHeaderProps) {
  return (
    <section className="grid justify-items-center gap-4 rounded-[var(--radius-2xl)] border border-border bg-surface px-6 py-8 text-center shadow-[var(--shadow-soft)]">
      <div className="inline-flex size-28 items-center justify-center rounded-full border-4 border-white bg-primary text-3xl font-bold text-white shadow-[var(--shadow-soft)]">
        {getInitials(name)}
      </div>
      <div className="grid gap-2">
        <h1 className="text-3xl font-semibold tracking-tight">{name}</h1>
        <p className="text-sm text-text-muted">{email ?? "-"}</p>
        <p className="max-w-2xl text-sm leading-6 text-text-muted">{subtitle}</p>
      </div>
    </section>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid gap-1 border-b border-border/60 px-5 py-4 last:border-b-0">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">{label}</p>
      <p className="text-sm text-text">{value}</p>
    </div>
  );
}

export function ProfileDetailsCard({
  dictionary,
  email,
  expanded,
  fontPreset,
  locale,
  loggedAt,
  name,
  onToggleExpanded,
  theme,
  accessLabel,
}: ProfileDetailsCardProps) {
  return (
    <Card className="overflow-hidden">
      <CardHeader className="gap-4 border-b border-border/60">
        <div className="flex items-start justify-between gap-4">
          <div className="grid gap-2">
            <CardTitle className="text-xl">{dictionary.profile.accountTitle}</CardTitle>
            <p className="text-sm leading-6 text-text-muted">{dictionary.profile.accountSubtitle}</p>
          </div>
          <button
            type="button"
            onClick={onToggleExpanded}
            className="inline-flex items-center gap-2 rounded-full border border-border px-4 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-text-muted transition hover:bg-[color:var(--color-surface-strong)]"
          >
            <span>{expanded ? dictionary.profile.collapseProfile : dictionary.profile.expandProfile}</span>
            <span className={cn("transition", expanded && "rotate-180")}>▾</span>
          </button>
        </div>
        <div className="inline-flex w-fit items-center gap-2 rounded-full border border-border bg-[color:var(--color-surface-strong)] px-3 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-text-muted">
          <span className="size-2 rounded-full bg-primary" />
          <span>{accessLabel}</span>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        <DetailRow label={dictionary.profile.nameLabel} value={name} />
        <DetailRow label={dictionary.profile.emailLabel} value={email ?? "-"} />
        <DetailRow label={dictionary.profile.loggedAtLabel} value={formatLoggedAt(loggedAt)} />

        {expanded ? (
          <div className="grid gap-0 border-t border-border/60 bg-[color:var(--color-surface-strong)]/35">
            <DetailRow label={dictionary.profile.languageTitle} value={languageLabel(locale)} />
            <DetailRow label={dictionary.profile.themeTitle} value={dictionary.profile[themeOptions.find((option) => option.value === theme)?.labelKey ?? "themeSystem"]} />
            <DetailRow label={dictionary.profile.fontTitle} value={dictionary.profile[fontPresets.find((option) => option.value === fontPreset)?.labelKey ?? "fontSystem"]} />
            <DetailRow label={dictionary.profile.portalAccessLabel} value={accessLabel} />
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

function OptionGroup<T extends string>({
  activeValue,
  label,
  options,
  onChange,
}: {
  activeValue: T;
  label: string;
  onChange: (value: T) => void;
  options: Array<{ label: string; value: T }>;
}) {
  return (
    <div className="grid gap-3">
      <p className="text-sm font-semibold uppercase tracking-[0.18em] text-text-muted">{label}</p>
      <div className="flex flex-wrap gap-3">
        {options.map((option) => (
          <Button
            key={option.value}
            variant={activeValue === option.value ? "default" : "outline"}
            onClick={() => onChange(option.value)}
          >
            {option.label}
          </Button>
        ))}
      </div>
    </div>
  );
}

export function ProfileActionsSection({
  configExpanded,
  dictionary,
  fontPreset,
  mobileShell,
  onLogout,
  onSetFontPreset,
  onSetTheme,
  onToggleExpanded,
  sessionActive,
  theme,
}: ProfileActionsSectionProps) {
  return (
    <Card id="config">
      <CardHeader className="gap-4 border-b border-border/60">
        <div className="flex items-start justify-between gap-4">
          <div className="grid gap-2">
            <CardTitle className="text-xl">{dictionary.profile.configTitle}</CardTitle>
            <p className="text-sm leading-6 text-text-muted">{dictionary.profile.configSubtitle}</p>
          </div>
          <button
            type="button"
            onClick={onToggleExpanded}
            className="inline-flex items-center gap-2 rounded-full border border-border px-4 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-text-muted transition hover:bg-[color:var(--color-surface-strong)]"
          >
            <span>{configExpanded ? dictionary.profile.collapseProfile : dictionary.profile.expandProfile}</span>
            <span className={cn("transition", configExpanded && "rotate-180")}>▾</span>
          </button>
        </div>
      </CardHeader>
      {configExpanded ? (
        <CardContent className="grid gap-6">
          <div id="config-language" className="grid gap-3">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-text-muted">{dictionary.profile.languageTitle}</p>
            <div className="flex flex-wrap items-center gap-3">
              <LocaleSwitcher />
            </div>
          </div>

          <div id="config-theme" className="grid gap-3">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-text-muted">{dictionary.profile.themeTitle}</p>
            <div className="flex flex-wrap items-center gap-3">
              <ThemeToggleButton />
            </div>
          </div>

          {sessionActive && mobileShell ? (
            <div className="rounded-[var(--radius-xl)] border border-border bg-[color:var(--color-surface-strong)] p-4">
              <p className="mb-3 text-sm font-semibold uppercase tracking-[0.18em] text-text-muted">
                {dictionary.profile.mobileActionsTitle}
              </p>
              <Button fixed={false} variant="danger" onClick={onLogout}>
                {dictionary.profile.menuSignOut}
              </Button>
            </div>
          ) : null}

          <OptionGroup
            activeValue={theme}
            label={dictionary.profile.themeTitle}
            onChange={onSetTheme}
            options={themeOptions.map((option) => ({
              value: option.value,
              label: dictionary.profile[option.labelKey],
            }))}
          />

          <OptionGroup
            activeValue={fontPreset}
            label={dictionary.profile.fontTitle}
            onChange={onSetFontPreset}
            options={fontPresets.map((option) => ({
              value: option.value,
              label: dictionary.profile[option.labelKey],
            }))}
          />

          {sessionActive && !mobileShell ? (
            <div className="border-t border-border/60 pt-4">
              <Button variant="danger" onClick={onLogout}>
                {dictionary.profile.menuSignOut}
              </Button>
            </div>
          ) : null}
        </CardContent>
      ) : null}
    </Card>
  );
}
