"use client";

import Link from "next/link";
import { usePrivy } from "@privy-io/react-auth";

const HAS_PRIVY = !!process.env.NEXT_PUBLIC_PRIVY_APP_ID;

export default function LandingPage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6 py-24">
      <div className="max-w-2xl text-center space-y-8">
        <p className="text-veranda-gold uppercase tracking-[0.4em] text-xs">
          Veranda
        </p>
        <h1 className="font-display text-6xl md:text-7xl leading-tight">
          Match through your agent.
          <br />
          Reveal on your terms.
        </h1>
        <p className="text-lg text-veranda-ink/70">
          A privacy-preserving dating platform on Solana. Your AI agent
          quietly meets 30 000 others. You only see who they are when you
          decide to.
        </p>
        <div className="flex justify-center gap-4 pt-4">
          {HAS_PRIVY ? <PrivyCta /> : <DevModeCta />}
        </div>
        {!HAS_PRIVY && (
          <p className="text-veranda-ink/40 text-xs pt-2">
            dev mode · set <code>NEXT_PUBLIC_PRIVY_APP_ID</code> in{" "}
            <code>.env</code> to enable real login
          </p>
        )}
      </div>
    </main>
  );
}

function PrivyCta() {
  const { ready, authenticated, login } = usePrivy();
  if (!ready) {
    return <span className="text-veranda-ink/40">Loading…</span>;
  }
  if (!authenticated) {
    return (
      <button
        onClick={login}
        className="px-8 py-3 rounded-full bg-veranda-ink text-veranda-fog hover:bg-veranda-ink/80 transition"
      >
        Begin
      </button>
    );
  }
  return (
    <Link
      href="/onboarding"
      className="px-8 py-3 rounded-full bg-veranda-ink text-veranda-fog hover:bg-veranda-ink/80 transition"
    >
      Continue onboarding →
    </Link>
  );
}

function DevModeCta() {
  return (
    <Link
      href="/onboarding"
      className="px-8 py-3 rounded-full bg-veranda-ink text-veranda-fog hover:bg-veranda-ink/80 transition"
    >
      Begin (dev mode)
    </Link>
  );
}
