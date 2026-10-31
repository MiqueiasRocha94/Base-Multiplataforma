/**
 * Atualização remota do app: pacote web (HTML/CSS/JS) assinado, baixado do canal
 * marca × ambiente e aplicado na abertura seguinte do app.
 *
 * RECURSO OPCIONAL, removido dos artefatos como o código de dev: este módulo só
 * existe no app gerado com `APP_UPDATE_ENABLED=true`; fora dele (web sempre, app
 * gerado sem a variável) a pasta e as regiões `@app-update` saem da entrada de
 * build e o plugin nativo fica fora do APK. Só é importado dentro de regiões
 * `@app-update`.
 *
 * Como usar (ligar, chaves, gerar e publicar o pacote):
 *   docs/ambiente-e-build.md → "Atualização remota do app"
 *   .agents/specs/atualizacao-remota-app.md (requisitos e critérios)
 *
 * NÃO FAÇA (regras completas e motivos na seção acima):
 *   - pacote com código nativo ou qualquer coisa além de HTML/CSS/JS e assets;
 *   - liberar por pacote perfil ou recurso que não passou pela revisão da loja,
 *     ou deixar telas escondidas no app para ligar depois;
 *   - aceitar pacote sem assinatura ou baixar de endereço vindo do conteúdo
 *     (o manifesto vem só de NEXT_PUBLIC_APP_UPDATE_URL, fixada no build);
 *   - usar pacote para mudar permissão nativa, plugin ou coleta de dados.
 *
 * Políticas das lojas que essas regras cumprem:
 *   - Apple App Store Review Guidelines 2.5.2, 2.5.19, 2.3.1:
 *     https://developer.apple.com/app-store/review/guidelines/
 *   - Apple Developer Program License Agreement 3.3.1 B (código interpretado):
 *     https://developer.apple.com/support/terms/apple-developer-program-license-agreement/
 *   - Google Play, Abuso de dispositivo e rede:
 *     https://support.google.com/googleplay/android-developer/answer/9888379
 */
import { isNativePlatform } from "@/lib/platform/capacitor";
import { getStorageItem, setStorageItem } from "@/lib/platform/storage";

/** Manifesto do canal, gerado por scripts/app-update-bundle.mjs. */
export type AppUpdateManifest = {
  schema: 1;
  channel: string;
  version: string;
  minNativeVersion: string;
  mandatory: boolean;
  bundle: { url: string; checksum: string; signature: string };
};

export type AppUpdate = AppUpdateManifest & { bundleUrl: string };

// Fixados no build (scripts/build-target.mjs), nunca vindos do conteúdo baixado.
const ENABLED = process.env.NEXT_PUBLIC_APP_UPDATE_ENABLED === "true";
const MANIFEST_URL = process.env.NEXT_PUBLIC_APP_UPDATE_URL ?? "";
const CHANNEL = process.env.NEXT_PUBLIC_APP_UPDATE_CHANNEL ?? "";
const RUNNING_VERSION = process.env.NEXT_PUBLIC_APP_UPDATE_VERSION ?? "";

// Pacotes que voltaram ao embutido por não confirmar a abertura: não são aplicados de novo.
const BLOCKED_KEY = "app-update-blocked-bundles";

async function liveUpdate() {
  const { LiveUpdate } = await import("@capawesome/capacitor-live-update");
  return LiveUpdate;
}

export function appUpdateActive() {
  return ENABLED && Boolean(MANIFEST_URL) && isNativePlatform();
}

/** Compara versões `MAJOR.MINOR.PATCH`: negativo se `a < b`. */
export function compareVersions(a: string, b: string) {
  const left = a.split(".").map(Number);
  const right = b.split(".").map(Number);
  for (let index = 0; index < 3; index += 1) {
    const diff = (left[index] ?? 0) - (right[index] ?? 0);
    if (diff !== 0) return diff;
  }
  return 0;
}

function blockedBundles(): string[] {
  try {
    const value = JSON.parse(getStorageItem(BLOCKED_KEY) ?? "[]");
    return Array.isArray(value) ? value.filter((id) => typeof id === "string") : [];
  } catch {
    // Valor corrompido no storage: recomeça a lista (só serve para não repetir pacote ruim).
    return [];
  }
}

