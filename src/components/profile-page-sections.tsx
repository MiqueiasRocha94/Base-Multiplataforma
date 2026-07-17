"use client";

import { LocaleSwitcher } from "@/components/locale-switcher";
import { ThemeToggleButton } from "@/components/theme-toggle-button";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { type AppDictionary } from "@/lib/i18n/dictionaries";
import { languageLabels, type AppLocale } from "@/lib/i18n/settings";
import { fontPresets, themeOptions } from "@/lib/preferences/options";
import { cn } from "@/lib/utils";
import {
  FONT_SCALE_DEFAULT,
  FONT_SCALE_MAX,
  FONT_SCALE_MIN,
  FONT_SCALE_STEP,
  derivePrimaryStrong,
  resolveBrand,
  useTheme,
  type AppTheme,
  type FontPreset,
} from "@/contexts/ThemeProvider";

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
  onSetFontPreset: (preset: FontPreset) => void;
  onToggleExpanded: () => void;
};

type ProfileAccountActionsSectionProps = {
  dictionary: AppDictionary;
  mobileShell: boolean;
  onLogout: () => void;
  sessionActive: boolean;
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
  onSetFontPreset,
  onToggleExpanded,
}: ProfileActionsSectionProps) {
  // No Perfil o usuario apenas SELECIONA um esquema predefinido. A edicao
  // (criar/editar/excluir) vive no painel do sistema.
  const { schemes, activeScheme, setActiveScheme, resolvedTheme, fontScale, setFontScale } = useTheme();

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

          <OptionGroup
            activeValue={fontPreset}
            label={dictionary.profile.fontTitle}
            onChange={onSetFontPreset}
            options={fontPresets.map((option) => ({
              value: option.value,
              label: dictionary.profile[option.labelKey],
            }))}
          />

          <div className="grid gap-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-text-muted">{dictionary.profile.fontSizeTitle}</p>
              <span className="text-sm font-semibold tabular-nums text-text">{Math.round(fontScale * 100)}%</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm text-text-muted" aria-hidden="true">A</span>
              <input
                type="range"
                min={FONT_SCALE_MIN}
                max={FONT_SCALE_MAX}
                step={FONT_SCALE_STEP}
                value={fontScale}
                onChange={(event) => setFontScale(Number.parseFloat(event.target.value))}
                aria-label={dictionary.profile.fontSizeTitle}
                className="h-2 flex-1 cursor-pointer appearance-none rounded-full bg-[color:var(--color-surface-strong)] accent-primary"
              />
              <span className="text-2xl leading-none text-text-muted" aria-hidden="true">A</span>
            </div>
            <div className="flex justify-end">
              <Button variant="outline" onClick={() => setFontScale(FONT_SCALE_DEFAULT)}>
                {dictionary.profile.fontSizeReset}
              </Button>
            </div>
          </div>

          <div className="grid gap-3">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-text-muted">{dictionary.profile.colorSchemeTitle}</p>
            <div className="flex flex-wrap items-center gap-3">
              {schemes.map((scheme) => {
                const brand = resolveBrand(scheme, resolvedTheme);
                const active = activeScheme.id === scheme.id;
                const quadrants = [brand.primary, derivePrimaryStrong(brand.primary), brand.secondary, brand.tertiary];

                return (
                  <button
                    key={scheme.id}
                    type="button"
                    onClick={() => setActiveScheme(scheme.id)}
                    title={scheme.name}
                    aria-label={scheme.name}
                    aria-pressed={active}
                    className={cn(
                      "size-16 overflow-hidden rounded-xl border-2 transition",
                      active ? "border-primary ring-2 ring-primary/40" : "border-border hover:border-primary/60",
                    )}
                  >
                    <span className="grid h-full w-full grid-cols-2 grid-rows-2">
                      {quadrants.map((color, index) => (
                        <span key={index} style={{ backgroundColor: color }} />
                      ))}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </CardContent>
      ) : null}
    </Card>
  );
}

export function ProfileAccountActionsSection({
  dictionary,
  mobileShell,
  onLogout,
  sessionActive,
}: ProfileAccountActionsSectionProps) {
  if (!sessionActive) {
    return null;
  }

  return (
    <Card>
      <CardHeader className="gap-2 border-b border-border/60">
        <CardTitle className="text-xl">{dictionary.profile.mobileActionsTitle}</CardTitle>
        <p className="text-sm leading-6 text-text-muted">
          {mobileShell ? dictionary.profile.subtitle : dictionary.profile.accountSubtitle}
        </p>
      </CardHeader>
      <CardContent className="pt-6">
        <Button className={mobileShell === true ? "w-full" : undefined} variant="danger" onClick={onLogout}>
          {dictionary.profile.menuSignOut}
        </Button>
      </CardContent>
    </Card>
  );
}
