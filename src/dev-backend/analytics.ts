import type { AnalyticsOverview } from "@/types/analytics";

/**
 * Mock de Analytics do DEV BACKEND: representa o que `GET /analytics/overview`
 * retornaria em producao. Substitua/expanda conforme o dominio do projeto.
 */
export function getDevAnalyticsOverview(): AnalyticsOverview {
  return {
    traffic: [
      { month: "Jan", desktop: 186, mobile: 80 },
      { month: "Fev", desktop: 305, mobile: 200 },
      { month: "Mar", desktop: 237, mobile: 120 },
      { month: "Abr", desktop: 173, mobile: 190 },
      { month: "Mai", desktop: 209, mobile: 130 },
      { month: "Jun", desktop: 264, mobile: 140 },
    ],
    channels: [
      { channel: "portal", label: "Portal", value: 275, color: "var(--chart-1)" },
      { channel: "app", label: "App", value: 200, color: "var(--chart-2)" },
      { channel: "atendimento", label: "Atendimento", value: 187, color: "var(--chart-3)" },
      { channel: "parceiros", label: "Parceiros", value: 173, color: "var(--chart-4)" },
      { channel: "outros", label: "Outros", value: 90, color: "var(--chart-5)" },
    ],
    funnel: [
      { metric: "Cadastro", value: 186 },
      { metric: "Vistoria", value: 285 },
      { metric: "Aprovacao", value: 237 },
      { metric: "Emissao", value: 203 },
      { metric: "Suporte", value: 209 },
      { metric: "Renovacao", value: 264 },
    ],
  };
}
