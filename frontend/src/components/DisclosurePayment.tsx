"use client";

import { useState } from "react";
import { api, type CandidateBrief, type DisclosedProfile } from "@/lib/api";
import { signRequestDisclosureTx } from "@/lib/anchor-client";
import { PixelButton } from "./pixel/PixelUI";
import { PixelGhost } from "./pixel/PixelGhost";

const MOCK_NAMES = [
  "Aria Chen",
  "Beatrice Lopez",
  "Caitlin Park",
  "Dana Reyes",
  "Eleanor Wu",
  "Farah Khan",
  "Gabrielle Marin",
  "Helena Voss",
  "Iris Tanaka",
  "Jordan Riley",
];

const MOCK_BIOS = [
  "Architect by training, dumpling specialist by Sunday. Always reading two books at once.",
  "Spent two years as a wildfire ecologist. Currently learning Korean and bouldering.",
  "Documentary editor. Will out-walk you on any city tour.",
  "Software engineer who plays cello in a community orchestra.",
  "Writer working on her first novel; volunteers Mondays at a food bank.",
  "Furniture designer. Drinks her coffee black. Travels with paint pens.",
  "Pediatric nurse. Loves baking bread; bad at small talk, great at long talks.",
  "Photographer who spent last summer biking across Portugal.",
  "Lawyer who quit big-firm life. Now teaches improv on weekends.",
  "Researcher in marine biology. Surfs. Talks to dogs more than people.",
];

function buildMockProfile(c: CandidateBrief): DisclosedProfile {
  const i = c.index % MOCK_NAMES.length;
  return {
    display_name: MOCK_NAMES[i] ?? "Anonymous",
    photos: [],
    recordings: [],
    bio: MOCK_BIOS[i] ?? "A well-matched candidate.",
  };
}

export function DisclosurePayment({
  sessionId,
  candidate,
  onClose,
  onDisclosed,
  mockMode = false,
}: {
  sessionId: string;
  candidate: CandidateBrief;
  onClose: () => void;
  onDisclosed: (profile: DisclosedProfile, agentWallet: string) => void;
  mockMode?: boolean;
}) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const onConfirm = async () => {
    try {
      setBusy(true);
      setErr(null);

      if (mockMode) {
        await new Promise((r) => setTimeout(r, 800));
        onDisclosed(buildMockProfile(candidate), candidate.agent_wallet);
        onClose();
        return;
      }

      const txSignature = await signRequestDisclosureTx({
        candidateIndex: candidate.index,
        candidateAgentWallet: candidate.agent_wallet,
      });
      const profile = await api.disclose(
        sessionId,
        candidate.index,
        txSignature,
      );
      onDisclosed(profile, candidate.agent_wallet);
      onClose();
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-pixel-bg border-2 border-pixel-orange rounded-md max-w-md w-full p-6 space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3">
          <PixelGhost color="#ffd060" scale={4} />
          <div>
            <p className="font-mono text-[9px] tracking-[0.4em] text-pixel-dim">
              REVEAL CANDIDATE
            </p>
            <p className="font-pixel text-2xl text-pixel-gold leading-none">
              UNLOCK IDENTITY
            </p>
          </div>
        </div>

        <p className="font-mono text-sm text-pixel-text/80 leading-relaxed">
          You'll pay{" "}
          <span className="text-pixel-gold font-bold">$2 USDC</span> from your
          escrow. Your candidate stays anonymous to other users until they too
          accept.
        </p>

        {mockMode && (
          <p className="font-mono text-[10px] text-pixel-dim border border-pixel-border rounded px-3 py-2">
            ⚠ DEMO MODE — no real tx will be signed.
          </p>
        )}

        {err && (
          <p className="font-mono text-[11px] text-pixel-pink border border-pixel-pink/50 rounded px-3 py-2">
            {err}
          </p>
        )}

        <div className="flex gap-2 justify-end pt-2">
          <PixelButton variant="ghost" onClick={onClose}>
            Cancel
          </PixelButton>
          <PixelButton onClick={onConfirm} disabled={busy}>
            {busy ? "Signing…" : mockMode ? "Confirm (demo)" : "Confirm $2"}
          </PixelButton>
        </div>
      </div>
    </div>
  );
}
