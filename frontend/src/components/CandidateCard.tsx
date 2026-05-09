"use client";

import type { CandidateBrief } from "@/lib/api";

export function CandidateCard({
  candidate,
  onClick,
}: {
  candidate: CandidateBrief;
  onClick: () => void;
}) {
  const pct = (candidate.score / 100).toFixed(1);
  return (
    <button
      onClick={onClick}
      className="text-left rounded-2xl border border-veranda-ink/10 p-6 hover:border-veranda-ink/40 transition group bg-white"
    >
      <div className="aspect-square rounded-xl bg-gradient-to-br from-veranda-rose/40 to-veranda-sage/40 mb-5 flex items-center justify-center">
        <span className="font-display text-4xl text-veranda-ink/30">?</span>
      </div>
      <p className="font-display text-2xl">{pct}% match</p>
      <p className="text-veranda-ink/60 text-sm mt-1">{candidate.teaser}</p>
      <p className="text-xs text-veranda-ink/30 mt-3 opacity-0 group-hover:opacity-100 transition">
        Tap to reveal — $2 USDC
      </p>
    </button>
  );
}
