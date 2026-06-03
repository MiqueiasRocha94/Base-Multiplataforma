type VisibilityHandler = (visible: boolean) => void;

export function subscribeToAppVisibility(handler: VisibilityHandler) {
  if (typeof document === "undefined") {
    return () => {};
  }

  const notify = () => {
    handler(document.visibilityState === "visible");
  };

  document.addEventListener("visibilitychange", notify);
  window.addEventListener("focus", notify);
  window.addEventListener("blur", notify);

  return () => {
    document.removeEventListener("visibilitychange", notify);
    window.removeEventListener("focus", notify);
    window.removeEventListener("blur", notify);
  };
}
