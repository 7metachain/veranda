"use client";

import { useEffect, useState } from "react";
import { getOrCreateAgentWallet } from "@/lib/agent-wallet";

const HAS_PRIVY = !!process.env.NEXT_PUBLIC_PRIVY_APP_ID;

export function DualWalletStatus() {
  return HAS_PRIVY ? <WithPrivy /> : <DevMode />;
}

function WithPrivy() {
  // Dynamically `require` privy hooks only when we know the provider is mounted.
  // (We can't conditionally `useState` inside one component, so we split.)
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { usePrivy, useWallets } = require("@privy-io/react-auth");
  const { user } = usePrivy();
  const { wallets } = useWallets();
  const [agent, setAgent] = useState<string | null>(null);

  const real =
    wallets.find((w: any) => w.walletClientType === "privy")?.address ??
    user?.wallet?.address ??
    null;

  useEffect(() => {
    getOrCreateAgentWallet().then((w) => setAgent(w.publicKey));
  }, []);

  return <Pills real={real} agent={agent} />;
}

function DevMode() {
  const [agent, setAgent] = useState<string | null>(null);
  useEffect(() => {
    getOrCreateAgentWallet().then((w) => setAgent(w.publicKey));
  }, []);
  return (
    <Pills
      real="(dev mode — Privy not configured)"
      agent={agent}
    />
  );
}

function Pills({
  real,
  agent,
}: {
  real: string | null;
  agent: string | null;
}) {
  return (
    <div className="border border-veranda-ink/10 rounded-2xl p-5 grid grid-cols-1 md:grid-cols-2 gap-4">
      <Pill label="Real wallet" value={real} />
      <Pill label="Agent wallet" value={agent} />
      <p className="text-veranda-ink/50 text-xs col-span-full">
        Server only knows the agent wallet. Real ↔ agent linkage stays in your
        browser as a Poseidon commitment.
      </p>
    </div>
  );
}

function Pill({ label, value }: { label: string; value: string | null }) {
  const isAddress = value && value.length > 12 && !value.startsWith("(");
  return (
    <div className="space-y-1">
      <p className="text-veranda-gold uppercase tracking-[0.3em] text-[10px]">
        {label}
      </p>
      <p className="font-mono text-xs break-all">
        {value
          ? isAddress
            ? `${value.slice(0, 4)}…${value.slice(-4)}`
            : value
          : "—"}
      </p>
    </div>
  );
}
