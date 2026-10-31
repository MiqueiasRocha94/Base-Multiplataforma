// Chave RSA que assina os pacotes da atualização remota. A chave pública vai no
// APK (plugin LiveUpdate) e o app recusa pacote sem assinatura válida.
//
// Recurso opcional: só usado com APP_UPDATE_ENABLED=true. Como usar e regras:
//   docs/ambiente-e-build.md → "Atualização remota do app"
// NÃO FAÇA: versionar, copiar para docs/issues ou trocar a chave de produção sem
// gerar versão de loja nova (os apps instalados só conhecem a chave pública antiga).
//
//   - produção: .secrets/app-update.production.<marca>.pem (obrigatória; nunca gerada);
//   - homologação/desenvolvimento: .secrets/app-update.<ambiente>.pem, gerada na
//     primeira vez e reaproveitada (vale para a máquina que a gerou, como o keystore);
//   - APP_UPDATE_PRIVATE_KEY_FILE: caminho explícito (ex.: segredo do build Docker).
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

import { projectRoot } from "./app-env.mjs";

const SECRETS_DIR = path.join(projectRoot, ".secrets");

export function appUpdateKeyFile(appEnv, brand) {
  return appEnv === "production"
    ? path.join(SECRETS_DIR, `app-update.production.${brand}.pem`)
    : path.join(SECRETS_DIR, `app-update.${appEnv}.pem`);
}

/** Chave privada (KeyObject) e pública (PEM SPKI, formato que o plugin lê). */
export function resolveAppUpdateKey(appEnv, brand, { env = process.env } = {}) {
  const explicit = (env.APP_UPDATE_PRIVATE_KEY_FILE ?? "").trim();
  const file = explicit ? path.resolve(projectRoot, explicit) : appUpdateKeyFile(appEnv, brand);

  if (!fs.existsSync(file)) {
    if (explicit || appEnv === "production") {
      throw new Error(
        `[app-update] chave de assinatura dos pacotes ausente: ${path.relative(projectRoot, file)}. ` +
          "Produção usa a chave da marca, nunca gerada (docs/ambiente-e-build.md → \"Atualização remota do app\").",
      );
    }
    const { privateKey } = crypto.generateKeyPairSync("rsa", { modulusLength: 2048 });
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, privateKey.export({ type: "pkcs8", format: "pem" }), { mode: 0o600 });
    console.log(`[app-update] chave de ${appEnv} gerada em ${path.relative(projectRoot, file)}`);
  }

  const privateKey = crypto.createPrivateKey(fs.readFileSync(file));
  const publicKeyPem = crypto.createPublicKey(privateKey).export({ type: "spki", format: "pem" }).toString();
  return { privateKey, publicKeyPem };
}
