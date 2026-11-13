// Testa a leitura de cabeçalho PNG/JPEG e as regras de validar-material.mjs sobre uma saída store/build/ montada em
// pasta temporária. Imagens geradas em memória (só o cabeçalho que o validador lê); sem rede.

import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { lerImagem, validar } from "./validar-material.mjs";

function png(largura, altura, { tipoCor = 2, trns = false } = {}) {
  const chunk = (tipo, dados) => {
    const tamanho = Buffer.alloc(4);
    tamanho.writeUInt32BE(dados.length);
    return Buffer.concat([tamanho, Buffer.from(tipo, "latin1"), dados, Buffer.alloc(4)]);
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(largura, 0);
  ihdr.writeUInt32BE(altura, 4);
  ihdr[8] = 8;
  ihdr[9] = tipoCor;
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    trns ? chunk("tRNS", Buffer.alloc(6)) : Buffer.alloc(0),
    chunk("IDAT", Buffer.alloc(2)),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

function jpeg(largura, altura) {
  const app0 = Buffer.from([0xff, 0xe0, 0x00, 0x10, ...Buffer.alloc(14)]);
  const sof = Buffer.from([0xff, 0xc0, 0x00, 0x11, 0x08, altura >> 8, altura & 0xff, largura >> 8, largura & 0xff,
    0x03, ...Buffer.alloc(9)]);
  return Buffer.concat([Buffer.from([0xff, 0xd8]), app0, sof, Buffer.from([0xff, 0xd9])]);
}

function gravar(base, relativo, conteudo) {
  const arquivo = path.join(base, ...relativo.split("/"));
  fs.mkdirSync(path.dirname(arquivo), { recursive: true });
  fs.writeFileSync(arquivo, conteudo);
}

// Saída válida de uma marca: um idioma, Play e Apple, iPad conforme o parâmetro.
function saidaValida({ ipad = false } = {}) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "validar-material-"));
  const base = path.join(dir, "exemplo");
  gravar(base, "publicacao.json", JSON.stringify({ marca: "exemplo", idiomas: ["pt-BR"],
    plataformas: ["android", "ios"], ipad, binarios: {} }));
  const play = "android/pt-BR";
  gravar(base, `${play}/title.txt`, "App Exemplo\n");
  gravar(base, `${play}/short_description.txt`, "Organize suas tarefas\n");
  gravar(base, `${play}/full_description.txt`, "Descrição completa do app de exemplo.\n");
  gravar(base, `${play}/changelogs/default.txt`, "- Correções\n");
  gravar(base, `${play}/images/icon.png`, png(512, 512, { tipoCor: 6 }));
  gravar(base, `${play}/images/featureGraphic.jpg`, jpeg(1024, 500));
  gravar(base, `${play}/images/phoneScreenshots/01-inicio.png`, png(1080, 1920));
  gravar(base, `${play}/images/phoneScreenshots/02-lista.png`, png(1080, 1920));
  const apple = "ios/metadata/pt-BR";
  gravar(base, `${apple}/name.txt`, "App Exemplo\n");
  gravar(base, `${apple}/description.txt`, "Descrição completa.\n");
  gravar(base, `${apple}/keywords.txt`, "tarefas,agenda,lista\n");
  gravar(base, `${apple}/support_url.txt`, "https://example.com/suporte\n");
  gravar(base, `${apple}/privacy_url.txt`, "https://example.com/privacidade\n");
  gravar(base, "ios/screenshots/pt-BR/iphone-6.9-01-inicio.png", png(1320, 2868));
  gravar(base, "ios/screenshots/pt-BR/iphone-6.3-01-inicio.png", png(1206, 2622));
  return { dir, base };
}

const erros = (itens) => itens.filter((item) => item.nivel === "erro");
const avisos = (itens) => itens.filter((item) => item.nivel === "aviso");

test("lerImagem lê dimensões e alfa de PNG e dimensões de JPEG", () => {
  assert.deepEqual(lerImagem(png(512, 512, { tipoCor: 6 })), { formato: "png", largura: 512, altura: 512, alfa: true });
  assert.equal(lerImagem(png(10, 10, { tipoCor: 2 })).alfa, false);
  assert.equal(lerImagem(png(10, 10, { tipoCor: 4 })).alfa, true);
  assert.equal(lerImagem(png(10, 10, { tipoCor: 3, trns: true })).alfa, true);
  assert.deepEqual(lerImagem(jpeg(1024, 500)), { formato: "jpeg", largura: 1024, altura: 500, alfa: false });
  assert.equal(lerImagem(Buffer.from("não é imagem")), null);
});

test("saída dentro das regras não tem erro nem aviso", () => {
  const { dir } = saidaValida();
  assert.deepEqual(validar(dir), []);
});

test("sem saída montada é erro", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "validar-material-"));
  assert.equal(erros(validar(dir)).length, 1);
});

