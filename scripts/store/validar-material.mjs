#!/usr/bin/env node
// Valida a saída de montar-material.mjs (store/build/<marca>/) contra requisitos-lojas.mjs: tamanho dos textos, URLs,
// formato, dimensões, transparência e quantidade das imagens. Lê o cabeçalho PNG/JPEG sem dependência. Sai com 1 se
// houver erro; aviso não bloqueia. Não decide conteúdo (captura enganosa, texto sobre a imagem): isso é revisão humana.
//
// Uso: node scripts/store/validar-material.mjs [store/build]

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { VERIFICADO_EM, TEXTOS, IMAGENS_PLAY, CAPTURAS_APPLE } from "./requisitos-lojas.mjs";

const PNG_ASSINATURA = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const EXTENSOES_IMAGEM = [".png", ".jpg", ".jpeg"];

// { formato: "png" | "jpeg", largura, altura, alfa } ou null se não for PNG nem JPEG legível.
function lerImagem(buffer) {
  if (buffer.length >= 33 && buffer.subarray(0, 8).equals(PNG_ASSINATURA)) {
    const largura = buffer.readUInt32BE(16);
    const altura = buffer.readUInt32BE(20);
    const tipoCor = buffer[25];
    let alfa = tipoCor === 4 || tipoCor === 6;
    let pos = 8;
    while (!alfa && pos + 8 <= buffer.length) {
      const tamanho = buffer.readUInt32BE(pos);
      const tipo = buffer.toString("latin1", pos + 4, pos + 8);
      if (tipo === "tRNS") alfa = true;
      if (tipo === "IDAT" || tipo === "IEND") break;
      pos += 12 + tamanho;
    }
    return { formato: "png", largura, altura, alfa };
  }
  if (buffer.length >= 4 && buffer[0] === 0xff && buffer[1] === 0xd8) {
    let pos = 2;
    while (pos + 9 < buffer.length) {
      if (buffer[pos] !== 0xff) return null;
      const marcador = buffer[pos + 1];
      if (marcador === 0xff) { pos += 1; continue; }
      if (marcador === 0xd8 || marcador === 0x01 || (marcador >= 0xd0 && marcador <= 0xd7)) { pos += 2; continue; }
      const tamanho = buffer.readUInt16BE(pos + 2);
      const sof = marcador >= 0xc0 && marcador <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marcador);
      if (sof) {
        return { formato: "jpeg", altura: buffer.readUInt16BE(pos + 5), largura: buffer.readUInt16BE(pos + 7), alfa: false };
      }
      pos += 2 + tamanho;
    }
  }
  return null;
}

function contar(texto) {
  return [...texto].length;
}

function lerTexto(arquivo) {
  return fs.readFileSync(arquivo, "utf8").replace(/\r?\n$/, "");
}

function listar(pasta, filtro) {
  if (!fs.existsSync(pasta)) return [];
  return fs.readdirSync(pasta).filter(filtro).sort();
}

function ehImagem(nome) {
  return EXTENSOES_IMAGEM.includes(path.extname(nome).toLowerCase());
}

function criarRelatorio(base) {
  const itens = [];
  const registrar = (nivel) => (arquivo, regra, encontrado, limite, fonte) => {
    itens.push({ nivel, arquivo: path.relative(base, arquivo).split(path.sep).join("/"), regra, encontrado, limite, fonte });
  };
  return { itens, erro: registrar("erro"), aviso: registrar("aviso") };
}

function validarTexto(arquivo, regra, rel) {
  const anotar = regra.aviso ? rel.aviso : rel.erro;
  if (!fs.existsSync(arquivo)) {
    if (regra.obrigatorio) rel.erro(arquivo, "obrigatório", "ausente", "presente", regra.fonte);
    return;
  }
  const texto = lerTexto(arquivo);
  if (regra.obrigatorio && !texto.trim()) rel.erro(arquivo, "obrigatório", "vazio", "preenchido", regra.fonte);
  if (regra.max && contar(texto) > regra.max) anotar(arquivo, "caracteres", contar(texto), `≤ ${regra.max}`, regra.fonte);
  if (regra.min && contar(texto) < regra.min) anotar(arquivo, "caracteres", contar(texto), `≥ ${regra.min}`, regra.fonte);
  if (regra.maxBytes && Buffer.byteLength(texto, "utf8") > regra.maxBytes) {
    anotar(arquivo, "bytes UTF-8", Buffer.byteLength(texto, "utf8"), `≤ ${regra.maxBytes}`, regra.fonte);
  }
  if (regra.palavraMin) {
    const curtas = texto.split(",").map((palavra) => palavra.trim()).filter((palavra) => palavra && contar(palavra) < regra.palavraMin);
    if (curtas.length) anotar(arquivo, "palavra curta", curtas.join(", "), `≥ ${regra.palavraMin} caracteres`, regra.fonte);
  }
  if (regra.url && texto.trim() && !/^https?:\/\/\S+$/.test(texto.trim())) {
    anotar(arquivo, "URL com protocolo", texto.trim(), "http(s)://...", regra.fonte);
  }
}

