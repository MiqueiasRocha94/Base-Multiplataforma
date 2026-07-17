"use client";

import { useMemo } from "react";
import { RadialBar, RadialBarChart } from "recharts";

import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import type { ChannelSlice } from "@/types/analytics";

import { buildChannelConfig } from "./analytics-charts-config";

export function ChannelRadialChart({ data }: { data: ChannelSlice[] }) {
  const config = useMemo(() => buildChannelConfig(data), [data]);
  // RadialBar colore cada barra pelo campo `fill` do dado; deriva do canal.
  const chartData = useMemo(
    () => data.map((entry) => ({ ...entry, fill: `var(--color-${entry.channel})` })),
    [data],
  );

  return (
    <ChartContainer config={config} className="mx-auto aspect-square max-h-[260px]">
      <RadialBarChart data={chartData} innerRadius={30} outerRadius={110} startAngle={90} endAngle={-270}>
        <ChartTooltip cursor={false} content={<ChartTooltipContent nameKey="channel" hideLabel />} />
        <RadialBar dataKey="value" background cornerRadius={6} />
      </RadialBarChart>
    </ChartContainer>
  );
}
