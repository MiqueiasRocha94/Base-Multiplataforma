"use client";

import * as React from "react";
import { createPortal } from "react-dom";

import { useDevice } from "@/contexts/DeviceContext";
import { useSystemContext, type TypedButtonRegion } from "@/contexts/SystemContext";
import { cn } from "@/lib/utils";

type ButtonVariant = "default" | "outline" | "secondary" | "ghost" | "danger" | "success" | "warning";
type ButtonSize = "default" | "sm" | "lg" | "icon";

/**
 * Posicionamento semantico do botao — unica fonte de verdade de placement.
 * - `none` (default): renderiza inline, participa do scroll normalmente.
 * - `destructive`/`special`: capturado pela regiao de TOPO (web: topo do
 *   MainContent, direita | mobile: header, direita).
 * - `action`: capturado pela regiao de ACOES (web: rodape do MainContent |
 *   mobile: footer).
 */
type ButtonType = "none" | "destructive" | "special" | "action";

const variantClasses: Record<ButtonVariant, string> = {
  default: "bg-primary text-on-primary hover:bg-primary-strong",
  outline: "border border-border bg-surface text-text hover:bg-[color:var(--color-surface-strong)]",
  secondary: "bg-secondary text-on-secondary hover:brightness-95",
  ghost: "text-[color:var(--color-text)] hover:bg-[color:var(--color-surface-strong)]",
  danger: "bg-error text-on-error hover:brightness-95",
  // Acoes semanticas usam as cores fixas do tema (success/warning), nunca as
  // marcas do esquema (primary/secondary/tertiary).
  success: "bg-[color:var(--color-success)] text-on-success hover:brightness-110",
  warning: "bg-[color:var(--color-warning)] text-on-warning hover:brightness-105",
};

const sizeClasses: Record<ButtonSize, string> = {
  default: "h-12 px-5",
  sm: "h-10 px-4 text-sm",
  lg: "h-14 px-6 text-base",
  icon: "size-10 px-0",
};

export type ButtonProps = Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "type"> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  type?: ButtonType;
  /**
   * `type` nativo do elemento <button>. Atencao: botoes tipados (type != none)
   * sao portalizados para fora do <form>; `htmlType="submit"` neles exige o
   * atributo nativo `form="<id do form>"`.
   */
  htmlType?: "button" | "submit" | "reset";
  /** Exibe spinner no lugar do conteudo e desabilita o botao. */
  loading?: boolean;
};

function resolveRegion(type: ButtonType): TypedButtonRegion | null {
  if (type === "action") return "actions";
  if (type === "destructive" || type === "special") return "top";
  return null;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    className,
    variant = "default",
    size = "default",
    type = "none",
    htmlType = "button",
    loading = false,
    disabled,
    children,
    ...props
  },
  ref,
) {
  const { view } = useDevice();
  const { headerRightEl, mobileActionsEl, webTopRightEl, webActionsEl, registerTypedButton } = useSystemContext().chrome;

  const region = resolveRegion(type);

  React.useEffect(() => {
    if (!region) return;
    return registerTypedButton(region);
  }, [region, registerTypedButton]);

  const target = !region
    ? null
    : view === "mobile"
      ? region === "top"
        ? headerRightEl
        : mobileActionsEl
      : region === "top"
        ? webTopRightEl
        : webActionsEl;

  const button = (
    <button
      ref={ref}
      type={htmlType}
      disabled={disabled || loading}
      data-button-type={type}
      data-view={view}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-2xl font-semibold transition disabled:cursor-not-allowed disabled:opacity-60",
        variantClasses[variant],
        sizeClasses[size],
        className,
      )}
      {...props}
    >
      {loading ? (
        <span className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
      ) : (
        children
      )}
    </button>
  );

  if (!region) {
    return button;
  }

  // Botao tipado: so existe dentro da regiao. Enquanto o alvo nao monta (SSR e
  // primeiro paint), nao renderiza nada — evita hydration mismatch e o flash de
  // "teleporte" que um fallback inline causaria.
  return target ? createPortal(button, target) : null;
});
