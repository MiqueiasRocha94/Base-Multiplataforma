import { p256 } from "@noble/curves/nist.js";
import { sha256 } from "@noble/hashes/sha2.js";

/**
 * Substituto do WebCrypto para o DPoP quando a página NÃO está em contexto
 * seguro — o dev server aberto por HTTP no IP da rede (`http://192.168.x.x`),
 * onde o navegador não expõe `crypto.subtle`. Mesmo algoritmo do nativo
 * (ECDSA P-256 + SHA-256, assinatura r||s): o backend recebe a mesma prova ES256.
 *
 * Diferença só de dev: a chave privada fica em bytes no IndexedDB (exportável),
 * e não como `CryptoKey` não exportável. Ferramenta de dev: a entrada de build
 * de homologação/produção não tem este módulo; lá o DPoP exige contexto seguro
 * (docs/ferramentas-dev.md → "Fora dos artefatos").
 */
export type DevEcdsa = {
  gerarChavePrivada: () => Uint8Array;
  /** Coordenadas `x`/`y` da chave pública (bytes; o DPoP codifica no JWK). */
  coordenadasPublicas: (privada: Uint8Array) => { x: Uint8Array; y: Uint8Array };
  assinar: (privada: Uint8Array, dados: Uint8Array) => Uint8Array;
  sha256: (dados: Uint8Array) => Uint8Array;
};

const devEcdsa: DevEcdsa = {
  gerarChavePrivada: () => p256.utils.randomSecretKey(),
  coordenadasPublicas: (privada) => {
    // Formato não comprimido: 0x04 || x (32) || y (32).
    const publica = p256.getPublicKey(privada, false);
    return { x: publica.slice(1, 33), y: publica.slice(33, 65) };
  },
  assinar: (privada, dados) => p256.sign(dados, privada),
  sha256: (dados) => sha256(dados),
};

export function devWebCrypto(): DevEcdsa {
  return devEcdsa;
}
