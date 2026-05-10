"use client";

import Link from "next/link";
import { useState } from "react";
import { LifiWidget } from "@/components/LifiWidget";
import { DualWalletStatus } from "@/components/DualWalletStatus";
import { api } from "@/lib/api";
import { PixelGhost } from "@/components/pixel/PixelGhost";
import {
  PixelButton,
  PixelDivider,
  PixelPanel,
} from "@/components/pixel/PixelUI";

type Tier = {
  id: "starter" | "core" | "premier" | "patron";
  name: string;
  amountUsd: number;
  amountUsdcRaw: number;
  reveals: string;
  poolSize: string;
  perks: string[];
  color: string;
  highlight?: boolean;
};

const TIERS: Tier[] = [
  {
    id: "starter",
    name: "Starter",
    amountUsd: 20,
    amountUsdcRaw: 20_000_000,
    reveals: "5 reveals",
    poolSize: "5 candidates visible",
    perks: ["1 scenario seed", "5 simulation slots", "Basic AI recap"],
    color: "#60c0ff",
  },
  {
    id: "core",
    name: "Core",
    amountUsd: 50,
    amountUsdcRaw: 50_000_000,
    reveals: "15 reveals",
    poolSize: "10 candidates visible",
    perks: [
      "All Starter perks",
      "10 simulation slots",
      "Compatibility deep-dive",
    ],
    color: "#ffd060",
    highlight: true,
  },
  {
    id: "premier",
    name: "Premier",
    amountUsd: 100,
    amountUsdcRaw: 100_000_000,
    reveals: "Unlimited reveals · 30 days",
    poolSize: "15 candidates visible",
    perks: [
      "All Core perks",
      "15 simulation slots",
      "Cross-scenario simulations",
    ],
    color: "#ff6090",
  },
  {
    id: "patron",
    name: "Patron",
    amountUsd: 250,
    amountUsdcRaw: 250_000_000,
    reveals: "Concierge · human curated",
    poolSize: "15 candidates + VIP shard",
    perks: [
      "All Premier perks",
      "Unlimited simulations",
      "Bespoke ZK badge",
    ],
    color: "#c060ff",
  },
];

