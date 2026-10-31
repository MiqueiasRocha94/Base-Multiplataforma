// Identidade do app mobile por marca (white-label): applicationId, nome e versao.
//
// Cada marca e um app proprio na loja; o APK so atualiza o app publicado se o
// applicationId e a chave forem os dele e o versionCode for maior. Os ids ficam
// em scripts/mobile-apps.json. A versao da loja e a versao NATIVA
// (`nativeVersion` em mobile-apps.json), separada da versao da aplicacao
// (package.json): ela so sobe quando sai versao de loja (camada nativa).
import fs from "node:fs";
import path from "node:path";

import { projectRoot } from "./app-env.mjs";

const MOBILE_APPS = JSON.parse(fs.readFileSync(path.join(projectRoot, "scripts", "mobile-apps.json"), "utf8"));

/**
 * versionCode: MAJOR·100000 + MINOR·1000 + PATCH·10
 * (3.1.4 → 301040). Minor e patch vao ate 99 para nao colidir com o proximo major.
 */
export function versionCodeFrom(version) {
  const match = /^(\d+)\.(\d+)\.(\d+)$/.exec(String(version ?? "").trim());
  if (!match) {
    throw new Error(`[mobile-app] versao invalida "${version}": use MAJOR.MINOR.PATCH (ex.: 4.0.0)`);
  }
  const [major, minor, patch] = match.slice(1).map(Number);
  if (minor > 99 || patch > 99) {
    throw new Error(`[mobile-app] versao ${version} fora do esquema do versionCode (minor e patch ate 99)`);
  }
  return major * 100000 + minor * 1000 + patch * 10;
}

/**
 * Resolve o app da marca para o ambiente. Producao exige a marca explicita
 * (NEXT_PUBLIC_BRAND), para nunca publicar com a marca default por engano.
 * Fora de producao o applicationId ganha o sufixo do ambiente, para o app de
 * teste conviver no aparelho com o publicado. versionName/versionCode vem da
 * versao nativa; `appVersion` (versao da aplicacao) so identifica o build.
 */
export function resolveMobileApp({ brand, appEnv, appVersion, nativeVersion = MOBILE_APPS.nativeVersion }) {
  const requested = String(brand ?? "").trim().toLowerCase();
  if (!requested && appEnv === "production") {
    throw new Error("[mobile-app] build de producao exige NEXT_PUBLIC_BRAND (marca do app)");
  }
  const brandId = requested || MOBILE_APPS.defaultBrand;
  const app = MOBILE_APPS.apps[brandId];
  if (!app) {
    throw new Error(
      `[mobile-app] marca desconhecida "${brandId}". Marcas: ${Object.keys(MOBILE_APPS.apps).join(", ")}`,
    );
  }
  return {
    brand: brandId,
    appId: appEnv === "production" ? app.appId : `${app.appId}.${appEnv}`,
    name: app.name,
    appVersion,
    versionName: nativeVersion,
    versionCode: versionCodeFrom(nativeVersion),
  };
}

/**
 * Imagem do ícone do app da marca, em public/brands/<marca>/: `icon` (1024 px, o
 * símbolo da marca) → `favicon` → `logo` (reservas para marca nova ainda sem
 * `icon`), cada um em PNG ou SVG.
 */
export function appIconSource(brand, root = projectRoot) {
  const names = ["icon", "favicon", "logo"].flatMap((name) => [`${name}.png`, `${name}.svg`]);
  for (const name of names) {
    const file = path.join(root, "public", "brands", brand, name);
    if (fs.existsSync(file)) return file;
  }
  throw new Error(`[mobile-app] marca "${brand}" sem icon, favicon nem logo (.png/.svg) em public/brands/${brand}/`);
}

// Densidades do Android: ícone clássico/redondo (48 dp) e camada da frente do
// ícone adaptativo (108 dp, conteúdo dentro da zona segura de 66 dp).
const ICON_DENSITIES = { mdpi: 1, hdpi: 1.5, xhdpi: 2, xxhdpi: 3, xxxhdpi: 4 };

