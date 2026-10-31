"use client";

import { useState } from "react";

import { LocaleSwitcher } from "@/components/locale-switcher";
import { ThemeToggleButton } from "@/components/theme-toggle-button";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { useBiometricSetting } from "@/hooks/use-biometric-setting";
import { type AppDictionary } from "@/lib/i18n/dictionaries";
import { fontPresets } from "@/lib/preferences/options";
import { cn } from "@/lib/utils";
import {
  FONT_SCALE_DEFAULT,
  FONT_SCALE_MAX,
  FONT_SCALE_MIN,
  FONT_SCALE_STEP,
  derivePrimaryStrong,
  resolveBrand,
  useTheme,
  type FontPreset,
} from "@/contexts/ThemeProvider";

type ProfileHeaderProps = {
  email: string | null;
  name: string;
};

type ProfileDetailsCardProps = {
  dictionary: AppDictionary;
  email: string | null;
  expanded: boolean;
  loggedAt: string | null;
  name: string;
  onToggleExpanded: () => void;
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
  onLogout: () => void;
  onResetPassword: () => void;
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

export function ProfileHeader({ email, name }: ProfileHeaderProps) {
  return (
    <section className="grid justify-items-center gap-3 rounded-[var(--radius-2xl)] border border-border bg-surface px-4 py-5 text-center shadow-[var(--shadow-soft)]">
      <div className="inline-flex size-20 items-center justify-center rounded-full border-2 border-white bg-primary text-2xl font-bold text-white shadow-[var(--shadow-soft)]">
        {getInitials(name)}
      </div>
      <div className="grid gap-1">
        <h1 className="typo-title">{name}</h1>
        <p className="typo-body text-text-muted">{email ?? "-"}</p>
      </div>
    </section>
  );
}

const SECTION_TOGGLE_BUTTON =
  "inline-flex items-center gap-2 rounded-full border border-border px-4 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-text-muted transition hover:bg-[color:var(--color-surface-strong)]";

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid gap-1 border-b border-border/60 px-5 py-4 last:border-b-0">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">{label}</p>
      <p className="text-sm text-text">{value}</p>
    </div>
  );
}

/** Linhas nome/e-mail/último acesso (corpo do card ou da linha expandida na gaveta). */
export function ProfileDetailsList({
  dictionary,
  email,
  loggedAt,
  name,
}: Pick<ProfileDetailsCardProps, "dictionary" | "email" | "loggedAt" | "name">) {
  return (
    <>
      <DetailRow label={dictionary.profile.nameLabel} value={name} />
      <DetailRow label={dictionary.profile.emailLabel} value={email ?? "-"} />
      <DetailRow label={dictionary.profile.loggedAtLabel} value={formatLoggedAt(loggedAt)} />
    </>
  );
}

export function ProfileDetailsCard({
  dictionary,
  email,
  expanded,
  loggedAt,
  name,
  onToggleExpanded,
  accessLabel,
}: ProfileDetailsCardProps) {
  return (
    <Card className="overflow-hidden">
      <CardHeader className="gap-4 border-b border-border/60">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="grid gap-2">
            <CardTitle>{dictionary.profile.accountTitle}</CardTitle>
          </div>
          <button
            type="button"
            onClick={onToggleExpanded}
            className={SECTION_TOGGLE_BUTTON}
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

      {expanded ? (
        <CardContent className="p-0">
          <ProfileDetailsList dictionary={dictionary} email={email} loggedAt={loggedAt} name={name} />
        </CardContent>
      ) : null}
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

/** Idioma, tema, fonte, tamanho e esquema de cores (corpo de Configurações). */
export function ProfileConfigFields({
  dictionary,
  fontPreset,
  onSetFontPreset,
}: Pick<ProfileActionsSectionProps, "dictionary" | "fontPreset" | "onSetFontPreset">) {
  // No Perfil o usuario apenas SELECIONA um esquema predefinido. A edicao
  // (criar/editar/excluir) vive no painel do sistema.
  const { schemes, activeScheme, setActiveScheme, resolvedTheme, fontScale, setFontScale } = useTheme();

  return (
    <>
      <BiometricConfigField dictionary={dictionary} />

      <div id="config-language" className="grid gap-3">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-text-muted">{dictionary.account.languageTitle}</p>
        <div className="flex flex-wrap items-center gap-3">
          <LocaleSwitcher />
        </div>
      </div>

      <div id="config-theme" className="grid gap-3">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-text-muted">{dictionary.account.themeTitle}</p>
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
    </>
  );
}

/**
 * "Entrar com biometria" (só no app, com biometria no aparelho): único lugar de
 * ligar/desligar depois do login. Ligar confirma a digital antes de salvar.
 */
function BiometricConfigField({ dictionary }: { dictionary: AppDictionary }) {
  const biometric = useBiometricSetting();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (!biometric.offerable) {
    return null;
  }

  const onCheckedChange = async (checked: boolean) => {
    setError(null);
    if (!checked) {
      biometric.disable();
      return;
    }
    setBusy(true);
    const confirmed = await biometric.enable(dictionary.profile.biometricEnableReason);
    setBusy(false);
    if (!confirmed) {
      setError(dictionary.profile.biometricError);
    }
  };

  return (
    <div id="config-biometric" className="grid gap-3">
      <p className="text-sm font-semibold uppercase tracking-[0.18em] text-text-muted">{dictionary.profile.biometricTitle}</p>
      <div className="flex items-center gap-3">
        <Switch
          checked={biometric.enabled}
          disabled={busy}
          aria-label={dictionary.profile.biometricTitle}
          onCheckedChange={(checked) => void onCheckedChange(checked)}
        />
        <span className="text-sm text-text-muted">{dictionary.profile.biometricDescription}</span>
      </div>
      {error ? <p className="text-sm text-error">{error}</p> : null}
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
  return (
    <Card id="config">
      <CardHeader className="gap-4 border-b border-border/60">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="grid gap-2">
            <CardTitle>{dictionary.profile.configTitle}</CardTitle>
          </div>
          <button
            type="button"
            onClick={onToggleExpanded}
            className={SECTION_TOGGLE_BUTTON}
          >
            <span>{configExpanded ? dictionary.profile.collapseProfile : dictionary.profile.expandProfile}</span>
            <span className={cn("transition", configExpanded && "rotate-180")}>▾</span>
          </button>
        </div>
      </CardHeader>
      {configExpanded ? (
        <CardContent className="grid gap-6">
          <ProfileConfigFields dictionary={dictionary} fontPreset={fontPreset} onSetFontPreset={onSetFontPreset} />
        </CardContent>
      ) : null}
    </Card>
  );
}

export function ProfileAccountActionsSection({
  dictionary,
  onLogout,
  onResetPassword,
  sessionActive,
}: ProfileAccountActionsSectionProps) {
  if (!sessionActive) {
    return null;
  }

  // Sem card: só as ações da conta, empilhadas e full-width.
  return (
    <div className="grid gap-3">
      <Button className="w-full" variant="outline" onClick={onResetPassword}>
        {dictionary.profile.resetPassword}
      </Button>
      <Button className="w-full" variant="danger" onClick={onLogout}>
        {dictionary.account.menuSignOut}
      </Button>
    </div>
  );
}
