"use client";

import { useEffect, useRef } from "react";

/**
 * The Cloudflare Turnstile widget, rendered only when a site key is set.
 *
 * Nothing loads and nothing renders without NEXT_PUBLIC_TURNSTILE_SITE_KEY;
 * the form then falls back to its honeypot and timing checks and the server
 * (which has its own switch) does not ask for a token. See
 * lib/server/turnstile.ts for the fail-closed rule on the other side.
 *
 * The loader is inserted from script, not from markup, on purpose: under the
 * site's `strict-dynamic` CSP a script element created by an already-trusted
 * script inherits that trust, so no nonce has to be threaded down to a
 * client component. The script is added once per page and shared by every
 * widget on it.
 *
 * `onToken` receives a fresh token each time the widget issues one and an
 * empty string when the previous token expires or errors, so the form always
 * knows whether it holds a token it can send.
 */

declare global {
  interface Window {
    turnstile?: {
      render: (el: HTMLElement, opts: Record<string, unknown>) => string;
      reset: (id?: string) => void;
      remove: (id: string) => void;
    };
  }
}

export const TURNSTILE_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY?.trim() || "";
const SRC = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";

let loading: Promise<void> | null = null;
function loadTurnstile(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (window.turnstile) return Promise.resolve();
  if (loading) return loading;
  loading = new Promise<void>((resolve, reject) => {
    const s = document.createElement("script");
    s.src = SRC;
    s.async = true;
    s.defer = true;
    s.onload = () => resolve();
    s.onerror = () => {
      loading = null;
      reject(new Error("turnstile loader failed"));
    };
    document.head.appendChild(s);
  });
  return loading;
}

export function Turnstile({ onToken, action, className }: { onToken: (token: string) => void; action: string; className?: string }) {
  const host = useRef<HTMLDivElement>(null);
  const cb = useRef(onToken);
  cb.current = onToken;

  useEffect(() => {
    if (!TURNSTILE_SITE_KEY || !host.current) return;
    let id: string | null = null;
    let disposed = false;
    loadTurnstile()
      .then(() => {
        if (disposed || !host.current || !window.turnstile) return;
        id = window.turnstile.render(host.current, {
          sitekey: TURNSTILE_SITE_KEY,
          action,
          theme: "dark",
          size: "flexible",
          callback: (token: string) => cb.current(token),
          "expired-callback": () => cb.current(""),
          "error-callback": () => cb.current(""),
          "timeout-callback": () => cb.current(""),
        });
      })
      .catch(() => cb.current(""));
    return () => {
      disposed = true;
      if (id && window.turnstile) {
        try {
          window.turnstile.remove(id);
        } catch {
          /* already gone */
        }
      }
    };
  }, [action]);

  if (!TURNSTILE_SITE_KEY) return null;
  return <div ref={host} className={className} data-turnstile />;
}
