import { getPlatform, isNativePlatform } from "@/lib/platform/capacitor";

/**
 * Atestado do app (Play Integrity no Android, App Attest no iOS), enviado no
 * login do nativo para o backend confirmar que é o binário oficial.
 *
 * O atestado é pedido com `requestHash` = `jkt` da chave DPoP: prova que ESTA
 * chave nasceu dentro do app autêntico, sem desafio extra no servidor.
 *
 * Ponto de troca: o plugin nativo ainda não está instalado — devolve `null` e o
 * backend, em modo "monitorar" (previsto no backend; docs/autenticacao-e-permissoes.md "Canais, vinculação e renovação do token"),
 * aceita a ausência. Ao instalar: import lazy do plugin aqui, mesmo padrão dos
 * demais recursos de `lib/platform`.
 */
export type AtestadoApp = { plataforma: "android" | "ios"; token: string };

export async function obterAtestadoApp(jkt: string): Promise<AtestadoApp | null> {
  const plataforma = getPlatform();
  if (!isNativePlatform() || !jkt || (plataforma !== "android" && plataforma !== "ios")) {
    return null;
  }
  return null;
}
