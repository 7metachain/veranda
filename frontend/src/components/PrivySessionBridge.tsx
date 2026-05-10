"use client";

import { useEffect, useRef } from "react";
import { usePrivy } from "@privy-io/react-auth";

const BASE = process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:8080";

/**
 * After Privy authenticates, exchanges the access token for a Veranda session
 * and caches `veranda:real_wallet` + `veranda:user_id` for UI / future APIs.
 */
export function PrivySessionBridge() {
  const { ready, authenticated, getAccessToken } = usePrivy();
  const syncedForUser = useRef<string | null>(null);

  useEffect(() => {
    if (!ready || !authenticated) {
      syncedForUser.current = null;
      localStorage.removeItem("veranda:user_id");
      localStorage.removeItem("veranda:real_wallet");
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        const token = await getAccessToken();
        if (!token || cancelled) return;

        // Re-sync when Privy rotates the session / user switches account.
        const cacheKey = token.slice(0, 48);
        if (syncedForUser.current === cacheKey) return;

        const res = await fetch(`${BASE}/api/v1/auth/session`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ privy_token: token }),
        });
        if (!res.ok) {
          const t = await res.text();
          console.warn("[PrivySessionBridge] session failed", res.status, t);
          return;
        }
        const data = (await res.json()) as {
          user_id: string;
          real_wallet: string;
        };
        if (cancelled) return;
        localStorage.setItem("veranda:user_id", data.user_id);
        localStorage.setItem("veranda:real_wallet", data.real_wallet);
        syncedForUser.current = cacheKey;
        window.dispatchEvent(new CustomEvent("veranda:session"));
      } catch (e) {
        console.warn("[PrivySessionBridge]", e);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [ready, authenticated, getAccessToken]);

  return null;
}
