/**
 * Entrada dos recursos de dev SEM React (lib, services e telas importam daqui).
 * Só é importada dentro de regiões `@dev-only`, que a entrada de build de
 * homologação/produção remove (docs/ferramentas-dev.md → "Fora dos artefatos").
 */
export { devApiBase } from "./api-proxy";
export { errorDiagnostics, type ErrorDiagnostics } from "./error-diagnostics";
export { apiQuickLogin, type QuickLogin } from "./quick-login";
export { systemPanelEnabled } from "./system-panel";
export { devTurnstileSiteKey } from "./turnstile";
export { devWebCrypto, type DevEcdsa } from "./webcrypto";
