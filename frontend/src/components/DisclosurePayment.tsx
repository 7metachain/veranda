"use client";

import { useState } from "react";
import { api, type CandidateBrief, type DisclosedProfile } from "@/lib/api";
import { signRequestDisclosureTx } from "@/lib/anchor-client";

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
        // Demo mode: skip the real on-chain tx + backend roundtrip.
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
      className="fixed inset-0 bg-veranda-ink/40 flex items-center justify-center z-50"
      onClick={onClose}
    >
      <div
        className="bg-veranda-fog rounded-3xl p-10 max-w-md w-[90%] space-y-5"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="font-display text-3xl">Reveal candidate?</h3>
        <p className="text-veranda-ink/60">
          You'll pay <strong>$2 USDC</strong> from your escrow. The candidate
          stays anonymous to other users.
        </p>
        {mockMode && (
          <p className="text-veranda-ink/40 text-xs">
            Demo mode — no real tx will be signed.
          </p>
        )}
        {err && <p className="text-red-700 text-sm">{err}</p>}
        <div className="flex gap-3">
          <button
            onClick={onConfirm}
            disabled={busy}
            className="flex-1 px-6 py-3 rounded-full bg-veranda-ink text-veranda-fog disabled:opacity-50"
          >
            {busy ? "Signing…" : mockMode ? "Confirm (demo)" : "Confirm $2"}
          </button>
          <button
            onClick={onClose}
            className="px-6 py-3 rounded-full border border-veranda-ink/20"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
