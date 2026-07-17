"use client";

import { useState } from "react";

import { cn } from "@/lib/utils";

export type MarkerPosition = "left" | "right" | "none" | "bottom";
export type MarkerMode = "sidebar" | "overlay-card" | "custom";
export type MarkerPayload = {
  itemId?: string;
  label: string;
  view: string;
};

export type MarkerProps = {
  className?: string;
  icon: React.ReactNode;
  itemId?: string;
  label: string;
  mode?: MarkerMode;
  onClick?: () => void;
  overlayContent?: React.ReactNode;
  positionOffset?: number;
  position?: MarkerPosition;
  title?: string;
  view?: string;
};

function resolveContainerClass(position: MarkerPosition) {
  if (position === "left") {
    return "pointer-events-none fixed inset-y-0 left-0 z-[60] flex items-center";
  }

  if (position === "right") {
    return "pointer-events-none fixed inset-y-0 right-0 z-[60] flex items-center";
  }

  if (position === "bottom") {
    return "pointer-events-none fixed inset-x-0 bottom-0 z-[60] flex justify-center px-4 pb-4";
  }

  return "";
}

function resolveButtonClass(position: MarkerPosition) {
  if (position === "left") {
    return "group flex min-h-24 w-14 flex-col items-center justify-center gap-2 rounded-r-2xl border border-l-0 border-border bg-surface px-2 shadow-[var(--shadow-soft)] transition hover:translate-x-1 hover:w-28";
  }

  if (position === "right") {
    return "group flex min-h-24 w-14 flex-col items-center justify-center gap-2 rounded-l-2xl border border-r-0 border-border bg-surface px-2 shadow-[var(--shadow-soft)] transition hover:-translate-x-1 hover:w-28";
  }

  if (position === "bottom") {
    return "group inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-border bg-surface px-4 shadow-[var(--shadow-soft)] transition hover:-translate-y-0.5";
  }

  return "group inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-border bg-surface px-4 shadow-[var(--shadow-soft)] transition hover:-translate-y-0.5";
}

export function Marker({
  className,
  icon,
  label,
  mode = "sidebar",
  onClick,
  overlayContent,
  positionOffset = 0,
  position = "none",
  title,
}: MarkerProps) {
  const [overlayOpen, setOverlayOpen] = useState(false);
  const markerTitle = title ?? label;

  const handleClick = () => {
    if (position === "bottom" && mode === "overlay-card") {
      setOverlayOpen(true);
      return;
    }

    onClick?.();
  };

  const button = (
    <button
      type="button"
      onClick={handleClick}
      title={markerTitle}
      aria-label={markerTitle}
      className={cn(resolveButtonClass(position), className)}
    >
      <span aria-hidden="true" className="text-lg leading-none">
        {icon}
      </span>
      <span
        className={cn(
          "max-w-0 overflow-hidden whitespace-nowrap text-[10px] font-semibold uppercase tracking-[0.2em] opacity-0 transition-all duration-200 group-hover:max-w-24 group-hover:opacity-100",
          position === "left" || position === "right" ? "group-hover:[writing-mode:horizontal-tb]" : "",
        )}
      >
        {label}
      </span>
    </button>
  );

  return (
    <>
      {position === "none" ? (
        button
      ) : (
        <div className={resolveContainerClass(position)}>
          <div
            className="pointer-events-auto"
            style={positionOffset ? { transform: `translateY(${positionOffset}px)` } : undefined}
          >
            {button}
          </div>
        </div>
      )}

      {position === "bottom" && overlayOpen && overlayContent ? (
        <div className="fixed inset-x-0 bottom-0 z-[70] flex justify-center px-4 pb-4">
          <div className="w-full max-w-4xl rounded-[var(--radius-2xl)] border border-border bg-surface shadow-[var(--shadow-soft)]">
            <div className="flex justify-end p-3">
              <button
                type="button"
                onClick={() => setOverlayOpen(false)}
                className="inline-flex size-10 items-center justify-center rounded-full border border-border text-text-muted transition hover:bg-[color:var(--color-surface-strong)]"
                aria-label="Close overlay"
              >
                x
              </button>
            </div>
            <div className="max-h-[60vh] overflow-y-auto px-4 pb-4">{overlayContent}</div>
          </div>
        </div>
      ) : null}
    </>
  );
}
