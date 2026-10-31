"use client";

import { useId, useState } from "react";
import { ChevronDown, PanelsTopLeft } from "lucide-react";
import { MarkerOverlay } from "@/components/marker-overlay";
import { SidebarPanelFrame } from "@/components/sidebar";
import { Button } from "@/components/ui/button";
import { InputColor } from "@/components/ui/input-color";
import { InputNumber } from "@/components/ui/input-number";
import { Label } from "@/components/ui/label";
import { SegmentSelector } from "@/components/ui/segment-selector";
import { Switch } from "@/components/ui/switch";
import { useDevice } from "@/contexts/DeviceContext";
import { useSystemContext } from "@/contexts/SystemContext";
import { type AreaColors, type ChartColorKey, type ChartColors, derivePrimaryStrong, resolveBrand, useTheme } from "@/contexts/ThemeProvider";
import { CHART_COLOR_KEYS } from "@/lib/theme/color-scheme";
import { SYSTEM_CONFIG_FILENAME, buildSystemConfigFile } from "@/lib/config/system-config";
import type { SidebarSide, SystemLayoutConfig } from "@/contexts/system/types";
import { useAccountPlacement } from "@/hooks/use-account-placement";
import { useMounted } from "@/hooks/use-mounted";
import { cn } from "@/lib/utils";
import { systemPanelEnabled } from "../runtime/system-panel";
import { useDevDictionary } from "./use-dev-dictionary";

type ToggleKey = keyof Pick<
  SystemLayoutConfig,
  | "footerVisible"
  | "headerVisible"
  | "leftSidebarVisible"
  | "rightSidebarVisible"
  | "footerReserveSpace"
  | "headerReserveSpace"
  | "leftSidebarReserveSpace"
  | "rightSidebarReserveSpace"
>;
type NumberKey = keyof Pick<
  SystemLayoutConfig,
  | "footerHeight"
  | "headerHeight"
  | "leftSidebarWidth"
  | "mainContentCardMargin"
  | "rightSidebarWidth"
  | "zIndexFooter"
  | "zIndexHeader"
>;

const sectionTitles = {
  colors: "Cores",
  footer: "Footer",
  header: "Header",
  leftSidebar: "LeftSidebar",
  mainContent: "MainContent",
  rightSidebar: "RightSidebar",
};

function createConfigPatch<Key extends keyof SystemLayoutConfig>(
  field: Key,
  value: SystemLayoutConfig[Key],
): Partial<SystemLayoutConfig> {
  return { [field]: value } as Pick<SystemLayoutConfig, Key>;
}

// --- Exportacao da config estatica -------------------------------------------
// A ideia e gravar direto em src/config/system-config.json. No navegador isso so
// e possivel via File System Access API (Chromium): na 1a vez o dev aponta o
// arquivo; depois grava direto, sem dialogo, durante a sessao. Se a API nao
// existir (ou o dev cancelar o handle), cai para um download comum.

type SaveFilePicker = (options?: {
  suggestedName?: string;
  types?: Array<{ description?: string; accept: Record<string, string[]> }>;
}) => Promise<FileSystemFileHandle>;

// Mantido fora do componente para sobreviver a fechar/reabrir o painel na sessao.
let cachedConfigFileHandle: FileSystemFileHandle | null = null;

function serializeConfig(data: unknown): string {
  return `${JSON.stringify(data, null, 2)}\n`;
}

