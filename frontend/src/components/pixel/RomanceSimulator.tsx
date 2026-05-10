"use client";

import { useEffect, useRef, useState } from "react";
import { GHOST_NORMAL, drawGhost } from "./PixelGhost";
import { PixelButton, PixelDivider } from "./PixelUI";
import type { CandidateBrief } from "@/lib/api";

const SCENE_LABELS: Record<string, string> = {
  casual_dining: "Dinner at a small bistro",
  work_colleagues: "Working a late-night project",
  family_interaction: "Meeting the family",
  conflict_resolution: "Navigating a disagreement",
  travel_companion: "On a weekend trip",
};

const SCENES: Record<string, Beat[]> = {
  casual_dining: [
    {
      tag: "OPENING",
      text: "Your agents arrive five minutes apart at a candle-lit bistro. Both pick the cozy corner booth.",
      stat: "▸ Both prefer intimate over public dining",
    },
    {
      tag: "ORDER",
      text: "They split a starter. You picked the wine; they picked the dessert. No menu negotiation needed.",
      stat: "▸ Compatible decision-making style",
    },
    {
      tag: "TENSION",
      text: "A loud table behind them. They both glance, both choose to keep listening.",
      stat: "▸ Shared annoyance threshold · 91%",
    },
    {
      tag: "BEAT",
      text: 'They laugh at the same beat in a story neither of them told before. Three minutes of un-self-conscious laughter.',
      stat: "▸ Humor compatibility: hits at frame 2.1s",
    },
    {
      tag: "TURN",
      text: 'They skip dessert. Walk seven blocks. Neither of them notices it raining for two minutes.',
      stat: "▸ Spontaneity index: matched",
    },
    {
      tag: "ENDING",
      text: "She quotes a book they both half-finished. He texts the next morning before noon, but not before 9.",
      stat: "▸ Future-pacing aligned · 94%",
    },
  ],
  work_colleagues: [
    {
      tag: "OPENING",
      text: "A 9pm deadline. Your agents pair on the same blocker for 40 minutes without small talk.",
      stat: "▸ Deep-work compatibility",
    },
    {
      tag: "TENSION",
      text: "They disagree on architecture. They argue cleanly for 7 minutes, then ship the better idea.",
      stat: "▸ Conflict resolution: surgical",
    },
    {
      tag: "BEAT",
      text: "Coffee at 11pm. She quotes a paper. He's read it twice. Both pretend it's not a flirt.",
      stat: "▸ Intellectual chemistry",
    },
    {
      tag: "ENDING",
      text: "They stay 20 minutes after shipping, talking about nothing.",
      stat: "▸ Lingerers · paired",
    },
  ],
  family_interaction: [
    {
      tag: "OPENING",
      text: "Sunday dinner. Your agent introduces theirs to a cousin who doesn't approve of anyone.",
      stat: "▸ Stakes raised early",
    },
    {
      tag: "BEAT",
      text: 'They don\'t try to win. They ask questions. The cousin admits a vulnerability by dessert.',
      stat: "▸ High-empathy disarmament",
    },
    {
      tag: "ENDING",
      text: 'On the drive home: "I liked them." "Yeah. Me too."',
      stat: "▸ Family-friendly · 96%",
    },
  ],
  conflict_resolution: [
    {
      tag: "OPENING",
      text: "Your agents disagree about something small that means something big. Neither escalates.",
      stat: "▸ De-escalation reflex matched",
    },
    {
      tag: "TURN",
      text: "She names the thing under the thing. He doesn't argue, he just listens.",
      stat: "▸ Active listening detected",
    },
    {
      tag: "ENDING",
      text: "They land on a third option neither suggested at the start.",
      stat: "▸ Co-creative resolution",
    },
  ],
  travel_companion: [
    {
      tag: "OPENING",
      text: "Lost luggage on day 1. Your agent offers half the suitcase. Theirs accepts before second-guessing.",
      stat: "▸ Trust onset: under 4 hours",
    },
    {
      tag: "BEAT",
      text: 'They get lost in an old town. Neither pulls a phone. They make it home via instinct.',
      stat: "▸ Adventure tolerance: paired",
    },
    {
      tag: "ENDING",
      text: 'Last night: "Same trip again next year?" — phrased as if it were obvious.',
      stat: "▸ Longevity signal · strong",
    },
  ],
};

type Beat = { tag: string; text: string; stat: string };

const VIRAL_LINES = [
  "If this were a movie, this is where the soundtrack drops.",
  "The agents are matched. The humans don't know yet.",
  '"They\'d be terrible at small talk. They\'d skip it."',
  "Privacy preserved. Chemistry: undeniable.",
  "You can fake compatibility. You can't fake this.",
  "Round 3 doesn't exist. This is it.",
];

