import { execFileSync } from "node:child_process";
import { X509Certificate } from "node:crypto";
import fs from "node:fs";
import path from "node:path";

import { lanAddresses, projectRoot } from "./app-env.mjs";

/**
 * Certificado autoassinado do `npm run dev:https`, para abrir o dev server pelo
 * IP da rede local (celular, outra máquina). Por HTTP num IP o navegador não dá
 * contexto seguro: sem WebCrypto, o DPoP do login não roda.
 *
 * Cobre localhost + os IPv4 atuais da máquina e é refeito quando um IP muda.
 * Gerado com openssl (no Windows, o que vem com o Git), sem instalar CA no
 * sistema: o navegador avisa uma vez e segue após "continuar".
 */

const certDir = path.join(projectRoot, "certificates");
const keyPath = path.join(certDir, "dev-key.pem");
const certPath = path.join(certDir, "dev-cert.pem");

function findOpenssl() {
  try {
    execFileSync("openssl", ["version"], { stdio: "ignore" });
    return "openssl";
  } catch {
    // Windows fora do Git Bash: usa o openssl que acompanha o Git.
  }
  try {
    const execPath = execFileSync("git", ["--exec-path"], { encoding: "utf8" }).trim();
    const candidate = path.resolve(execPath, "..", "..", "bin", "openssl.exe");
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  } catch {
    // Sem git no PATH: cai no erro abaixo.
  }
  throw new Error("openssl não encontrado (instale o Git ou o OpenSSL) — necessário para o dev:https.");
}

function coversAll(ips) {
  if (!fs.existsSync(keyPath) || !fs.existsSync(certPath)) {
    return false;
  }
  const cert = new X509Certificate(fs.readFileSync(certPath));
  const notExpired = new Date(cert.validTo).getTime() > Date.now();
  return notExpired && cert.checkHost("localhost") !== undefined && ips.every((ip) => cert.checkIP(ip) !== undefined);
}

export function ensureDevCertificate() {
  const ips = lanAddresses();
  if (!coversAll(ips)) {
    fs.mkdirSync(certDir, { recursive: true });
    const altNames = ["DNS:localhost", "IP:127.0.0.1", "IP:::1", ...ips.map((ip) => `IP:${ip}`)].join(",");
    execFileSync(
      findOpenssl(),
      [
        "req", "-x509", "-newkey", "ec", "-pkeyopt", "ec_paramgen_curve:P-256", "-nodes",
        "-days", "365", "-subj", "/CN=multiplataforma-base dev",
        "-addext", `subjectAltName=${altNames}`,
        "-keyout", keyPath, "-out", certPath,
      ],
      { stdio: "ignore" },
    );
    console.log(`[dev:https] certificado gerado em ${path.relative(projectRoot, certDir)}/`);
  }
  for (const ip of ips) {
    console.log(`[dev:https] rede local: https://${ip}:${process.env.PORT ?? 3000}`);
  }
  return { keyPath, certPath };
}
