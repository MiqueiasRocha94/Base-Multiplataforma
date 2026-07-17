// Gera os diagramas da documentacao como SVG (em public/docs/), substituindo os
// blocos ```mermaid``` — que o leitor de .md da app NAO renderiza. Cada diagrama
// e descrito de forma declarativa (nodes com centro x/y + edges); o script emite
// um SVG auto-contido (figura clara, legivel em tema claro ou escuro).
//
//   node scripts/docs-diagrams.mjs
//
// Saida: public/docs/<id>.svg (referenciados nos .md como /docs/<id>.svg).
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const OUT_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "public", "docs");

// --- estilo -----------------------------------------------------------------
const C = {
  figureBg: "#ffffff",
  figureBorder: "#e5e7eb",
  rect: { fill: "#ffffff", stroke: "#cbd5e1", text: "#0f172a" },
  primary: { fill: "#eff6ff", stroke: "#3b82f6", text: "#0f172a" },
  muted: { fill: "#f8fafc", stroke: "#cbd5e1", text: "#334155" },
  decision: { fill: "#fffbeb", stroke: "#f59e0b", text: "#92400e" },
  warning: { fill: "#fff7ed", stroke: "#fb923c", text: "#9a3412" },
  edge: "#94a3b8",
  edgeText: "#475569",
};
const FONT = "font-family='ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,sans-serif'";
const NODE_W = 210;
const NODE_H = 54;

