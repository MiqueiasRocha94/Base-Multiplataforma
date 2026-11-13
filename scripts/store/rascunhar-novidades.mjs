#!/usr/bin/env node
// Rascunha o "O que há de novo" de uma versão a partir do CHANGELOG.md (títulos do semantic-release ou do Keep a
// Changelog). Mantém só o que o usuário percebe (novidades, correções, desempenho), tira hash, link, escopo e emoji, e
// grava store/novidades/<versão>/<idioma>.md só se o arquivo não existir: texto já revisado nunca é sobrescrito.
// Changelog é técnico, num idioma só e longo; o resultado é rascunho para revisão humana, e o limite de cada loja é
// conferido por validar-material.mjs.
//
// Uso: node scripts/store/rascunhar-novidades.mjs --versao 1.4.0 --idioma pt-BR [--changelog CHANGELOG.md]
//        [--store store]
// Saída: 0 = rascunho gravado; 1 = erro; 2 = já existe (nada mudou).

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

// Seções que interessam ao usuário, comparadas sem emoji e sem caixa.
const SECOES_DO_USUARIO = [
  "features", "bug fixes", "performance improvements", "added", "changed", "fixed",
  "novidades", "correções", "melhorias",
];

const TITULO_VERSAO = /^(#{1,3})\s+\[?v?(\d+\.\d+\.\d+[\w.+-]*)\]?/;

function semEmoji(texto) {
  return texto.replace(/[\p{Extended_Pictographic}️‍]/gu, "").replace(/:[a-z][a-z0-9_+-]*:/g, "");
}

function limparItem(linha) {
  return semEmoji(linha)
    .replace(/^\s*[-*]\s+/, "")
    .replace(/\(\[[0-9a-f]{7,40}\]\([^)]*\)\)/gi, "")
    .replace(/\(?\b[0-9a-f]{7,40}\b\)?/g, (trecho) => (/\d/.test(trecho) && /[a-f]/i.test(trecho) ? "" : trecho))
    .replace(/,?\s*(closes|fixes|refs?)\s+\[?#\d+\]?(\([^)]*\))?/gi, "")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/^\*\*[^*]+:\*\*\s*/, "")
    .replace(/^(feat|fix|perf|refactor|docs|chore|style|test|build|ci|revert)(\([^)]*\))?!?:\s+/i, "")
    .replace(/\s{2,}/g, " ")
    .trim()
    .replace(/^./, (letra) => letra.toUpperCase());
}

function extrairNovidades(changelog, versao) {
  const linhas = changelog.split(/\r?\n/);
  const inicio = linhas.findIndex((linha) => {
    const titulo = TITULO_VERSAO.exec(linha);
    return titulo && titulo[2] === versao;
  });
  if (inicio < 0) return null;

  const itens = [];
  let manter = false;
  for (const linha of linhas.slice(inicio + 1)) {
    if (TITULO_VERSAO.test(linha)) break;
    const secao = /^#{2,4}\s+(.+?)\s*$/.exec(linha);
    if (secao) {
      manter = SECOES_DO_USUARIO.includes(semEmoji(secao[1]).trim().toLowerCase());
      continue;
    }
    if (manter && /^\s*[-*]\s+/.test(linha)) {
      const item = limparItem(linha);
      if (item && !itens.includes(item)) itens.push(item);
    }
  }
  return itens;
}

function rascunhar({ changelog = "CHANGELOG.md", raiz = "store", versao, idioma }) {
  if (!versao || !idioma) return { codigo: 1, mensagem: "informe --versao e --idioma" };
  const destino = path.join(raiz, "novidades", versao, `${idioma}.md`);
  if (fs.existsSync(destino)) return { codigo: 2, mensagem: `já existe, mantido: ${destino}` };
  if (!fs.existsSync(changelog)) return { codigo: 1, mensagem: `não encontrado: ${changelog}` };

  const itens = extrairNovidades(fs.readFileSync(changelog, "utf8"), versao);
  if (itens === null) return { codigo: 1, mensagem: `versão ${versao} não encontrada em ${changelog}` };
  if (itens.length === 0) {
    return { codigo: 1, mensagem: `versão ${versao} sem novidade ou correção para o usuário; escreva ${destino} à mão` };
  }

  const texto = [
    `<!-- Rascunho gerado de ${path.basename(changelog)} (${versao}). Revise: linguagem do usuário, idioma, limite da loja. -->`,
    ...itens.map((item) => `- ${item}`),
    "",
  ].join("\n");
  fs.mkdirSync(path.dirname(destino), { recursive: true });
  fs.writeFileSync(destino, texto);
  return { codigo: 0, mensagem: `rascunho gravado: ${destino} (${itens.length} itens)` };
}

function lerArgumentos(argv) {
  const opcoes = {};
  const nomes = { "--changelog": "changelog", "--store": "raiz", "--versao": "versao", "--idioma": "idioma" };
  for (let i = 0; i < argv.length; i += 2) {
    if (!nomes[argv[i]]) throw new Error(`opção desconhecida: ${argv[i]}`);
    opcoes[nomes[argv[i]]] = argv[i + 1];
  }
  return opcoes;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const { codigo, mensagem } = rascunhar(lerArgumentos(process.argv.slice(2)));
  (codigo === 1 ? console.error : console.log)(mensagem);
  process.exit(codigo);
}

export { extrairNovidades, limparItem, rascunhar };
