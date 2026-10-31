import { isNativePlatform } from "@/lib/platform/capacitor";

export type BackButtonEvent = {
  /** A WebView tem para onde voltar no histórico (rota anterior ou camada empilhada). */
  canGoBack: boolean;
};

/**
 * Botão voltar do sistema (Android). Com um assinante, o plugin `@capacitor/app`
 * deixa de agir sozinho e só avisa: quem assina decide voltar, fechar ou sair.
 * Web/iOS: não faz nada (o navegador cuida do voltar). Import lazy, no mesmo
 * padrão dos demais recursos nativos.
 */
export function subscribeBackButton(handler: (event: BackButtonEvent) => void): () => void {
  if (!isNativePlatform()) {
    return () => {};
  }

  let active = true;
  let remove: (() => Promise<void>) | null = null;

  void import("@capacitor/app")
    .then(({ App }) => App.addListener("backButton", ({ canGoBack }) => handler({ canGoBack })))
    .then((listener) => {
      if (active) {
        remove = () => listener.remove();
      } else {
        void listener.remove();
      }
    })
    .catch(() => {
      // Plugin ausente (APK antigo sem `cap sync`): fica o comportamento padrão do SO.
    });

  return () => {
    active = false;
    void remove?.();
  };
}

/** Fecha o app (Android). Fora do nativo, não faz nada. */
export async function exitApp(): Promise<void> {
  if (!isNativePlatform()) {
    return;
  }
  const { App } = await import("@capacitor/app");
  await App.exitApp();
}

export type BackAction = "history" | "exit-hint" | "exit" | "home";

/** Janela do segundo toque para sair do app. */
export const EXIT_CONFIRM_WINDOW_MS = 2000;

/**
 * Decide o que o voltar do sistema faz (puro, testável):
 * - há histórico → volta (fecha a camada empilhada ou volta a rota);
 * - sem histórico, na raiz (home ou rota pública) → avisa no 1º toque e sai no 2º
 *   dentro da janela;
 * - sem histórico em outra rota (entrada direta) → vai para a home.
 */
export function resolveBackAction(input: {
  canGoBack: boolean;
  atRoot: boolean;
  now: number;
  lastPressAt: number | null;
}): BackAction {
  if (input.canGoBack) return "history";
  if (!input.atRoot) return "home";
  if (input.lastPressAt !== null && input.now - input.lastPressAt <= EXIT_CONFIRM_WINDOW_MS) return "exit";
  return "exit-hint";
}
