#!/usr/bin/env node
// Valida o manifest e os ícones de um app web instalável (PWA) contra requisitos-pwa.mjs: campos obrigatórios,
// "display", ícones PNG 192 e 512 com a medida declarada, ícone maskable e apple-touch-icon. Lê o cabeçalho PNG sem
// dependência (cópia própria, para o script ser adotado sem os das lojas). Sai com 1 se houver erro; aviso não
// bloqueia. Não confere HTTPS, service worker nem a heurística de engajamento: isso é teste em aparelho real.
//
// Uso: node scripts/pwa/validar-pwa.mjs --manifest <manifest.json> [--public <pasta>] [--base <caminho base>]
//        [--apple-touch-icon <arquivo>]
// O manifest precisa ser JSON: com manifest gerado por código (app/manifest.ts), valide o arquivo do build.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { VERIFICADO_EM, MANIFEST, ICONES, APPLE_TOUCH_ICON } from "./requisitos-pwa.mjs";

const PNG_ASSINATURA = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

// { largura, altura } ou null se não for PNG.
function lerPng(buffer) {
  if (buffer.length < 24 || !buffer.subarray(0, 8).equals(PNG_ASSINATURA)) return null;
  return { largura: buffer.readUInt32BE(16), altura: buffer.readUInt32BE(20) };
}

function lerArgs(argv) {
  const opcoes = { manifest: null, public: null, base: "", appleTouchIcon: null };
  const nomes = { "--manifest": "manifest", "--public": "public", "--base": "base", "--apple-touch-icon": "appleTouchIcon" };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--") continue;
    const chave = nomes[argv[i]];
    if (!chave) throw new Error(`Argumento desconhecido: ${argv[i]}`);
    if (i + 1 >= argv.length) throw new Error(`${argv[i]} exige um valor`);
    opcoes[chave] = argv[++i];
  }
  if (!opcoes.manifest) throw new Error("Informe --manifest <arquivo>");
  return opcoes;
}

