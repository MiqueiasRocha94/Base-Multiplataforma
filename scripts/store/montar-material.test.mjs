// Testa montar-material.mjs numa fonte store/ criada em pasta temporária: herança comum → marca, {{campo}}, campos
// obrigatórios, novidades da versão, imagens no layout do fastlane e publicacao.json com binário referenciado. Sem rede.

import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { lerCampos, montar } from "./montar-material.mjs";

function gravar(base, relativo, conteudo) {
  const arquivo = path.join(base, ...relativo.split("/"));
  fs.mkdirSync(path.dirname(arquivo), { recursive: true });
  fs.writeFileSync(arquivo, conteudo);
}

function ler(base, relativo) {
  return fs.readFileSync(path.join(base, ...relativo.split("/")), "utf8");
}

function fonte() {
  const raiz = fs.mkdtempSync(path.join(os.tmpdir(), "montar-material-"));
  gravar(raiz, "store.json", JSON.stringify({
    idiomas: ["pt-BR"],
    plataformas: ["android", "ios"],
    marcas: {
      azul: { nomeMarca: "Azul", site: "https://azul.example.com" },
      verde: { nomeMarca: "Verde", site: "https://verde.example.com" },
    },
  }));
  gravar(raiz, "textos/pt-BR.md", [
    "<!-- comentário que não vai para a saída -->",
    "## nome",
    "{{nomeMarca}} Tarefas",
    "## descricao-curta",
    "Organize suas tarefas",
    "## descricao",
    "Linha um.",
    "",
    "Linha dois.",
    "## palavras-chave",
    "tarefas,agenda",
    "## url-suporte",
    "{{site}}/suporte",
    "## url-privacidade",
    "{{site}}/privacidade",
    "",
  ].join("\n"));
  gravar(raiz, "marcas/verde/pt-BR.md", "## descricao-curta\nTarefas da marca verde\n");
  gravar(raiz, "novidades/1.4.0/pt-BR.md", "<!-- rascunho revisado -->\n- Lista nova\n");
  gravar(raiz, "imagens/azul/android/icon.png", "icone");
  gravar(raiz, "imagens/azul/android/featureGraphic.jpg", "destaque");
  gravar(raiz, "imagens/azul/android/rascunho.png", "fora do layout");
  gravar(raiz, "imagens/azul/android/phoneScreenshots/01-inicio.png", "captura");
  gravar(raiz, "imagens/azul/ios/iphone-6.9/01-inicio.png", "captura");
  return raiz;
}

test("lerCampos separa por \"## campo\", ignora comentário e preserva linhas internas", () => {
  const raiz = fonte();
  const campos = lerCampos(path.join(raiz, "textos", "pt-BR.md"));
  assert.equal(campos.nome, "{{nomeMarca}} Tarefas");
  assert.equal(campos.descricao, "Linha um.\n\nLinha dois.");
  assert.equal(lerCampos(path.join(raiz, "nao-existe.md")).nome, undefined);
});

