/**
 * Contrato de dados do painel de Analytics — o formato que o backend retornaria
 * em `GET /analytics/overview`. Em modo dev, vem do mock local (dev-backend).
 */

export type TrafficPoint = {
  /** Rotulo do periodo (ex.: "Jan"). */
  month: string;
  desktop: number;
  mobile: number;
};

export type ChannelSlice = {
  /** Chave estavel do canal (ex.: "portal"); dirige a cor via `--color-<channel>`. */
  channel: string;
  /** Rotulo exibido. */
  label: string;
  value: number;
  /** Token de cor CSS (ex.: "var(--chart-1)"). */
  color: string;
};

export type FunnelMetric = {
  metric: string;
  value: number;
};

export type AnalyticsOverview = {
  traffic: TrafficPoint[];
  channels: ChannelSlice[];
  funnel: FunnelMetric[];
};
