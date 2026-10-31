import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

// ---------------------------------------------------------------------------
// Fronteiras dos módulos arquiteturais de src/ (docs/estrutura-projeto.md → "Módulos
// arquiteturais de src"). Cada bloco diz o que a pasta NÃO pode importar.
// Desvios conhecidos ficam com `eslint-disable-next-line ... -- Dxx (desvio
// conhecido): <motivo>` no próprio arquivo (docs/enforcement-arquitetura.md).
// Não afrouxe a regra aqui.
// ---------------------------------------------------------------------------
const DOC = "Ver docs/estrutura-projeto.md (Módulos arquiteturais) e docs/enforcement-arquitetura.md.";

const group = (mod, message) => ({ group: [mod, `${mod}/*`, `${mod}/**`], message: `${message} ${DOC}` });

const noDevBackend = (who) => group("@/dev-backend", `${who} não importa dev-backend (mock); passe por services/ ou injete o provider.`);
const noComponents = (who) => group("@/components", `${who} não depende de components (view).`);
const noContexts = (who) => group("@/contexts", `${who} não depende de contexts (estado de runtime).`);
const noServices = (who) => group("@/services", `${who} não chama services (API).`);
const noMockLib = (who) => ({
  group: ["@/lib/mock-*"],
  message: `${who} não usa mocks de lib; mock pertence a dev-backend. ${DOC}`,
});
const noRawFetch = (who) => ({
  name: "@/lib/http",
  importNames: ["apiFetch"],
  message: `${who} não faz HTTP direto; crie/use uma função em services/. ${DOC}`,
});
const noRouteLocalFolders = {
  group: ["**/_components/**", "**/_screens/**", "./_*", "../_*"],
  message: `Não existe _components/_screens em rotas; telas ficam em src/components/{modulo}. ${DOC}`,
};

const boundaries = (files, { patterns = [], paths = [] }) => ({
  files,
  rules: { "no-restricted-imports": ["error", { patterns, paths }] },
});

