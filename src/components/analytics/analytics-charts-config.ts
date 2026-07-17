import type { ChartConfig } from "@/components/ui/chart";
import type { ChannelSlice } from "@/types/analytics";

/** Config das series de trafego (desktop/mobile) compartilhada por area/bar/line. */
export const trafficConfig = {
  desktop: { label: "Desktop", color: "var(--chart-1)" },
  mobile: { label: "Mobile", color: "var(--chart-2)" },
} satisfies ChartConfig;

/** Deriva a config do grafico (rotulo/cor por canal) a partir dos dados. */
export function buildChannelConfig(channels: ChannelSlice[]): ChartConfig {
  const entries = channels.map((c) => [c.channel, { label: c.label, color: c.color }] as const);
  return { value: { label: "Acessos" }, ...Object.fromEntries(entries) };
}
