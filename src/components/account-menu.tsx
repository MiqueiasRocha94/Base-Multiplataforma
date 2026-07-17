"use client";

import Link from "next/link";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";

import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { LocaleSwitcher } from "@/components/locale-switcher";
import { ThemeToggleButton } from "@/components/theme-toggle-button";
import { cn } from "@/lib/utils";

function getInitials(value: string) {
  return value
    .split(/[\s@._-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

type DropdownPosition = {
  align: "left" | "right";
  left: number;
  right: number;
  top: number;
};

const DROPDOWN_FALLBACK_WIDTH = 288; // min-w-72
const VIEWPORT_MARGIN = 8;

export function AccountMenu({ compact = false }: { compact?: boolean }) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const dropdownRef = useRef<HTMLDivElement | null>(null);
  const router = useRouter();
  const { dictionary } = useLanguage();
  const { session, signOut } = useAuth();
  const [open, setOpen] = useState(false);
  const [optionsOpen, setOptionsOpen] = useState(false);
  const [position, setPosition] = useState<DropdownPosition>({ align: "right", left: 0, right: 0, top: 0 });

  const closeMenu = () => {
    setOptionsOpen(false);
    setOpen(false);
  };

  useEffect(() => {
    if (!open) {
      return;
    }

    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      // O dropdown e portalado para document.body, entao fica fora da
      // subarvore do rootRef mesmo estando "dentro" visualmente — precisa
      // checar os dois containers para nao fechar ao clicar nele mesmo.
      if (rootRef.current?.contains(target) || dropdownRef.current?.contains(target)) {
        return;
      }

      closeMenu();
    };

    window.addEventListener("mousedown", handlePointerDown);

    return () => {
      window.removeEventListener("mousedown", handlePointerDown);
    };
  }, [open]);

  // O dropdown e renderizado via portal (fora da arvore do Card), pois o
  // painel da sidebar tem overflow-hidden e cortaria o popover. Alinha pela
  // borda que sobra mais espaco no viewport: no header (trigger perto da
  // direita) cresce para a esquerda; na sidebar (trigger perto da esquerda)
  // cresce para a direita — evita medir de um lado so e vazar da tela.
  useLayoutEffect(() => {
    if (!open || !rootRef.current) {
      return;
    }

    const updatePosition = () => {
      if (!rootRef.current) {
        return;
      }

      const rect = rootRef.current.getBoundingClientRect();
      const dropdownWidth = dropdownRef.current?.getBoundingClientRect().width ?? DROPDOWN_FALLBACK_WIDTH;
      const fitsToTheRight = rect.left + dropdownWidth + VIEWPORT_MARGIN <= window.innerWidth;

      setPosition(
        fitsToTheRight
          ? { align: "left", left: rect.left, right: 0, top: rect.bottom + 8 }
          : { align: "right", left: 0, right: window.innerWidth - rect.right, top: rect.bottom + 8 },
      );
    };

    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);

    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [open]);

  if (!session) {
    return (
      <Link
        href="/login"
        className="inline-flex h-11 items-center justify-center rounded-2xl border border-border px-4 text-sm font-semibold transition hover:bg-[color:var(--color-surface-strong)]"
      >
        {dictionary.nav.login}
      </Link>
    );
  }

  const initials = getInitials(session.username || session.email || dictionary.nav.portal);

  return (
    <div ref={rootRef} className="relative">
      {compact ? (
        <button
          type="button"
          aria-expanded={open}
          aria-label={session.username}
          onClick={() => (open ? closeMenu() : setOpen(true))}
          className="inline-flex size-10 items-center justify-center rounded-full bg-primary text-xs font-bold text-white transition hover:opacity-90"
        >
          {initials}
        </button>
      ) : (
        <button
          type="button"
          aria-expanded={open}
          onClick={() => {
            if (open) {
              closeMenu();
              return;
            }

            setOpen(true);
          }}
          className="inline-flex h-11 items-center gap-3 rounded-2xl border border-border bg-surface/85 px-3 py-2 text-sm font-semibold transition hover:bg-[color:var(--color-surface-strong)]"
        >
          <span className="inline-flex size-8 items-center justify-center rounded-full bg-primary text-xs font-bold text-white">
            {initials}
          </span>
          <span className="max-w-32 truncate text-text">{session.username}</span>
          <span className={cn("text-xs text-text-muted transition", open && "rotate-180")}>▾</span>
        </button>
      )}

      {open && typeof document !== "undefined"
        ? createPortal(
            <div
              ref={dropdownRef}
              className="fixed z-[1100] min-w-72 rounded-[var(--radius-xl)] border border-border bg-surface p-2 shadow-[var(--shadow-soft)]"
              style={
                position.align === "left"
                  ? { left: position.left, top: position.top }
                  : { right: position.right, top: position.top }
              }
            >
          <div className="border-b border-border/60 px-3 py-3">
            <p className="text-sm font-semibold text-text">{session.username}</p>
            <p className="mt-1 text-sm text-text-muted">{session.email}</p>
          </div>

          <div className="grid gap-1 p-1">
            <Link
              href="/portal/profile"
              onClick={() => {
                closeMenu();
              }}
              className="rounded-[var(--radius-lg)] px-3 py-3 text-sm font-medium text-text transition hover:bg-[color:var(--color-surface-strong)]"
            >
              {dictionary.profile.menuProfile}
            </Link>
            <div className="border-t border-border/60 pt-1">
              <button
                type="button"
                aria-expanded={optionsOpen}
                onClick={() => setOptionsOpen((current) => !current)}
                className="flex w-full items-center justify-between gap-3 rounded-[var(--radius-lg)] px-3 py-3 text-left text-sm font-medium text-text transition hover:bg-[color:var(--color-surface-strong)]"
              >
                <span>{dictionary.profile.menuConfig}</span>
                <span className={cn("text-xs text-text-muted transition", optionsOpen && "rotate-180")}>▾</span>
              </button>

              {optionsOpen ? (
                <div className="grid gap-4 px-3 pb-3 pt-2">
                  <div className="flex flex-wrap items-start gap-3">
                    <div className="grid gap-2">
                      <p className="text-sm font-medium text-text">{dictionary.profile.languageTitle}</p>
                      <LocaleSwitcher />
                    </div>
                    <div className="grid gap-2">
                      <p className="text-sm font-medium text-text">{dictionary.profile.themeTitle}</p>
                      <ThemeToggleButton className="w-fit" />
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
            <button
              type="button"
              onClick={() => {
                signOut();
                closeMenu();
                router.replace("/home");
              }}
              className="rounded-[var(--radius-lg)] px-3 py-3 text-left text-sm font-medium text-error transition hover:bg-[color:var(--color-surface-strong)]"
            >
              {dictionary.profile.menuSignOut}
            </button>
          </div>
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}
