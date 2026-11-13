// Testa as regras de validar-pwa.mjs sobre um manifest e ícones gravados em pasta temporária. Imagens geradas em
// memória (só o cabeçalho que o validador lê); sem rede.

import { test, after } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { lerPng, lerArgs, validar } from "./validar-pwa.mjs";

const temporarios = [];
after(() => temporarios.forEach((pasta) => fs.rmSync(pasta, { recursive: true, force: true })));

function png(largura, altura) {
  const ihdr = Buffer.alloc(25);
  ihdr.writeUInt32BE(13, 0);
  ihdr.write("IHDR", 4, "latin1");
  ihdr.writeUInt32BE(largura, 8);
  ihdr.writeUInt32BE(altura, 12);
  ihdr[16] = 8;
  ihdr[17] = 6;
  return Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), ihdr]);
}

function manifestValido() {
  return {
    name: "App Exemplo",
    short_name: "Exemplo",
    id: "/",
    start_url: "/",
    scope: "/",
    display: "standalone",
    theme_color: "#ffffff",
    background_color: "#ffffff",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}

// Pasta pública com manifest, ícones e apple-touch-icon; `ajustar` muda o manifest, `sem` remove arquivos.
function projeto({ ajustar = () => {}, sem = [], arquivos = {} } = {}) {
  const pasta = fs.mkdtempSync(path.join(os.tmpdir(), "validar-pwa-"));
  temporarios.push(pasta);
  const conteudo = {
    "icons/icon-192.png": png(192, 192),
    "icons/icon-512.png": png(512, 512),
    "icons/maskable-512.png": png(512, 512),
    "apple-touch-icon.png": png(180, 180),
    ...arquivos,
  };
  for (const [relativo, dados] of Object.entries(conteudo)) {
    if (sem.includes(relativo)) continue;
    const arquivo = path.join(pasta, ...relativo.split("/"));
    fs.mkdirSync(path.dirname(arquivo), { recursive: true });
    fs.writeFileSync(arquivo, dados);
  }
  const manifest = manifestValido();
  ajustar(manifest);
  const arquivo = path.join(pasta, "manifest.webmanifest");
  fs.writeFileSync(arquivo, JSON.stringify(manifest));
  return { manifest: arquivo, public: pasta };
}

const regras = (itens, nivel) => itens.filter((item) => item.nivel === nivel).map((item) => item.regra);

test("lê largura e altura do cabeçalho PNG e recusa outro formato", () => {
  assert.deepEqual(lerPng(png(192, 512)), { largura: 192, altura: 512 });
  assert.equal(lerPng(Buffer.from([0xff, 0xd8, 0xff, 0xe0])), null);
});

test("manifest e ícones válidos não geram erro nem aviso", () => {
  assert.deepEqual(validar(projeto()), []);
});

test("nome, start_url e display inválidos são erro", () => {
  const itens = validar(projeto({ ajustar: (m) => {
    delete m.name;
    delete m.short_name;
    delete m.start_url;
    m.display = "browser";
  } }));
  assert.deepEqual(regras(itens, "erro"), ["name ou short_name", "start_url", "display"]);
});

test("prefer_related_applications true é erro; campos recomendados ausentes são aviso", () => {
  const itens = validar(projeto({ ajustar: (m) => {
    m.prefer_related_applications = true;
    delete m.id;
    delete m.scope;
  } }));
  assert.deepEqual(regras(itens, "erro"), ["prefer_related_applications"]);
  assert.deepEqual(regras(itens, "aviso"), ["id", "scope"]);
});

test("ícone com medida diferente da declarada, ausente ou que não é PNG é erro", () => {
  const itens = validar(projeto({
    sem: ["icons/icon-192.png"],
    arquivos: { "icons/icon-512.png": png(500, 500), "icons/maskable-512.png": Buffer.from("não é png") },
  }));
  assert.deepEqual(regras(itens, "erro"), ["ícone", "sizes", "formato", "ícone 192×192", "ícone 512×512"]);
  assert.deepEqual(regras(itens, "aviso"), ["ícone maskable"]);
});

test("sem maskable e sem apple-touch-icon são só aviso", () => {
  const itens = validar(projeto({ sem: ["apple-touch-icon.png"], ajustar: (m) => m.icons.pop() }));
  assert.deepEqual(regras(itens, "erro"), []);
  assert.deepEqual(regras(itens, "aviso"), ["ícone maskable", "apple-touch-icon"]);
});

test("caminho base é retirado do src; src relativo usa a pasta do manifest; URL externa é aviso", () => {
  const itens = validar({ ...projeto({ ajustar: (m) => {
    m.icons[0].src = "/app/icons/icon-192.png";
    m.icons[1].src = "icons/icon-512.png";
    m.icons.push({ src: "https://cdn.example.com/icone.png", sizes: "64x64" });
  } }), base: "/app" });
  assert.deepEqual(regras(itens, "erro"), []);
  assert.deepEqual(regras(itens, "aviso"), ["ícone externo"]);
});

test("manifest ausente ou com JSON inválido é erro", () => {
  const { public: pasta } = projeto();
  assert.deepEqual(regras(validar({ manifest: path.join(pasta, "nao-existe.json") }), "erro"), ["manifest"]);
  const invalido = path.join(pasta, "invalido.json");
  fs.writeFileSync(invalido, "{ nome");
  assert.deepEqual(regras(validar({ manifest: invalido }), "erro"), ["JSON"]);
});

test("lê os argumentos da linha de comando", () => {
  assert.deepEqual(lerArgs(["--manifest", "m.json", "--public", "public", "--base", "/app"]),
    { manifest: "m.json", public: "public", base: "/app", appleTouchIcon: null });
  assert.throws(() => lerArgs([]), /--manifest/);
  assert.throws(() => lerArgs(["--manifest"]), /exige um valor/);
  assert.throws(() => lerArgs(["--manifest", "m.json", "--outro", "x"]), /desconhecido/);
});
