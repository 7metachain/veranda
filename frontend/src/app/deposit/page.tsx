"use client";

import Link from "next/link";
import { LifiWidget } from "@/components/LifiWidget";
import { DualWalletStatus } from "@/components/DualWalletStatus";
import { useState } from "react";
import { api } from "@/lib/api";

export default function DepositPage() {
  const [depositing, setDepositing] = useState(false);
  const [done, setDone] = useState(false);

  const onDeposit = async () => {
    try {
      setDepositing(true);
      // Calls the on-chain `deposit` instruction via anchor-client.ts
      await api.deposit({ amount: 20_000_000 });
      setDone(true);
    } finally {
      setDepositing(false);
    }
  };

  return (
    <main className="min-h-screen px-6 py-16 max-w-3xl mx-auto space-y-10">
      <header>
        <p className="text-veranda-gold uppercase tracking-[0.4em] text-xs">
          Deposit
        </p>
        <h1 className="font-display text-4xl mt-2">Fund your escrow.</h1>
        <p className="text-veranda-ink/60 mt-2">
          $20 USDC minimum. Bridges from any chain via LI.FI; the second step
          deposits into your on-chain escrow PDA.
        </p>
      </header>

      <DualWalletStatus />

      <section>
        <h2 className="font-display text-2xl mb-3">Step 1 — Bridge to Solana</h2>
        <LifiWidget />
      </section>

      <section>
        <h2 className="font-display text-2xl mb-3">Step 2 — Deposit to escrow</h2>
        <button
          onClick={onDeposit}
          disabled={depositing || done}
          className="px-8 py-3 rounded-full bg-veranda-ink text-veranda-fog disabled:opacity-50"
        >
          {done ? "Deposited ✓" : depositing ? "Sending…" : "Deposit $20 USDC"}
        </button>
      </section>

      {done && (
        <Link
          href="/matching"
          className="inline-block px-8 py-3 rounded-full bg-veranda-rose text-veranda-ink"
        >
          Find matches →
        </Link>
      )}
    </main>
  );
}
