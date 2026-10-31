import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";

async function moduleUrl(path, replacements = {}) {
  let source = await readFile(new URL(path, import.meta.url), "utf8");
  for (const [from, to] of Object.entries(replacements)) source = source.replaceAll(from, to);
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext },
  });
  return `data:text/javascript;base64,${Buffer.from(outputText).toString("base64")}`;
}

const {
  buildCsv,
  buildDateOf,
  buildFormFields,
  buildPredicate,
  buildQueryFilters,
  buildTableColumns,
  buildZodSchema,
  displayValue,
  fileFields,
  formValuesToRecord,
} = await import(
  await moduleUrl("../src/core/module-engine/module-engine.ts", { '"zod"': JSON.stringify(import.meta.resolve("zod")) })
);

const schema = {
  primaryKey: "id",
  fields: [
    { name: "id", type: "integer", hidden: true },
    { name: "nroPedido", type: "string", label: "Nº pedido" },
    { name: "cliente", type: "string", label: "Cliente" },
    { name: "dataPedido", type: "date", label: "Data do pedido" },
    {
      name: "situacao",
      type: "enum",
      label: "Situação",
      enum: [
        { value: "A", label: "Ativo" },
        { value: "C", label: "Cancelado" },
      ],
    },
    { name: "valorTotal", type: "decimal", label: "Valor total", mask: "currency" },
  ],
};
const ui = {
  columns: ["cliente", "dataPedido", "situacao", "valorTotal"],
  filters: ["nroPedido", "cliente", "situacao"],
  actions: { create: false, edit: false, delete: false, view: true },
};
const linha = { id: 1, nroPedido: "543233", cliente: "LOJA CENTRAL", dataPedido: "2026-01-01", situacao: "A", valorTotal: 1 };

test("exibição pelo contrato: moeda por mask, data ISO sem fuso, enum pelo rótulo", () => {
  const campo = (nome) => schema.fields.find((field) => field.name === nome);
  assert.equal(displayValue(linha, campo("valorTotal")).replace(/\s/g, " "), "R$ 1,00");
  assert.equal(displayValue(linha, campo("dataPedido")), "01/01/2026");
  assert.equal(displayValue(linha, campo("situacao")), "Ativo");
});

test("mask percent: o valor já vem em percentual", () => {
  const campo = { name: "taxaDesconto", type: "decimal", mask: "percent" };
  assert.equal(displayValue({ taxaDesconto: 1.75 }, campo), "1,75%");
  assert.equal(displayValue({ taxaDesconto: 21.6834 }, campo), "21,6834%");
});

test("colunas do contrato: título, ordenáveis pelo nome do campo, número à direita", () => {
  const colunas = buildTableColumns(ui, schema);
  assert.deepEqual(colunas.map((coluna) => coluna.key), ["nroPedido", "cliente", "dataPedido", "situacao", "valorTotal"]);
  assert.equal(colunas[0].mobileRole, "title");
  assert.ok(colunas.every((coluna) => coluna.sortKey === coluna.key));
  const valor = colunas.find((coluna) => coluna.key === "valorTotal");
  assert.equal(valor.headerClassName, "text-right");
  assert.equal(valor.sortValue(linha), 1);
  assert.equal(colunas.find((coluna) => coluna.key === "situacao").sortValue(linha), "Ativo");
});

test("ordenação na API só nas colunas que o contrato aceita (ui.sortable + sort padrão)", () => {
  const contrato = { ...ui, sort: { field: "dataPedido", direction: "DESC" }, sortable: ["cliente"] };
  const ordenaveis = buildTableColumns(contrato, schema, { serverSort: true })
    .filter((coluna) => coluna.sortKey)
    .map((coluna) => coluna.key);
  assert.deepEqual(ordenaveis, ["cliente", "dataPedido"]);
  // Lista local (veio inteira): todas ordenam.
  assert.ok(buildTableColumns(contrato, schema).every((coluna) => coluna.sortKey));
});

test("colunas com visible/additional: id oculto oferecido, adicional marcada, formato antigo segue visível", () => {
  const contrato = {
    ...ui,
    columns: [
      { field: "id", visible: false },
      { field: "cliente", visible: true },
      { field: "valorTotal", visible: false, additional: true },
    ],
  };
  const colunas = buildTableColumns(contrato, schema);
  const id = colunas.find((coluna) => coluna.key === "id");
  assert.ok(id, "campo hidden do schema entra quando o contrato o lista explicitamente");
  assert.equal(id.defaultHidden, true);
  assert.equal(id.hideOnMobile, true);
  const adicional = colunas.find((coluna) => coluna.key === "valorTotal");
  assert.equal(adicional.additional, true);
  assert.equal(adicional.defaultHidden, true);
  assert.equal(colunas.find((coluna) => coluna.key === "cliente").defaultHidden, false);
  // Formato antigo (string): visível; campo hidden do schema continua de fora.
  const antigas = buildTableColumns({ ...ui, columns: ["id", "cliente"] }, schema);
  assert.equal(antigas.some((coluna) => coluna.key === "id"), false);
  assert.equal(antigas.find((coluna) => coluna.key === "cliente").defaultHidden, false);
});

test("filtro → API: enum pelo código, texto como digitado, vazios fora", () => {
  assert.deepEqual(buildQueryFilters({ situacao: "Cancelado", cliente: " LOJA ", nroPedido: "" }, schema, ui), {
    situacao: "C",
    cliente: "LOJA",
  });
});

test("filtro local e data do 1º campo de data", () => {
  const predicado = buildPredicate(schema, ui);
  assert.equal(predicado(linha, { situacao: "Ativo", cliente: "central" }), true);
  assert.equal(predicado(linha, { situacao: "Cancelado" }), false);
  assert.equal(buildDateOf(schema)(linha), Date.parse("2026-01-01"));
});

test("arquivos pelo contrato: file = foto, files = galeria, fora de form, tabela, Zod e CSV", () => {
  const comArquivos = {
    primaryKey: "id",
    fields: [
      { name: "id", type: "string" },
      { name: "nome", type: "string", label: "Nome", required: true },
      { name: "foto", type: "file", label: "Foto" },
      { name: "anexoOculto", type: "file", hidden: true },
      { name: "galeria", type: "files", label: "Galeria" },
    ],
  };
  const contrato = { columns: ["nome", "foto", "galeria"], filters: ["nome", "foto"], actions: ui.actions };

  assert.deepEqual(fileFields(comArquivos).map((campo) => campo.name), ["foto", "galeria"]);
  assert.deepEqual(buildFormFields(comArquivos).map((campo) => campo.key), ["nome"]);
  assert.deepEqual(buildTableColumns(contrato, comArquivos).map((coluna) => coluna.key), ["nome"]);
  assert.deepEqual(Object.keys(formValuesToRecord({ nome: " Ana " }, comArquivos)), ["nome"]);
  assert.equal(buildZodSchema(comArquivos).safeParse({ nome: "Ana" }).success, true);
  assert.equal(buildCsv([{ id: "1", nome: "Ana", foto: { id: "f" } }], contrato, comArquivos).split("\n")[0], '"id","Nome"');
});
