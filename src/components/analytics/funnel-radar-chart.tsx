"use client";

import { PolarAngleAxis, PolarGrid, Radar, RadarChart } from "recharts";

import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import type { FunnelMetric } from "@/types/analytics";

const funnelConfig = {
  value: { label: "Volume", color: "var(--chart-1)" },
} satisfies ChartConfig;

export function FunnelRadarChart({ data }: { data: FunnelMetric[] }) {
  return (
    <ChartContainer config={funnelConfig} className="mx-auto aspect-square max-h-[260px]">
      <RadarChart data={data}>
        <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
        <PolarGrid />
        <PolarAngleAxis dataKey="metric" />
        <Radar dataKey="value" fill="var(--color-value)" fillOpacity={0.6} stroke="var(--color-value)" />
      </RadarChart>
    </ChartContainer>
  );
}
