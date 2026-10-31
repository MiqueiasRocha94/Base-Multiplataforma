"use client";

import { useEffect, useRef } from "react";
import Script from "next/script";

// @dev-only:start
import { devTurnstileSiteKey } from "@/dev-tools/runtime";
// @dev-only:end

declare global {
    interface Window {
        turnstile?: {
            render: (
                container: HTMLElement,
                options: {
                    sitekey: string;
                    callback?: (token: string) => void;
                    "error-callback"?: () => void;
                    "expired-callback"?: () => void;
                    "timeout-callback"?: () => void;
                },
            ) => string;
            reset: (widgetId: string) => void;
            remove: (widgetId: string) => void;
        };
    }
}

interface TurnstileProps {
    onToken: (token: string | null) => void;
}

export function Turnstile({ onToken }: TurnstileProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const widgetIdRef = useRef<string | null>(null);

    const renderWidget = () => {
        if (!containerRef.current || !window.turnstile || widgetIdRef.current) {
            return;
        }

        widgetIdRef.current = window.turnstile.render(containerRef.current, {
            sitekey: /* @dev-only:start */ devTurnstileSiteKey() /* chave de teste em dev */ ?? /* @dev-only:end */ "0x4AAAAAADWyY0Whqs7cPJW6",

            callback: (token) => {
                onToken(token);
            },

            "error-callback": () => {
                onToken(null);
            },

            "expired-callback": () => {
                onToken(null);
            },

            "timeout-callback": () => {
                onToken(null);
            },
        });
    };

    useEffect(() => {
        renderWidget();

        return () => {
            if (widgetIdRef.current && window.turnstile) {
                window.turnstile.remove(widgetIdRef.current);
                widgetIdRef.current = null;
            }
        };
    }, []);

    return (
        <>
            <Script
                src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"
                strategy="afterInteractive"
                onLoad={renderWidget}
            />

            <div ref={containerRef} />
        </>
    );
}