function validarTextos(pasta, regras, rel) {
  for (const [nome, regra] of Object.entries(regras)) {
    if (nome.includes("*")) {
      const [subpasta] = nome.split("/");
      for (const arquivo of listar(path.join(pasta, subpasta), (n) => n.endsWith(".txt"))) {
        validarTexto(path.join(pasta, subpasta, arquivo), regra, rel);
      }
    } else {
      validarTexto(path.join(pasta, nome), regra, rel);
    }
  }
}

function abrirImagem(arquivo, regra, rel) {
  const imagem = lerImagem(fs.readFileSync(arquivo));
  if (!imagem) {
    rel.erro(arquivo, "formato", "ilegível", regra.formatos.join(" ou "), regra.fonte);
    return null;
  }
  if (!regra.formatos.includes(imagem.formato)) {
    rel.erro(arquivo, "formato", imagem.formato, regra.formatos.join(" ou "), regra.fonte);
  }
  if (regra.alfa === false && imagem.alfa) rel.erro(arquivo, "transparência", "com alfa", "sem alfa", regra.fonte);
  return imagem;
}

function validarPlay(pasta, rel) {
  validarTextos(pasta, TEXTOS.android, rel);
  const imagens = path.join(pasta, "images");

  for (const regra of [IMAGENS_PLAY.icone, IMAGENS_PLAY.destaque]) {
    const encontrados = listar(imagens, (n) => ehImagem(n) && path.basename(n, path.extname(n)) === regra.arquivo);
    if (encontrados.length === 0) {
      if (regra.obrigatorio) rel.erro(path.join(imagens, regra.arquivo), "obrigatório", "ausente", "presente", regra.fonte);
      continue;
    }
    const arquivo = path.join(imagens, encontrados[0]);
    const imagem = abrirImagem(arquivo, regra, rel);
    if (!imagem) continue;
    if (imagem.largura !== regra.largura || imagem.altura !== regra.altura) {
      rel.erro(arquivo, "dimensão", `${imagem.largura}×${imagem.altura}`, `${regra.largura}×${regra.altura}`, regra.fonte);
    }
    if (regra.maxKB && fs.statSync(arquivo).size > regra.maxKB * 1024) {
      rel.erro(arquivo, "tamanho", `${Math.ceil(fs.statSync(arquivo).size / 1024)} KB`, `≤ ${regra.maxKB} KB`, regra.fonte);
    }
  }

  const capturas = IMAGENS_PLAY.capturas;
  const tablet = IMAGENS_PLAY.tablet;
  let total = 0;
  for (const tipo of capturas.pastas) {
    const dir = path.join(imagens, tipo);
    const arquivos = listar(dir, ehImagem);
    total += arquivos.length;
    if (arquivos.length > capturas.maxPorPasta) {
      rel.erro(dir, "quantidade", arquivos.length, `≤ ${capturas.maxPorPasta}`, capturas.fonte);
    }
    const ehTablet = tablet.pastas.includes(tipo);
    if (ehTablet && arquivos.length > 0 && arquivos.length < tablet.min) {
      rel.aviso(dir, "capturas de tablet", arquivos.length, `≥ ${tablet.min} para aparecer como app de tablet`, tablet.fonte);
    }
    for (const nome of arquivos) {
      const arquivo = path.join(dir, nome);
      const imagem = abrirImagem(arquivo, capturas, rel);
      if (!imagem) continue;
      const menor = Math.min(imagem.largura, imagem.altura);
      const maior = Math.max(imagem.largura, imagem.altura);
      const medida = `${imagem.largura}×${imagem.altura}`;
      if (menor < capturas.ladoMin || maior > capturas.ladoMax) {
        rel.erro(arquivo, "lados", medida, `${capturas.ladoMin}–${capturas.ladoMax} px`, capturas.fonte);
      }
      if (maior > capturas.proporcaoMax * menor) {
        rel.erro(arquivo, "proporção", medida, `lado maior ≤ ${capturas.proporcaoMax}× o menor`, capturas.fonte);
      }
      if (ehTablet) {
        const proporcaoOk = maior * 9 === menor * 16;
        if (menor < tablet.ladoMin || maior > tablet.ladoMax || !proporcaoOk) {
          rel.aviso(arquivo, "captura de tablet", medida, `${tablet.ladoMin}–${tablet.ladoMax} px, ${tablet.proporcoes.join(" ou ")}`, tablet.fonte);
        }
      }
    }
  }
  if (total < capturas.minTotal) rel.erro(imagens, "capturas", total, `≥ ${capturas.minTotal}`, capturas.fonte);
}

