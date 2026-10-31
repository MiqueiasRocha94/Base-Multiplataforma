"use client";

import { Area, AreaChart, CartesianGrid, XAxis } from "recharts";

import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import type { TrafficPoint } from "@/types/analytics";

import { trafficConfig } from "@/lib/analytics/chart-config";

export function TrafficAreaChart({ data }: { data: TrafficPoint[] }) {
  return (
    <ChartContainer config={trafficConfig} className="h-[240px]">
      <AreaChart data={data} margin={{ left: 12, right: 12 }}>
        <CartesianGrid vertical={false} />
        <XAxis dataKey="month" tickLine={false} axisLine={false} tickMargin={8} />
        <ChartTooltip cursor={false} content={<ChartTooltipContent indicator="dot" />} />
        <defs>
          <linearGradient id="fillDesktop" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="var(--color-desktop)" stopOpacity={0.8} />
            <stop offset="95%" stopColor="var(--color-desktop)" stopOpacity={0.1} />
          </linearGradient>
          <linearGradient id="fillMobile" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="var(--color-mobile)" stopOpacity={0.8} />
            <stop offset="95%" stopColor="var(--color-mobile)" stopOpacity={0.1} />
          </linearGradient>
        </defs>
        <Area dataKey="mobile" type="natural" fill="url(#fillMobile)" stroke="var(--color-mobile)" stackId="a" />
        <Area dataKey="desktop" type="natural" fill="url(#fillDesktop)" stroke="var(--color-desktop)" stackId="a" />
        <ChartLegend content={<ChartLegendContent />} />
      </AreaChart>
    </ChartContainer>
  );
}
