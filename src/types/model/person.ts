import type { FileItem } from "@/types/file-item";

export type PersonRole = "admin" | "editor" | "viewer";

/**
 * Entidade CRUD de exemplo "Pessoa" (antiga `User` de CRUD desta base).
 *
 * Vive em `src/types/model/` DE PROPOSITO: toda interface nesta pasta e um
 * "modelo de API" — o alvo do scaffold, que gera as paginas (lista/detalhe/
 * criacao) a partir do contrato. A identidade autenticada (`User`) fica FORA
 * daqui, em `src/types/user.ts`, porque nao e um recurso CRUD.
 *
 * Inclui atributos do tipo arquivo: `photo` (imagem unica) e `photos` (lista).
 * Substitua/expanda conforme o dominio do seu projeto.
 */
export type Person = {
  id: string;
  name: string;
  email: string;
  role: PersonRole;
  active: boolean;
  /** Telefone (campo com mascara). */
  phone?: string;
  /** Departamento (campo de relacionamento; guarda o rotulo no mock). */
  department?: string;
  createdAt: number;
  photo?: FileItem | null;
  photos?: FileItem[];
};
