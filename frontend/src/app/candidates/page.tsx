"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { CandidateCard } from "@/components/CandidateCard";
import { DisclosurePayment } from "@/components/DisclosurePayment";
import { CeremonyVideo } from "@/components/CeremonyVideo";
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
  const [picked, setPicked] = useState<CandidateBrief | null>(null);
  const [disclosed, setDisclosed] = useState<DisclosedProfile | null>(null);
  const [ceremonyUrl, setCeremonyUrl] = useState<string | null>(null);
  const [mockMode, setMockMode] = useState(false);

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
      // backend offline — fall through, no ceremony video shown
    }
  };

  if (!sessionId) {
    return <main className="p-12">Missing session id.</main>;
  }

  return (
    <main className="min-h-screen px-6 py-16 max-w-5xl mx-auto space-y-10">
      <header>
        <p className="text-veranda-gold uppercase tracking-[0.4em] text-xs">
          Top 10 {mockMode && "· demo"}
        </p>
        <h1 className="font-display text-5xl mt-2">Your final candidates.</h1>
        <p className="text-veranda-ink/60 mt-2">
          Tap a card to reveal who they are. $2 USDC each.
        </p>
        {mockMode && (
          <p className="text-veranda-ink/40 text-xs mt-2">
            Backend offline — showing a stub gallery so you can preview the
            disclosure flow.
          </p>
        )}
      </header>

      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {candidates.map((c) => (
          <CandidateCard
            key={c.index}
            candidate={c}
            onClick={() => setPicked(c)}
          />
        ))}
      </section>

      {picked && !disclosed && sessionId && (
        <DisclosurePayment
          sessionId={sessionId}
          candidate={picked}
          onClose={() => setPicked(null)}
          onDisclosed={onDisclosed}
          mockMode={mockMode}
        />
      )}

      {disclosed && (
        <section className="border-t border-veranda-ink/10 pt-10 space-y-6">
          <h2 className="font-display text-3xl">{disclosed.display_name}</h2>
          <p className="text-veranda-ink/70">{disclosed.bio}</p>
          {ceremonyUrl && <CeremonyVideo url={ceremonyUrl} />}
        </section>
      )}
    </main>
  );
}

export default function CandidatesPage() {
  return (
    <Suspense fallback={<main className="p-12">Loading…</main>}>
      <CandidatesPageInner />
    </Suspense>
  );
}