// Caminho do arquivo de um "src" do manifest: relativo ao manifest, ou à pasta pública se começa com "/" (sem o
// caminho base). null para URL externa.
function resolverIcone(src, { manifest, publico, base }) {
  if (/^[a-z][a-z0-9+.-]*:/i.test(src)) return null;
  const limpo = src.split(/[?#]/)[0];
  if (limpo.startsWith("/")) {
    const semBase = base && limpo.startsWith(`${base.replace(/\/$/, "")}/`) ? limpo.slice(base.replace(/\/$/, "").length) : limpo;
    return path.join(publico, ...semBase.split("/").filter(Boolean));
  }
  return path.join(path.dirname(manifest), ...limpo.split("/").filter(Boolean));
}

function medidasDeclaradas(sizes) {
  return String(sizes || "").trim().split(/\s+/).filter(Boolean).map((medida) => {
    const [largura, altura] = medida.toLowerCase().split("x").map(Number);
    return { largura, altura };
  });
}

function validarManifest(dados, rel, arquivo) {
  const { nome, startUrl, display, relacionados, recomendados } = MANIFEST;
  if (!nome.campos.some((campo) => typeof dados[campo] === "string" && dados[campo].trim())) {
    rel.erro(arquivo, nome.campos.join(" ou "), "ausente", "preenchido", nome.fonte);
  }
  if (typeof dados[startUrl.campo] !== "string") rel.erro(arquivo, startUrl.campo, "ausente", "preenchido", startUrl.fonte);
  if (!display.valores.includes(dados[display.campo])) {
    rel.erro(arquivo, display.campo, dados[display.campo] ?? "ausente", display.valores.join(", "), display.fonte);
  }
  if (dados[relacionados.campo] === true) rel.erro(arquivo, relacionados.campo, "true", "ausente ou false", relacionados.fonte);
  for (const campo of recomendados.campos) {
    if (dados[campo] === undefined) rel.aviso(arquivo, campo, "ausente", "recomendado", recomendados.fonte);
  }
}

function validarIcones(dados, rel, contexto) {
  const icones = Array.isArray(dados.icons) ? dados.icons : [];
  const validos = [];
  for (const icone of icones) {
    const arquivo = resolverIcone(String(icone.src || ""), contexto);
    if (arquivo === null) {
      rel.aviso(contexto.manifest, "ícone externo", icone.src, "arquivo do próprio app (não conferido)", ICONES.fonte);
      continue;
    }
    if (!fs.existsSync(arquivo)) {
      rel.erro(arquivo, "ícone", "ausente", `arquivo de ${icone.src}`, ICONES.fonte);
      continue;
    }
    const png = lerPng(fs.readFileSync(arquivo));
    if (!png) {
      rel.erro(arquivo, "formato", "não é PNG", ICONES.formatos.join(" ou "), ICONES.fonte);
      continue;
    }
    const declaradas = medidasDeclaradas(icone.sizes);
    if (!declaradas.some((medida) => medida.largura === png.largura && medida.altura === png.altura)) {
      rel.erro(arquivo, "sizes", `${png.largura}×${png.altura} no arquivo`, `declarado ${icone.sizes || "nada"}`, ICONES.fonte);
      continue;
    }
    const propositos = String(icone.purpose || "any").split(/\s+/);
    validos.push({ ...png, propositos });
  }
  for (const medida of ICONES.obrigatorios) {
    const tem = validos.some((icone) => icone.largura === medida && icone.altura === medida && icone.propositos.includes("any"));
    if (!tem) rel.erro(contexto.manifest, `ícone ${medida}×${medida}`, "ausente", "PNG com purpose any", ICONES.fonte);
  }
  const maskable = ICONES.maskable;
  const temMaskable = validos.some((icone) => icone.propositos.includes("maskable") && icone.largura >= maskable.medida);
  if (!temMaskable) rel.aviso(contexto.manifest, "ícone maskable", "ausente", `≥ ${maskable.medida}×${maskable.medida}`, maskable.fonte);
}

function validarAppleTouchIcon(arquivo, rel) {
  const regra = APPLE_TOUCH_ICON;
  if (!arquivo || !fs.existsSync(arquivo)) {
    rel.aviso(arquivo || regra.arquivo, "apple-touch-icon", "ausente", `PNG ${regra.largura}×${regra.altura}`, regra.fonte);
    return;
  }
  const png = lerPng(fs.readFileSync(arquivo));
  if (!png) {
    rel.erro(arquivo, "formato", "não é PNG", regra.formatos.join(" ou "), regra.fonte);
  } else if (png.largura !== regra.largura || png.altura !== regra.altura) {
    rel.aviso(arquivo, "dimensão", `${png.largura}×${png.altura}`, `${regra.largura}×${regra.altura}`, regra.fonte);
  }
}

function validar({ manifest, public: publico = null, base = "", appleTouchIcon = null }) {
  const itens = [];
  const registrar = (nivel) => (arquivo, regra, encontrado, limite, fonte) => {
    itens.push({ nivel, arquivo: path.relative(process.cwd(), arquivo).split(path.sep).join("/"), regra, encontrado, limite, fonte });
  };
  const rel = { erro: registrar("erro"), aviso: registrar("aviso") };

  if (!fs.existsSync(manifest)) {
    rel.erro(manifest, "manifest", "ausente", "arquivo JSON", MANIFEST.nome.fonte);
    return itens;
  }
  let dados;
  try {
    dados = JSON.parse(fs.readFileSync(manifest, "utf8"));
  } catch (erro) {
    rel.erro(manifest, "JSON", erro.message, "JSON válido", MANIFEST.nome.fonte);
    return itens;
  }
  const pasta = publico || path.dirname(manifest);
  validarManifest(dados, rel, manifest);
  validarIcones(dados, rel, { manifest, publico: pasta, base });
  validarAppleTouchIcon(appleTouchIcon || path.join(pasta, APPLE_TOUCH_ICON.arquivo), rel);
  return itens;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  let opcoes;
  try {
    opcoes = lerArgs(process.argv.slice(2));
  } catch (erro) {
    console.error(erro.message);
    process.exit(2);
  }
  const itens = validar(opcoes);
  for (const item of itens) {
    const fonte = item.fonte ? ` [${item.fonte}]` : "";
    console.log(`${item.nivel.toUpperCase()} ${item.arquivo}: ${item.regra} = ${item.encontrado} (esperado ${item.limite})${fonte}`);
  }
  const erros = itens.filter((item) => item.nivel === "erro").length;
  console.log(`${erros} erro(s), ${itens.length - erros} aviso(s). Requisitos verificados em ${VERIFICADO_EM}.`);
  process.exit(erros ? 1 : 0);
}

export { lerPng, lerArgs, validar };
