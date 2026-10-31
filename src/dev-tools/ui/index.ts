/**
 * Entrada dos recursos de dev com React: modo desenvolvedor (contexto e painel)
 * e painel do sistema. Só é importada dentro de regiões `@dev-only`, que a
 * entrada de build de homologação/produção remove (docs/ferramentas-dev.md →
 * "Fora dos artefatos").
 */
export { DeveloperModeProvider, useDeveloperMode, type DeveloperModeSettings } from "./developer-mode-context";
export { DeveloperModePainel, DeveloperModePanelContent } from "./developer-mode-painel";
export { SystemContextPanel, SystemContextPanelContent } from "./system-context-panel";
export { useDevDictionary } from "./use-dev-dictionary";
export { QuickAccess } from "./quick-access";