async function iconPng(sharp, source, size, contentRatio, { round = false, background } = {}) {
  const content = Math.round(size * contentRatio);
  const image = await sharp(source)
    .resize(content, content, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();
  let canvas = sharp({ create: { width: size, height: size, channels: 4, background: background ?? { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite([{ input: image, gravity: "center" }]);
  if (round) {
    const mask = Buffer.from(`<svg width="${size}" height="${size}"><circle cx="${size / 2}" cy="${size / 2}" r="${size / 2}"/></svg>`);
    canvas = sharp(await canvas.png().toBuffer()).composite([{ input: mask, blend: "dest-in" }]);
  }
  return canvas.png().toBuffer();
}

/** Grava os ícones do launcher (clássico, redondo e adaptativo) a partir da imagem da marca. */
export async function applyAndroidIcon(androidDirectory, brand) {
  const { default: sharp } = await import("sharp");
  const source = appIconSource(brand);
  const white = { r: 255, g: 255, b: 255, alpha: 1 };
  const res = path.join(androidDirectory, "app", "src", "main", "res");
  for (const [density, scale] of Object.entries(ICON_DENSITIES)) {
    const dir = path.join(res, `mipmap-${density}`);
    fs.mkdirSync(dir, { recursive: true });
    const legacy = 48 * scale;
    fs.writeFileSync(path.join(dir, "ic_launcher.png"), await iconPng(sharp, source, legacy, 0.8, { background: white }));
    fs.writeFileSync(path.join(dir, "ic_launcher_round.png"), await iconPng(sharp, source, legacy, 0.68, { round: true, background: white }));
    fs.writeFileSync(path.join(dir, "ic_launcher_foreground.png"), await iconPng(sharp, source, 108 * scale, 0.6));
  }
  const values = path.join(res, "values");
  fs.mkdirSync(values, { recursive: true });
  fs.writeFileSync(
    path.join(values, "ic_launcher_background.xml"),
    '<?xml version="1.0" encoding="utf-8"?>\n<resources>\n    <color name="ic_launcher_background">#FFFFFF</color>\n</resources>\n',
  );
  console.log(`[mobile-app] ícone do app a partir de ${path.relative(projectRoot, source)}`);
}

/** Nome do ícone pequeno das notificações (drawable); o mesmo vai em `LocalNotifications.smallIcon`. */
export const NOTIFICATION_ICON = "ic_stat_notify";

const FCM_ICON_META =
  `<meta-data android:name="com.google.firebase.messaging.default_notification_icon" android:resource="@drawable/${NOTIFICATION_ICON}" />`;

/**
 * Ícone da barra de status das notificações a partir de public/brands/<marca>/notification.png
 * (ou .svg; silhueta branca em fundo transparente — o Android usa só o alfa). Grava o drawable em
 * 24 dp por densidade e registra no manifest o ícone padrão das notificações push (FCM).
 */
export async function applyAndroidNotificationIcon(androidDirectory, brand) {
  const { default: sharp } = await import("sharp");
  const source = ["notification.png", "notification.svg"]
    .map((name) => path.join(projectRoot, "public", "brands", brand, name))
    .find((file) => fs.existsSync(file));
  if (!source) {
    throw new Error(`[mobile-app] marca "${brand}" sem notification.png/.svg em public/brands/${brand}/`);
  }
  const main = path.join(androidDirectory, "app", "src", "main");
  for (const [density, scale] of Object.entries(ICON_DENSITIES)) {
    const dir = path.join(main, "res", `drawable-${density}`);
    fs.mkdirSync(dir, { recursive: true });
    const size = 24 * scale;
    await sharp(source).resize(size, size, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png().toFile(path.join(dir, `${NOTIFICATION_ICON}.png`));
  }

  const manifestFile = path.join(main, "AndroidManifest.xml");
  const manifest = fs.readFileSync(manifestFile, "utf8");
  if (!manifest.includes("default_notification_icon")) {
    fs.writeFileSync(manifestFile, replaceOnce(manifest, /(\s*)<\/application>/, `$1    ${FCM_ICON_META}$1</application>`, manifestFile));
  }
}

/** Canal da atualização remota: um por marca × ambiente (docs/ambiente-e-build.md → "Atualização remota do app"). */
export function appUpdateChannelFor(brand, appEnv) {
  return `${brand}/${appEnv}`;
}

function replaceOnce(content, pattern, replacement, file) {
  if (!pattern.test(content)) {
    throw new Error(`[mobile-app] ${pattern} nao encontrado em ${file}`);
  }
  return content.replace(pattern, replacement);
}

/**
 * Grava a identidade no projeto Android (regeneravel pelo Capacitor, fora do git):
 * applicationId/versionCode/versionName no build.gradle e o nome exibido no strings.xml.
 */
export function applyAndroidIdentity(androidDirectory, app) {
  const gradleFile = path.join(androidDirectory, "app", "build.gradle");
  let gradle = fs.readFileSync(gradleFile, "utf8");
  gradle = replaceOnce(gradle, /applicationId\s+"[^"]*"/, `applicationId "${app.appId}"`, gradleFile);
  gradle = replaceOnce(gradle, /versionCode\s+\d+/, `versionCode ${app.versionCode}`, gradleFile);
  gradle = replaceOnce(gradle, /versionName\s+"[^"]*"/, `versionName "${app.versionName}"`, gradleFile);
  fs.writeFileSync(gradleFile, gradle);

  const stringsFile = path.join(androidDirectory, "app", "src", "main", "res", "values", "strings.xml");
  let strings = fs.readFileSync(stringsFile, "utf8");
  for (const key of ["app_name", "title_activity_main"]) {
    strings = replaceOnce(
      strings,
      new RegExp(`(<string name="${key}">)[^<]*(</string>)`),
      `$1${app.name}$2`,
      stringsFile,
    );
  }
  fs.writeFileSync(stringsFile, strings);

  console.log(
    `[mobile-app] ${app.name}: ${app.appId} nativo ${app.versionName} (${app.versionCode}), aplicacao ${app.appVersion}`,
  );
}
