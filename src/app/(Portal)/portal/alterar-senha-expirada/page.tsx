import { SenhaExpiradaScreen } from "@/components/login/senha-expirada-screen";

/**
 * Troca de senha expirada — wrapper fino sobre a tela em `components/login`.
 * Protegida (grupo `(Portal)`), sem o chrome do app (`minimal` em
 * `lib/system/route-meta`): a sessao ainda nao libera o menu.
 */
export default function AlterarSenhaExpiradaPage() {
  return <SenhaExpiradaScreen />;
}
