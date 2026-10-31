/**
 * Chave de site de TESTE da Cloudflare (sempre aprova, vale em qualquer host —
 * inclusive IP e localhost): em dev o widget aparece e libera o login de quem
 * abre o dev server pelo IP da rede, que a chave real recusa (erro 110200).
 * O backend fora de produção não confere o token.
 *
 * Ferramenta de dev: a entrada de build de homologação/produção não tem este
 * módulo nem a chamada a ele (docs/ferramentas-dev.md → "Fora dos artefatos").
 */
const CHAVE_TESTE_SEMPRE_APROVA = "1x00000000000000000000AA";

export function devTurnstileSiteKey(): string | null {
  return CHAVE_TESTE_SEMPRE_APROVA;
}
