import type { NextConfig } from "next";

const isMobileBuild = process.env.NEXT_BUILD_TARGET === "mobile";
// Build web em container: `output: "standalone"` empacota um server Node minimo
// (.next/standalone/server.js) para uma imagem enxuta. Opt-in por env para nao
// alterar o build web local padrao. O alvo mobile continua usando `export`.
const useStandalone = process.env.NEXT_OUTPUT_STANDALONE === "true";

// As ferramentas de dev (painel do sistema + painel de developer mode) so podem
// existir no ambiente de desenvolvimento explicito. Em qualquer outro build
// (homolog, producao, ou um `next build` cru sem APP_ENV) os modulos sao
// trocados por um stub vazio ja na resolucao — o codigo real nao entra no bundle.
// O alvo usa o alias `@/` (resolvido via tsconfig pelo Turbopack e pelo webpack).
const isDevEnv = process.env.NEXT_PUBLIC_APP_ENV === "development";
const DEV_TOOLS_STUB = "@/components/dev-tools-stub";
const devToolModules = [
  "@/components/system/system-context-panel",
  "@/components/developer-mode/developer-mode-painel",
];

const nextConfig: NextConfig = {
  output: isMobileBuild ? "export" : useStandalone ? "standalone" : undefined,
  images: {
    unoptimized: isMobileBuild,
  },
  // Em dev (Turbopack) nao ha alias; um objeto vazio evita o aviso do Turbopack
  // sobre `webpack` sem `turbopack`. Fora de dev, troca os modulos pelo stub.
  turbopack: isDevEnv
    ? {}
    : {
        resolveAlias: Object.fromEntries(devToolModules.map((moduleId) => [moduleId, DEV_TOOLS_STUB])),
      },
  // Mesmo alias para quem buildar com `--webpack` (o build padrao usa Turbopack).
  ...(isDevEnv
    ? {}
    : {
        webpack: (config: { resolve?: { alias?: Record<string, string> } }) => {
          config.resolve = config.resolve ?? {};
          config.resolve.alias = {
            ...(config.resolve.alias ?? {}),
            // `$` = match exato do especificador (nao pega submodulos).
            ...Object.fromEntries(devToolModules.map((moduleId) => [`${moduleId}$`, DEV_TOOLS_STUB])),
          };
          return config;
        },
      }),
};

export default nextConfig;
