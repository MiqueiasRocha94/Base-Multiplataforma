"use client";

import { useMemo } from "react";
import { Cell, Pie, PieChart } from "recharts";

import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import type { ChannelSlice } from "@/types/analytics";

import { buildChannelConfig } from "./analytics-charts-config";

export function ChannelPieChart({ data }: { data: ChannelSlice[] }) {
  const config = useMemo(() => buildChannelConfig(data), [data]);

  return (
    <ChartContainer config={config} className="mx-auto aspect-square max-h-[260px]">
      <PieChart>
        <ChartTooltip content={<ChartTooltipContent nameKey="channel" hideLabel />} />
        <Pie data={data} dataKey="value" nameKey="channel" innerRadius={50} strokeWidth={4}>
          {data.map((entry) => (
            <Cell key={entry.channel} fill={`var(--color-${entry.channel})`} />
          ))}
        </Pie>
        <ChartLegend content={<ChartLegendContent nameKey="channel" />} />
      </PieChart>
    </ChartContainer>
  );
}