function isManifest(value: unknown): value is AppUpdateManifest {
  const manifest = value as AppUpdateManifest | null;
  return (
    manifest?.schema === 1 &&
    typeof manifest.channel === "string" &&
    typeof manifest.version === "string" &&
    typeof manifest.minNativeVersion === "string" &&
    typeof manifest.mandatory === "boolean" &&
    typeof manifest.bundle?.url === "string" &&
    typeof manifest.bundle.checksum === "string" &&
    typeof manifest.bundle.signature === "string"
  );
}

/**
 * Confirma que o pacote em execução abriu. Sem a confirmação no prazo
 * (`readyTimeout`), o plugin volta ao pacote embutido no APK; o pacote que
 * falhou entra na lista de bloqueados.
 */
export async function confirmAppStart() {
  const result = await (await liveUpdate()).ready();
  if (result.rollback && result.previousBundleId) {
    setStorageItem(BLOCKED_KEY, JSON.stringify([...new Set([...blockedBundles(), result.previousBundleId])]));
  }
}

/** Pacote novo aplicável a este app, ou `null`. */
export async function findAppUpdate(): Promise<AppUpdate | null> {
  const response = await fetch(MANIFEST_URL, { cache: "no-store" });
  // Canal sem pacote para baixar (ex.: o do `npm run dev` sem mudança).
  if (response.status === 204) {
    return null;
  }
  if (!response.ok) {
    throw new Error(`manifesto indisponível (HTTP ${response.status})`);
  }
  const manifest: unknown = await response.json();
  if (!isManifest(manifest)) {
    throw new Error("manifesto em formato inválido");
  }
  const { versionName } = await (await liveUpdate()).getVersionName();
  const applicable =
    manifest.channel === CHANNEL &&
    compareVersions(manifest.version, RUNNING_VERSION) > 0 &&
    compareVersions(versionName, manifest.minNativeVersion) >= 0 &&
    !blockedBundles().includes(manifest.version);
  return applicable ? { ...manifest, bundleUrl: new URL(manifest.bundle.url, MANIFEST_URL).href } : null;
}

/** Baixa (se preciso) e deixa o pacote para a próxima abertura. A assinatura é conferida pelo plugin. */
export async function prepareAppUpdate(update: AppUpdate) {
  const plugin = await liveUpdate();
  const { bundleIds } = await plugin.getBundles();
  if (!bundleIds.includes(update.version)) {
    await plugin.downloadBundle({
      bundleId: update.version,
      url: update.bundleUrl,
      checksum: update.bundle.checksum,
      signature: update.bundle.signature,
    });
  }
  await plugin.setNextBundle({ bundleId: update.version });
}

/** Aplica já o pacote preparado (pacote obrigatório). */
export async function applyAppUpdateNow() {
  await (await liveUpdate()).reload();
}

// @dev-only:start
// Verificação sob demanda no APK debug: o botão do painel de dev pede e o
// AppUpdateGate responde (docs/ambiente-e-build.md → "Atualização no desenvolvimento").
export type AppUpdateCheckResult = "none" | "applying" | "failed";

const CHECK_EVENT = "app-update:check";

/** Pede ao `AppUpdateGate` uma verificação agora; resolve com o resultado. */
export function requestAppUpdateCheck(): Promise<AppUpdateCheckResult> {
  return new Promise((resolve) => {
    window.dispatchEvent(new CustomEvent<(result: AppUpdateCheckResult) => void>(CHECK_EVENT, { detail: resolve }));
  });
}

/** Atende os pedidos de verificação; devolve a função que para de atender. */
export function onAppUpdateCheckRequest(check: () => Promise<AppUpdateCheckResult>) {
  const listener = (event: Event) => {
    const respond = (event as CustomEvent<(result: AppUpdateCheckResult) => void>).detail;
    void check().then(respond);
  };
  window.addEventListener(CHECK_EVENT, listener);
  return () => window.removeEventListener(CHECK_EVENT, listener);
}
// @dev-only:end
