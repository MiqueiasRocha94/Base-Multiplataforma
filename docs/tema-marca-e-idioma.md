# Tema, marca e idioma

Aparência e identidade da aplicação: tema claro/escuro, esquema de cores,
configuração estática, marca (white-label), fonte e i18n.

## Tema (claro/escuro/sistema)

**Fonte única:** o [ThemeProvider.tsx](../src/contexts/ThemeProvider.tsx) aplica as
cores como CSS vars no `<html>` em runtime. As cores vêm do **esquema de cores**
(seção seguinte). A comunicação Brand→Theme é por **contrato público**: o
ThemeProvider consome `useBrand().themeContract` (id da marca + default
encapsulado) — **nunca** lê `brand.colors`/estado interno da Brand — e resolve o
próprio domínio (esquemas disponíveis, ativo por marca, tokens). Nunca hardcoda
foreground.

**Fronteira de domínios (não cruzar):** o `ThemeContext` não acessa
`brand.default`/`brand.colors` nem manipula estado interno da Brand; o
`BrandContext` não altera `activeScheme`, não gerencia `schemes` nem aplica CSS
vars. A Brand informa o contexto; o Theme resolve o estado.

- [src/styles/tokens.css](../src/styles/tokens.css): CSS variables semânticas
  (`--color-primary`, `--color-secondary`, `--color-background`, `--color-surface`,
  `--color-surface-strong`, `--color-text`, `--color-text-muted`, `--color-border`,
  `--color-success`, `--color-warning`, `--color-error`, `--shadow-soft`,
  `--radius-*`) e a paleta de gráficos (`--chart-1..5`). Serve de **fallback** para
  o primeiro paint; o ThemeProvider sobrescreve em runtime.
- [globals.css](../src/app/globals.css) `@theme inline` mapeia os tokens para
  utilitários Tailwind (`bg-surface`, `text-text`, `border-border`, `text-on-primary`…).
- **Tokens por área do layout:** Header, Sidebars (esq./dir. separadas) e Footer têm
  `background`/`foreground`/`border` próprios (`--color-header-*`,
  `--color-left-sidebar-*`, `--color-right-sidebar-*`, `--color-footer-*`),
  consumidos em [header](../src/components/layout/header.tsx),
  [footer](../src/components/layout/footer.tsx),
  [left-sidebar](../src/components/layout/left-sidebar.tsx) e
  [right-sidebar](../src/components/layout/right-sidebar.tsx). No mobile a navbar
  usa os da sidebar esquerda ([shell adaptativo](./shell-adaptativo.md) →
  "Regiões no mobile").
- Em tela: `const { theme, resolvedTheme, setTheme, … } = useTheme()`.
- **Regra:** usar tokens semânticos (`bg-surface`, `text-text`, `text-on-primary`,
  `border-border`…), **nunca** cores fixas.

## Esquema de cores (modelo)

Modelo e derivação em [src/lib/theme/color-scheme.ts](../src/lib/theme/color-scheme.ts)
(`resolveCssVars` + `deriveDarkBrand`); runtime no ThemeProvider.

- **Pré-pintura (sem "pisca" de cor):** [theme-bootstrap.ts](../src/lib/theme/theme-bootstrap.ts)
  gera no servidor um `<style>` com as vars da marca do build (claro + escuro,
  mesmos seletores de `tokens.css`, especificidade maior) e um script que aplica
  as preferências salvas (tema, fonte, raio, escala) em `<html>` antes de pintar.
  O ThemeProvider depois aplica os MESMOS valores. Exceção: override de marca do
  devtools (só dev) entra após montar.
- **Só o tema CLARO é configurado**; o **dark é derivado** automaticamente do light
  (`darkOverrides?` opcional por esquema).
- **3 marcas por esquema:** `primary`, `secondary`, `tertiary`. A **primária forte
  não é configurável**: `derivePrimaryStrong(primary)` = tom mais escuro (l×0.65) em
  ambos os temas → `--color-primary-strong` (nav selecionado, barra de filtro). Os
  neutros (background/surface/text/border) são fixos por tema; os charts derivam das
  marcas.
- **Ações semânticas NUNCA usam as marcas:** salvar = `--color-success`, editar =
  `--color-warning`, destrutivo = `--color-error` (`--color-danger` é alias).
- **Contraste automático:** `readableForeground()` gera `--color-on-{primary,
  primary-strong,secondary,tertiary,success,error}` pela maior razão WCAG → use
  `text-on-primary`, `text-on-error` etc. sobre fundos de marca (`text`/`text-muted`
  sobre neutro).
- **Áreas** (`header`/`footer`/`leftSidebar`/`rightSidebar`) têm boolean `custom`:
  ligado = cores próprias; desligado = seguem o esquema (fundo = `primary`, texto
  auto-contrastado). As cores próprias também seguem "claro configura, escuro
  deriva": no tema escuro, um fundo **claro** (ex.: sidebar ou rodapé brancos)
  vira um tom escuro do mesmo matiz (branco → superfície do dark), com texto e
  borda recalculados; fundos já escuros ficam como configurados
  (`resolveAreaColors`). Os painéis especiais das sidebars seguem a área do lado
  ([shell adaptativo](./shell-adaptativo.md) → `sidebar-panel`).
