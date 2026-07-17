# 05 — Infraestrutura

Recursos transversais que qualquer tela reaproveita.

## Tema (claro/escuro/sistema)

**Fonte única:** o [ThemeProvider.tsx](../src/contexts/ThemeProvider.tsx) é o
catálogo canônico de cores (`themeColorFields` + paletas light/dark). Ele aplica
cada token como inline style no `<html>`, persiste no storage e permite
**sobrescrever qualquer cor por modo** via `updateThemeColor(key, value)`
(`resetThemeColors()` volta ao padrão). O painel do sistema gera os campos de cor
automaticamente a partir de `themeColorFields` — incluindo a paleta de gráficos
(`chart1..5`).

**Variações de esquema de cores (selecionáveis no Perfil):** `paletteVariant` ∈
`system` (preset do sistema), `custom1` / `custom2` (as duas paletas
**editáveis** no painel), `accessible` (colorblind-safe, base Okabe-Ito) e
`highContrast`. O seletor fica em [profile-page-sections.tsx](../src/components/profile-page-sections.tsx)
(`setPaletteVariant`); o painel só permite editar cores quando a variação ativa é
`custom1`/`custom2` (`activeVariantEditable`). O estado é persistido em
`storageKeys.colorScheme` (com migração do formato antigo `themeColors`).

- [src/styles/tokens.css](../src/styles/tokens.css): CSS variables semânticas
  (`--color-primary`, `--color-secondary`, `--color-background`, `--color-surface`,
  `--color-surface-strong`, `--color-text`, `--color-text-muted`, `--color-border`,
  `--color-success`, `--color-error`, `--shadow-soft`, `--radius-*`) e a paleta de
  gráficos (`--chart-1..5`, estilo shadcn). Serve de **fallback** para o primeiro
  paint; o ThemeProvider sobrescreve as cores em runtime.
- [globals.css](../src/app/globals.css) `@theme inline` mapeia os tokens para
  utilitários Tailwind (`bg-surface`, `text-text`, `border-border`…).
- **Tokens por área do layout (personalizáveis separadamente):** Header, Sidebars
  e Footer têm seus próprios `background` / `foreground` / `border`
  (`--color-header-*`, `--color-sidebar-*`, `--color-footer-*`). No `tokens.css`
  derivam das cores base; no ThemeProvider têm valores concretos editáveis por
  modo. Consumidos em [Header](../src/components/layout/Header.tsx),
  [Footer](../src/components/layout/Footer.tsx),
  [MobileAppShell](../src/components/layout/MobileAppShell.tsx) e
  [Sidebar](../src/components/Sidebar.tsx).
- Em tela: `const { theme, resolvedTheme, setTheme, themeColors, … } = useTheme()`.
- **Regra:** usar tokens semânticos (`bg-surface`, `text-text`,
  `text-text-muted`, `border-border`, `bg-[color:var(--color-header-background)]`…),
  **não** cores fixas.

## i18n (pt-BR / en / es-ES)

- Dicionários em [public/locales](../public/locales)
  (`pt-BR.json`, `en.json`, `es-ES.json`), carregados por
  [src/lib/i18n/dictionaries.ts](../src/lib/i18n/dictionaries.ts).
- [LanguageContext.tsx](../src/contexts/LanguageContext.tsx) expõe
  `{ dictionary, locale, setLocale }`, persiste o locale e sincroniza o i18next
  ([src/lib/i18n.ts](../src/lib/i18n.ts), settings em
  [src/lib/i18n/settings.ts](../src/lib/i18n/settings.ts)).
- Em tela: `const { dictionary } = useLanguage()` e leia chaves tipadas
  (`dictionary.nav.home`, `dictionary.login.error`…). O dicionário pt-BR define o
  **shape** (`AppDictionary`). Troca de idioma: [LocaleSwitcher](../src/components/LocaleSwitcher.tsx).
- Evite texto hardcoded: adicione a chave nos três JSONs.

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
  em `storageKeys.fontScale`.

## Autenticação, biometria e gate

- **Sessão demo** em [src/lib/auth/session.ts](../src/lib/auth/session.ts):
  `signIn`/`signOut`/`getSession` persistem um `DemoSession` em `localStorage`
  **e cookies** (`mp_access_token`, `mp_username`, `mp_profile`,
  `mp_allowed_routes`), e preferência de biometria por login.
- [AuthContext.tsx](../src/contexts/AuthContext.tsx) expõe `isReady`, `session`,
  `biometricEnabled`, `signIn/signOut`, `refreshSession`, `resolveAccessMode`,
  `hasProtectedSession`.
- **Gate da área protegida** ([PortalGate](../src/components/portal-gate.tsx),
  usado em [(Portal)/portal/layout.tsx](<../src/app/(Portal)/portal/layout.tsx>)):
  sem sessão → redireciona a `/login`; em **nativo com biometria habilitada**
  bloqueia e pede autenticação, inclusive ao voltar para o app
  ([app-visibility.ts](../src/lib/platform/app-visibility.ts)).
- Modos de acesso em [protected-access.ts](../src/lib/auth/protected-access.ts):
  `biometric` | `web-session` | `none`.

![Fluxo do PortalGate: sem sessão vai para /login; com sessão web renderiza; no nativo com biometria bloqueia até requestBiometricAuth (ok renderiza, falha faz retry/signOut).](/docs/portal-gate-fluxo.svg)

## Storage

- [src/lib/platform/storage.ts](../src/lib/platform/storage.ts): wrapper sobre
  `window.localStorage` com guarda de SSR (`typeof window`). Chaves centralizadas
  em `storageKeys` (`locale`, `session`, `theme`, `themeColors`, `fontPreset`,
  `biometricPreferenceByLogin`, `developerModeSettings`).

