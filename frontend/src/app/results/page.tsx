"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { PixelGhost } from "@/components/pixel/PixelGhost";
import {
  PixelButton,
  PixelDivider,
  PixelPanel,
} from "@/components/pixel/PixelUI";
import { CeremonyVideo } from "@/components/CeremonyVideo";
import { api, type CandidateBrief, type DisclosedProfile } from "@/lib/api";

const MOCK_DISCLOSED: DisclosedProfile = {
  display_name: "Aria Chen",
  photos: [],
  recordings: [],
  bio: "Architect by training, dumpling specialist by Sunday. Reads two books at once. Believes the best conversations happen after midnight.",
};

function ResultsPageInner() {
  const params = useSearchParams();
  const router = useRouter();
  const sessionId = params.get("session");
  const candidateIdx = params.get("candidate");
  const outcome = params.get("outcome"); // "success" or "fail"

  const [candidate, setCandidate] = useState<CandidateBrief | null>(null);
  const [simResult, setSimResult] = useState<{
    success: boolean;
    messageCount: number;
    scenario: string;
  } | null>(null);

  const [paying, setPaying] = useState(false);
  const [paid, setPaid] = useState(false);
  const [disclosed, setDisclosed] = useState<DisclosedProfile | null>(null);
  const [ceremonyUrl, setCeremonyUrl] = useState<string | null>(null);

  const isSuccess = outcome === "success";

  // Load simulation result from localStorage.
  useEffect(() => {
    try {
      const raw = localStorage.getItem("veranda:simulation_result");
      if (raw) {
        const parsed = JSON.parse(raw) as {
          candidate: CandidateBrief;
          success: boolean;
          messageCount: number;
          scenario: string;
        };
        setCandidate(parsed.candidate);
        setSimResult({
          success: parsed.success,
          messageCount: parsed.messageCount,
          scenario: parsed.scenario,
        });
      }
    } catch {
      /* noop */
    }
    // Fallback: load candidate from simulation_candidate
    try {
      const raw = localStorage.getItem("veranda:simulation_candidate");
      if (raw) {
        setCandidate((prev) => prev ?? (JSON.parse(raw) as CandidateBrief));
      }
    } catch {
      /* noop */
    }
  }, []);

  const handlePay = async () => {
    if (!sessionId || !candidate) return;
    setPaying(true);
    try {
      // Try real disclosure
      const profile = await api.disclose(
        sessionId,
        candidate.index,
        "mock-tx-sig-" + Date.now(),
      );
      setDisclosed(profile);
      setPaid(true);
      // Try ceremony
      try {
        const ceremony = await api.triggerCeremony(candidate.agent_wallet);
        setCeremonyUrl(ceremony.video_url);
      } catch {
        // no ceremony
      }
    } catch {
      // Backend offline — use mock data
      setDisclosed(MOCK_DISCLOSED);
      setPaid(true);
    } finally {
      setPaying(false);
    }
  };

  if (!candidate) {
    return (
      <main className="p-12 font-mono text-pixel-orange">
        No simulation result found.{" "}
        <Link href="/" className="underline">
          Go home
        </Link>
      </main>
    );
  }

  const compat = (candidate.score / 100).toFixed(1);

  return (
    <main className="min-h-screen pixel-grid-bg">
      {/* HEADER */}
      <div className="border-b border-pixel-border bg-pixel-bg2/60">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <PixelGhost
              color={isSuccess ? "#50e890" : "#ff6090"}
              scale={3}
              floaty
            />
            <div>
              <p className="font-mono text-[9px] tracking-[0.4em] text-pixel-dim">
                SIMULATION RESULT
              </p>
              <p className="font-pixel text-2xl text-pixel-gold leading-none">
                {isSuccess ? "MATCH SUCCESSFUL" : "NOT A MATCH"}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-10 space-y-8">
        {/* OUTCOME CARD */}
        <PixelPanel
          title={isSuccess ? "COMPATIBLE" : "INCOMPATIBLE"}
          accent={isSuccess ? "#50e890" : "#ff6090"}
        >
          <div className="grid sm:grid-cols-[auto_1fr] gap-6 items-center">
            <div className="flex flex-col items-center gap-2">
              <PixelGhost
                color={isSuccess ? "#50e890" : "#ff6090"}
                scale={5}
              />
              <span
                className={`font-pixel text-4xl ${isSuccess ? "text-pixel-green" : "text-pixel-pink"}`}
              >
                {isSuccess ? "♥" : "✕"}
              </span>
            </div>
            <div className="space-y-3">
              <div>
                <p className="font-mono text-[10px] tracking-[0.4em] text-pixel-dim">
                  CANDIDATE #{(candidate.index + 1).toString().padStart(2, "0")}
                </p>
                <p className="font-pixel text-5xl text-pixel-gold leading-none my-1">
                  {compat}%
                </p>
                <p className="font-mono text-sm text-pixel-text/80">
                  {candidate.teaser}
                </p>
              </div>
              {simResult && (
                <div className="flex flex-wrap gap-3">
                  <span className="font-mono text-[10px] px-2 py-1 border border-pixel-border rounded text-pixel-dim">
                    {simResult.messageCount} exchanges
                  </span>
                  <span className="font-mono text-[10px] px-2 py-1 border border-pixel-border rounded text-pixel-dim">
                    scenario: {simResult.scenario.replace(/_/g, " ")}
                  </span>
                  <span
                    className="font-mono text-[10px] px-2 py-1 border rounded"
                    style={{
                      borderColor: isSuccess ? "#50e89040" : "#ff609040",
                      color: isSuccess ? "#50e890" : "#ff6090",
                    }}
                  >
                    {isSuccess ? "PASSED" : "FAILED"}
                  </span>
                </div>
              )}
            </div>
          </div>
        </PixelPanel>

        {/* SUCCESS PATH — payment + reveal */}
        {isSuccess && !paid && (
          <PixelPanel title="UNLOCK DATING INFO" accent="#ffd060">
            <div className="space-y-4">
              <p className="font-mono text-sm text-pixel-text/80">
                Your agents are compatible. Pay to reveal this candidate's real
                dating profile and contact information.
              </p>
              <div className="bg-pixel-bg border border-pixel-border rounded p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-mono text-[10px] tracking-[0.3em] text-pixel-dim">
                      DISCLOSURE FEE
                    </p>
                    <p className="font-pixel text-3xl text-pixel-gold leading-none mt-1">
                      $2 <span className="font-mono text-[11px] text-pixel-dim">USDC</span>
                    </p>
                    <p className="font-mono text-[10px] text-pixel-dim mt-1">
                      Paid from your escrow balance · non-refundable
                    </p>
                  </div>
                  <PixelButton onClick={handlePay} disabled={paying}>
                    {paying ? "Processing..." : "Pay & reveal identity →"}
                  </PixelButton>
                </div>
              </div>
              <p className="font-mono text-[10px] text-pixel-dim text-center">
                Identity stays sealed unless{" "}
                <span className="text-pixel-gold">both</span> sides unlock.
              </p>
            </div>
          </PixelPanel>
        )}

        {/* REVEALED PROFILE */}
        {paid && disclosed && (
          <PixelPanel title="IDENTITY UNLOCKED" accent="#50e890">
            <div className="grid sm:grid-cols-[auto_1fr] gap-5 items-start">
              <PixelGhost color="#50e890" scale={5} />
              <div className="space-y-2">
                <p className="font-pixel text-3xl text-pixel-text leading-none">
                  {disclosed.display_name}
                </p>
                <p className="font-mono text-sm text-pixel-text/80">
                  {disclosed.bio}
                </p>
                {disclosed.photos.length > 0 && (
                  <>
                    <PixelDivider label="PHOTOS" />
                    <div className="flex gap-2">
                      {disclosed.photos.map((url, i) => (
                        <div
                          key={i}
                          className="w-20 h-20 bg-pixel-bg2 border border-pixel-border rounded overflow-hidden"
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={url}
                            alt={`Photo ${i + 1}`}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>
            {ceremonyUrl && (
              <>
                <PixelDivider label="CEREMONY · GENERATED FOR YOU" />
                <CeremonyVideo url={ceremonyUrl} />
              </>
            )}
          </PixelPanel>
        )}

        {/* FAILURE PATH */}
        {!isSuccess && (
          <PixelPanel title="WHAT HAPPENED" accent="#ff6090">
            <div className="space-y-3">
              <p className="font-mono text-sm text-pixel-text/80">
                The agents' dialogue revealed key incompatibilities. This doesn't
                mean anything is wrong — it means the encrypted preference vectors
                diverged on critical dimensions during the full simulation.
              </p>
              <div className="bg-pixel-bg border border-pixel-border rounded p-4">
                <p className="font-mono text-[10px] tracking-[0.3em] text-pixel-dim mb-2">
                  MISMATCH SIGNALS
                </p>
                <ul className="space-y-1.5">
                  <li className="font-mono text-[11px] text-pixel-text/70 flex gap-2">
                    <span className="text-pixel-pink">▸</span>
                    Communication cadence mismatch detected
                  </li>
                  <li className="font-mono text-[11px] text-pixel-text/70 flex gap-2">
                    <span className="text-pixel-pink">▸</span>
                    Long-term priority vectors diverged
                  </li>
                  <li className="font-mono text-[11px] text-pixel-text/70 flex gap-2">
                    <span className="text-pixel-pink">▸</span>
                    Emotional safety threshold not reached
                  </li>
                </ul>
              </div>
            </div>
          </PixelPanel>
        )}

        {/* NAVIGATION */}
        <div className="flex flex-wrap gap-3 justify-center">
          <Link href={`/candidates?session=${sessionId}`}>
            <PixelButton variant="ghost">
              ← Back to candidates
            </PixelButton>
          </Link>
          {!isSuccess && (
            <Link href={`/candidates?session=${sessionId}`}>
              <PixelButton>
                Try another candidate →
              </PixelButton>
            </Link>
          )}
          {paid && (
            <Link href="/">
              <PixelButton>
                Done — return home
              </PixelButton>
            </Link>
          )}
        </div>
      </div>
    </main>
  );
}

export default function ResultsPage() {
  return (
    <Suspense
      fallback={
        <main className="p-12 font-mono text-pixel-orange">Loading...</main>
      }
    >
      <ResultsPageInner />
    </Suspense>
  );
}
