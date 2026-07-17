import type { ActionDef } from "@/lib/actions/types";

/**
 * Catalogo de acoes da entidade `Person` (na demo). TODAS ficam registradas
 * INTACTAS — o filtro por permissao acontece na EXIBICAO, via
 * `resolveAvailableActions(registry, user)`, nunca apagando do catalogo.
 *
 * `labelKey` casa com `dictionary.persons`. A ordem aqui define a ordem no menu
 * de acoes da linha. Acoes sem `requiredPermissions`/`requiredRoles` sao publicas.
 *
 * Visibilidade resultante nos 3 perfis demo:
 *  - comum   (pessoa.visualizar)            -> publicas + audit
 *  - analista(+ pessoa.exportar)            -> ... + exportar/relatorio
 *  - admin   (criar/editar/remover/exportar)-> todas
 */
export const PERSON_ACTIONS: ActionDef[] = [
  { id: "edit", labelKey: "edit", entity: "person", requiredPermissions: ["pessoa.editar"] },

  // Publicas (cotidiano; nao exigem permissao).
  { id: "copy-id", labelKey: "copyId", entity: "person" },
  { id: "share", labelKey: "share", entity: "person" },
  { id: "print", labelKey: "print", entity: "person" },
  { id: "send-email", labelKey: "sendEmail", entity: "person" },

  // Exportar.
  { id: "export-pdf", labelKey: "exportPdf", entity: "person", requiredPermissions: ["pessoa.exportar"] },

  // Criar / derivar.
  { id: "duplicate", labelKey: "duplicate", entity: "person", requiredPermissions: ["pessoa.criar"] },
  { id: "clone-deep", labelKey: "cloneDeep", entity: "person", requiredPermissions: ["pessoa.criar"] },
  { id: "create-related", labelKey: "createRelated", entity: "person", requiredPermissions: ["pessoa.criar"] },

  // Editar (mudanca de estado do registro).
  { id: "activate", labelKey: "activate", entity: "person", requiredPermissions: ["pessoa.editar"] },
  { id: "deactivate", labelKey: "deactivate", entity: "person", requiredPermissions: ["pessoa.editar"] },

  // Visualizar.
  { id: "audit", labelKey: "audit", entity: "person", requiredPermissions: ["pessoa.visualizar"] },

  // Exportar (por linha).
  { id: "export-row", labelKey: "exportRow", entity: "person", requiredPermissions: ["pessoa.exportar"] },

  // Fluxo/estado — exigem editar.
  { id: "favorite", labelKey: "favorite", entity: "person", requiredPermissions: ["pessoa.editar"] },
  { id: "archive", labelKey: "archive", entity: "person", requiredPermissions: ["pessoa.editar"] },
  { id: "restore", labelKey: "restore", entity: "person", requiredPermissions: ["pessoa.editar"] },
  { id: "block", labelKey: "block", entity: "person", requiredPermissions: ["pessoa.editar"] },
  { id: "unblock", labelKey: "unblock", entity: "person", requiredPermissions: ["pessoa.editar"] },
  { id: "approve", labelKey: "approve", entity: "person", requiredPermissions: ["pessoa.editar"] },
  { id: "reject", labelKey: "reject", entity: "person", requiredPermissions: ["pessoa.editar"] },
  { id: "cancel", labelKey: "cancelAction", entity: "person", requiredPermissions: ["pessoa.editar"] },
  { id: "reopen", labelKey: "reopen", entity: "person", requiredPermissions: ["pessoa.editar"] },
  { id: "change-status", labelKey: "changeStatus", entity: "person", requiredPermissions: ["pessoa.editar"] },
  { id: "change-owner", labelKey: "changeOwner", entity: "person", requiredPermissions: ["pessoa.editar"] },
  { id: "link", labelKey: "link", entity: "person", requiredPermissions: ["pessoa.editar"] },
  { id: "unlink", labelKey: "unlink", entity: "person", requiredPermissions: ["pessoa.editar"] },
  { id: "attach", labelKey: "attachFile", entity: "person", requiredPermissions: ["pessoa.editar"] },
  { id: "manage-attachments", labelKey: "manageAttachments", entity: "person", requiredPermissions: ["pessoa.editar"] },
  { id: "comment", labelKey: "addComment", entity: "person", requiredPermissions: ["pessoa.editar"] },

  // Relatorio (exportacao).
  { id: "report", labelKey: "generateReport", entity: "person", requiredPermissions: ["pessoa.exportar"] },

  // Remover.
  { id: "delete", labelKey: "delete", entity: "person", requiredPermissions: ["pessoa.remover"] },
];
