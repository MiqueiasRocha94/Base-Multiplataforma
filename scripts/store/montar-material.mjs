#!/usr/bin/env node
// Monta store/build/<marca>/ a partir da fonte store/, no layout que o fastlane lê (supply na Play, deliver na Apple),
// e grava publicacao.json com a versão e os binários do app (referenciados, não copiados). A saída é recriada a cada
// execução e não se mistura com o build do app.
//
// Uso: node scripts/store/montar-material.mjs [--store store] [--marca <id>]... [--versao 1.4.0] [--version-code 42]
//        [--aab <caminho com {{marca}}>] [--ipa <caminho com {{marca}}>]
//
// Fonte esperada (ver docs/publicacao-lojas.md do projeto):
//   store.json                         { "idiomas": [...], "plataformas": ["android", "ios"], "ipad": false,
//                                        "marcas": { "<id>": { "<campo>": "<valor para {{campo}}>" } } }
//   textos/<idioma>.md                 "## <campo>" por campo (nome, descricao-curta, descricao, ...)
//   marcas/<marca>/<idioma>.md         só os campos que a marca sobrescreve
//   novidades/<versão>/<idioma>.md     "O que há de novo" da versão
//   imagens/<marca>/android/           icon.png, featureGraphic.(png|jpg), phoneScreenshots/, sevenInchScreenshots/,
//                                      tenInchScreenshots/
//   imagens/<marca>/ios/<grupo>/       capturas por grupo de tela (iphone-6.9, iphone-6.3, ipad-13, ...)

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { CAMPOS, TEXTOS, IMAGENS_PLAY } from "./requisitos-lojas.mjs";

const EXTENSOES_IMAGEM = [".png", ".jpg", ".jpeg"];

function lerCampos(arquivo) {
  if (!fs.existsSync(arquivo)) return {};
  const texto = fs.readFileSync(arquivo, "utf8").replace(/<!--[\s\S]*?-->/g, "");
  const campos = {};
  let atual = null;
  for (const linha of texto.split(/\r?\n/)) {
    const titulo = /^##\s+(.+?)\s*$/.exec(linha);
    if (titulo) {
      atual = titulo[1];
      campos[atual] = [];
    } else if (atual) {
      campos[atual].push(linha);
    }
  }
  const resultado = {};
  for (const [campo, linhas] of Object.entries(campos)) {
    const valor = linhas.join("\n").trim();
    if (valor) resultado[campo] = valor;
  }
  return resultado;
}

function substituir(texto, valores, onde, erros) {
  return texto.replace(/\{\{\s*([\w-]+)\s*\}\}/g, (trecho, nome) => {
    if (valores[nome] === undefined) {
      erros.push(`${onde}: {{${nome}}} sem valor em store.json`);
      return trecho;
    }
    return String(valores[nome]);
  });
}

function imagensDe(pasta) {
  if (!fs.existsSync(pasta)) return [];
  return fs.readdirSync(pasta)
    .filter((nome) => EXTENSOES_IMAGEM.includes(path.extname(nome).toLowerCase()))
    .sort();
}

function escrever(arquivo, conteudo) {
  fs.mkdirSync(path.dirname(arquivo), { recursive: true });
  fs.writeFileSync(arquivo, conteudo.endsWith("\n") ? conteudo : `${conteudo}\n`);
}

function copiar(origem, destino) {
  fs.mkdirSync(path.dirname(destino), { recursive: true });
  fs.copyFileSync(origem, destino);
}

function camposObrigatorios(plataforma) {
  return Object.entries(CAMPOS)
    .filter(([, arquivos]) => arquivos[plataforma] && TEXTOS[plataforma][arquivos[plataforma]]?.obrigatorio)
    .map(([campo]) => campo);
}

