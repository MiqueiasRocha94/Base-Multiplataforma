import { isNativePlatform } from "@/lib/platform/capacitor";

/**
 * Raiz da API vista pelo navegador em dev: a mesma origem da página. O
 * `rewrites` de dev do `next.config` repassa `/auth/*` e `/private/*`
 * para `NEXT_PUBLIC_ACESSO_API_URL`. Assim o dev funciona em qualquer porta e
 * pelo IP da rede sem depender do CORS do backend — e `localhost:8080`, que no
 * navegador de outra máquina seria ela mesma, só é chamado por este servidor.
 * O proxy mantém o `Host` da página: o `htu` da prova DPoP é a URL chamada.
 *
 * No APK de debug não há servidor do Next (export estático servido pelo app em
 * `https://localhost`): sem proxy, a chamada vai direto à raiz configurada
 * (ex.: `http://192.168.x.x:8080`, com cleartext liberado no capacitor.config).
 *
 * Ferramenta de dev: a entrada de build de homologação/produção não tem este
 * módulo nem a chamada a ele (docs/ferramentas-dev.md → "Fora dos artefatos").
 */
export function devApiBase(base: string): string {
  return base && !isNativePlatform() ? "" : base;
}
