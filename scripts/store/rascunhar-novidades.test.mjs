// Testa rascunhar-novidades.mjs com changelogs no formato do semantic-release (conventionalcommits, com emoji) e do
// Keep a Changelog: seção da versão, filtro do que o usuário percebe, limpeza de hash/link/escopo e não sobrescrever.

import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { extrairNovidades, limparItem, rascunhar } from "./rascunhar-novidades.mjs";

const SEMANTIC_RELEASE = `# Changelog

## [1.4.0](https://git.example.test/app/compare/v1.3.0...v1.4.0) (2026-03-10)

### ✨ Features

* **lista:** filtro por data ([a1b2c3d](https://git.example.test/app/commit/a1b2c3d))
* **perfil:** foto de perfil, closes [#12](https://git.example.test/app/issues/12)

### 🐛 Bug Fixes

* corrige o login após trocar a senha ([0f9e8d7](https://git.example.test/app/commit/0f9e8d7))

### ♻️ Code Refactoring

* separa o serviço de sessão ([1234abc](https://git.example.test/app/commit/1234abc))

### Miscellaneous Chores

* atualiza dependências

# [1.3.0](https://git.example.test/app/compare/v1.2.0...v1.3.0) (2026-02-01)

### Features

* modo escuro
`;

const KEEP_A_CHANGELOG = `# Changelog

## [Unreleased]

### Added
- algo ainda não lançado

## [2.0.0] - 2026-04-01

### Added
- Exportar para PDF

### Removed
- Tela antiga de ajuda

### Fixed
- Notificação duplicada
`;

test("extrai só as seções que o usuário percebe, da versão pedida", () => {
  assert.deepEqual(extrairNovidades(SEMANTIC_RELEASE, "1.4.0"), [
    "Filtro por data",
    "Foto de perfil",
    "Corrige o login após trocar a senha",
  ]);
  assert.deepEqual(extrairNovidades(SEMANTIC_RELEASE, "1.3.0"), ["Modo escuro"]);
  assert.deepEqual(extrairNovidades(KEEP_A_CHANGELOG, "2.0.0"), ["Exportar para PDF", "Notificação duplicada"]);
  assert.equal(extrairNovidades(KEEP_A_CHANGELOG, "9.9.9"), null);
});

test("limparItem tira escopo, prefixo de commit, hash, link e emoji", () => {
  assert.equal(limparItem("* **api:** novo filtro ([abc1234](https://x.example.test/c/abc1234))"), "Novo filtro");
  assert.equal(limparItem("- feat(lista): ✨ ordenar por nome"), "Ordenar por nome");
  assert.equal(limparItem("- veja o [guia](https://x.example.test/guia) atualizado"), "Veja o guia atualizado");
  assert.equal(limparItem("- suporte a 1080 linhas"), "Suporte a 1080 linhas");
});

test("grava o rascunho e nunca sobrescreve texto existente", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "rascunhar-novidades-"));
  const changelog = path.join(dir, "CHANGELOG.md");
  const raiz = path.join(dir, "store");
  fs.writeFileSync(changelog, SEMANTIC_RELEASE);

  const primeiro = rascunhar({ changelog, raiz, versao: "1.4.0", idioma: "pt-BR" });
  assert.equal(primeiro.codigo, 0);
  const destino = path.join(raiz, "novidades", "1.4.0", "pt-BR.md");
  const texto = fs.readFileSync(destino, "utf8");
  assert.match(texto, /^<!-- Rascunho gerado/);
  assert.match(texto, /\n- Filtro por data\n- Foto de perfil\n- Corrige o login após trocar a senha\n$/);

  fs.writeFileSync(destino, "- Texto revisado\n");
  assert.equal(rascunhar({ changelog, raiz, versao: "1.4.0", idioma: "pt-BR" }).codigo, 2);
  assert.equal(fs.readFileSync(destino, "utf8"), "- Texto revisado\n");
});

test("versão ausente, versão só técnica e argumentos faltando são erro", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "rascunhar-novidades-"));
  const changelog = path.join(dir, "CHANGELOG.md");
  const raiz = path.join(dir, "store");
  fs.writeFileSync(changelog, "## [1.0.1] - 2026-05-01\n\n### Changed\n\n## 1.0.0\n\n### Chores\n- ci\n");
  assert.equal(rascunhar({ changelog, raiz, versao: "3.0.0", idioma: "pt-BR" }).codigo, 1);
  assert.match(rascunhar({ changelog, raiz, versao: "1.0.0", idioma: "pt-BR" }).mensagem, /sem novidade/);
  assert.equal(rascunhar({ changelog, raiz, versao: "1.0.0" }).codigo, 1);
  assert.equal(fs.existsSync(path.join(raiz, "novidades")), false);
});