export function RomanceSimulator({
  candidate,
  scenarioId = "casual_dining",
  onClose,
  onUnlock,
}: {
  candidate: CandidateBrief;
  scenarioId?: string;
  onClose: () => void;
  onUnlock: () => void;
}) {
  const beats = SCENES[scenarioId] ?? SCENES.casual_dining!;
  const [shown, setShown] = useState(0);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (shown >= beats.length) {
      setDone(true);
      return;
    }
    const t = setTimeout(() => setShown((s) => s + 1), 1700);
    return () => clearTimeout(t);
  }, [shown, beats.length]);

  const viralLine = VIRAL_LINES[candidate.index % VIRAL_LINES.length] ?? "";
  const sceneLabel = SCENE_LABELS[scenarioId] ?? "Generated scenario";
  const compat = (candidate.score / 100).toFixed(1);

  return (
    <div
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="bg-pixel-bg border-2 border-pixel-orange rounded-md max-w-2xl w-full my-4 max-h-[95vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-pixel-border bg-pixel-bg2">
          <div>
            <p className="font-mono text-[9px] tracking-[0.4em] text-pixel-dim">
              AI ROMANCE SIM · {scenarioId.toUpperCase().replace(/_/g, " ")}
            </p>
            <p className="font-pixel text-2xl text-pixel-gold leading-none mt-0.5">
              CANDIDATE #{candidate.index + 1} · {compat}% MATCH
            </p>
          </div>
          <button
            onClick={onClose}
            className="font-mono text-pixel-dim hover:text-pixel-orange text-lg"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {/* Pixel canvas — two ghosts at the table */}
        <DateCanvas color={cardColor(candidate.index)} progress={shown / beats.length} />

        {/* Streaming beats */}
        <div className="p-5 space-y-3">
          <p className="font-mono text-[10px] text-pixel-dim italic">
            {sceneLabel} · privacy-preserving simulation, no PII
          </p>
          {beats.slice(0, shown).map((b, i) => (
            <div
              key={i}
              className="border-l-2 pl-3 animate-[fadein_0.5s_ease-out]"
              style={{ borderColor: beatColor(b.tag) }}
            >
              <p
                className="font-mono text-[9px] tracking-[0.3em] mb-1"
                style={{ color: beatColor(b.tag) }}
              >
                ── {b.tag} ──
              </p>
              <p className="font-pixel text-lg text-pixel-text leading-snug">
                {b.text}
              </p>
              <p className="font-mono text-[10px] text-pixel-dim mt-1">
                {b.stat}
              </p>
            </div>
          ))}
          {shown < beats.length && (
            <div className="flex items-center gap-2 text-pixel-orange font-mono text-[10px]">
              <span className="w-1.5 h-1.5 rounded-full bg-pixel-orange animate-livePulse" />
              writing the next beat…
            </div>
          )}

          {done && (
            <>
              <PixelDivider label="VIRAL CARD · SHAREABLE, NO PII" />
              <div
                className="bg-pixel-bg2 border-2 rounded-md p-4 text-center"
                style={{ borderColor: cardColor(candidate.index) }}
              >
                <p className="font-mono text-[10px] tracking-[0.3em] text-pixel-dim">
                  COMPAT {compat}% · BUILT-FROM ENCRYPTED PREFERENCES
                </p>
                <p
                  className="font-pixel text-2xl mt-2 leading-snug"
                  style={{ color: cardColor(candidate.index) }}
                >
                  "{viralLine}"
                </p>
                <p className="font-mono text-[10px] text-pixel-dim mt-2">
                  veranda.app · scenario: {scenarioId}
                </p>
              </div>

              <div className="flex flex-wrap gap-2 justify-end pt-2">
                <PixelButton variant="ghost" onClick={onClose}>
                  Close
                </PixelButton>
                <PixelButton variant="ghost">
                  ↗ Share card
                </PixelButton>
                <PixelButton onClick={onUnlock}>
                  Reveal identity · $2 USDC →
                </PixelButton>
              </div>
              <p className="font-mono text-[10px] text-pixel-dim text-center pt-1">
                Identities stay sealed unless <span className="text-pixel-gold">both</span> sides
                unlock.
              </p>
            </>
          )}
        </div>
      </div>

      <style jsx>{`
        @keyframes fadein {
          from {
            opacity: 0;
            transform: translateY(4px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
}

function beatColor(tag: string) {
  switch (tag) {
    case "OPENING":
      return "#60c0ff";
    case "ORDER":
      return "#ffd060";
    case "TENSION":
      return "#ff6090";
    case "BEAT":
      return "#50e890";
    case "TURN":
      return "#c060ff";
    default:
      return "#e8724a";
  }
}

function cardColor(i: number) {
  const palette = ["#ffd060", "#50e890", "#ff6090", "#60c0ff", "#c060ff", "#e8724a"];
  return palette[i % palette.length]!;
}

/* ───── Two-ghost dinner-table canvas ───── */
function DateCanvas({
  color,
  progress,
}: {
  color: string;
  progress: number;
}) {
  const ref = useRef<HTMLCanvasElement | null>(null);
  const fRef = useRef(0);

  useEffect(() => {
    const ctx = ref.current?.getContext("2d");
    if (!ctx) return;
    let raf = 0;
    const W = 640;
    const H = 200;
    const draw = () => {
      const f = fRef.current++;
      // bg
      const grad = ctx.createLinearGradient(0, 0, 0, H);
      grad.addColorStop(0, "#1a0d08");
      grad.addColorStop(1, "#0d0806");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, W, H);

      // floor
      ctx.fillStyle = "#2a1408";
      ctx.fillRect(0, H - 40, W, 40);

      // city through window
      ctx.fillStyle = "#0a1828";
      ctx.fillRect(W / 2 - 100, 16, 200, 70);
      ctx.strokeStyle = "#3a2014";
      ctx.lineWidth = 2;
      ctx.strokeRect(W / 2 - 100, 16, 200, 70);
      for (let i = 0; i < 18; i++) {
        const bx = W / 2 - 96 + i * 11;
        const bh = 16 + ((i * 13) % 30);
        ctx.fillStyle = "#15293f";
        ctx.fillRect(bx, 86 - bh, 9, bh);
        if ((i + f / 12) % 4 < 2) {
          ctx.fillStyle = "#ffd06066";
          ctx.fillRect(bx + 2, 86 - bh + 4, 1, 1);
        }
      }

      // hanging lamp + glow
      ctx.fillStyle = "#3a2014";
      ctx.fillRect(W / 2 - 1, 0, 2, 40);
      ctx.fillStyle = "#ffd060";
      ctx.beginPath();
      ctx.arc(W / 2, 50, 10, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#ffd06022";
      ctx.beginPath();
      ctx.arc(W / 2, 50, 28 + Math.sin(f * 0.1) * 3, 0, Math.PI * 2);
      ctx.fill();

      // table
      ctx.fillStyle = "#5a3018";
      ctx.fillRect(W / 2 - 130, 130, 260, 32);
      ctx.fillStyle = "#3a2014";
      ctx.fillRect(W / 2 - 130, 130, 260, 4);

      // candles
      for (let i = -1; i <= 1; i += 2) {
        const cx = W / 2 + i * 50;
        ctx.fillStyle = "#f0d0b0";
        ctx.fillRect(cx - 2, 122, 4, 10);
        const flick = Math.sin(f * 0.3 + i) * 1;
        ctx.fillStyle = "#ffd060";
        ctx.fillRect(cx - 1, 116 + flick, 2, 6);
      }

      // ghosts
      const bob = Math.sin(f * 0.08) * 1.5;
      drawGhost(ctx, W / 2 - 80, 100 + bob, "#ffd060", 3, GHOST_NORMAL);
      drawGhost(ctx, W / 2 + 80, 100 - bob, color, 3, GHOST_NORMAL);

      // dotted match line + heart at progress
      ctx.save();
      ctx.setLineDash([4, 4]);
      ctx.lineDashOffset = -((f * 1.5) % 16);
      ctx.strokeStyle = `${color}aa`;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(W / 2 - 80, 100);
      ctx.lineTo(W / 2 + 80, 100);
      ctx.stroke();
      ctx.restore();
      const hp = 0.6 + 0.4 * Math.sin(f * 0.15);
      ctx.font = `${12 + hp * 4}px sans-serif`;
      ctx.fillStyle = color;
      ctx.textAlign = "center";
      ctx.fillText("♥", W / 2, 90);

      // progress bar overlay
      ctx.fillStyle = "#0d0806";
      ctx.fillRect(0, H - 6, W, 6);
      ctx.fillStyle = color;
      ctx.fillRect(0, H - 6, W * progress, 6);

      // scanlines
      ctx.fillStyle = "rgba(0,0,0,.05)";
      for (let y = 0; y < H; y += 2) ctx.fillRect(0, y, W, 1);

      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [color, progress]);

  return (
    <canvas
      ref={ref}
      width={640}
      height={200}
      className="block w-full pixelated border-b border-pixel-border"
    />
  );
}