const architecture = [
  boundaries(["src/app/**"], {
    patterns: [noDevBackend("app"), noServices("Rota (app)"), noRouteLocalFolders],
    paths: [noRawFetch("Rota (app)")],
  }),
  boundaries(["src/components/**"], {
    patterns: [noDevBackend("components"), noRouteLocalFolders],
    paths: [noRawFetch("components")],
  }),
  // Malha física: sem regra de auth/negócio nem API (docs/estrutura-projeto.md + docs/shell-adaptativo.md).
  boundaries(["src/components/layout/**"], {
    patterns: [
      noDevBackend("components/layout"),
      noServices("components/layout"),
      group("@/lib/auth", "components/layout é estrutura física; regra de auth fica em contexts/lib."),
    ],
    paths: [
      noRawFetch("components/layout"),
      // Região não lê sessão nem rota (docs/shell-adaptativo.md "AppStructure única"): o que
      // depende disso vem resolvido do SystemContext ou entra como componente/slot.
      {
        name: "@/contexts/AuthContext",
        importNames: ["useAuth"],
        message: `Região não lê a sessão: use o valor resolvido do SystemContext ou um componente de fora de layout. ${DOC}`,
      },
      {
        name: "next/navigation",
        importNames: ["usePathname"],
        message: `Região não lê a rota: estado que depende dela mora no SystemContext. ${DOC}`,
      },
    ],
  }),
  boundaries(["src/core/**"], {
    patterns: [noComponents("core"), noContexts("core"), noServices("core"), noDevBackend("core"), noMockLib("core")],
    paths: [
      { name: "react", message: `core é engine pura, sem React. ${DOC}` },
      noRawFetch("core"),
    ],
  }),
  boundaries(["src/contexts/**"], {
    patterns: [noDevBackend("contexts"), noComponents("contexts")],
    paths: [
      noRawFetch("contexts"),
      // SystemContext é sempre downstream: nenhum context o lê (docs/shell-adaptativo.md).
      {
        name: "@/contexts/SystemContext",
        importNames: ["useSystemContext"],
        message: `Nenhum context lê o SystemContext (ele é downstream). ${DOC}`,
      },
    ],
  }),
  boundaries(["src/hooks/**"], {
    patterns: [noDevBackend("hooks"), noComponents("hooks")],
  }),
  boundaries(["src/lib/**"], {
    patterns: [noComponents("lib"), noServices("lib"), noDevBackend("lib")],
  }),
  boundaries(["src/services/**"], {
    patterns: [noComponents("services"), noContexts("services"), noMockLib("services")],
  }),
  boundaries(["src/dev-backend/**"], {
    patterns: [noComponents("dev-backend"), noContexts("dev-backend"), noServices("dev-backend")],
  }),
  // Recursos de dev sem React: lib/services importam esta entrada, então ela não puxa view, estado nem API.
  boundaries(["src/dev-tools/runtime/**"], {
    patterns: [noComponents("dev-tools/runtime"), noContexts("dev-tools/runtime"), noServices("dev-tools/runtime"), noDevBackend("dev-tools/runtime")],
  }),
  // Atualização remota sem React (docs/ambiente-e-build.md → "Atualização remota do app"): mesma regra.
  boundaries(["src/app-update/runtime/**"], {
    patterns: [noComponents("app-update/runtime"), noContexts("app-update/runtime"), noServices("app-update/runtime"), noDevBackend("app-update/runtime")],
  }),
  boundaries(["src/config/**"], {
    patterns: [noComponents("config"), noContexts("config"), noServices("config"), noDevBackend("config")],
  }),
  boundaries(["src/types/**"], {
    patterns: [noComponents("types"), noContexts("types"), noServices("types"), noDevBackend("types")],
  }),
  // types/ = tipos puros: nada de valor de runtime exportado.
  {
    files: ["src/types/**"],
    rules: {
      "no-restricted-syntax": [
        "error",
        {
          selector: "ExportNamedDeclaration > FunctionDeclaration",
          message: `types/ só tem tipos; função vai para lib/. ${DOC}`,
        },
        {
          selector: "ExportNamedDeclaration > VariableDeclaration",
          message: `types/ só tem tipos; constante de runtime vai para lib/ ou config/. ${DOC}`,
        },
        {
          selector: "ExportNamedDeclaration > ClassDeclaration",
          message: `types/ só tem tipos; classe vai para lib/. ${DOC}`,
        },
      ],
    },
  },
];

// ---------------------------------------------------------------------------
// Telas montadas com o design system (docs/componentes-ui.md → "Design único
// web/mobile"). components/ui implementa os primitivos.
// ---------------------------------------------------------------------------
const UI_DOC = "Ver docs/componentes-ui.md (Design único web/mobile) e docs/enforcement-arquitetura.md.";

const screens = {
  files: ["src/components/**", "src/app/**"],
  ignores: ["src/components/ui/**"],
  rules: {
    "no-restricted-syntax": [
      "error",
      {
        selector: "JSXOpeningElement[name.name='table']",
        message: `Tabela à mão na tela: use GenericTable (tabela no desktop, cards no mobile) ou EntityListScreen. ${UI_DOC}`,
      },
      {
        selector: "JSXOpeningElement[name.name='select']",
        message: `<select> à mão na tela: use SelectOne (select nativo no web, tela de seleção no mobile). ${UI_DOC}`,
      },
      {
        selector: "JSXOpeningElement[name.name='input']:has(JSXAttribute[name.name='type'][value.value=/^(date|month)$/])",
        message: `<input type="date|month"> nativo: use DateField. ${UI_DOC}`,
      },
      {
        selector: "CallExpression[callee.object.name='window'][callee.property.name='confirm'], CallExpression[callee.name='confirm']",
        message: `window.confirm na tela: confirmação vai pelo design system (componentes-ui item 9). ${UI_DOC}`,
      },
    ],
  },
};

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  ...architecture,
  screens,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Projetos de referência (ignorados pelo git): só consulta.
    "references/**",
  ]),
]);

export default eslintConfig;
