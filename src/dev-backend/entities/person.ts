import type { EntityContract, ModuleRecord } from "@/core/contracts";
import type { PersonRole } from "@/types/model/person";
import type { FileItem } from "@/types/file-item";

const PERSON_ROLES: PersonRole[] = ["admin", "editor", "viewer"];

const PERSON_ROLE_LABEL: Record<PersonRole, string> = {
  admin: "Administrador",
  editor: "Editor",
  viewer: "Leitor",
};

/**
 * Entidade de exemplo "Person" (Pessoa) no DEV BACKEND. Representa o que o
 * backend de producao retornaria em `GET /persons/contract` (definicao estatica)
 * e os dados iniciais de `GET /persons`.
 */
export const PERSON_CONTRACT: EntityContract = {
  version: "1.0.0",
  permissions: { create: true, update: true, delete: true, view: true, export: true },
  schema: {
    primaryKey: "id",
    fields: [
      { name: "id", type: "string", label: "ID", readOnly: true },
      { name: "name", type: "string", label: "Nome", placeholder: "Ex.: Joao da Silva", required: true, minLength: 2, maxLength: 100 },
      { name: "email", type: "email", label: "E-mail", placeholder: "Ex.: joao@email.com", required: true },
      {
        name: "role",
        type: "enum",
        label: "Papel",
        required: true,
        default: "viewer",
        enum: PERSON_ROLES.map((role) => ({ value: role, label: PERSON_ROLE_LABEL[role] })),
      },
      {
        name: "active",
        type: "boolean",
        label: "Situacao",
        default: true,
        enum: [
          { value: true, label: "Ativo" },
          { value: false, label: "Inativo" },
        ],
      },
      { name: "phone", type: "phone", label: "Telefone", placeholder: "(11) 90000-0000", mask: "(99) 99999-9999" },
      {
        name: "department",
        type: "relation",
        label: "Departamento",
        relationship: { entity: "departments", labelField: "name", valueField: "id" },
      },
      { name: "createdAt", type: "datetime", label: "Criado em", readOnly: true, hidden: true },
    ],
  },
  ui: {
    columns: ["email", "role", "active"],
    filters: ["name", "role", "active"],
    sort: { field: "createdAt", direction: "DESC" },
    actions: { create: true, edit: true, delete: true, view: true, export: true },
  },
  relations: {
    department: { entity: "departments", labelField: "name", valueField: "id" },
  },
};

function photo(id: string, seed: string): FileItem {
  return { id, name: `${seed}.jpg`, uri: `https://picsum.photos/seed/${seed}/400/300`, mimeType: "image/jpeg" };
}

function avatar(seed: number): FileItem {
  return { id: `avatar-${seed}`, name: `avatar-${seed}.jpg`, uri: `https://i.pravatar.cc/150?img=${seed}`, mimeType: "image/jpeg" };
}

export function personSeed(): ModuleRecord[] {
  const now = Date.now();
  return [
    {
      id: "1",
      name: "Ana Souza",
      email: "ana.souza@example.com",
      role: "admin",
      active: true,
      phone: "(11) 98888-1111",
      department: "TI",
      createdAt: now - 86_400_000 * 9,
      photo: avatar(1),
      photos: [photo("p-1a", "ana1"), photo("p-1b", "ana2"), photo("p-1c", "ana3")],
    },
    {
      id: "2",
      name: "Bruno Lima",
      email: "bruno.lima@example.com",
      role: "editor",
      active: true,
      phone: "(11) 97777-2222",
      department: "Financeiro",
      createdAt: now - 86_400_000 * 6,
      photo: avatar(12),
      photos: [photo("p-2a", "bruno1"), photo("p-2b", "bruno2")],
    },
    {
      id: "3",
      name: "Carla Dias",
      email: "carla.dias@example.com",
      role: "viewer",
      active: false,
      phone: "(11) 96666-3333",
      department: "RH",
      createdAt: now - 86_400_000 * 3,
      photo: avatar(5),
      photos: [],
    },
    {
      id: "4",
      name: "Diego Alves",
      email: "diego.alves@example.com",
      role: "editor",
      active: true,
      phone: "(11) 95555-4444",
      department: "Operacoes",
      createdAt: now - 86_400_000,
      photo: avatar(15),
      photos: [photo("p-4a", "diego1")],
    },
  ];
}