export default function DepositPage() {
  const [selected, setSelected] = useState<Tier>(TIERS[1]!);
  const [depositing, setDepositing] = useState(false);
  const [done, setDone] = useState(false);

  const onDeposit = async () => {
    try {
      setDepositing(true);
      await api.deposit({ amount: selected.amountUsdcRaw });
      localStorage.setItem("veranda:tier", selected.id);
      setDone(true);
    } finally {
      setDepositing(false);
    }
  };

  return (
    <main className="min-h-screen pixel-grid-bg">
      {/* header */}
      <div className="border-b border-pixel-border bg-pixel-bg2/60">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center gap-3">
          <PixelGhost color={selected.color} scale={3} floaty />
          <div>
            <p className="font-mono text-[9px] tracking-[0.4em] text-pixel-dim">
              ONBOARDING · STEP 2 OF 3 · STAKE
            </p>
            <p className="font-pixel text-2xl text-pixel-gold leading-none">
              FUND YOUR AGENT'S RUN
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-10 space-y-8">
        {/* Pitch */}
        <div className="text-center space-y-2">
          <p className="font-mono text-[10px] tracking-[0.5em] text-pixel-orange">
            ── PICK A SUBSCRIPTION TIER ──
          </p>
          <h2 className="font-pixel text-4xl text-pixel-text">
            Higher tiers = more reveals,{" "}
            <span className="text-pixel-gold">deeper sims</span>, priority compute.
          </h2>
          <p className="font-mono text-sm text-pixel-dim max-w-xl mx-auto">
            All deposits go into your on-chain escrow PDA. Reveal fees are paid
            from this balance. Unused balance is refundable.
          </p>
        </div>

        {/* Tier cards */}
        <section className="grid md:grid-cols-2 lg:grid-cols-4 gap-3">
          {TIERS.map((t) => {
            const isSelected = selected.id === t.id;
            return (
              <button
                key={t.id}
                onClick={() => !done && setSelected(t)}
                disabled={done}
                className={`text-left bg-pixel-bg2 border-2 rounded-md p-5 transition-all relative ${
                  isSelected
                    ? "border-current"
                    : "border-pixel-border hover:border-pixel-dim"
                } ${done ? "opacity-60 cursor-not-allowed" : ""}`}
                style={{ color: isSelected ? t.color : undefined }}
              >
                {t.highlight && (
                  <span
                    className="absolute -top-2 right-3 px-2 py-0.5 font-mono text-[9px] tracking-widest uppercase rounded"
                    style={{
                      background: t.color,
                      color: "#0d0806",
                    }}
                  >
                    most picked
                  </span>
                )}
                <div className="flex items-center justify-between mb-3">
                  <PixelGhost color={t.color} scale={3} />
                  <span
                    className={`w-3 h-3 rounded-sm ${
                      isSelected ? "" : "bg-pixel-border"
                    }`}
                    style={isSelected ? { background: t.color } : undefined}
                  />
                </div>
                <p
                  className="font-pixel text-2xl leading-none"
                  style={{ color: t.color }}
                >
                  {t.name}
                </p>
                <p className="font-pixel text-4xl text-pixel-text mt-2 leading-none">
                  ${t.amountUsd}
                  <span className="font-mono text-[11px] text-pixel-dim">
                    {" "}
                    USDC
                  </span>
                </p>
                <p className="font-mono text-[11px] text-pixel-dim mt-1">
                  {t.reveals}
                </p>
                <p className="font-mono text-[10px] text-pixel-dim/70">
                  {t.poolSize}
                </p>
                <ul className="mt-4 space-y-1.5">
                  {t.perks.map((p) => (
                    <li
                      key={p}
                      className="font-mono text-[11px] text-pixel-text/80 flex gap-2"
                    >
                      <span style={{ color: t.color }}>▸</span>
                      <span>{p}</span>
                    </li>
                  ))}
                </ul>
              </button>
            );
          })}
        </section>

        {/* Wallet + bridge */}
        <PixelPanel title="WALLET STATUS" accent="#60c0ff">
          <DualWalletStatus />
        </PixelPanel>

        <PixelPanel title="STEP 1 · BRIDGE TO SOLANA" accent="#ffd060">
          <p className="font-mono text-sm text-pixel-text/70 mb-3">
            Coming from another chain? Use LI.FI to bridge USDC into your Solana
            wallet first.
          </p>
          <LifiWidget />
        </PixelPanel>

        <PixelPanel title="STEP 2 · STAKE INTO ESCROW" accent="#50e890">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="font-mono text-[10px] tracking-[0.3em] text-pixel-dim uppercase">
                Selected tier
              </p>
              <p
                className="font-pixel text-3xl leading-none mt-1"
                style={{ color: selected.color }}
              >
                {selected.name} · ${selected.amountUsd} USDC
              </p>
              <p className="font-mono text-[11px] text-pixel-dim mt-1">
                {selected.reveals} · {selected.poolSize}
              </p>
            </div>
            {done ? (
              <Link href="/matching">
                <PixelButton>Find matches →</PixelButton>
              </Link>
            ) : (
              <PixelButton onClick={onDeposit} disabled={depositing}>
                {depositing
                  ? "Signing…"
                  : `▶ Stake $${selected.amountUsd} USDC`}
              </PixelButton>
            )}
          </div>
          {done && (
            <>
              <PixelDivider label="DEPOSIT CONFIRMED" />
              <p className="font-mono text-sm text-pixel-green">
                ✓ Escrow funded. Your agent is ready to enter the pool.
              </p>
            </>
          )}
        </PixelPanel>
      </div>
    </main>
  );
}
