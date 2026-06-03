"use client";

import { useRouter } from "next/navigation";

import { showcaseRequests, showcaseStats, showcaseTimeline } from "@/app/(Public)/home/_lib/mock-data";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { GenericTable, type GenericTableColumn } from "@/components/ui/generic-table";
import { Input } from "@/components/ui/input";
import { useDeveloperMode } from "@/contexts/DeveloperModeContext";
import { useLanguage } from "@/contexts/LanguageContext";

const requestColumns: GenericTableColumn<(typeof showcaseRequests)[number]>[] = [
  {
    key: "title",
    header: "Solicitacao",
    mobileLabel: "Solicitacao",
    mobilePriority: "primary",
    render: (item) => item.title,
  },
  {
    key: "owner",
    header: "Responsavel",
    mobileLabel: "Responsavel",
    render: (item) => item.owner,
  },
  {
    key: "channel",
    header: "Canal",
    mobileLabel: "Canal",
    mobilePriority: "meta",
    render: (item) => item.channel,
  },
  {
    key: "status",
    header: "Status",
    mobileLabel: "Status",
    mobilePriority: "meta",
    render: (item) => item.status,
  },
  {
    key: "updatedAt",
    header: "Atualizado",
    mobileLabel: "Atualizado",
    mobilePriority: "secondary",
    render: (item) => item.updatedAt,
  },
];

export function PortalHomeShowcase() {
  const router = useRouter();
  const { dictionary } = useLanguage();
  const { developerModeEnabled, settings } = useDeveloperMode();

  return (
    <section className="grid gap-6 py-8">
      <Card>
        <CardHeader className="gap-4">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="grid gap-2">
              <p className="text-sm font-medium uppercase tracking-[0.24em] text-primary">{dictionary.portal.badge}</p>
              <CardTitle className="text-3xl">{dictionary.portal.title}</CardTitle>
              <CardDescription className="max-w-3xl">{dictionary.portal.subtitle}</CardDescription>
            </div>
            <div className="flex flex-wrap gap-2">
              {developerModeEnabled ? (
                <span className="rounded-full border border-border bg-[color:var(--color-surface-strong)] px-3 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">
                  {settings.mockedDataEnabled ? dictionary.home.mockBadgeActive : dictionary.home.mockBadgeInactive}
                </span>
              ) : null}
              <span className="rounded-full border border-border bg-[color:var(--color-surface-strong)] px-3 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">
                {dictionary.home.showcaseBadge}
              </span>
            </div>
          </div>
        </CardHeader>
        <CardContent className="grid gap-5">
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
                <GenericTable
                  data={showcaseRequests}
                  columns={requestColumns}
                  getRowKey={(item) => item.id}
                  caption={dictionary.home.tableCaption}
                />
              </CardContent>
            </Card>

            <Card className="shadow-none">
              <CardHeader>
                <CardTitle className="text-xl">{dictionary.home.formTitle}</CardTitle>
                <CardDescription>{dictionary.home.formSubtitle}</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-3">
                <Input placeholder="Pesquisar por protocolo, cliente ou placa" />
                <Input placeholder="Filtrar por situacao" />
                <div className="grid gap-3 sm:grid-cols-2">
                  <Button variant="outline" onClick={() => router.push("/portal/profile")}>
                    {dictionary.profile.menuProfile}
                  </Button>
                  <Button onClick={() => router.push("/portal/home")}>
                    {dictionary.nav.portal}
                  </Button>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Button fixed={false} variant="secondary">
                    {dictionary.home.adaptiveAction}
                  </Button>
                  <Button fixed={false} special variant="ghost">
                    {dictionary.home.specialAction}
                  </Button>
                </div>
              </CardContent>
            </Card>
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
