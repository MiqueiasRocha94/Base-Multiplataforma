"use client";

import { useDevice } from "@/contexts/DeviceContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAnalytics } from "@/hooks/use-analytics";

import { ChannelPieChart } from "./channel-pie-chart";
import { ChannelRadialChart } from "./channel-radial-chart";
import { ChartCard } from "./chart-card";
import { FunnelRadarChart } from "./funnel-radar-chart";
import { TrafficAreaChart } from "./traffic-area-chart";
import { TrafficBarChart } from "./traffic-bar-chart";
import { TrafficLineChart } from "./traffic-line-chart";

export function AnalyticsDemo() {
  const { dictionary } = useLanguage();
  const { view } = useDevice();
  const isMobile = view === "mobile";
  const t = dictionary.analytics;
  const data = useAnalytics();

  return (
    <section className={isMobile ? "grid gap-4 px-4 py-4" : "grid gap-6 py-8"}>
      <div className="grid gap-1">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary">{t.badge}</p>
        <h1 className={isMobile ? "text-2xl font-extrabold text-text" : "text-3xl font-semibold tracking-tight text-text"}>{t.title}</h1>
        <p className="text-sm leading-6 text-text-muted">{t.subtitle}</p>
      </div>

      {data ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <ChartCard title={t.areaTitle} description={t.areaSubtitle}>
            <TrafficAreaChart data={data.traffic} />
          </ChartCard>

          <ChartCard title={t.barTitle} description={t.barSubtitle}>
            <TrafficBarChart data={data.traffic} />
          </ChartCard>

          <ChartCard title={t.lineTitle} description={t.lineSubtitle}>
            <TrafficLineChart data={data.traffic} />
          </ChartCard>

          <ChartCard title={t.pieTitle} description={t.pieSubtitle}>
            <ChannelPieChart data={data.channels} />
          </ChartCard>

          <ChartCard title={t.radialTitle} description={t.radialSubtitle}>
            <ChannelRadialChart data={data.channels} />
          </ChartCard>

          <ChartCard title={t.radarTitle} description={t.radarSubtitle}>
            <FunnelRadarChart data={data.funnel} />
          </ChartCard>
        </div>
      ) : (
        <p className="py-8 text-center text-sm text-text-muted">…</p>
      )}
    </section>
  );
}
