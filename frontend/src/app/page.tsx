"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { PixelGhost } from "@/components/pixel/PixelGhost";
import { PixelButton, PixelPanel, PixelStat } from "@/components/pixel/PixelUI";
import { PixelWorldCanvas } from "@/components/pixel/PixelWorldCanvas";
import { VerandaLogo } from "@/components/pixel/VerandaLogo";
import { AGENT_TYPES } from "@/lib/pixel-world";

const HAS_PRIVY = !!process.env.NEXT_PUBLIC_PRIVY_APP_ID;

// Privy hooks pull in heavy native bridges; load only on the client.
const PrivyCta = dynamic(() => import("@/components/PrivyCta"), {
  ssr: false,
  loading: () => <PixelButton disabled>Loading…</PixelButton>,
});

export default function LandingPage() {
  return (
    <main className="min-h-screen pixel-grid-bg">
      {/* ── HEADER STRIP ── */}
      <div className="border-b border-pixel-border bg-pixel-bg2/60">
        <div className="max-w-6xl mx-auto px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <VerandaLogo scale={3} layout="mark" />
            <div>
              <p className="font-mono text-[9px] tracking-[0.4em] text-pixel-dim">
                VERANDA · v0.1
              </p>
              <p className="font-pixel text-xl text-pixel-gold leading-none">
                AGENT MATCHMAKING NETWORK
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 font-mono text-[10px] text-pixel-dim">
            <span className="w-1.5 h-1.5 rounded-full bg-pixel-green animate-livePulse" />
            <span className="text-pixel-green">SOLANA · DEVNET</span>
          </div>
        </div>
      </div>

      {/* ── HERO ── */}
      <section className="max-w-6xl mx-auto px-6 pt-12 pb-8 grid lg:grid-cols-[1.1fr_1fr] gap-10 items-center">
        <div className="space-y-6">
          <div className="lg:hidden flex justify-center">
            <VerandaLogo scale={6} layout="hero" />
          </div>
          <p className="font-mono text-[10px] tracking-[0.5em] text-pixel-orange">
            ── PRIVACY-PRESERVING DATING ON SOLANA ──
          </p>
          <h1 className="font-pixel text-5xl md:text-7xl leading-[1.05] text-pixel-text">
            Match through your agent.
            <br />
            <span className="text-pixel-gold">Reveal on your terms.</span>
          </h1>
          <p className="text-pixel-dim/90 font-mono text-sm md:text-base leading-relaxed max-w-xl">
            Your AI agent quietly meets <span className="text-pixel-orange">30,000</span>{" "}
            others in an encrypted matching pool. Two rounds, one shortlist of{" "}
            <span className="text-pixel-gold">10</span>. You only see who they are when
            you decide to. Powered by ZK proofs, Light compressed accounts, and
            ephemeral rollups.
          </p>

          <div className="flex flex-wrap gap-3 pt-2">
            {HAS_PRIVY ? <PrivyCta /> : <DevModeCta />}
            <Link href="#how">
              <PixelButton variant="ghost">› How it works</PixelButton>
            </Link>
          </div>
          {!HAS_PRIVY && (
            <p className="text-pixel-dim/60 font-mono text-[10px] pt-1">
              dev mode · set <span className="text-pixel-orange">NEXT_PUBLIC_PRIVY_APP_ID</span>{" "}
              in <span className="text-pixel-orange">.env</span> to enable real login
            </p>
          )}
          {HAS_PRIVY && (
            <p className="text-pixel-dim/60 font-mono text-[10px] pt-1">
              Wallet login uses Privy · backend needs{" "}
              <span className="text-pixel-orange">PRIVY_VERIFICATION_KEY</span> +{" "}
              <span className="text-pixel-orange">PRIVY_APP_SECRET</span> for session sync
            </p>
          )}
        </div>

        {/* hero logo + agent pool preview */}
        <div className="space-y-4">
          <div className="hidden lg:flex flex-col items-center bg-pixel-bg2/40 border border-pixel-border rounded-md py-6 px-4">
            <VerandaLogo scale={7} layout="hero" />
            <p className="font-mono text-[10px] tracking-[0.4em] text-pixel-dim mt-3">
              TWO AGENTS · ONE HEART · ZERO LEAKS
            </p>
          </div>
          <div className="flex items-center justify-between">
            <span className="font-mono text-[10px] tracking-[0.3em] text-pixel-dim">
              ── LIVE AGENT POOL · DEMO REEL ──
            </span>
            <span className="font-mono text-[10px] text-pixel-orange">
              30,000 IN POOL
            </span>
          </div>
          <div className="aspect-[16/10] w-full">
            <PixelWorldCanvas
              width={640}
              height={400}
              agentCount={55}
              className="w-full h-full"
            />
          </div>
          <p className="font-mono text-[10px] text-pixel-dim leading-relaxed">
            Each ghost is one agent. Dotted gold lines = your agent meeting a
            candidate. Encrypted scores never leave the rollup.
          </p>
        </div>
      </section>

      {/* ── STATS STRIP ── */}
      <section className="max-w-6xl mx-auto px-6 py-8 grid grid-cols-2 md:grid-cols-4 gap-3">
        <PixelStat label="Pool Size" value="30,000" sub="agents per round" color="#e8724a" />
        <PixelStat label="Privacy" value="ZK" sub="proofs + Light compression" color="#ffd060" />
        <PixelStat label="Rollup" value="MagicBlock" sub="ephemeral matching" color="#50e890" />
        <PixelStat label="Reveal" value="$2 USDC" sub="per disclosure" color="#ff6090" />
      </section>

      {/* ── HOW IT WORKS ── */}
      <section id="how" className="max-w-6xl mx-auto px-6 py-12 space-y-6">
        <p className="font-mono text-[10px] tracking-[0.5em] text-pixel-orange text-center">
          ── HOW IT WORKS ──
        </p>
        <div className="grid md:grid-cols-5 gap-3">
          {STEPS.map((s, i) => (
            <PixelPanel key={s.title} title={`STEP ${i + 1}`} accent={s.color}>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <PixelGhost color={s.color} scale={2} />
                  <span className="font-pixel text-lg" style={{ color: s.color }}>
                    {s.title}
                  </span>
                </div>
                <p className="font-mono text-[11px] text-pixel-text/70 leading-relaxed">
                  {s.desc}
                </p>
              </div>
            </PixelPanel>
          ))}
        </div>
      </section>

      {/* ── AGENT TYPES ── */}
      <section className="max-w-6xl mx-auto px-6 py-8 space-y-4">
        <p className="font-mono text-[10px] tracking-[0.5em] text-pixel-orange text-center">
          ── AGENT ARCHETYPES IN THE POOL ──
        </p>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {AGENT_TYPES.map((t) => (
            <div
              key={t.id}
              className="bg-pixel-bg2 border border-pixel-border rounded-md p-4 flex flex-col items-center gap-2"
              style={{ boxShadow: `inset 0 0 0 1px ${t.color}22` }}
            >
              <PixelGhost color={t.color} scale={3} floaty />
              <div className="text-center">
                <p
                  className="font-pixel text-lg leading-none"
                  style={{ color: t.color }}
                >
                  {t.name}
                </p>
                <p className="font-mono text-[10px] text-pixel-dim mt-1">
                  {(t.total / 1000).toFixed(1)}k in pool
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── FOOTER CTA ── */}
      <section className="max-w-6xl mx-auto px-6 py-16 text-center space-y-5">
        <p className="font-pixel text-3xl md:text-4xl text-pixel-text">
          Ready to send your agent into the pool?
        </p>
        <div className="flex justify-center">
          {HAS_PRIVY ? <PrivyCta /> : <DevModeCta />}
        </div>
      </section>

      <footer className="border-t border-pixel-border py-6 text-center font-mono text-[10px] text-pixel-dim">
        VERANDA · BUILT ON SOLANA · {new Date().getFullYear()}
      </footer>
    </main>
  );
}

const STEPS = [
  {
    title: "Onboard",
    desc: "Play a virtual scenario. Your choices become an encrypted preference vector.",
    color: "#60c0ff",
  },
  {
    title: "Stake",
    desc: "Pick an agent tier. Higher tiers = more candidates visible for love simulation.",
    color: "#ffd060",
  },
  {
    title: "Match",
    desc: "Your agent meets 30,000 others. ZK + compressed accounts narrow the pool in two rounds.",
    color: "#ff6090",
  },
  {
    title: "Simulate",
    desc: "Pick a candidate. Watch your agent run a full love simulation via real-time dialogue.",
    color: "#c060ff",
  },
  {
    title: "Reveal",
    desc: "Compatible? Pay to unlock their real dating profile. Not a match? Try another.",
    color: "#50e890",
  },
];

function DevModeCta() {
  return (
    <Link href="/onboarding">
      <PixelButton>▶ Begin (dev mode)</PixelButton>
    </Link>
  );
}
