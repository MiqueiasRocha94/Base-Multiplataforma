/**
 * Tipo generico de arquivo (imagem, documento, etc.) — dado comum em quase
 * todo sistema. `uri` pode ser local (blob:), remota (http) ou data URI.
 */
export type FileItem = {
  id: string;
  name: string;
  uri: string;
  mimeType?: string;
};

// eslint-disable-next-line no-restricted-syntax -- D06 (desvio conhecido): valor de runtime em types/; corrige movendo para lib/
export function generateFileId(): string {
  return `file-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}