function grupoApple(imagem) {
  for (const [nome, grupo] of Object.entries(CAPTURAS_APPLE.grupos)) {
    const cabe = grupo.medidas.some(([l, a]) => (imagem.largura === l && imagem.altura === a)
      || (imagem.largura === a && imagem.altura === l));
    if (cabe) return nome;
  }
  return null;
}

function validarApple(metadata, capturas, ipad, rel) {
  validarTextos(metadata, TEXTOS.ios, rel);
  const regra = CAPTURAS_APPLE;
  const porGrupo = {};
  for (const nome of listar(capturas, ehImagem)) {
    const arquivo = path.join(capturas, nome);
    const imagem = abrirImagem(arquivo, regra, rel);
    if (!imagem) continue;
    const grupo = grupoApple(imagem);
    if (!grupo) {
      rel.erro(arquivo, "dimensão", `${imagem.largura}×${imagem.altura}`, "uma das medidas oficiais de um grupo", regra.fonte);
      continue;
    }
    porGrupo[grupo] = (porGrupo[grupo] || 0) + 1;
  }
  for (const [grupo, quantidade] of Object.entries(porGrupo)) {
    if (quantidade > regra.maxPorGrupo) rel.erro(capturas, `capturas ${grupo}`, quantidade, `≤ ${regra.maxPorGrupo}`, regra.fonte);
  }
  const iphones = Object.keys(porGrupo).filter((grupo) => regra.grupos[grupo].aparelho === "iphone");
  if (iphones.length === 0) {
    rel.erro(capturas, "capturas de iPhone", 0, `≥ ${regra.minPorGrupo}`, regra.fonte);
  } else if (!porGrupo[regra.iphoneRecomendado]) {
    rel.aviso(capturas, `capturas ${regra.iphoneRecomendado}`, 0, "recomendado (Dynamic Island, tela média)", regra.fonte);
  }
  if (ipad && !porGrupo[regra.ipadObrigatorio]) {
    rel.erro(capturas, `capturas ${regra.ipadObrigatorio}`, 0, `≥ ${regra.minPorGrupo} (app roda em iPad)`, regra.fonte);
  }
}

function validar(dir = path.join("store", "build")) {
  const rel = criarRelatorio(dir);
  const marcas = listar(dir, (nome) => fs.existsSync(path.join(dir, nome, "publicacao.json")));
  if (marcas.length === 0) {
    rel.erro(dir, "saída montada", "nenhuma marca com publicacao.json", "rodar montar-material.mjs antes", "");
  }
  for (const marca of marcas) {
    const base = path.join(dir, marca);
    const publicacao = JSON.parse(fs.readFileSync(path.join(base, "publicacao.json"), "utf8"));
    for (const idioma of publicacao.idiomas) {
      if (publicacao.plataformas.includes("android")) validarPlay(path.join(base, "android", idioma), rel);
      if (publicacao.plataformas.includes("ios")) {
        validarApple(path.join(base, "ios", "metadata", idioma), path.join(base, "ios", "screenshots", idioma),
          publicacao.ipad, rel);
      }
    }
  }
  return rel.itens;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const itens = validar(process.argv[2]);
  for (const item of itens) {
    const fonte = item.fonte ? ` [${item.fonte}]` : "";
    console.log(`${item.nivel.toUpperCase()} ${item.arquivo}: ${item.regra} = ${item.encontrado} (esperado ${item.limite})${fonte}`);
  }
  const erros = itens.filter((item) => item.nivel === "erro").length;
  console.log(`${erros} erro(s), ${itens.length - erros} aviso(s). Requisitos verificados em ${VERIFICADO_EM}.`);
  process.exit(erros ? 1 : 0);
}

export { lerImagem, validar };
