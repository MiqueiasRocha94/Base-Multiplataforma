import type { NextConfig } from "next";

const isMobileBuild = process.env.NEXT_BUILD_TARGET === "mobile";
// Build web de homologação/produção: `output: "standalone"` empacota um server
// Node mínimo (.next/standalone/server.js), usado pelo `npm run start` e pela
// imagem Docker. O alvo mobile usa `export`.
const useStandalone = process.env.NEXT_OUTPUT_STANDALONE === "true";
// Raiz do workspace (onde está o node_modules) quando o build roda numa cópia dos
// fontes dentro do projeto (scripts/build-target.mjs).
const buildRoot = process.env.NEXT_BUILD_ROOT;

// @dev-only:start
// Em dev o navegador chama a API na mesma origem (`devApiBase`) e estes rewrites
// repassam para `NEXT_PUBLIC_ACESSO_API_URL`: sem CORS, em qualquer porta e pelo
// IP da rede (localhost:8080 so existe nesta maquina). Mesmos caminhos da API: o
// cookie de renovacao (`Path=/auth/...`) continua valendo.
const isDevEnv = process.env.NEXT_PUBLIC_APP_ENV === "development";
const acessoApiUrl = (process.env.NEXT_PUBLIC_ACESSO_API_URL ?? "").replace(/\/+$/, "");
const devApiProxyPrefixes = ["/auth", "/private"];
// @dev-only:end

const nextConfig: NextConfig = {
  devIndicators: { position: "bottom-left" },
  // @dev-only:start
  // Em dev o Next bloqueia requisicoes cross-origin aos assets de dev (/_next, HMR).
  // Libera IPs de rede local para testar em outro dispositivo (ex.: celular na mesma rede).
  allowedDevOrigins: ["192.168.*.*", "10.*.*.*", "172.*.*.*"],
  ...(isDevEnv && acessoApiUrl
    ? {
        rewrites: async () =>
          devApiProxyPrefixes.map((prefix) => ({ source: `${prefix}/:path*`, destination: `${acessoApiUrl}${prefix}/:path*` })),
      }
    : {}),
  // @dev-only:end
  output: isMobileBuild ? "export" : useStandalone ? "standalone" : undefined,
  images: {
    unoptimized: isMobileBuild,
  },
  ...(buildRoot ? { outputFileTracingRoot: buildRoot, turbopack: { root: buildRoot } } : {}),
  // Source maps do navegador fora dos artefatos (docs/ferramentas-dev.md → "Fora dos artefatos").
  productionBrowserSourceMaps: false,
};

export default nextConfig;