- **Categorias de esquema (domínios separados).** O `ColorSchemeStore` compõe a
  lista disponível a partir de três origens, respeitando a fronteira Brand↔Theme:
  - **Brand Default** — fornecido pela **Brand** via contrato (`BrandThemeContract`,
    id `brand:<id>`, `builtin`). Pertence ao domínio da Brand; o Theme apenas o
    aplica, nunca o edita/persiste nem lê `brand.colors` direto.
  - **Commons** — `COMMON_SCHEMES` (acessibilidade/inclusão: `accessible`,
    `highContrast`), ids **globais**, `builtin`. Não há builtin `default`: quem
    provê o default é a Brand.
  - **Customizations** — criadas pelo usuário, **vinculadas à marca**
    (`customizations[brandId]`). Uma custom de uma marca não vaza para outra.
  - **Legado** — esquemas do formato antigo (sem marca) ficam em `legacyGlobal`
    **somente-leitura** até uma migração explícita (compat não-destrutiva).
- **`activeSchemeId` é por marca** (`activeSchemeIdByBrand[brandId]`): pertence ao
  Theme, mas a escolha depende da Brand atual. Resolução: registro da marca →
  `legacyActiveSchemeId` (fallback global de compat) → **default da Brand**.
- **Onde se mexe:** o **Perfil**
  ([profile-page-sections.tsx](../src/components/profile-page-sections.tsx)) tem só o
  **seletor** de swatches + toggle light/dark/system; a **edição** (adicionar/editar
  as 3 marcas/excluir + cores por área) fica no **painel do sistema**
  ([ferramentas de desenvolvimento](./ferramentas-dev.md)).

## Configuração estática

Baseline única do sistema: [src/config/system-config.json](../src/config/system-config.json)
(importado em build), guardando `theme`, `radiusPreset`, `fontPreset`, `fontScale`,
`layout` (`SystemLayoutConfig`, ver [shell adaptativo](./shell-adaptativo.md)) e
`colorScheme` (store serializado; cores por marca).

- **Loader:** [src/lib/config/system-config.ts](../src/lib/config/system-config.ts)
  — `loadSystemConfig()` mescla com defaults (garante builtins); `systemConfig`
  resolvido no boot; `DEFAULT_LAYOUT_CONFIG` mora aqui.
- **Salvar (dev):** botão "Salvar config" grava **direto** no JSON via **File System
  Access API** (`showSaveFilePicker`; handle cacheado na sessão). Não é rota de
  API porque `POST` quebra `output: "export"` (mobile). O dev commita o arquivo; em
  produção (painel off) o app só **lê**.
- **Preferências × baseline:** o JSON é o DEFAULT. As **preferências** do usuário
  (theme/mode, fontPreset, fontScale, radiusPreset) são persistidas em
  `localStorage` (inicializador lazy no `useState`: SSR usa o config, cliente lê o
  storage sem mismatch). **Cores NÃO são persistidas** aqui — seguem a marca. O
  layout não é persistido.
- **Arredondamento:** via `data-radius` no `<html>` + as CSS vars `--radius-sm`…`--radius-2xl`.
  Use as classes de raio que seguem o preset (`rounded-2xl`, `rounded-xl`, …);
  `rounded-full` **ignora** o preset.

## Marca (white-label)

A base traz só a marca neutra `base`; cada produto registra as suas. Varia só a identidade —
cores, logo, nome, favicon, ícone e splash do APK, contato e domínio —, **sem
feature flag por marca**: a funcionalidade é a mesma em todas. A marca é fixada no
build/deploy (`NEXT_PUBLIC_BRAND`, inlined no bundle; sem a env ou com valor
inválido vale `base`). Matriz de deploy em
[ambiente e build](./ambiente-e-build.md) → "Build em Docker".

Identidade em **duas camadas**:

- **`BrandProfile` (SÍNCRONO)** — [src/config/brand.ts](../src/config/brand.ts):
  id, nome, cores (tríade primary/secondary/tertiary por marca) e assets de
  primeiro paint. Lido no **SSR e pelo ThemeProvider** no render inicial (não
  mover para API). `ACTIVE_BRAND_ID` é o default; em DEV um override persistido
  (`localStorage`) sobrepõe (região `@dev-only`: não existe fora de dev).
- **`BrandInfo` (ASSÍNCRONO)** — dados institucionais por marca (razão social, CNPJ,
  contato, endereço, termo, lojas, chatbot, domínio).
  Cadeia: [types/brand.ts](../src/types/brand.ts) →
  [config/brand-info.ts](../src/config/brand-info.ts) (dados por marca, iguais em todo ambiente) →
  [services/brand.ts](../src/services/brand.ts) (`getBrandInfo`) →
  [BrandContext](../src/contexts/BrandContext.tsx) expõe `info`. Consumidores: login
  (rodapé/badges via `info.stores`).
