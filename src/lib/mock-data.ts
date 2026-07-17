export type ShowcaseStat = {
  id: string;
  label: string;
  value: string;
  detail: string;
};

export type ShowcaseRequest = {
  id: string;
  title: string;
  owner: string;
  channel: string;
  status: "Ativo" | "Em revisao" | "Aguardando";
  updatedAt: string;
};

export type ShowcaseTimelineItem = {
  id: string;
  title: string;
  summary: string;
};

export const showcaseStats: ShowcaseStat[] = [
  { id: "active", label: "Registros ativos", value: "128", detail: "Painel principal com leitura rapida para web e mobile." },
  { id: "pending", label: "Pendencias", value: "17", detail: "Cards compactos ajudam o usuario a localizar o que exige atencao." },
  { id: "forms", label: "Formularios", value: "06", detail: "Fluxos de cadastro testados com componentes adaptaveis." },
  { id: "alerts", label: "Alertas", value: "09", detail: "Area pronta para destacar eventos ou bloqueios do processo." },
];

export const showcaseRequests: ShowcaseRequest[] = [
  {
    id: "REQ-1034",
    title: "Atualizacao cadastral do associado",
    owner: "Equipe comercial",
    channel: "Portal",
    status: "Ativo",
    updatedAt: "Hoje, 08:30",
  },
  {
    id: "REQ-1035",
    title: "Validacao documental de frota",
    owner: "Backoffice",
    channel: "Atendimento",
    status: "Em revisao",
    updatedAt: "Hoje, 09:45",
  },
  {
    id: "REQ-1036",
    title: "Nova solicitacao de vistoria",
    owner: "Operacoes",
    channel: "App",
    status: "Aguardando",
    updatedAt: "Hoje, 11:10",
  },
];

export const showcaseTimeline: ShowcaseTimelineItem[] = [
  {
    id: "step-1",
    title: "TopBar contextual no mobile",
    summary: "A navegacao curta deixa o usuario orientado sem perder espaco para o conteudo principal.",
  },
  {
    id: "step-2",
    title: "Tabela unica com fallback para cards",
    summary: "A mesma fonte de dados alimenta a leitura em tabela no web e cards no telefone.",
  },
  {
    id: "step-3",
    title: "Modo desenvolvedor adaptado do Expo",
    summary: "Quick access, mock e validacoes ficam centralizados em um overlay leve para o projeto web.",
  },
];
