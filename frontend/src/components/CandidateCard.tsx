"use client";

import type { CandidateBrief } from "@/lib/api";
import { PixelGhost } from "./pixel/PixelGhost";

const PALETTE = [
  "#ffd060",
  "#50e890",
  "#ff6090",
  "#60c0ff",
  "#c060ff",
  "#e8724a",
];

export function CandidateCard({
  candidate,
  rank,
  onClick,
}: {
  candidate: CandidateBrief;
  rank?: number;
  onClick: () => void;
}) {
  const pct = (candidate.score / 100).toFixed(1);
  const color = PALETTE[candidate.index % PALETTE.length] ?? "#ffd060";
  const grade =
    candidate.score >= 9000
      ? "S+"
      : candidate.score >= 8500
        ? "S"
        : candidate.score >= 8000
          ? "A+"
          : "A";

  return (
    <button
      onClick={onClick}
      className="text-left bg-pixel-bg2 border-2 border-pixel-border hover:border-current rounded-md p-4 transition-all group relative overflow-hidden"
      style={{ color }}
    >
      <div
        className="absolute top-0 left-0 right-0 h-[2px]"
        style={{
          background: `linear-gradient(90deg, transparent, ${color}, transparent)`,
        }}
      />
      <div className="flex items-start justify-between mb-3">
        {rank !== undefined && (
          <span className="font-pixel text-2xl text-pixel-dim">
            #{String(rank + 1).padStart(2, "0")}
          </span>
        )}
        <span
          className="font-pixel text-xl"
          style={{ color }}
        >
          {grade}
        </span>
      </div>

      <div className="flex justify-center my-3">
        <PixelGhost color={color} scale={4} floaty />
      </div>

      <p
        className="font-pixel text-3xl text-center leading-none"
        style={{ color }}
      >
        {pct}%
      </p>
      <p className="font-mono text-[10px] tracking-widest text-pixel-dim text-center mt-1 uppercase">
        compatibility
      </p>

      <p className="font-mono text-[11px] text-pixel-text/70 mt-3 leading-snug">
        {candidate.teaser}
      </p>

      <div className="mt-3 pt-3 border-t border-pixel-border flex items-center justify-between">
        <span className="font-mono text-[9px] text-pixel-dim group-hover:text-pixel-orange transition">
          ▸ START LOVE SIMULATION
        </span>
        <span className="font-mono text-[9px] text-pixel-dim opacity-0 group-hover:opacity-100 transition">
          AGENT DIALOGUE
        </span>
      </div>
    </button>
  );
}