test("monta cada marca no layout do fastlane com herança comum → marca e {{campo}}", () => {
  const raiz = fonte();
  const { erros } = montar({ raiz, versao: "1.4.0", versionCode: "42", agora: new Date("2026-01-02T03:04:05Z") });
  assert.deepEqual(erros, []);
  const azul = path.join(raiz, "build", "azul");
  const verde = path.join(raiz, "build", "verde");
  assert.equal(ler(azul, "android/pt-BR/title.txt"), "Azul Tarefas\n");
  assert.equal(ler(azul, "android/pt-BR/short_description.txt"), "Organize suas tarefas\n");
  assert.equal(ler(verde, "android/pt-BR/short_description.txt"), "Tarefas da marca verde\n");
  assert.equal(ler(verde, "ios/metadata/pt-BR/support_url.txt"), "https://verde.example.com/suporte\n");
  assert.equal(ler(azul, "android/pt-BR/changelogs/42.txt"), "- Lista nova\n");
  assert.equal(ler(azul, "ios/metadata/pt-BR/release_notes.txt"), "- Lista nova\n");
  assert.equal(ler(azul, "android/pt-BR/images/featureGraphic.jpg"), "destaque");
  assert.equal(ler(azul, "android/pt-BR/images/phoneScreenshots/01-inicio.png"), "captura");
  assert.equal(ler(azul, "ios/screenshots/pt-BR/iphone-6.9-01-inicio.png"), "captura");
  assert.equal(fs.existsSync(path.join(azul, "android", "pt-BR", "images", "rascunho.png")), false);
  assert.equal(fs.existsSync(path.join(azul, "android", "pt-BR", "short_description.txt")), true);
  assert.equal(fs.existsSync(path.join(azul, "ios", "metadata", "pt-BR", "short_description.txt")), false);
  const publicacao = JSON.parse(ler(azul, "publicacao.json"));
  assert.equal(publicacao.versionCode, "42");
  assert.equal(publicacao.geradoEm, "2026-01-02T03:04:05.000Z");
});

test("a saída é recriada: arquivo de montagem anterior não sobra", () => {
  const raiz = fonte();
  montar({ raiz });
  gravar(raiz, "build/azul/android/pt-BR/sobra.txt", "antigo");
  montar({ raiz, marcas: ["azul"] });
  assert.equal(fs.existsSync(path.join(raiz, "build", "azul", "android", "pt-BR", "sobra.txt")), false);
});

test("{{campo}} sem valor, campo obrigatório ausente e versão sem novidades são erro", () => {
  const raiz = fonte();
  gravar(raiz, "marcas/verde/pt-BR.md", "## nome\n{{inexistente}}\n## descricao\n\n");
  fs.rmSync(path.join(raiz, "novidades"), { recursive: true });
  const { erros } = montar({ raiz, marcas: ["verde"], versao: "1.5.0" });
  assert.match(erros[0], /falta novidades\/1\.5\.0\/pt-BR\.md/);
  // Um por plataforma: o nome vai para title.txt (Play) e name.txt (Apple).
  assert.deepEqual(erros.slice(1).map((erro) => /\{\{inexistente\}\} sem valor/.test(erro)), [true, true]);
  const vazia = path.join(raiz, "textos", "pt-BR.md");
  gravar(raiz, "textos/pt-BR.md", fs.readFileSync(vazia, "utf8").replace(/## descricao\n[\s\S]*?## palavras/, "## palavras"));
  const semDescricao = montar({ raiz, marcas: ["azul"] }).erros;
  assert.deepEqual(semDescricao.map((erro) => /"descricao"/.test(erro)), [true, true]);
});

test("publicacao.json referencia o binário sem copiá-lo e acusa binário ausente", () => {
  const raiz = fonte();
  gravar(raiz, "app/azul-release.aab", "binario");
  const aab = path.join(raiz, "app", "{{marca}}-release.aab");
  const { erros } = montar({ raiz, binarios: { android: aab } });
  assert.equal(erros.length, 1);
  assert.match(erros[0], /verde: binário android não encontrado/);
  const publicacao = JSON.parse(ler(path.join(raiz, "build", "azul"), "publicacao.json"));
  assert.equal(publicacao.binarios.android, path.join(raiz, "app", "azul-release.aab"));
  const arquivos = (pasta) => fs.readdirSync(pasta, { withFileTypes: true })
    .flatMap((item) => (item.isDirectory() ? arquivos(path.join(pasta, item.name)) : [item.name]));
  assert.deepEqual(arquivos(path.join(raiz, "build")).filter((nome) => nome.endsWith(".aab")), []);
});

test("marca desconhecida e store.json ausente são erro", () => {
  const raiz = fonte();
  assert.deepEqual(montar({ raiz, marcas: ["roxa"] }).erros, ["marca desconhecida: roxa"]);
  assert.match(montar({ raiz: path.join(raiz, "nada") }).erros[0], /não encontrado/);
});
