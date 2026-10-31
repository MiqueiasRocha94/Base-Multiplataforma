// eslint-disable-next-line no-restricted-imports -- D08 (desvio conhecido): tipo de view em lib; corrige movendo ChartConfig para types/
import type { ChartConfig } from "@/components/ui/chart";
import type { ChannelSlice } from "@/types/analytics";

/** Config das series de trafego (desktop/mobile) compartilhada por area/bar/line. */
export const trafficConfig = {
  desktop: { label: "Desktop", color: "var(--chart-1)" },
  mobile: { label: "Mobile", color: "var(--chart-2)" },
} satisfies ChartConfig;

/** Deriva a config do grafico (rotulo/cor por canal) a partir dos dados. */
export function buildChannelConfig(channels: ChannelSlice[]): ChartConfig {
  const entries = channels.map((channel) => [channel.channel, { label: channel.label, color: channel.color }] as const);
  return { value: { label: "Acessos" }, ...Object.fromEntries(entries) };
}