function esc(s) {
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function palette(accent) {
  return C[accent] ?? C.rect;
}

// Ponto na borda do retangulo do node, na direcao de (tx,ty).
function boundary(node, tx, ty) {
  const w = (node.w ?? NODE_W) / 2;
  const h = (node.h ?? NODE_H) / 2;
  const dx = tx - node.x;
  const dy = ty - node.y;
  const adx = Math.abs(dx) || 1e-6;
  const ady = Math.abs(dy) || 1e-6;
  const t = Math.min(w / adx, h / ady);
  return { x: node.x + dx * t, y: node.y + dy * t };
}

function renderLabel(lines, cx, cy, color) {
  const lh = 15;
  const startY = cy - ((lines.length - 1) * lh) / 2;
  const tspans = lines
    .map((ln, i) => `<tspan x="${cx}" y="${(startY + i * lh).toFixed(1)}">${esc(ln)}</tspan>`)
    .join("");
  return `<text ${FONT} font-size="12.5" font-weight="500" fill="${color}" text-anchor="middle" dominant-baseline="middle">${tspans}</text>`;
}

function renderNode(node) {
  const w = node.w ?? NODE_W;
  const h = node.h ?? NODE_H;
  const p = palette(node.accent);
  const lines = String(node.label).split("\n");
  const x = node.x - w / 2;
  const y = node.y - h / 2;

  let shape;
  if (node.shape === "diamond") {
    const pts = [
      `${node.x},${y}`,
      `${node.x + w / 2},${node.y}`,
      `${node.x},${y + h}`,
      `${node.x - w / 2},${node.y}`,
    ].join(" ");
    const d = C.decision;
    shape = `<polygon points="${pts}" fill="${d.fill}" stroke="${d.stroke}" stroke-width="1.5" />`;
    return shape + renderLabel(lines, node.x, node.y, d.text);
  }

  shape = `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="10" ry="10" fill="${p.fill}" stroke="${p.stroke}" stroke-width="1.5" />`;
  return shape + renderLabel(lines, node.x, node.y, p.text);
}

function renderEdge(edge, byId) {
  const a = byId[edge.from];
  const b = byId[edge.to];
  const start = boundary(a, b.x, b.y);
  const end = boundary(b, a.x, a.y);
  const dash = edge.dashed ? ` stroke-dasharray="5 4"` : "";
  const line = `<line x1="${start.x.toFixed(1)}" y1="${start.y.toFixed(1)}" x2="${end.x.toFixed(1)}" y2="${end.y.toFixed(1)}" stroke="${C.edge}" stroke-width="1.5"${dash} marker-end="url(#arrow)" />`;

  let label = "";
  if (edge.label) {
    const mx = (start.x + end.x) / 2;
    const my = (start.y + end.y) / 2;
    const wLabel = edge.label.length * 6 + 10;
    label =
      `<rect x="${(mx - wLabel / 2).toFixed(1)}" y="${(my - 9).toFixed(1)}" width="${wLabel}" height="18" rx="4" fill="${C.figureBg}" opacity="0.92" />` +
      `<text ${FONT} font-size="11" fill="${C.edgeText}" text-anchor="middle" dominant-baseline="middle" x="${mx.toFixed(1)}" y="${(my + 1).toFixed(1)}">${esc(edge.label)}</text>`;
  }
  return line + label;
}

function buildSvg(spec) {
  const { width, height, nodes, edges } = spec;
  const byId = Object.fromEntries(nodes.map((n) => [n.id, n]));
  const defs = `<defs><marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="${C.edge}" /></marker></defs>`;
  const bg = `<rect x="1" y="1" width="${width - 2}" height="${height - 2}" rx="14" fill="${C.figureBg}" stroke="${C.figureBorder}" stroke-width="1.5" />`;
  const edgeSvg = edges.map((e) => renderEdge(e, byId)).join("\n  ");
  const nodeSvg = nodes.map(renderNode).join("\n  ");
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" role="img">
  ${defs}
  ${bg}
  ${edgeSvg}
  ${nodeSvg}
</svg>
`;
}

// --- diagramas --------------------------------------------------------------
const diagrams = {
  "arquitetura-camadas": {
    width: 700,
    height: 520,
    nodes: [
      { id: "A", x: 380, y: 55, label: "src/app/*\n(Public) e (Portal)", accent: "primary" },
      { id: "ST", x: 380, y: 155, label: "AppStructure\norquestrador de UI + providers", accent: "primary" },
      { id: "SHELL", x: 380, y: 270, w: 200, h: 72, label: "DeviceContext.view", shape: "diamond" },
      { id: "MOB", x: 250, y: 400, label: "MobileAppShell\nheader enxuto + footer nav" },
      { id: "DESK", x: 560, y: 400, label: "Malha física\nHeader · Sidebars · Main · Footer" },
      { id: "SYS", x: 560, y: 480, label: "SystemContext\ngeometria + painéis", accent: "muted" },
      { id: "PROV", x: 125, y: 155, w: 210, h: 72, label: "Contexts globais\nTheme·Auth·Device·System·Nav", accent: "muted" },
      { id: "UI", x: 72, y: 300, w: 128, label: "design system\n(components/ui)", accent: "muted" },
      { id: "LIBS", x: 205, y: 300, w: 128, label: "src/lib/*\n(platform·i18n)", accent: "muted" },
    ],
    edges: [
      { from: "A", to: "ST" },
      { from: "ST", to: "SHELL" },
      { from: "ST", to: "PROV" },
      { from: "SHELL", to: "MOB", label: "mobile" },
      { from: "SHELL", to: "DESK", label: "desktop/tablet" },
      { from: "DESK", to: "SYS" },
      { from: "PROV", to: "UI" },
      { from: "PROV", to: "LIBS" },
    ],
  },

  "camadas-shell": {
    width: 780,
    height: 380,
    nodes: [
      { id: "RL", x: 120, y: 75, label: "app/layout.tsx\n(root mínimo)" },
      { id: "AS", x: 120, y: 185, label: "AppStructure", accent: "primary" },
      { id: "CTX", x: 120, y: 295, label: "Providers\n(ordem fixa)", accent: "muted" },
      { id: "DEV", x: 390, y: 295, label: "DeviceContext\nmobile · tablet · desktop" },
      { id: "CHOICE", x: 390, y: 185, w: 200, h: 70, label: "view === mobile?", shape: "diamond" },
      { id: "MS", x: 650, y: 95, label: "MobileAppShell" },
      { id: "GRID", x: 650, y: 205, label: "Header + Body(L/M/R) + Footer" },
      { id: "SC", x: 650, y: 305, label: "SystemContext\ngeom/visib/z-index + painéis", accent: "muted" },
    ],
    edges: [
      { from: "RL", to: "AS" },
      { from: "AS", to: "CTX" },
      { from: "CTX", to: "DEV" },
      { from: "DEV", to: "CHOICE" },
      { from: "CHOICE", to: "MS", label: "sim" },
      { from: "CHOICE", to: "GRID", label: "não" },
      { from: "GRID", to: "SC" },
    ],
  },

  "fluxo-navegacao": {
    width: 700,
    height: 540,
    nodes: [
      { id: "Start", x: 250, y: 55, label: "/ (bootstrap)" },
      { id: "Home", x: 250, y: 155, label: "/home (público)" },
      { id: "Login", x: 250, y: 255, label: "/login", accent: "primary" },
      { id: "PortalHome", x: 250, y: 470, label: "/portal/home", accent: "primary" },
      { id: "Portal", x: 560, y: 255, label: "/portal/*\n(layout = PortalGate)", accent: "muted" },
      { id: "Lock", x: 560, y: 370, label: "bloqueio biométrico", accent: "warning" },
    ],
    edges: [
      { from: "Start", to: "Home" },
      { from: "Home", to: "Login" },
      { from: "Login", to: "PortalHome", label: "sessão demo criada" },
      { from: "Portal", to: "Login", label: "sem sessão" },
      { from: "Portal", to: "Lock", label: "nativo + biometria" },
      { from: "Lock", to: "PortalHome", label: "autenticado" },
    ],
  },

  "providers-ordem": {
    width: 720,
    height: 640,
    nodes: [
      { id: "AS", x: 360, y: 50, label: "AppStructure", accent: "primary" },
      { id: "P", x: 360, y: 145, label: "Providers (ordem fixa)", accent: "muted" },
      { id: "CHAIN", x: 360, y: 260, w: 440, h: 96, label: "Theme → Language → Auth → Device →\nDeveloperMode → UI → System → Navigation", accent: "muted" },
      { id: "Content", x: 360, y: 380, label: "AppStructureContent" },
      { id: "Q", x: 360, y: 480, w: 190, h: 68, label: "view === mobile?", shape: "diamond" },
      { id: "MS", x: 180, y: 585, label: "MobileAppShell\n+ launchers" },
      { id: "Grid", x: 560, y: 585, w: 250, label: "Header · Sidebars · Main · Footer" },
    ],
    edges: [
      { from: "AS", to: "P" },
      { from: "P", to: "CHAIN" },
      { from: "CHAIN", to: "Content" },
      { from: "Content", to: "Q" },
      { from: "Q", to: "MS", label: "sim" },
      { from: "Q", to: "Grid", label: "não" },
    ],
  },

  "navegacao-placement": {
    width: 800,
    height: 550,
    nodes: [
      { id: "Items", x: 400, y: 50, label: "navigation.ts\nitens por sessão" },
      { id: "NavCtx", x: 400, y: 150, label: "NavigationContext", accent: "muted" },
      { id: "D", x: 400, y: 255, w: 150, h: 64, label: "view", shape: "diamond" },
      { id: "DM", x: 195, y: 365, w: 205, h: 72, label: "> 5 itens\nou aninhado?", shape: "diamond" },
      { id: "MM", x: 605, y: 365, w: 210, h: 72, label: "sessão ou\n>1 público?", shape: "diamond" },
      { id: "H", x: 95, y: 475, w: 170, label: "placement:\nheader" },
      { id: "S", x: 300, y: 475, w: 170, label: "placement:\nsidebar" },
      { id: "F", x: 505, y: 475, w: 170, label: "placement:\nfooter" },
      { id: "Hide", x: 705, y: 475, w: 170, label: "placement:\nhidden" },
    ],
    edges: [
      { from: "Items", to: "NavCtx" },
      { from: "NavCtx", to: "D" },
      { from: "D", to: "DM", label: "desktop" },
      { from: "D", to: "MM", label: "mobile" },
      { from: "DM", to: "H", label: "não" },
      { from: "DM", to: "S", label: "sim" },
      { from: "MM", to: "F", label: "sim" },
      { from: "MM", to: "Hide", label: "não" },
    ],
  },

  "portal-gate-fluxo": {
    width: 760,
    height: 510,
    nodes: [
      { id: "Enter", x: 380, y: 55, w: 230, label: "/portal/* (PortalGate)", accent: "muted" },
      { id: "Ready", x: 380, y: 175, w: 180, h: 70, label: "sessão pronta?", shape: "diamond" },
      { id: "Login", x: 150, y: 300, label: "/login" },
      { id: "Lock", x: 610, y: 300, label: "locked →\nrequestBiometricAuth", accent: "warning" },
      { id: "Show", x: 380, y: 430, label: "renderiza conteúdo", accent: "primary" },
      { id: "Retry", x: 610, y: 430, label: "retry / signOut" },
    ],
    edges: [
      { from: "Enter", to: "Ready" },
      { from: "Ready", to: "Login", label: "sem sessão" },
      { from: "Ready", to: "Show", label: "com sessão, web" },
      { from: "Ready", to: "Lock", label: "nativo + biometria" },
      { from: "Lock", to: "Show", label: "ok" },
      { from: "Lock", to: "Retry", label: "falha" },
    ],
  },

  "generictable-adaptativo": {
    width: 720,
    height: 550,
    nodes: [
      { id: "GT", x: 360, y: 50, w: 270, label: "GenericTable (mesma chamada)", accent: "primary" },
      { id: "V", x: 360, y: 160, w: 190, h: 66, label: "useDevice().view", shape: "diamond" },
      { id: "TB", x: 180, y: 285, w: 250, label: "Tabela completa + toolbar\n(filtros / criar / exportar)" },
      { id: "CL", x: 545, y: 285, w: 250, label: "Lista de cards\n(badge · status · ações)" },
      { id: "BAR", x: 545, y: 390, w: 250, label: "Barra de filtros + FAB" },
      { id: "FM", x: 545, y: 490, w: 250, label: "FilterModal (sheet)" },
      { id: "FM2", x: 180, y: 490, w: 250, label: "FilterModal (dialog)" },
    ],
    edges: [
      { from: "GT", to: "V" },
      { from: "V", to: "TB", label: "desktop/tablet" },
      { from: "V", to: "CL", label: "mobile" },
      { from: "CL", to: "BAR" },
      { from: "BAR", to: "FM" },
      { from: "TB", to: "FM2" },
    ],
  },

  "contrato-para-ui": {
    width: 800,
    height: 510,
    nodes: [
      { id: "M", x: 135, y: 90, w: 230, label: "types/model/<x>.ts\n(modelo TS)" },
      { id: "C", x: 135, y: 210, w: 230, label: "dev-backend/entities/<x>.ts\nEntityContract + seed" },
      { id: "R", x: 400, y: 210, label: "useEntity({ url })\n(Entity Runtime)", accent: "primary" },
      { id: "E", x: 660, y: 120, label: "module-engine\n(schema → UI)" },
      { id: "UI", x: 660, y: 235, w: 250, label: "GenericTable + DynamicForm\n(lista/detalhe/criação)" },
      { id: "P", x: 400, y: 345, w: 235, h: 70, label: "getEntityDataProvider()", shape: "diamond" },
      { id: "DEV", x: 255, y: 450, label: "Dev Backend (mock)" },
      { id: "API", x: 545, y: 450, label: "API REST" },
    ],
    edges: [
      { from: "M", to: "C" },
      { from: "C", to: "R" },
      { from: "R", to: "E" },
      { from: "E", to: "UI" },
      { from: "R", to: "P", dashed: true, label: "contrato/dados" },
      { from: "P", to: "DEV", label: "sem API" },
      { from: "P", to: "API", label: "API + mock off" },
    ],
  },

  "runtime-modulo": {
    width: 780,
    height: 550,
    nodes: [
      { id: "Page", x: 390, y: 50, label: "persons/page.tsx" },
      { id: "UE", x: 390, y: 150, w: 260, label: "useEntity({ url: 'persons' })", accent: "primary" },
      { id: "LC", x: 150, y: 265, w: 230, label: "loadContract →\nprovider.getContract" },
      { id: "LD", x: 390, y: 265, w: 220, label: "provider.list →\ndata + pagination" },
      { id: "POL", x: 630, y: 265, w: 230, label: "entity-policy:\nUser × permissions" },
      { id: "ME", x: 150, y: 385, w: 230, label: "module-engine\n(schema → colunas/form/zod)" },
      { id: "ACT", x: 630, y: 385, w: 230, label: "resolveActions ×\nui.actions" },
      { id: "GT", x: 390, y: 490, w: 260, label: "GenericTable / DynamicForm", accent: "primary" },
    ],
    edges: [
      { from: "Page", to: "UE" },
      { from: "UE", to: "LC" },
      { from: "UE", to: "LD" },
      { from: "UE", to: "POL" },
      { from: "LC", to: "ME" },
      { from: "POL", to: "ACT" },
      { from: "ME", to: "GT" },
      { from: "ACT", to: "GT" },
    ],
  },
};

fs.mkdirSync(OUT_DIR, { recursive: true });
for (const [id, spec] of Object.entries(diagrams)) {
  const file = path.join(OUT_DIR, `${id}.svg`);
  fs.writeFileSync(file, buildSvg(spec), "utf8");
  console.log(`[docs-diagrams] ${path.relative(process.cwd(), file)}`);
}
console.log(`[docs-diagrams] ${Object.keys(diagrams).length} diagramas gerados.`);
