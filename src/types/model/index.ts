/**
 * Barrel dos MODELOS DE API. Toda interface reexportada aqui vive em
 * `src/types/model/` e e o alvo do scaffold (gera lista/detalhe/criacao a
 * partir do contrato). Interfaces estaticas (ex.: `User`) ficam na raiz de
 * `src/types/` e NAO sao tocadas pelo scaffold.
 */
export * from "./person";
