"use client";

import { createContext, useContext, useId, useLayoutEffect, useRef, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";

import { cn } from "@/lib/utils";

type TooltipProviderValue = {
  root: HTMLElement | null;
};

type TooltipPlacement = "top" | "bottom";

type TooltipPosition = {
  left: number;
  placement: TooltipPlacement;
  top: number;
};

type TooltipProps = {
  children: React.ReactNode;
  className?: string;
  content: React.ReactNode;
};

const VIEWPORT_PADDING = 8;
const TOOLTIP_GAP = 10;

const TooltipContext = createContext<TooltipProviderValue | null>(null);

// Raiz do portal: o `body` no cliente; no servidor não há portal.
const subscribeToRoot = () => () => {};
const clientRoot = () => document.body;
const serverRoot = () => null;

export function TooltipProvider({ children }: { children: React.ReactNode }) {
  const root = useSyncExternalStore(subscribeToRoot, clientRoot, serverRoot);

  return <TooltipContext.Provider value={{ root }}>{children}</TooltipContext.Provider>;
}

export function Tooltip({ children, className, content }: TooltipProps) {
  const tooltipId = useId();
  const context = useContext(TooltipContext);
  const tooltipRef = useRef<HTMLSpanElement | null>(null);
  const triggerRef = useRef<HTMLSpanElement | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState<TooltipPosition>({
    left: 0,
    placement: "top",
    top: 0,
  });

  useLayoutEffect(() => {
    if (!isOpen || !triggerRef.current || !tooltipRef.current) {
      return;
    }

    const updatePosition = () => {
      if (!triggerRef.current || !tooltipRef.current) {
        return;
      }

      const triggerRect = triggerRef.current.getBoundingClientRect();
      const tooltipRect = tooltipRef.current.getBoundingClientRect();
      const shouldRenderBelow =
        triggerRect.top <= tooltipRect.height + TOOLTIP_GAP + VIEWPORT_PADDING ||
        triggerRect.bottom + TOOLTIP_GAP + tooltipRect.height <= window.innerHeight;

      const rawLeft = triggerRect.left + triggerRect.width / 2;
      const minLeft = VIEWPORT_PADDING + tooltipRect.width / 2;
      const maxLeft = window.innerWidth - VIEWPORT_PADDING - tooltipRect.width / 2;
      const left = Math.min(Math.max(rawLeft, minLeft), maxLeft);
      const top = shouldRenderBelow
        ? triggerRect.bottom + TOOLTIP_GAP
        : triggerRect.top - TOOLTIP_GAP;

      setPosition({
        left,
        placement: shouldRenderBelow ? "bottom" : "top",
        top,
      });
    };

    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);

    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [isOpen]);

  return (
    <>
      <span
        ref={triggerRef}
        aria-describedby={isOpen ? tooltipId : undefined}
        className={cn("inline-flex", className)}
        onBlur={() => setIsOpen(false)}
        onFocus={() => setIsOpen(true)}
        onMouseEnter={() => setIsOpen(true)}
        onMouseLeave={() => setIsOpen(false)}
      >
        {children}
      </span>
      {context?.root && isOpen
        ? createPortal(
            <span
              id={tooltipId}
              ref={tooltipRef}
              role="tooltip"
              className={cn(
                "pointer-events-none fixed z-[1100] -translate-x-1/2 rounded-xl border border-border bg-surface px-3 py-2 text-xs font-medium text-text shadow-[var(--shadow-soft)]",
                position.placement === "top" ? "-translate-y-full" : "",
              )}
              style={{ left: position.left, top: position.top }}
            >
              <span
                aria-hidden="true"
                className={cn(
                  "absolute left-1/2 h-3 w-3 -translate-x-1/2 rotate-45 border-border bg-surface",
                  position.placement === "top"
                    ? "bottom-[-7px] border-b border-r"
                    : "top-[-7px] border-l border-t",
                )}
              />
              <span className="relative block whitespace-nowrap">{content}</span>
            </span>,
            context.root,
          )
        : null}
    </>
  );
}