## Camada nativa (Capacitor)

Recursos nativos ficam encapsulados em [src/lib/platform](../src/lib/platform)
(reexportados por [index.ts](../src/lib/platform/index.ts)). Padrão comum:
**checar `isNativePlatform()` e importar o plugin de forma lazy** (`await
import(...)`), com *fallback* seguro na web.

| Módulo | Arquivo | API |
| --- | --- | --- |
| Plataforma | [capacitor.ts](../src/lib/platform/capacitor.ts) | `isNativePlatform`, `getPlatform`, `isMobileViewport`, `isTabletViewport`. |
| Biometria | [biometrics.ts](../src/lib/platform/biometrics.ts) | `isBiometricAuthAvailable`, `requestBiometricAuth(reason)`. |
| Câmera | [camera.ts](../src/lib/platform/camera.ts) | `pickCameraPhoto()` (DataUrl). |
| Arquivos | [files.ts](../src/lib/platform/files.ts) | `pickFile()`, `readTextFile(path)`. |
| Notificações | [notifications.ts](../src/lib/platform/notifications.ts) | `requestLocalNotificationPermission`, `requestPushNotificationPermission`. |
| Visibilidade | [app-visibility.ts](../src/lib/platform/app-visibility.ts) | `subscribeToAppVisibility(handler)`. |

> O lazy import mantém os plugins fora do bundle web e evita erros em ambiente
> sem nativo. Novos recursos nativos devem seguir o mesmo padrão neste diretório.

## Cliente HTTP

- [src/services/api/http.ts](../src/services/api/http.ts): `apiFetch(path,
  options)` — `fetch` com `Content-Type: application/json`, `baseUrl` opcional e
  erro lançado em respostas não-ok. Ainda não há serviços de domínio (sem
  backend); a base de URL vem de `NEXT_PUBLIC_API_URL`
  ([env/public.ts](../src/lib/env/public.ts)).

## Contexts globais (resumo)

| Context | Arquivo | Papel |
| --- | --- | --- |
| `ThemeProvider` | [ThemeProvider.tsx](../src/contexts/ThemeProvider.tsx) | Tema, preset de fonte, cores customizadas. |
| `LanguageProvider` | [LanguageContext.tsx](../src/contexts/LanguageContext.tsx) | Dicionário e locale. |
| `AuthProvider` | [AuthContext.tsx](../src/contexts/AuthContext.tsx) | Sessão demo e biometria. |
| `DeviceProvider` | [DeviceContext.tsx](../src/contexts/DeviceContext.tsx) | `view` (mobile/tablet/desktop) e flags nativas. |
| `DeveloperModeProvider` | [DeveloperModeContext.tsx](../src/contexts/DeveloperModeContext.tsx) | Flags de desenvolvimento, persistidas. |
| `UIProvider` | [UIContext.tsx](../src/contexts/UIContext.tsx) | Estado leve de UI (`navigationOpen`). |
| `SystemProvider` | [SystemContext.tsx](../src/contexts/SystemContext.tsx) | Geometria da malha + painéis (ver [04](./04-shell-adaptativo.md)). |
| `NavigationProvider` | [NavigationContext.tsx](../src/contexts/NavigationContext.tsx) | Itens e *placement* da navegação. |

## Componentes de UI (design system)

Primeira fonte de reutilização — [src/components/ui](../src/components/ui):

| Componente | Arquivo | Uso |
| --- | --- | --- |
| `Button` | [ui/button.tsx](../src/components/ui/button.tsx) | Variantes semânticas (default, outline, secondary, ghost, danger). |
| `Card` | [ui/card.tsx](../src/components/ui/card.tsx) | `Card`/`CardHeader`/`CardTitle`/`CardContent` — blocos e painéis. |
| `Input` / `InputText` / `InputNumber` / `InputColor` | [ui/](../src/components/ui) | Campos de formulário com tokens. |
| `Label` | [ui/label.tsx](../src/components/ui/label.tsx) | Rótulo de campo. |
| `Switch` | [ui/switch.tsx](../src/components/ui/switch.tsx) | Toggle (usado no painel do sistema). |
| `SegmentSelector` | [ui/segment-selector.tsx](../src/components/ui/segment-selector.tsx) | Seleção segmentada. |
| `GenericTable` | [ui/generic-table.tsx](../src/components/ui/generic-table.tsx) | Componente adaptativo: tabela completa no desktop e lista estilo Expo (cards + filtros + FAB) no mobile. Ver [06 — Componentes adaptativos](./06-componentes-adaptativos.md). |
| `Chart` | [ui/chart.tsx](../src/components/ui/chart.tsx) | Wrapper de gráficos no estilo shadcn (Recharts): `ChartContainer`, `ChartTooltipContent`, `ChartLegendContent`. Cores via tokens `--chart-1..5`. Demo em [/portal/analytics](<../src/app/(Portal)/portal/analytics/page.tsx>). |
| `FilterModal` | [ui/filter-modal.tsx](../src/components/ui/filter-modal.tsx) | Filtro adaptativo (sheet no mobile, dialog no desktop) usado pelo `GenericTable`. |

## Modo desenvolvedor

- [DeveloperModeContext.tsx](../src/contexts/DeveloperModeContext.tsx) +
  [DeveloperModePainel.tsx](../src/components/developer-mode/DeveloperModePainel.tsx):
  flags de inspeção/runtime. Habilitado por `NEXT_PUBLIC_DEVELOPER_MODE=true` ou
  fora de produção. **Bloqueado em builds homolog/produção** pelo
  [validate-build-env.mjs](../scripts/validate-build-env.mjs).
- Mantenha as ferramentas de desenvolvimento desacopladas da jornada do usuário
  final.

Voltar ao [índice](./README.md).
