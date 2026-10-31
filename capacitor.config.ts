import fs from "node:fs";
import path from "node:path";

import type { CapacitorConfig } from "@capacitor/cli";

import mobileApps from "./scripts/mobile-apps.json";
import packageJson from "./package.json";

// App da marca do build (NEXT_PUBLIC_BRAND), usado pelo `cap add`. O build do APK
// grava a identidade final (sufixo do ambiente e versao) — scripts/mobile-app.mjs.
const brand = process.env.NEXT_PUBLIC_BRAND?.trim().toLowerCase() || mobileApps.defaultBrand;
const app = mobileApps.apps[brand as keyof typeof mobileApps.apps] ?? mobileApps.apps[mobileApps.defaultBrand as keyof typeof mobileApps.apps];

// APK de debug (development) fala com a API da máquina do dev por HTTP na rede local
// (ex.: http://192.168.x.x:8080): libera cleartext e mixed content SÓ nesse ambiente.
const isDevelopmentBuild = (process.env.APP_ENV ?? "development") === "development";

// Atualização remota (recurso opcional, docs/ambiente-e-build.md → "Atualização
// remota do app"). Desligada (padrão), o plugin nativo fica FORA do APK: o sync
// só inclui os demais plugins (`includePlugins`) e não há configuração dele.
// Ligada (APP_UPDATE_ENABLED=true), a chave pública é obrigatória: o app recusa
// pacote sem assinatura válida. NÃO FAÇA: ligar sem chave, afrouxar a assinatura
// ou carregar conteúdo de outro endereço. Políticas das lojas:
// https://developer.apple.com/app-store/review/guidelines/ (2.5.2, 2.5.19, 2.3.1),
// https://developer.apple.com/support/terms/apple-developer-program-license-agreement/ (3.3.1 B),
// https://support.google.com/googleplay/android-developer/answer/9888379
const APP_UPDATE_PLUGIN = "@capawesome/capacitor-live-update";
const appUpdateEnabled = (process.env.APP_UPDATE_ENABLED ?? "").trim().toLowerCase() === "true";
const appUpdatePublicKey = process.env.APP_UPDATE_PUBLIC_KEY?.trim();
if (appUpdateEnabled && !appUpdatePublicKey) {
  throw new Error("APP_UPDATE_ENABLED=true sem APP_UPDATE_PUBLIC_KEY: gere o app por `npm run apk`/`mobile:debug`.");
}

/** Plugins nativos do package.json (os que o `cap sync` detectaria), sem o da atualização remota. */
function pluginsWithoutAppUpdate() {
  return Object.keys(packageJson.dependencies).filter((name) => {
    if (name === APP_UPDATE_PLUGIN) return false;
    const manifest = path.join(process.cwd(), "node_modules", name, "package.json");
    return fs.existsSync(manifest) && "capacitor" in JSON.parse(fs.readFileSync(manifest, "utf8"));
  });
}

const config: CapacitorConfig = {
  appId: app.appId,
  appName: app.name,
  webDir: "out",
  ...(isDevelopmentBuild ? { server: { cleartext: true }, android: { allowMixedContent: true } } : {}),
  plugins: {
    // Ícone da barra de status (silhueta da marca), gravado no build do APK — scripts/mobile-app.mjs.
    LocalNotifications: { smallIcon: "ic_stat_notify" },
    ...(appUpdateEnabled
      ? { LiveUpdate: { publicKey: appUpdatePublicKey, readyTimeout: 10000, autoDeleteBundles: true } }
      : {}),
  },
  ...(appUpdateEnabled ? {} : { includePlugins: pluginsWithoutAppUpdate() }),
};

export default config;
