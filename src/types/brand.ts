import type { BrandId } from "@/config/brand";

/**
 * Informações institucionais do white-label (WL).
 *
 * Camadas da identidade de marca:
 * - `BrandProfile` (config/brand, SÍNCRONO): id, nome, cores e assets de
 *   primeiro paint. Fica sync porque o SSR e o ThemeProvider (cores) leem no
 *   render inicial.
 * - `BrandInfo` (ESTE, ASSÍNCRONO): dados institucionais recuperados por WL.
 *   Hoje vêm do Dev Backend (mock que simula a API); quando o backend real
 *   existir, virão de `GET /whitelabel/:id` — que também passará a servir as
 *   imagens de cada marca.
 */
export type BrandInfo = {
  id: BrandId;
  /** Domínio de produção (`urlMatch`) — base da resolução da marca por host. */
  domain: string;
  /** Nome comercial. */
  name: string;
  /** Empresa (forma curta). */
  company: string;
  /** Artigo gramatical pt-BR ("A Empresa" / "O Instituto"). */
  article: "A" | "O";
  /** Razão social. */
  legalName: string;
  /** CNPJ ("" quando não informado). */
  cnpj: string;
  /** Telefone/WhatsApp de contato (E.164 sem "+"). */
  phone: string;
  /** E-mail de contato — vem do backend (EnumConfiguracaoEmail); "" por ora. */
  email: string;
  /** Endereço da sede. */
  address: string;
  /** Arquivo do termo de uso (PDF); o backend servirá a URL. */
  termsFile: string;
  /** Botões de loja exibidos no login. */
  stores: { playStore: boolean; appStore: boolean };
  /** Chatbot habilitado. */
  chatbot: boolean;
};