- **Providers:** `BrandProvider` **envolve** o `ThemeProvider` (a marca é a ENTRADA
  da identidade; o ThemeProvider é a fonte única das cores e consome o **contrato**
  `useBrand().themeContract`, não `brand.colors`). `BrandContext` cuida só de
  identidade + publicação do contrato (brandId/brand + `themeContract` + override
  dev + `document.title`/favicon em runtime); **não** gerencia esquemas/tema. Assets
  em `public/brands/<id>/` + `public/badges/`; os do APK (`icon`, `notification`)
  estão em [ambiente e build](./ambiente-e-build.md) → "Identidade do app por marca".
- **Switcher (dev):** `WhitelabelSwitcher` no painel de dev troca a marca ao vivo;
  fora de dev não entra no bundle ([ferramentas de desenvolvimento](./ferramentas-dev.md)).
- **Regra:** dado institucional novo → `BrandInfo` (`config/brand-info.ts`); cor/asset de SSR →
  `BrandProfile`. Nenhuma tela ramifica por marca.
- **Nova marca:** perfil em `src/config/brand.ts`, cores no `colorScheme` do
  `system-config.json`, assets em `public/brands/<id>/`, `BrandInfo` em
  `config/brand-info.ts`; o build de produção recebe a marca em `NEXT_PUBLIC_BRAND`
  ([ambiente e build](./ambiente-e-build.md) → "Build em Docker").

## Fonte: preset (família) + tamanho (escala)

- **Preset de família** — `data-font` ∈ `system` | `reading` | `compact`
  (`setFontPreset`); em [tokens.css](../src/styles/tokens.css) cada preset troca
  apenas `--font-manrope`.
- **Tamanho da fonte (acessibilidade)** — espelha o ratio do base Expo:
  `fontScale` (`setFontScale`, faixa `FONT_SCALE_MIN..MAX`, default 1) é um
  multiplicador do usuário, com slider no Perfil
  ([profile-page-sections.tsx](../src/components/profile-page-sections.tsx)).
- O `ThemeProvider` combina preset + ratio (`escala efetiva = base do preset ×
  fontScale`) e grava `--font-scale` no `<html>`; o [globals.css](../src/app/globals.css)
  aplica `font-size: calc(100% * var(--font-scale))` na **raiz**, então todo o
  texto baseado em `rem` (inclusive utilitários Tailwind) escala junto. Persistido
  em `storageKeys.fontScale`. A escala também reduz as células da navbar mobile
  ([shell adaptativo](./shell-adaptativo.md)).

## i18n (pt-BR / en / es-ES)

- Dicionários em [public/locales](../public/locales)
  (`pt-BR.json`, `en.json`, `es-ES.json`), carregados por
  [src/lib/i18n/dictionaries.ts](../src/lib/i18n/dictionaries.ts).
- [LanguageContext.tsx](../src/contexts/LanguageContext.tsx) expõe
  `{ dictionary, locale, setLocale }`, persiste o locale e sincroniza o i18next
  ([src/lib/i18n/index.ts](../src/lib/i18n/index.ts), settings em
  [src/lib/i18n/settings.ts](../src/lib/i18n/settings.ts)). Namespaces lazy
  (ex.: `profile`) entram por `useLazyNamespace`.
- Em tela: `const { dictionary } = useLanguage()` e leia chaves tipadas
  (`dictionary.nav.home`, `dictionary.login.error`…). O dicionário pt-BR define o
  **shape** (`AppDictionary`). Troca de idioma: [locale-switcher](../src/components/locale-switcher.tsx).
- Evite texto hardcoded: adicione a chave nos três JSONs.
- **Idiomas oferecidos:** `enabledLocales` em [settings.ts](../src/lib/i18n/settings.ts),
  subconjunto de `locales` (a base oferece os três). O seletor mostra só os
  oferecidos e idioma salvo fora da lista volta para pt-BR. Produto de público de
  um idioma só deixa apenas ele na lista (a troca some); os demais seguem no
  projeto (tipos e JSONs) e voltam ao entrar nela, com os textos do JSON completos.

## Onde está no código

| Peça | Onde |
| --- | --- |
| Tema | [src/contexts/ThemeProvider.tsx](../src/contexts/ThemeProvider.tsx) |
| Marca | [src/contexts/BrandContext.tsx](../src/contexts/BrandContext.tsx) |
| Configuração de marca | [src/config/brand.ts](../src/config/brand.ts) |
| Configuração estática | [src/config/system-config.json](../src/config/system-config.json) |
| Opções de tema e fonte | [src/lib/preferences/options.ts](../src/lib/preferences/options.ts) |
| Idioma | [src/contexts/LanguageContext.tsx](../src/contexts/LanguageContext.tsx) |
| i18n | [src/lib/i18n/](../src/lib/i18n/) |
| Textos | [public/locales/](../public/locales/) |

Voltar ao [índice](./README.md).
