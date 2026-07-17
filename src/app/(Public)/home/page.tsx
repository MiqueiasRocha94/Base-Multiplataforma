"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { LocaleSwitcher } from "@/components/locale-switcher";
import { ThemeToggleButton } from "@/components/theme-toggle-button";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { GenericTable, type GenericTableColumn, type RowStatus } from "@/components/ui/generic-table";
import type { FilterField, FilterValues } from "@/components/ui/filter-modal";
import { Input } from "@/components/ui/input";
import { SegmentSelector } from "@/components/ui/segment-selector";
import { Switch } from "@/components/ui/switch";
import { showcaseRequests, showcaseStats, showcaseTimeline, type ShowcaseRequest } from "@/lib/mock-data";
import { useAuth } from "@/contexts/AuthContext";
import { useDevice } from "@/contexts/DeviceContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useTheme } from "@/contexts/ThemeProvider";
import { fontPresets, themeOptions } from "@/lib/preferences/options";

const REQUEST_STATUS_TONE: Record<ShowcaseRequest["status"], RowStatus["tone"]> = {
  Ativo: "success",
  "Em revisao": "warning",
  Aguardando: "neutral",
};

const requestColumns: GenericTableColumn<ShowcaseRequest>[] = [
  { key: "title", header: "Solicitacao", mobileLabel: "Solicitacao", mobileRole: "title", render: (item) => item.title },
  { key: "owner", header: "Responsavel", mobileLabel: "Responsavel", render: (item) => item.owner },
  { key: "channel", header: "Canal", mobileLabel: "Canal", mobileRole: "badge", render: (item) => item.channel },
  { key: "updatedAt", header: "Atualizado", mobileRole: "meta", render: (item) => item.updatedAt },
];

const requestFilter = {
  enabled: true as const,
  fields: [
    { key: "title", label: "Solicitacao", kind: "text", placeholder: "Solicitacao" },
    {
      key: "status",
      label: "Status",
      kind: "select",
      options: [
        { id: "Ativo", label: "Ativo" },
        { id: "Em revisao", label: "Em revisao" },
        { id: "Aguardando", label: "Aguardando" },
      ],
    },
  ] satisfies FilterField[],
  predicate: (item: ShowcaseRequest, values: FilterValues) => {
    const title = values.title?.trim().toLowerCase();
    if (title && !item.title.toLowerCase().includes(title)) {
      return false;
    }
    if (values.status?.trim() && item.status !== values.status) {
      return false;
    }
    return true;
  },
};

