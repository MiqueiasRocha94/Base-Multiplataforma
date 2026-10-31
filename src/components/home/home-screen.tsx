"use client";

import { useRouter } from "next/navigation";

import { showcaseRequests, showcaseStats, showcaseTimeline } from "@/lib/mock-data";
import { BrandButton } from "@/components/brand-button";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { GenericTable, type GenericTableColumn } from "@/components/ui/generic-table";
import { Input } from "@/components/ui/input";
import { useDevice } from "@/contexts/DeviceContext";
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

// Home de demonstração da base: cada produto substitui pela sua.
export function HomeScreen() {
  const router = useRouter();
  const { dictionary } = useLanguage();
  const { view } = useDevice();

  if (view === "mobile") {
    return (
      <section className="grid gap-4 px-4 py-4">
        <div className="grid gap-2 py-2">
          <p className="text-sm font-semibold uppercase text-primary">{dictionary.portal.badge}</p>
          <h1 className="text-2xl font-extrabold text-text">{dictionary.portal.title}</h1>
          <p className="text-sm leading-6 text-text-muted">{dictionary.portal.subtitle}</p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {showcaseStats.slice(0, 4).map((stat) => (
            <div key={stat.id} className="rounded-xl border border-border bg-surface p-4">
              <p className="text-xs font-semibold text-text-muted">{stat.label}</p>
              <p className="mt-2 text-2xl font-extrabold text-text">{stat.value}</p>
            </div>
          ))}
        </div>

        <div className="grid gap-3 rounded-xl border border-border bg-surface p-4">
          <div className="grid gap-1">
            <h2 className="text-lg font-bold text-text">{dictionary.home.tableTitle}</h2>
            <p className="text-sm leading-6 text-text-muted">{dictionary.home.tableSubtitle}</p>
          </div>
          <GenericTable
            data={showcaseRequests}
            columns={requestColumns}
            getRowKey={(item) => item.id}
            caption={dictionary.home.tableCaption}
          />
        </div>

        <div className="grid gap-3 rounded-xl border border-border bg-surface p-4">
          <Input placeholder="Pesquisar por protocolo, cliente ou placa" />
          <Input placeholder="Filtrar por situacao" />
          <div className="grid grid-cols-2 gap-3">
            <Button variant="outline" onClick={() => router.push("/portal/profile")}>
              {dictionary.account.menuProfile}
            </Button>
            <Button onClick={() => router.push("/portal/home")}>
              {dictionary.nav.portal}
            </Button>
          </div>
        </div>
      </section>
    );
  }

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
                    {dictionary.account.menuProfile}
                  </Button>
                  <Button onClick={() => router.push("/portal/home")}>
                    {dictionary.nav.portal}
                  </Button>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Button variant="secondary">
                    {dictionary.home.adaptiveAction}
                  </Button>
                  <BrandButton>
                    {dictionary.home.specialAction}
                  </BrandButton>
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