// Baixa um objeto como arquivo JSON (fallback quando nao ha acesso a disco).
function downloadJson(filename: string, data: unknown) {
  const blob = new Blob([serializeConfig(data)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

type SaveConfigResult = "saved" | "downloaded";

async function saveConfigToDisk(filename: string, data: unknown): Promise<SaveConfigResult> {
  const picker = (window as unknown as { showSaveFilePicker?: SaveFilePicker }).showSaveFilePicker;

  if (typeof picker === "function") {
    try {
      if (!cachedConfigFileHandle) {
        cachedConfigFileHandle = await picker({
          suggestedName: filename,
          types: [{ description: "JSON", accept: { "application/json": [".json"] } }],
        });
      }
      const writable = await cachedConfigFileHandle.createWritable();
      await writable.write(serializeConfig(data));
      await writable.close();
      return "saved";
    } catch (error) {
      // Cancelou o seletor: aborta sem baixar nada.
      if (error instanceof DOMException && error.name === "AbortError") {
        throw error;
      }
      // Qualquer outra falha: descarta o handle e cai para o download.
      cachedConfigFileHandle = null;
    }
  }

  downloadJson(filename, data);
  return "downloaded";
}

function getSidebarSide(field: ToggleKey): SidebarSide | null {
  if (field === "leftSidebarVisible") {
    return "left";
  }

  if (field === "rightSidebarVisible") {
    return "right";
  }

  return null;
}

/** Grupo do painel, recolhível pelo cabeçalho (começa aberto). */
function PanelSection({
  children,
  title,
}: {
  children: React.ReactNode;
  title: string;
}) {
  const [open, setOpen] = useState(true);
  const contentId = useId();

  return (
    <section className="rounded-[var(--radius-xl)] border border-border bg-[color:var(--color-surface-strong)]">
      <h3>
        <button
          type="button"
          aria-expanded={open}
          aria-controls={contentId}
          onClick={() => setOpen((current) => !current)}
          className="flex w-full items-center justify-between gap-3 px-4 py-4 text-left text-sm font-semibold uppercase tracking-[0.18em] text-text"
        >
          {title}
          <ChevronDown
            aria-hidden="true"
            className={cn("size-4 shrink-0 text-text-muted transition-transform", open && "rotate-180")}
          />
        </button>
      </h3>
      {open ? (
        <div id={contentId} className="grid gap-3 px-4 pb-4">
          {children}
        </div>
      ) : null}
    </section>
  );
}

function SwitchRow({
  checked,
  disabled,
  label,
  onChange,
}: {
  checked: boolean;
  disabled: boolean;
  label: string;
  onChange: (value: boolean) => void;
}) {
  return (
    <label className="flex items-center justify-between gap-3 border-b border-border/50 py-3 last:border-b-0">
      <span className="text-sm font-semibold text-text">{label}</span>
      <Switch checked={checked} disabled={disabled} onCheckedChange={onChange} />
    </label>
  );
}

function NumberRow({
  disabled,
  label,
  value,
  onChange,
}: {
  disabled: boolean;
  label: string;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <Label className="grid grid-cols-[minmax(0,1fr)_7rem] items-center gap-3 border-b border-border/50 py-3 last:border-b-0">
      <span className="min-w-0 text-sm font-semibold text-text">{label}</span>
      <InputNumber value={value} disabled={disabled} className="h-11 w-full" onChange={onChange} />
    </Label>
  );
}

function SegmentRow<Value extends string>({
  disabled,
  label,
  value,
  options,
  onChange,
}: {
  disabled: boolean;
  label: string;
  value: Value;
  options: Array<{ label: string; value: Value }>;
  onChange: (value: Value) => void;
}) {
  return (
    <div className="border-b border-border/50 py-3 last:border-b-0">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className="text-sm font-semibold text-text">{label}</span>
        <SegmentSelector disabled={disabled} value={value} options={options} onChange={onChange} />
      </div>
    </div>
  );
}

function ColorRow({
  disabled,
  label,
  value,
  onChange,
}: {
  disabled: boolean;
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <Label className="grid grid-cols-[minmax(0,1fr)_3rem] items-center gap-3 border-b border-border/50 py-3 last:border-b-0">
      <span className="min-w-0 text-sm font-semibold text-text">{label}</span>
      <InputColor value={value} disabled={disabled} onChange={onChange} />
    </Label>
  );
}


// Toggle "personalizado" + cores da area. Quando desligado, a area segue o
// esquema de cores (neutros do tema); quando ligado, usa as cores escolhidas.
function AreaColorControls({
  area,
  disabled,
  onToggleCustom,
  onColorChange,
}: {
  area: { custom: boolean; colors: AreaColors };
  disabled: boolean;
  onToggleCustom: (custom: boolean) => void;
  onColorChange: (key: keyof AreaColors, value: string) => void;
}) {
  return (
    <>
      <SwitchRow
        checked={area.custom}
        disabled={disabled}
        label="Cor personalizada"
        onChange={onToggleCustom}
      />
      {area.custom ? (
        <div className="grid grid-cols-1">
          <ColorRow disabled={disabled} label="Fundo" value={area.colors.background} onChange={(value) => onColorChange("background", value)} />
          <ColorRow disabled={disabled} label="Texto" value={area.colors.foreground} onChange={(value) => onColorChange("foreground", value)} />
          <ColorRow disabled={disabled} label="Borda" value={area.colors.border} onChange={(value) => onColorChange("border", value)} />
        </div>
      ) : null}
    </>
  );
}

const CHART_LABELS: Record<ChartColorKey, string> = {
  chart1: "Grafico 1",
  chart2: "Grafico 2",
  chart3: "Grafico 3",
  chart4: "Grafico 4",
  chart5: "Grafico 5",
};

// Mesmo padrao do AreaColorControls: desligado deriva das marcas do esquema
// (deriveCharts), ligado usa as 5 cores escolhidas aqui.
function ChartColorControls({
  charts,
  disabled,
  onToggleCustom,
  onColorChange,
}: {
  charts: { custom: boolean; colors: ChartColors };
  disabled: boolean;
  onToggleCustom: (custom: boolean) => void;
  onColorChange: (key: ChartColorKey, value: string) => void;
}) {
  return (
    <>
      <SwitchRow
        checked={charts.custom}
        disabled={disabled}
        label="Cor personalizada"
        onChange={onToggleCustom}
      />
      {charts.custom ? (
        <div className="grid grid-cols-1">
          {CHART_COLOR_KEYS.map((key) => (
            <ColorRow
              key={key}
              disabled={disabled}
              label={CHART_LABELS[key]}
              value={charts.colors[key]}
              onChange={(value) => onColorChange(key, value)}
            />
          ))}
        </div>
      ) : null}
    </>
  );
}

type PanelContentProps = {
  disabled: boolean;
  onClose: () => void;
};

export function SystemContextPanelContent({ disabled, onClose }: PanelContentProps) {
  const dictionary = useDevDictionary();
  const {
    theme,
    setTheme,
    areas,
    setAreaCustom,
    updateAreaColor,
    charts,
    setChartsCustom,
    updateChartColor,
    schemes,
    activeScheme,
    setActiveScheme,
    addScheme,
    deleteScheme,
    updateBrandColor,
    activeSchemeEditable,
    resolvedTheme,
    radiusPreset,
    setRadiusPreset,
    fontPreset,
    fontScale,
    colorSchemeStore,
  } = useTheme();
  const {
    resetConfig,
    setSidebarDisplayMode,
    setMainContentCardMargin,
    setMainContentMode,
    setSidebarEnabled,
    updateConfig,
    layoutConfig,
    ...config
  } = useSystemContext();

  const accountMenuAvailable = useAccountPlacement().menuAvailable;
  const [exportStatus, setExportStatus] = useState<string | null>(null);

  // Exporta o estado atual (layout + tema + cores) como o arquivo estatico
  // `system-config.json` — que o dev commita em src/config para virar a config.
  const handleExportConfig = async () => {
    const file = buildSystemConfigFile({
      theme,
      radiusPreset,
      fontPreset,
      fontScale,
      layout: layoutConfig,
      colorScheme: colorSchemeStore,
    });
    try {
      const result = await saveConfigToDisk(SYSTEM_CONFIG_FILENAME, file);
      setExportStatus(
        result === "saved"
          ? "Gravado direto no arquivo."
          : "Baixado (navegador sem acesso a disco) — mova para src/config/.",
      );
    } catch {
      // Seletor cancelado: nao mostra nada.
      setExportStatus(null);
    }
  };

  const handleToggleChange = (field: ToggleKey, value: boolean) => {
    const sidebarSide = getSidebarSide(field);

    if (sidebarSide) {
      setSidebarEnabled(sidebarSide, value);
      return;
    }

    updateConfig(createConfigPatch(field, value));
  };

  const handleNumberChange = (field: NumberKey, value: number) => {
    if (field === "mainContentCardMargin") {
      setMainContentCardMargin(value);
      return;
    }

    updateConfig(createConfigPatch(field, value));
  };

  return (
    <>
      <PanelSection title={sectionTitles.header}>
        <SwitchRow checked={config.headerVisible} disabled={disabled} label="Visivel" onChange={(value) => handleToggleChange("headerVisible", value)} />
        <SwitchRow checked={config.headerReserveSpace} disabled={disabled} label="Reservar espaco" onChange={(value) => handleToggleChange("headerReserveSpace", value)} />
        {config.headerVisible ? (
          <div className="grid grid-cols-1">
            <NumberRow value={config.headerHeight} disabled={disabled} label="Altura" onChange={(value) => handleNumberChange("headerHeight", value)} />
            <NumberRow value={config.zIndexHeader} disabled={disabled} label="z-index" onChange={(value) => handleNumberChange("zIndexHeader", value)} />
          </div>
        ) : null}
        <AreaColorControls
          area={areas.header}
          disabled={disabled}
          onToggleCustom={(value) => setAreaCustom("header", value)}
          onColorChange={(key, value) => updateAreaColor("header", key, value)}
        />
      </PanelSection>

      {/* Só web e só com menu na sidebar: sem menu, o perfil fica sempre no header. */}
      {!config.isMobile && accountMenuAvailable ? (
        <PanelSection title="Perfil">
          <SegmentRow
            disabled={disabled}
            value={config.accountPlacement}
            onChange={(value) => updateConfig({ accountPlacement: value })}
            label="Onde aparece"
            options={[
              { label: "Automático", value: "auto" },
              { label: "Header", value: "header" },
              { label: "Menu", value: "menu" },
            ]}
          />
          {!config.layout.header ? (
            <p className="text-xs text-text-muted">Header oculto: o perfil fica no menu.</p>
          ) : null}
        </PanelSection>
      ) : null}

      <PanelSection title={sectionTitles.leftSidebar}>
        <SwitchRow checked={config.leftSidebarVisible} disabled={disabled} label="Visivel" onChange={(value) => handleToggleChange("leftSidebarVisible", value)} />
        <SwitchRow checked={config.leftSidebarReserveSpace} disabled={disabled} label="Reservar espaco" onChange={(value) => handleToggleChange("leftSidebarReserveSpace", value)} />
        {config.leftSidebarVisible ? (
          <>
            <NumberRow value={config.leftSidebarWidth} disabled={disabled} label="Largura" onChange={(value) => handleNumberChange("leftSidebarWidth", value)} />
            <SegmentRow
              disabled={disabled}
              value={config.leftSidebarDisplayMode}
              onChange={(value) => setSidebarDisplayMode("left", value)}
              label="Modo"
              options={[
                { label: "Full", value: "full" },
                { label: "Card", value: "card" },
                { label: "Card Full", value: "card-full" },
              ]}
            />
          </>
        ) : null}
        <AreaColorControls
          area={areas.leftSidebar}
          disabled={disabled}
          onToggleCustom={(value) => setAreaCustom("leftSidebar", value)}
          onColorChange={(key, value) => updateAreaColor("leftSidebar", key, value)}
        />
      </PanelSection>

      <PanelSection title={sectionTitles.mainContent}>
        <SegmentRow
          disabled={disabled}
          value={config.mainContentMode}
          onChange={setMainContentMode}
          label="Modo"
          options={[
            { label: dictionary.system.fullMode, value: "full" },
            { label: dictionary.system.cardMode, value: "card" },
          ]}
        />
        {config.mainContentMode === "card" ? (
          <NumberRow value={config.mainContentCardMargin} disabled={disabled} label="Margem" onChange={(value) => handleNumberChange("mainContentCardMargin", value)} />
        ) : null}
      </PanelSection>

      <PanelSection title={sectionTitles.rightSidebar}>
        <SwitchRow checked={config.rightSidebarVisible} disabled={disabled} label="Visivel" onChange={(value) => handleToggleChange("rightSidebarVisible", value)} />
        <SwitchRow checked={config.rightSidebarReserveSpace} disabled={disabled} label="Reservar espaco" onChange={(value) => handleToggleChange("rightSidebarReserveSpace", value)} />
        {config.rightSidebarVisible ? (
          <>
            <NumberRow value={config.rightSidebarWidth} disabled={disabled} label="Largura" onChange={(value) => handleNumberChange("rightSidebarWidth", value)} />
            <SegmentRow
              disabled={disabled}
              value={config.rightSidebarDisplayMode}
              onChange={(value) => setSidebarDisplayMode("right", value)}
              label="Modo"
              options={[
                { label: "Full", value: "full" },
                { label: "Card", value: "card" },
                { label: "Card Full", value: "card-full" },
              ]}
            />
          </>
        ) : null}
        <AreaColorControls
          area={areas.rightSidebar}
          disabled={disabled}
          onToggleCustom={(value) => setAreaCustom("rightSidebar", value)}
          onColorChange={(key, value) => updateAreaColor("rightSidebar", key, value)}
        />
      </PanelSection>

      <PanelSection title={sectionTitles.footer}>
        <SwitchRow checked={config.footerVisible} disabled={disabled} label="Visivel" onChange={(value) => handleToggleChange("footerVisible", value)} />
        <SwitchRow checked={config.footerReserveSpace} disabled={disabled} label="Reservar espaco" onChange={(value) => handleToggleChange("footerReserveSpace", value)} />
        {config.footerVisible ? (
          <div className="grid grid-cols-1">
            <NumberRow value={config.footerHeight} disabled={disabled} label="Altura" onChange={(value) => handleNumberChange("footerHeight", value)} />
            <NumberRow value={config.zIndexFooter} disabled={disabled} label="z-index" onChange={(value) => handleNumberChange("zIndexFooter", value)} />
          </div>
        ) : null}
        <AreaColorControls
          area={areas.footer}
          disabled={disabled}
          onToggleCustom={(value) => setAreaCustom("footer", value)}
          onColorChange={(key, value) => updateAreaColor("footer", key, value)}
        />
      </PanelSection>

      <PanelSection title="Esquema de cores">
        <div className="flex flex-wrap items-center gap-2 py-2">
          {schemes.map((scheme) => {
            const brand = resolveBrand(scheme, resolvedTheme);
            const active = activeScheme.id === scheme.id;
            const quadrants = [brand.primary, derivePrimaryStrong(brand.primary), brand.secondary, brand.tertiary];

            return (
              <button
                key={scheme.id}
                type="button"
                disabled={disabled}
                onClick={() => setActiveScheme(scheme.id)}
                title={scheme.name}
                aria-label={scheme.name}
                aria-pressed={active}
                className={cn(
                  "size-12 overflow-hidden rounded-lg border-2 transition",
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
          <button
            type="button"
            disabled={disabled}
            onClick={() => addScheme()}
            title="Adicionar esquema"
            aria-label="Adicionar esquema"
            className="flex size-12 items-center justify-center rounded-lg border-2 border-dashed border-border text-xl text-text-muted transition hover:border-primary/60 hover:text-primary"
          >
            +
          </button>
        </div>
        {activeSchemeEditable ? (
          <>
            <div className="flex items-center justify-between gap-2 py-2">
              <span className="text-sm font-semibold text-text">{activeScheme.name}</span>
              <Button variant="outline" disabled={disabled} onClick={() => deleteScheme(activeScheme.id)}>
                Excluir
              </Button>
            </div>
            <ColorRow disabled={disabled} label="Primaria" value={activeScheme.light.primary} onChange={(value) => updateBrandColor("primary", value)} />
            <ColorRow disabled={disabled} label="Secundaria" value={activeScheme.light.secondary} onChange={(value) => updateBrandColor("secondary", value)} />
            <ColorRow disabled={disabled} label="Terciaria" value={activeScheme.light.tertiary} onChange={(value) => updateBrandColor("tertiary", value)} />
            <p className="text-xs leading-5 text-text-muted">Voce configura o tema claro; o escuro e derivado automaticamente. A primaria forte (selecao/filtro) e um tom mais escuro da primaria.</p>
          </>
        ) : (
          <p className="text-xs leading-5 text-text-muted">Esquema fixo (nao editavel). Adicione um novo para personalizar as cores.</p>
        )}
      </PanelSection>

      <PanelSection title="Cores dos graficos">
        <ChartColorControls
          charts={charts}
          disabled={disabled}
          onToggleCustom={setChartsCustom}
          onColorChange={updateChartColor}
        />
      </PanelSection>

      <PanelSection title="Tema">
        <SegmentRow
          disabled={disabled}
          value={theme}
          onChange={setTheme}
          label="Modo"
          options={[
            { label: "Light", value: "light" },
            { label: "Dark", value: "dark" },
            { label: "Sistema", value: "system" },
          ]}
        />
        <SegmentRow
          disabled={disabled}
          value={radiusPreset}
          onChange={setRadiusPreset}
          label="Arredondamento"
          options={[
            { label: "Alto", value: "high" },
            { label: "Médio", value: "default" },
            { label: "Leve", value: "light" },
            { label: "Sem", value: "none" },
          ]}
        />
      </PanelSection>

      <div className="grid gap-2">
        {exportStatus ? (
          <p className="text-right text-xs leading-5 text-text-muted">{exportStatus}</p>
        ) : null}
        <div className="flex flex-wrap justify-end gap-2">
          <Button variant="outline" onClick={resetConfig} disabled={disabled}>
            {dictionary.system.reset}
          </Button>
          <Button variant="outline" onClick={handleExportConfig} disabled={disabled}>
            Salvar config
          </Button>
          <Button onClick={onClose}>{dictionary.system.close}</Button>
        </div>
      </div>
    </>
  );
}

export function SystemContextPanel() {
  const mounted = useMounted();
  const { view } = useDevice();
  const { closePanel, openPanel, systemPanel } = useSystemContext();
  const dictionary = useDevDictionary();

  if (!mounted || !systemPanelEnabled()) {
    return null;
  }

  if (view !== "mobile") {
    return null;
  }

  return (
    <MarkerOverlay
      open={systemPanel.isOpen}
      onOpen={() => openPanel("system")}
      onClose={() => closePanel("system")}
      contentWrapperClassName="max-w-4xl"
      markerClassName="size-12 !min-h-0 !rounded-full !p-0"
      markerProps={{
        icon: <PanelsTopLeft className="size-5" />,
        itemId: systemPanel.activeItemId ?? undefined,
        label: systemPanel.label,
        mode: "custom",
        position: "none",
        title: dictionary.system.open,
        view: systemPanel.view,
      }}
    >
      <SidebarPanelFrame id="system" title={dictionary.system.title} onClose={() => closePanel("system")}>
        <SystemContextPanelContent disabled={false} onClose={() => closePanel("system")} />
      </SidebarPanelFrame>
    </MarkerOverlay>
  );
}
