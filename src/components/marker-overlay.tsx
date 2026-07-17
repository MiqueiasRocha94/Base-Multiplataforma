"use client";

import { Marker, type MarkerProps } from "@/components/marker";
import { cn } from "@/lib/utils";

type MarkerOverlayProps = {
  children: React.ReactNode;
  className?: string;
  contentClassName?: string;
  contentWrapperClassName?: string;
  markerClassName?: string;
  markerWrapperClassName?: string;
  markerProps: Omit<MarkerProps, "className" | "onClick">;
  onClose: () => void;
  onOpen: () => void;
  open: boolean;
  showCloseButton?: boolean;
};

export function MarkerOverlay({
  children,
  className,
  contentClassName,
  contentWrapperClassName,
  markerClassName,
  markerWrapperClassName,
  markerProps,
  onClose,
  onOpen,
  open,
  showCloseButton = false,
}: MarkerOverlayProps) {
  if (!open) {
    if (markerWrapperClassName) {
      return (
        <div className={markerWrapperClassName}>
          <div className="pointer-events-auto">
            <Marker {...markerProps} className={markerClassName} onClick={onOpen} />
          </div>
        </div>
      );
    }

    return <Marker {...markerProps} className={markerClassName} onClick={onOpen} />;
  }

  return (
    <div className={cn("fixed inset-0 z-[70] flex items-center justify-center bg-black/40 px-4 py-8", className)}>
      <div className={cn("w-full", contentWrapperClassName)}>
        <div className={cn("relative", contentClassName)}>
          {showCloseButton ? (
            <button
              type="button"
              onClick={onClose}
              className="absolute right-3 top-3 z-10 inline-flex size-10 items-center justify-center rounded-full border border-border bg-surface text-text-muted transition hover:bg-[color:var(--color-surface-strong)]"
              aria-label="Close overlay"
            >
              x
            </button>
          ) : null}
          {children}
        </div>
      </div>
    </div>
  );
}
