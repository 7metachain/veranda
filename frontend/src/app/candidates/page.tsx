"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { CandidateCard } from "@/components/CandidateCard";
import { CeremonyVideo } from "@/components/CeremonyVideo";
import { DisclosurePayment } from "@/components/DisclosurePayment";
import { RomanceSimulator } from "@/components/pixel/RomanceSimulator";
import { PixelGhost } from "@/components/pixel/PixelGhost";
import {
  PixelButton,
  PixelDivider,
  PixelPanel,
} from "@/components/pixel/PixelUI";
import { api, type CandidateBrief, type DisclosedProfile } from "@/lib/api";

const MOCK_TEASERS = [
  "Loves cooking weeknight pasta from scratch.",
  "Travels with one carry-on; reads on planes.",
  "Family-first; weekly Sunday dinners are sacred.",
  "Mediates in disagreements; rarely raises voice.",
  "Coffee snob. Knows every café within walking distance.",
  "Reads two books a month, mostly fiction.",
  "Climbs on weekends; runs sub-25 5Ks.",
  "Hosts board game nights. Plays to win.",
  "Worked overseas; speaks three languages.",
  "Volunteers at the animal shelter every Saturday.",
];

function buildMockCandidates(): CandidateBrief[] {
  return Array.from({ length: 10 }).map((_, i) => ({
    index: i,
    score: 9500 - i * 320 - Math.floor(Math.random() * 80),
    teaser: MOCK_TEASERS[i] ?? `Top candidate #${i + 1}`,
    agent_wallet: `MockCandidateAgent${String(i).padStart(2, "0")}1111111111111111111`,
  }));
}