function montarMarca({ raiz, config, marca, versao, versionCode, binarios, agora }) {
  const erros = [];
  const saida = path.join(raiz, "build", marca);
  const valores = { marca, ...(config.marcas[marca] || {}) };
  const plataformas = config.plataformas || ["android", "ios"];

  fs.rmSync(saida, { recursive: true, force: true });

  for (const idioma of config.idiomas) {
    const comum = lerCampos(path.join(raiz, "textos", `${idioma}.md`));
    const daMarca = lerCampos(path.join(raiz, "marcas", marca, `${idioma}.md`));
    const campos = { ...comum, ...daMarca };
    const onde = `${marca}/${idioma}`;

    let novidades = null;
    if (versao) {
      const arquivo = path.join(raiz, "novidades", versao, `${idioma}.md`);
      if (fs.existsSync(arquivo)) {
        novidades = substituir(fs.readFileSync(arquivo, "utf8").replace(/<!--[\s\S]*?-->/g, "").trim(), valores,
          `${onde} novidades`, erros);
      } else {
        erros.push(`${onde}: falta novidades/${versao}/${idioma}.md (rascunho: rascunhar-novidades.mjs)`);
      }
    }

    for (const plataforma of plataformas) {
      for (const campo of camposObrigatorios(plataforma)) {
        if (!campos[campo]) erros.push(`${onde}: campo obrigatório "${campo}" ausente (${plataforma})`);
      }
      const base = plataforma === "android"
        ? path.join(saida, "android", idioma)
        : path.join(saida, "ios", "metadata", idioma);
      for (const [campo, valor] of Object.entries(campos)) {
        const arquivo = CAMPOS[campo]?.[plataforma];
        if (arquivo) escrever(path.join(base, arquivo), substituir(valor, valores, `${onde} ${campo}`, erros));
      }
      if (novidades) {
        const arquivo = plataforma === "android" ? path.join("changelogs", `${versionCode || "default"}.txt`)
          : "release_notes.txt";
        escrever(path.join(base, arquivo), novidades);
      }
    }

    if (plataformas.includes("android")) {
      const origem = path.join(raiz, "imagens", marca, "android");
      const destino = path.join(saida, "android", idioma, "images");
      for (const nome of imagensDe(origem)) {
        const semExtensao = path.basename(nome, path.extname(nome));
        if ([IMAGENS_PLAY.icone.arquivo, IMAGENS_PLAY.destaque.arquivo].includes(semExtensao)) {
          copiar(path.join(origem, nome), path.join(destino, nome));
        }
      }
      for (const pasta of IMAGENS_PLAY.capturas.pastas) {
        for (const nome of imagensDe(path.join(origem, pasta))) {
          copiar(path.join(origem, pasta, nome), path.join(destino, pasta, nome));
        }
      }
    }

    if (plataformas.includes("ios")) {
      const origem = path.join(raiz, "imagens", marca, "ios");
      const grupos = fs.existsSync(origem)
        ? fs.readdirSync(origem).filter((nome) => fs.statSync(path.join(origem, nome)).isDirectory()).sort()
        : [];
      for (const grupo of grupos) {
        for (const nome of imagensDe(path.join(origem, grupo))) {
          copiar(path.join(origem, grupo, nome), path.join(saida, "ios", "screenshots", idioma, `${grupo}-${nome}`));
        }
      }
    }
  }

  const binariosDaMarca = {};
  for (const [plataforma, modelo] of Object.entries(binarios || {})) {
    if (!modelo || !plataformas.includes(plataforma)) continue;
    const caminho = substituir(modelo, valores, `${marca} binário ${plataforma}`, erros);
    if (!fs.existsSync(caminho)) erros.push(`${marca}: binário ${plataforma} não encontrado: ${caminho}`);
    binariosDaMarca[plataforma] = caminho;
  }

  escrever(path.join(saida, "publicacao.json"), JSON.stringify({
    marca,
    versao: versao || null,
    versionCode: versionCode || null,
    geradoEm: (agora || new Date()).toISOString(),
    plataformas,
    idiomas: config.idiomas,
    ipad: Boolean(config.ipad),
    binarios: binariosDaMarca,
  }, null, 2));

  return erros;
}

function montar({ raiz = "store", marcas, versao, versionCode, binarios, agora } = {}) {
  const arquivoConfig = path.join(raiz, "store.json");
  if (!fs.existsSync(arquivoConfig)) return { erros: [`não encontrado: ${arquivoConfig}`] };
  const config = JSON.parse(fs.readFileSync(arquivoConfig, "utf8"));
  if (!Array.isArray(config.idiomas) || config.idiomas.length === 0) {
    return { erros: ["store.json: \"idiomas\" vazio"] };
  }
  config.marcas = config.marcas || {};
  const escolhidas = marcas && marcas.length ? marcas : Object.keys(config.marcas);
  if (escolhidas.length === 0) return { erros: ["store.json: nenhuma marca em \"marcas\""] };

  const erros = [];
  for (const marca of escolhidas) {
    if (!config.marcas[marca]) {
      erros.push(`marca desconhecida: ${marca}`);
      continue;
    }
    erros.push(...montarMarca({ raiz, config, marca, versao, versionCode, binarios, agora }));
  }
  return { erros, marcas: escolhidas };
}

function lerArgumentos(argv) {
  const opcoes = { marcas: [], binarios: {} };
  for (let i = 0; i < argv.length; i += 1) {
    const valor = argv[i + 1];
    switch (argv[i]) {
      case "--store": opcoes.raiz = valor; i += 1; break;
      case "--marca": opcoes.marcas.push(valor); i += 1; break;
      case "--versao": opcoes.versao = valor; i += 1; break;
      case "--version-code": opcoes.versionCode = valor; i += 1; break;
      case "--aab": opcoes.binarios.android = valor; i += 1; break;
      case "--ipa": opcoes.binarios.ios = valor; i += 1; break;
      default: throw new Error(`opção desconhecida: ${argv[i]}`);
    }
  }
  return opcoes;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const opcoes = lerArgumentos(process.argv.slice(2));
  const { erros, marcas } = montar(opcoes);
  if (erros.length) {
    console.error(erros.map((erro) => `ERRO ${erro}`).join("\n"));
    process.exit(1);
  }
  console.log(`Material montado em ${path.join(opcoes.raiz || "store", "build")}: ${marcas.join(", ")}`);
}

export { lerCampos, montar };