function ComponentGallery() {
  const { dictionary } = useLanguage();
  const [segment, setSegment] = useState<"list" | "grid">("list");
  const [enabled, setEnabled] = useState(true);

  return (
    <Card className="shadow-none">
      <CardHeader>
        <CardTitle className="text-xl">{dictionary.home.formTitle}</CardTitle>
        <CardDescription>{dictionary.home.formSubtitle}</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        <div className="flex flex-wrap gap-2">
          <Button className="max-md:w-full">{dictionary.nav.login}</Button>
          <Button className="max-md:w-full" variant="outline">{dictionary.home.adaptiveAction}</Button>
          <Button className="max-md:w-full" variant="secondary">{dictionary.home.specialAction}</Button>
          <Button className="max-md:w-full" variant="ghost">{dictionary.profile.menuConfig}</Button>
          <Button className="max-md:w-full" variant="danger">{dictionary.profile.menuSignOut}</Button>
        </div>
        <Input placeholder="Pesquisar por protocolo, cliente ou placa" />
        <div className="flex flex-wrap items-center justify-between gap-3">
          <SegmentSelector
            options={[
              { value: "list", label: "Lista" },
              { value: "grid", label: "Grade" },
            ]}
            value={segment}
            onChange={setSegment}
          />
          <div className="flex items-center gap-2">
            <span className="text-sm text-text-muted">{dictionary.developer.mockedData}</span>
            <Switch checked={enabled} onCheckedChange={setEnabled} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function PublicMobileConfigModal({
  onClose,
}: {
  onClose: () => void;
}) {
  const { dictionary } = useLanguage();
  const { fontPreset, setFontPreset, theme, setTheme } = useTheme();

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 px-4 py-6">
      <Card className="w-full max-w-md">
        <CardHeader className="border-b border-border/60">
          <div className="flex items-start justify-between gap-4">
            <div className="grid gap-1">
              <CardTitle className="text-xl">{dictionary.home.quickConfigTitle}</CardTitle>
              <CardDescription>{dictionary.home.quickConfigSubtitle}</CardDescription>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="inline-flex size-10 items-center justify-center rounded-full border border-border text-text-muted transition hover:bg-[color:var(--color-surface-strong)]"
            >
              x
            </button>
          </div>
        </CardHeader>
        <CardContent className="grid gap-5 p-6">
          <div className="grid gap-3">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-text-muted">{dictionary.profile.configTitle}</p>
            <div className="flex flex-wrap items-center gap-3">
              <LocaleSwitcher />
              <ThemeToggleButton />
            </div>
          </div>

          <div className="grid gap-3">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-text-muted">{dictionary.profile.themeTitle}</p>
            <div className="flex flex-wrap gap-3">
              {themeOptions.map((option) => (
                <Button
                  key={option.value}
                  variant={theme === option.value ? "default" : "outline"}
                  onClick={() => setTheme(option.value)}
                >
                  {dictionary.profile[option.labelKey]}
                </Button>
              ))}
            </div>
          </div>

          <div className="grid gap-3">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-text-muted">{dictionary.profile.fontTitle}</p>
            <div className="flex flex-wrap gap-3">
              {fontPresets.map((option) => (
                <Button
                  key={option.value}
                  variant={fontPreset === option.value ? "default" : "outline"}
                  onClick={() => setFontPreset(option.value)}
                >
                  {dictionary.profile[option.labelKey]}
                </Button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function PublicMobileHome() {
  const router = useRouter();
  const { dictionary } = useLanguage();
  const [configOpen, setConfigOpen] = useState(false);

  return (
    <>
      <section className="mx-auto flex min-h-[calc(100vh-2rem)] w-full max-w-md items-center justify-center py-6">
        <div className="grid w-full gap-6 rounded-[var(--radius-2xl)] border border-border bg-surface p-6 shadow-[var(--shadow-soft)]">
          <div className="flex items-start justify-between gap-4">
            <div className="grid gap-2">
              <p className="text-sm font-medium uppercase tracking-[0.24em] text-primary">{dictionary.home.mobileBadge}</p>
              <h1 className="text-3xl font-semibold tracking-tight">{dictionary.home.mobileTitle}</h1>
              <p className="text-sm leading-6 text-text-muted">{dictionary.home.mobileSubtitle}</p>
            </div>
            <button
              type="button"
              onClick={() => setConfigOpen(true)}
              className="inline-flex size-11 items-center justify-center rounded-full border border-border bg-[color:var(--color-surface-strong)] text-lg transition hover:bg-surface"
              aria-label={dictionary.home.quickConfigTitle}
            >
              ⚙
            </button>
          </div>

          <div className="grid gap-3">
            <Button onClick={() => router.push("/login")}>{dictionary.nav.login}</Button>
            <Button variant="outline" onClick={() => router.push("/register")}>
              {dictionary.home.registerCta}
            </Button>
          </div>
        </div>
      </section>

      {configOpen ? <PublicMobileConfigModal onClose={() => setConfigOpen(false)} /> : null}
    </>
  );
}

function ExpoInspiredPublicMobileHome() {
  const router = useRouter();
  const { dictionary } = useLanguage();
  const [configOpen, setConfigOpen] = useState(false);

  return (
    <>
      <section className="flex min-h-screen w-full flex-col justify-center gap-7 px-6 py-10">
        <div className="grid gap-3">
          <p className="text-sm font-semibold uppercase text-primary">{dictionary.home.mobileBadge}</p>
          <h1 className="text-3xl font-extrabold text-text">{dictionary.appName}</h1>
          <p className="text-base leading-7 text-text-muted">{dictionary.tagline}</p>
        </div>

        <div className="grid gap-3">
          <Button onClick={() => router.push("/login")}>
            {dictionary.nav.login}
          </Button>
          <Button variant="outline" onClick={() => router.push("/register")}>
            {dictionary.home.registerCta}
          </Button>
          <button
            type="button"
            onClick={() => setConfigOpen(true)}
            className="mt-2 inline-flex h-12 items-center justify-center rounded-xl border border-border bg-surface px-4 text-sm font-semibold text-text transition hover:bg-[color:var(--color-surface-strong)]"
          >
            {dictionary.home.quickConfigTitle}
          </button>
        </div>

        <div className="rounded-xl border border-border bg-surface p-4">
          <div className="grid gap-1">
            <p className="text-sm font-semibold text-text">{dictionary.home.mobileTitle}</p>
            <p className="text-sm leading-6 text-text-muted">{dictionary.home.mobileSubtitle}</p>
          </div>
        </div>
      </section>

      {configOpen ? <PublicMobileConfigModal onClose={() => setConfigOpen(false)} /> : null}
    </>
  );
}

function PublicEntryCard() {
  const router = useRouter();
  const { dictionary } = useLanguage();

  const getRowStatus = (item: ShowcaseRequest): RowStatus => ({ label: item.status, tone: REQUEST_STATUS_TONE[item.status] });

  return (
    <section className="mx-auto grid w-full max-w-5xl gap-6 py-8">
      <Card>
        <CardHeader className="gap-4">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="grid gap-2">
              <p className="text-sm font-medium uppercase tracking-[0.24em] text-primary">{dictionary.home.badge}</p>
              <CardTitle className="text-3xl">{dictionary.home.title}</CardTitle>
              <CardDescription className="max-w-3xl">{dictionary.home.subtitle}</CardDescription>
            </div>
            <span className="rounded-full border border-border bg-[color:var(--color-surface-strong)] px-3 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">
              {dictionary.home.showcaseBadge}
            </span>
          </div>
        </CardHeader>
        <CardContent className="grid gap-5">
          <div className="grid gap-4 rounded-[var(--radius-xl)] border border-border bg-[color:var(--color-surface-strong)] p-5">
            <p className="text-sm leading-6 text-text-muted">{dictionary.home.publicDescription}</p>
            <div className="grid gap-3 sm:grid-cols-2">
              <Button onClick={() => router.push("/login")}>{dictionary.nav.login}</Button>
              <Button variant="outline" onClick={() => router.push("/register")}>
                {dictionary.home.registerCta}
              </Button>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {showcaseStats.map((stat) => (
              <div key={stat.id} className="rounded-[var(--radius-xl)] border border-border bg-[color:var(--color-surface-strong)] p-5">
                <p className="text-sm text-text-muted">{stat.label}</p>
                <p className="mt-3 text-3xl font-semibold tracking-tight">{stat.value}</p>
                <p className="mt-2 text-sm leading-6 text-text-muted">{stat.detail}</p>
              </div>
            ))}
          </div>

          <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
            <Card className="shadow-none">
              <CardHeader>
                <CardTitle className="text-xl">{dictionary.home.tableTitle}</CardTitle>
                <CardDescription>{dictionary.home.tableSubtitle}</CardDescription>
              </CardHeader>
              <CardContent>
                <GenericTable<ShowcaseRequest>
                  data={showcaseRequests}
                  columns={requestColumns}
                  getRowKey={(item) => item.id}
                  caption={dictionary.home.tableCaption}
                  filter={requestFilter}
                  getRowStatus={getRowStatus}
                />
              </CardContent>
            </Card>

            <ComponentGallery />
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            {showcaseTimeline.map((item) => (
              <Card key={item.id} className="shadow-none">
                <CardHeader className="gap-2">
                  <CardTitle className="text-lg">{item.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm leading-6 text-text-muted">{item.summary}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>
    </section>
  );
}

export default function HomePage() {
  const { view } = useDevice();
  const { session } = useAuth();

  if (view === "mobile" && !session) {
    return <ExpoInspiredPublicMobileHome />;
  }

  return <PublicEntryCard />;
}