function CandidatesPageInner() {
  const params = useSearchParams();
  const sessionId = params.get("session");

  const [candidates, setCandidates] = useState<CandidateBrief[]>([]);
  const [simulating, setSimulating] = useState<CandidateBrief | null>(null);
  const [scenario, setScenario] = useState<string>("casual_dining");
  const [paymentTarget, setPaymentTarget] = useState<CandidateBrief | null>(null);
  const [disclosed, setDisclosed] = useState<DisclosedProfile | null>(null);
  const [ceremonyUrl, setCeremonyUrl] = useState<string | null>(null);
  const [mockMode, setMockMode] = useState(false);

  // Read scenario from onboarding (defaults to casual_dining).
  useEffect(() => {
    try {
      const raw = localStorage.getItem("veranda:selected_scenarios");
      const arr = raw ? (JSON.parse(raw) as string[]) : [];
      if (arr[0]) setScenario(arr[0]);
    } catch {
      /* noop */
    }
  }, []);

  useEffect(() => {
    if (!sessionId) return;
    let cancelled = false;
    (async () => {
      try {
        const r = await api.candidates(sessionId);
        if (cancelled) return;
        if (r.candidates.length === 0) {
          setMockMode(true);
          setCandidates(buildMockCandidates());
        } else {
          setCandidates(r.candidates);
        }
      } catch {
        if (cancelled) return;
        setMockMode(true);
        setCandidates(buildMockCandidates());
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [sessionId]);

  const onDisclosed = async (profile: DisclosedProfile, agentWallet: string) => {
    setDisclosed(profile);
    try {
      const ceremony = await api.triggerCeremony(agentWallet);
      setCeremonyUrl(ceremony.video_url);
    } catch {
      // backend offline — no ceremony video
    }
  };

  if (!sessionId)
    return (
      <main className="p-12 font-mono text-pixel-orange">
        Missing session id.
      </main>
    );

  return (
    <main className="min-h-screen pixel-grid-bg">
      {/* HEADER */}
      <div className="border-b border-pixel-border bg-pixel-bg2/60">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <PixelGhost color="#ffd060" scale={3} floaty />
            <div>
              <p className="font-mono text-[9px] tracking-[0.4em] text-pixel-dim">
                ROUND 2 · TOP 10 FINALISTS
              </p>
              <p className="font-pixel text-2xl text-pixel-gold leading-none">
                YOUR SHORTLIST
              </p>
            </div>
          </div>
          <div className="flex flex-col items-end gap-1">
            <span className="font-mono text-[9px] tracking-[0.4em] text-pixel-dim">
              SCENARIO
            </span>
            <span
              className="font-mono text-[11px] px-2 py-1 border border-pixel-border rounded text-pixel-orange uppercase"
            >
              {scenario.replace(/_/g, " ")}
            </span>
          </div>
        </div>
      </div>

      {/* INTRO */}
      <section className="max-w-6xl mx-auto px-6 py-8 text-center space-y-2">
        <p className="font-mono text-[10px] tracking-[0.5em] text-pixel-orange">
          ── SIMULATE BEFORE YOU REVEAL ──
        </p>
        <h1 className="font-pixel text-4xl md:text-5xl text-pixel-text leading-tight">
          Tap a card. AI plays out{" "}
          <span className="text-pixel-gold">
            your {scenario.replace(/_/g, " ")} scene
          </span>{" "}
          with both agents' encrypted preferences. No PII leaves the rollup.
        </h1>
        {mockMode && (
          <p className="font-mono text-[10px] text-pixel-dim mt-1">
            Backend offline — running a stub gallery with mock candidates.
          </p>
        )}
      </section>

      {/* TOP 1 hero */}
      {candidates[0] && (
        <section className="max-w-6xl mx-auto px-6 pb-4">
          <PixelPanel title="TOP MATCH" accent="#ffd060">
            <div className="grid sm:grid-cols-[auto_1fr_auto] gap-5 items-center">
              <PixelGhost color="#ffd060" scale={5} floaty />
              <div>
                <p className="font-mono text-[10px] tracking-[0.4em] text-pixel-dim">
                  RANK #01 · ENCRYPTED MATCH
                </p>
                <p className="font-pixel text-5xl text-pixel-gold leading-none my-1">
                  {(candidates[0].score / 100).toFixed(1)}%
                </p>
                <p className="font-mono text-sm text-pixel-text/80">
                  {candidates[0].teaser}
                </p>
              </div>
              <PixelButton onClick={() => setSimulating(candidates[0]!)}>
                ▶ Simulate this date
              </PixelButton>
            </div>
          </PixelPanel>
        </section>
      )}

      {/* GRID */}
      <section className="max-w-6xl mx-auto px-6 pb-12 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {candidates.slice(1).map((c, i) => (
          <CandidateCard
            key={c.index}
            candidate={c}
            rank={i + 1}
            onClick={() => setSimulating(c)}
          />
        ))}
      </section>

      {/* SIMULATION MODAL */}
      {simulating && (
        <RomanceSimulator
          candidate={simulating}
          scenarioId={scenario}
          onClose={() => setSimulating(null)}
          onUnlock={() => {
            const c = simulating;
            setSimulating(null);
            setPaymentTarget(c);
          }}
        />
      )}

      {/* PAYMENT MODAL */}
      {paymentTarget && !disclosed && sessionId && (
        <DisclosurePayment
          sessionId={sessionId}
          candidate={paymentTarget}
          onClose={() => setPaymentTarget(null)}
          onDisclosed={onDisclosed}
          mockMode={mockMode}
        />
      )}

      {/* REVEAL */}
      {disclosed && (
        <section className="max-w-3xl mx-auto px-6 py-12">
          <PixelPanel title="REVEAL · IDENTITY UNLOCKED" accent="#50e890">
            <div className="grid sm:grid-cols-[auto_1fr] gap-5 items-start">
              <PixelGhost color="#50e890" scale={5} />
              <div className="space-y-2">
                <p className="font-pixel text-3xl text-pixel-text leading-none">
                  {disclosed.display_name}
                </p>
                <p className="font-mono text-sm text-pixel-text/80">
                  {disclosed.bio}
                </p>
              </div>
            </div>
            {ceremonyUrl && (
              <>
                <PixelDivider label="CEREMONY · GENERATED FOR YOU" />
                <CeremonyVideo url={ceremonyUrl} />
              </>
            )}
          </PixelPanel>
        </section>
      )}
    </main>
  );
}

export default function CandidatesPage() {
  return (
    <Suspense
      fallback={
        <main className="p-12 font-mono text-pixel-orange">Loading…</main>
      }
    >
      <CandidatesPageInner />
    </Suspense>
  );
}
