"use client";

import { useEffect, useState } from "react";

/**
 * LiFi Widget mount point.
 *
 * NOTE: We intentionally avoid a top-level `import { LiFiWidget } from "@lifi/widget"`
 * because the v3.14+ wallet-management transitive ships a broken
 * `@mysten/dapp-kit` dep (its named import `getJsonRpcFullnodeUrl` was
 * dropped from `@mysten/sui` upstream). Even with `dynamic(...{ ssr: false })`
 * webpack still tries to resolve the names at build time and fails.
 *
 * The lazy `import()` below is hidden inside a `useEffect` so webpack treats
 * it as a separate client-only chunk and skips static analysis. When the
 * upstream dep tree settles, hoist the import back out and use the
 * `next/dynamic` pattern.
 */
export function LifiWidget() {
  const [Widget, setWidget] = useState<any>(null);

  const SOLANA_CHAIN_ID = Number(
    process.env.NEXT_PUBLIC_LIFI_TO_CHAIN ?? "1151111081099710",
  );
  const integrator = process.env.NEXT_PUBLIC_LIFI_INTEGRATOR ?? "veranda";

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const mod = await import(
          /* webpackIgnore: true */ "@lifi/widget"
        ).catch(() => null);
        if (!cancelled && mod?.LiFiWidget) {
          setWidget(() => mod.LiFiWidget);
        }
      } catch {
        // swallow — fall through to placeholder
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="rounded-2xl border border-veranda-ink/10 overflow-hidden p-6 bg-white">
      {Widget ? (
        <Widget
          integrator={integrator}
          config={{
            integrator,
            toChain: SOLANA_CHAIN_ID,
            toToken: process.env.NEXT_PUBLIC_USDC_MINT ?? "USDC",
            appearance: "light",
          }}
        />
      ) : (
        <div className="space-y-2 text-center py-12">
          <p className="text-veranda-gold uppercase tracking-[0.3em] text-[10px]">
            LI.FI Bridge
          </p>
          <p className="font-display text-2xl">
            Bridge any chain → Solana USDC
          </p>
          <p className="text-veranda-ink/50 text-xs">
            (widget will mount client-side once `@lifi/widget` upstream
            dep tree resolves)
          </p>
        </div>
      )}
    </div>
  );
}
