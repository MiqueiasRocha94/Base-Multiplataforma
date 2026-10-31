"use client";

import { Bug, Info } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";

// @app-update:start
import { appUpdateActive, requestAppUpdateCheck, type AppUpdateCheckResult } from "@/app-update/runtime";
// @app-update:end

import { MarkerOverlay } from "@/components/marker-overlay";
import { SidebarPanelFrame } from "@/components/sidebar";
import { Tooltip } from "@/components/tooltip";
import { Button } from "@/components/ui/button";
import { SelectOne } from "@/components/ui/select-one";
import { Switch } from "@/components/ui/switch";
import { BRANDS, BRAND_IDS, type BrandId } from "@/config/brand";
import { useBrand } from "@/contexts/BrandContext";
import { useDeveloperMode, type DeveloperModeSettings } from "./developer-mode-context";
import { useDevice } from "@/contexts/DeviceContext";
import { useSystemContext } from "@/contexts/SystemContext";
import { useDevDictionary } from "./use-dev-dictionary";

/** Ícone de ajuda com a explicação em tooltip (mantém o painel enxuto). */
function InfoHint({ content }: { content: React.ReactNode }) {
  return (
    <Tooltip content={content}>
      <Info className="size-3.5 shrink-0 text-text-muted" aria-hidden="true" />
    </Tooltip>
  );
}

/** Seletor de white-label (DEV): troca a marca; as cores seguem via BrandContext. */
function WhitelabelSwitcher() {
  const { brandId, setBrand } = useBrand();

  return (
    <div className="grid gap-2 rounded-[var(--radius-xl)] border border-border bg-[color:var(--color-surface-strong)] px-4 py-3">
      <span className="flex items-center gap-1.5 text-sm font-semibold text-text">
        White-label
        <InfoHint content="Troca a marca ativa (assets + cores) para pré-visualização. Só em desenvolvimento." />
      </span>
      <SelectOne
        title="White-label"
        ariaLabel="White-label"
        value={brandId}
        options={BRAND_IDS.map((id) => ({ id, label: BRANDS[id].name }))}
        onChange={(id) => setBrand(id as BrandId)}
      />
    </div>
  );
}

type DevPage = { href: string; label: string };

// Navegação rápida do dev (curada — não puxa a árvore RBAC/40 módulos).
const PUBLIC_PAGES: DevPage[] = [
  { href: "/start", label: "Início (Start)" },
  { href: "/login", label: "Login" },
];

const PORTAL_PAGES: DevPage[] = [
  { href: "/portal/home", label: "Home" },
  { href: "/portal/persons", label: "Pessoas" },
  { href: "/portal/analytics", label: "Analytics" },
  { href: "/portal/profile", label: "Perfil" },
  { href: "/portal/audit", label: "Auditoria" },
  { href: "/portal/demo400", label: "Demo 400" },
  { href: "/portal/demo500", label: "Demo 500" },
];

/**
 * Navegador de páginas (DEV): atalhos para as telas disponíveis. As públicas
 * ficam sempre; o grupo Portal aparece só autenticado (via `isAuthenticated` do
 * SystemContext). RBAC do PortalGate continua valendo — isto é só navegação.
 */
function PagesNavigator({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const pathname = usePathname();
  const { isAuthenticated } = useSystemContext();

  const go = (href: string) => {
    router.push(href);
    onClose();
  };

  const renderGroup = (title: string, hint: string, pages: DevPage[]) => {
    const current = pages.find((page) => pathname === page.href || pathname.startsWith(`${page.href}/`));
    return (
      <div className="grid gap-2 rounded-[var(--radius-xl)] border border-border bg-[color:var(--color-surface-strong)] px-4 py-3">
        <span className="flex items-center gap-1.5 text-sm font-semibold text-text">
          {title}
          <InfoHint content={hint} />
        </span>
        <SelectOne
          title={title}
          ariaLabel={title}
          placeholder="Ir para…"
          value={current?.href ?? null}
          options={pages.map((page) => ({ id: page.href, label: page.label }))}
          onChange={go}
        />
      </div>
    );
  };

  return (
    <>
      {renderGroup("Páginas públicas", "Atalhos para as telas públicas (sem login).", PUBLIC_PAGES)}
      {isAuthenticated
        ? renderGroup("Portal", "Telas autenticadas. O acesso ainda respeita as permissões (PortalGate).", PORTAL_PAGES)
        : null}
    </>
  );
}

type SettingKey = keyof DeveloperModeSettings;

type SettingItem = {
  key: SettingKey;
  title: string;
  description: string;
};

// @app-update:start
/**
 * APK debug: pede ao app a verificação do pacote no `npm run dev` agora
 * (docs/ambiente-e-build.md → "Atualização no desenvolvimento"). Só aparece no app
 * gerado com a atualização remota.
 */
function AppUpdateCheckButton() {
  const dictionary = useDevDictionary();
  const [status, setStatus] = useState<AppUpdateCheckResult | "checking" | null>(null);

  if (!appUpdateActive()) {
    return null;
  }

  const messages: Record<AppUpdateCheckResult | "checking", string> = {
    checking: dictionary.developer.appUpdateChecking,
    none: dictionary.developer.appUpdateNone,
    applying: dictionary.developer.appUpdateApplying,
    failed: dictionary.developer.appUpdateFailed,
  };

  return (
    <div className="grid gap-2 rounded-[var(--radius-xl)] border border-border bg-[color:var(--color-surface-strong)] px-4 py-3">
      <Button
        variant="outline"
        disabled={status === "checking"}
        onClick={() => {
          setStatus("checking");
          void requestAppUpdateCheck().then(setStatus);
        }}
      >
        {dictionary.developer.appUpdateCheck}
      </Button>
      {status ? <p className="text-sm text-text-muted">{messages[status]}</p> : null}
    </div>
  );
}
// @app-update:end

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
    <label className="flex items-center justify-between gap-3 rounded-[var(--radius-xl)] border border-border bg-[color:var(--color-surface-strong)] px-4 py-3">
      <span className="flex items-center gap-1.5 text-sm font-medium text-text">
        {label}
        <InfoHint content={description} />
      </span>
      <Switch checked={checked} onCheckedChange={onChange} />
    </label>
  );
}

export function DeveloperModePainel() {
  const { developerModeEnabled } = useDeveloperMode();
  const dictionary = useDevDictionary();
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
  const dictionary = useDevDictionary();
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
    {
      key: "captchaDisabled",
      title: dictionary.developer.captchaDisabled,
      description: dictionary.developer.captchaDisabledDescription,
    },
  ];

  return (
    <>
      <div className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-text-muted">
        {dictionary.developer.title}
        <InfoHint
          content={
            <span>
              {dictionary.developer.description}{" "}
              {view === "mobile" ? dictionary.developer.mobileShell : dictionary.developer.webShell}
            </span>
          }
        />
      </div>

      <WhitelabelSwitcher />

      <PagesNavigator onClose={onClose} />

      {/* @app-update:start */}
      <AppUpdateCheckButton />
      {/* @app-update:end */}

      <div className="grid gap-2">
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
