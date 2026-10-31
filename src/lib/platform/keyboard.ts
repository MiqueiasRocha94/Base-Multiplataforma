/**
 * Teclado virtual (celular/tablet, web e nativo). Não há API web para "fechar o
 * teclado": tirar o foco do campo editável faz o SO recolhê-lo — funciona no
 * navegador e no WebView do Capacitor sem plugin.
 *
 * Só `blur()` não basta em dois casos (Android/WebView): o IME às vezes segue
 * aberto após o blur, e quando o campo focado é DESMONTADO (troca de página) o
 * `activeElement` já é o `body` — não há o que desfocar e o teclado fica órfão.
 * Por isso, depois do blur, foca e desfoca um input `readonly` temporário: o SO
 * troca a conexão do IME para um campo não editável e recolhe o teclado.
 */
export function dismissKeyboard() {
  if (typeof document === "undefined") {
    return;
  }
  const active = document.activeElement;
  if (active instanceof HTMLElement && active !== document.body) {
    active.blur();
  }

  const sink = document.createElement("input");
  sink.readOnly = true;
  sink.tabIndex = -1;
  sink.setAttribute("aria-hidden", "true");
  sink.style.cssText = "position:fixed;top:0;left:0;width:1px;height:1px;opacity:0;pointer-events:none;";
  document.body.appendChild(sink);
  sink.focus({ preventScroll: true });
  sink.blur();
  sink.remove();
}

/**
 * Fecha o teclado a cada submit de formulário na página (captura: roda antes do
 * handler da tela, que pode trocar de rota ou mostrar erro). Um listener só, no
 * documento — cobre todo `<form>`, sem cada tela lembrar de fazer isso.
 */
export function subscribeDismissKeyboardOnSubmit(): () => void {
  document.addEventListener("submit", dismissKeyboard, true);
  return () => document.removeEventListener("submit", dismissKeyboard, true);
}