test("limite de caracteres conta caracteres, não bytes", () => {
  const { dir, base } = saidaValida();
  gravar(base, "android/pt-BR/title.txt", `${"á".repeat(30)}\n`);
  assert.deepEqual(erros(validar(dir)), []);
  gravar(base, "android/pt-BR/title.txt", `${"a".repeat(31)}\n`);
  const [erro] = erros(validar(dir));
  assert.equal(erro.arquivo, "exemplo/android/pt-BR/title.txt");
  assert.equal(erro.encontrado, 31);
});

test("palavras-chave da Apple contam bytes UTF-8 e recusam palavra curta", () => {
  const { dir, base } = saidaValida();
  gravar(base, "ios/metadata/pt-BR/keywords.txt", `${"ção".repeat(30)}\n`); // 90 caracteres, 120 bytes
  assert.equal(erros(validar(dir))[0].regra, "bytes UTF-8");
  gravar(base, "ios/metadata/pt-BR/keywords.txt", "tarefas,ok,lista\n");
  assert.equal(erros(validar(dir))[0].encontrado, "ok");
});

test("campo obrigatório ausente e URL sem protocolo são erro", () => {
  const { dir, base } = saidaValida();
  fs.rmSync(path.join(base, "android", "pt-BR", "short_description.txt"));
  gravar(base, "ios/metadata/pt-BR/support_url.txt", "example.com/suporte\n");
  const regras = erros(validar(dir)).map((item) => item.regra).sort();
  assert.deepEqual(regras, ["URL com protocolo", "obrigatório"]);
});

test("novidades da Play acima de 500 é só aviso", () => {
  const { dir, base } = saidaValida();
  gravar(base, "android/pt-BR/changelogs/default.txt", `${"a".repeat(501)}\n`);
  const itens = validar(dir);
  assert.equal(erros(itens).length, 0);
  assert.equal(avisos(itens).length, 1);
});

test("ícone da Play fora da medida e gráfico de destaque com alfa são erro", () => {
  const { dir, base } = saidaValida();
  gravar(base, "android/pt-BR/images/icon.png", png(500, 500, { tipoCor: 6 }));
  fs.rmSync(path.join(base, "android", "pt-BR", "images", "featureGraphic.jpg"));
  gravar(base, "android/pt-BR/images/featureGraphic.png", png(1024, 500, { tipoCor: 6 }));
  const regras = erros(validar(dir)).map((item) => item.regra).sort();
  assert.deepEqual(regras, ["dimensão", "transparência"]);
});

test("capturas da Play: proporção, transparência, quantidade mínima e máxima", () => {
  const { dir, base } = saidaValida();
  const pasta = "android/pt-BR/images/phoneScreenshots";
  gravar(base, `${pasta}/02-lista.png`, png(1000, 2100));
  assert.equal(erros(validar(dir))[0].regra, "proporção");
  gravar(base, `${pasta}/02-lista.png`, png(1080, 1920, { trns: true }));
  assert.equal(erros(validar(dir))[0].regra, "transparência");
  fs.rmSync(path.join(base, ...pasta.split("/"), "02-lista.png"));
  assert.equal(erros(validar(dir))[0].regra, "capturas");
  for (let i = 2; i <= 9; i += 1) gravar(base, `${pasta}/0${i}-tela.png`, png(1080, 1920));
  assert.equal(erros(validar(dir))[0].regra, "quantidade");
});

test("capturas de tablet da Play abaixo do mínimo ou fora da proporção geram aviso", () => {
  const { dir, base } = saidaValida();
  gravar(base, "android/pt-BR/images/tenInchScreenshots/01-inicio.png", png(1600, 2560));
  const itens = validar(dir);
  assert.equal(erros(itens).length, 0);
  assert.deepEqual(avisos(itens).map((item) => item.regra).sort(), ["captura de tablet", "capturas de tablet"]);
});

test("capturas da Apple: medida fora dos grupos, iPhone ausente, grupo médio e iPad", () => {
  const { dir, base } = saidaValida({ ipad: true });
  const pasta = path.join(base, "ios", "screenshots", "pt-BR");
  assert.deepEqual(erros(validar(dir)).map((item) => item.regra), ["capturas ipad-13"]);
  gravar(base, "ios/screenshots/pt-BR/ipad-13-01-inicio.png", png(2752, 2064));
  assert.deepEqual(validar(dir), []);
  fs.rmSync(path.join(pasta, "iphone-6.3-01-inicio.png"));
  assert.equal(avisos(validar(dir))[0].regra, "capturas iphone-6.3");
  fs.rmSync(path.join(pasta, "iphone-6.9-01-inicio.png"));
  gravar(base, "ios/screenshots/pt-BR/outra.png", png(1000, 2000));
  assert.deepEqual(erros(validar(dir)).map((item) => item.regra).sort(), ["capturas de iPhone", "dimensão"]);
});
