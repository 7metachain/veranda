"use client";

import { useEffect, useRef, useState } from "react";
import { GHOST_NORMAL, drawGhost } from "./PixelGhost";

const W = 560;
const H = 280;
const TILE = 8;

type SceneStep = 0 | 1 | 2 | 3 | 4;

const SCENE_TEXT: Record<SceneStep, string> = {
  0: "You walk into a small bistro. They have one open table — by the window or in the cozy back corner?",
  1: "The waiter brings the menu. Your date asks: pick for both, or order separately?",
  2: "Halfway through dinner the next table is loud. What now?",
  3: "Your date suggests skipping dessert and going for a walk instead. You…",
  4: "Last question — they want to split the bill exactly down the middle. Your move?",
};

/**
 * Each choice carries weights for our 5 traits + a tag for downstream agent matching.
 */
export type ScenarioChoice = {
  id: string;
  label: string;
  weights: Partial<{
    logic: number;
    empathy: number;
    creativity: number;
    ambition: number;
    humor: number;
  }>;
  tag: string;
};

const CHOICES: Record<SceneStep, ScenarioChoice[]> = {
  0: [
    {
      id: "window",
      label: "▸ Window seat — I love people-watching",
      weights: { creativity: 8, empathy: 4 },
      tag: "extrovert-leaning",
    },
    {
      id: "cozy",
      label: "▸ Cozy back corner — I want to actually hear you",
      weights: { empathy: 8, logic: 3 },
      tag: "deep-talker",
    },
  ],
  1: [
    {
      id: "pick",
      label: "▸ Order for both — I trust my taste",
      weights: { ambition: 7, humor: 3 },
      tag: "decisive",
    },
    {
      id: "separate",
      label: "▸ Separately — let's compare",
      weights: { logic: 6, creativity: 4 },
      tag: "curious",
    },
    {
      id: "share",
      label: "▸ Order three things and share",
      weights: { empathy: 7, humor: 6 },
      tag: "warm",
    },
  ],
  2: [
    {
      id: "ignore",
      label: "▸ Ignore them, lean in closer",
      weights: { empathy: 6, logic: 4 },
      tag: "focused",
    },
    {
      id: "joke",
      label: "▸ Make a joke about it",
      weights: { humor: 9, creativity: 5 },
      tag: "playful",
    },
    {
      id: "ask",
      label: "▸ Politely ask the waiter to switch tables",
      weights: { ambition: 6, logic: 5 },
      tag: "assertive",
    },
  ],
  3: [
    {
      id: "yes",
      label: "▸ Yes — let's go before the city is asleep",
      weights: { creativity: 7, empathy: 5 },
      tag: "spontaneous",
    },
    {
      id: "dessert",
      label: "▸ One dessert first, then walk",
      weights: { humor: 6, empathy: 4 },
      tag: "savorer",
    },
    {
      id: "no",
      label: "▸ Honestly, I'd rather just keep talking here",
      weights: { logic: 4, empathy: 7 },
      tag: "stayer",
    },
  ],
  4: [
    {
      id: "split",
      label: "▸ Sure, exact split — I appreciate that",
      weights: { logic: 8, ambition: 3 },
      tag: "egalitarian",
    },
    {
      id: "treat",
      label: "▸ I'd rather treat you tonight",
      weights: { empathy: 7, ambition: 5 },
      tag: "generous",
    },
    {
      id: "alternate",
      label: "▸ I got tonight, you got next time",
      weights: { humor: 5, empathy: 6 },
      tag: "next-time-implied",
    },
  ],
};

export function PixelDiningScene({
  onComplete,
}: {
  onComplete: (result: {
    choices: ScenarioChoice[];
    traits: {
      logic: number;
      empathy: number;
      creativity: number;
      ambition: number;
      humor: number;
    };
  }) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const frameRef = useRef(0);
  const [step, setStep] = useState<SceneStep>(0);
  const [picks, setPicks] = useState<ScenarioChoice[]>([]);

  // canvas animation
  useEffect(() => {
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    let raf = 0;
    const loop = () => {
      drawScene(ctx, frameRef.current++, step);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [step]);

  const choose = (c: ScenarioChoice) => {
    const next = [...picks, c];
    setPicks(next);
    if (step < 4) {
      setStep((s) => (s + 1) as SceneStep);
    } else {
      // aggregate traits
      const traits = next.reduce(
        (acc, p) => {
          for (const k of Object.keys(p.weights) as (keyof typeof p.weights)[]) {
            acc[k] += p.weights[k] ?? 0;
          }
          return acc;
        },
        { logic: 30, empathy: 30, creativity: 30, ambition: 30, humor: 30 },
      );
      onComplete({ choices: next, traits });
    }
  };

  const choices = CHOICES[step];

  return (
    <div className="space-y-3">
      <div className="relative border border-pixel-border rounded-md overflow-hidden bg-pixel-bg">
        <canvas
          ref={canvasRef}
          width={W}
          height={H}
          className="pixelated block"
          style={{ width: "100%", height: "auto" }}
        />
        <div className="absolute top-2 left-2 px-2 py-1 bg-pixel-bg/90 border border-pixel-border rounded font-mono text-[9px] text-pixel-dim tracking-[0.2em]">
          SCENARIO · DINNER DATE · {step + 1}/5
        </div>
        <div className="absolute bottom-2 right-2 px-2 py-1 bg-pixel-bg/90 border border-pixel-border rounded font-mono text-[9px] text-pixel-orange">
          PICK A RESPONSE ▾
        </div>
      </div>

      <div className="bg-pixel-bg2 border border-pixel-border rounded-md p-4">
        <p className="font-pixel text-xl text-pixel-text leading-snug">
          {SCENE_TEXT[step]}
        </p>
        <div className="mt-4 grid gap-2">
          {choices.map((c) => (
            <button
              key={c.id}
              onClick={() => choose(c)}
              className="text-left font-mono text-sm text-pixel-text/80 hover:text-pixel-gold border border-pixel-border hover:border-pixel-orange bg-pixel-bg/40 hover:bg-pixel-bg/70 px-4 py-2.5 rounded transition-all"
            >
              {c.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Renderer ───────────────────────────────────────────────────────────────

function drawScene(
  ctx: CanvasRenderingContext2D,
  frame: number,
  step: SceneStep,
) {
  // bg
  const grad = ctx.createLinearGradient(0, 0, 0, H);
  grad.addColorStop(0, "#1a0d08");
  grad.addColorStop(1, "#0d0806");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);

  // soft floor
  ctx.fillStyle = "#2a1408";
  ctx.fillRect(0, H - 60, W, 60);

  // wallpaper stripes
  ctx.fillStyle = "#15090a";
  for (let x = 0; x < W; x += 24) ctx.fillRect(x, 0, 1, H - 60);

  // window with city
  ctx.fillStyle = "#0a1828";
  ctx.fillRect(40, 30, 180, 100);
  ctx.strokeStyle = "#3a2014";
  ctx.lineWidth = 2;
  ctx.strokeRect(40, 30, 180, 100);
  ctx.fillStyle = "#3a2014";
  ctx.fillRect(40, 80, 180, 2);
  ctx.fillRect(130, 30, 2, 100);

  // city skyline through window
  for (let i = 0; i < 18; i++) {
    const bx = 44 + i * 10;
    const bh = 20 + ((i * 13) % 35);
    ctx.fillStyle = "#15293f";
    ctx.fillRect(bx, 130 - bh, 8, bh);
    if ((i + frame / 12) % 4 < 2) {
      ctx.fillStyle = "#ffd06066";
      ctx.fillRect(bx + 2, 130 - bh + 4, 1, 1);
      ctx.fillRect(bx + 5, 130 - bh + 8, 1, 1);
    }
  }

  // hanging lamp
  ctx.fillStyle = "#3a2014";
  ctx.fillRect(W / 2 - 1, 0, 2, 60);
  ctx.fillStyle = "#ffd060";
  ctx.beginPath();
  ctx.arc(W / 2, 70, 14, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#ffd06022";
  ctx.beginPath();
  ctx.arc(W / 2, 70, 30 + Math.sin(frame * 0.1) * 3, 0, Math.PI * 2);
  ctx.fill();

  // table
  ctx.fillStyle = "#5a3018";
  ctx.fillRect(W / 2 - 110, 170, 220, 50);
  ctx.fillStyle = "#3a2014";
  ctx.fillRect(W / 2 - 110, 170, 220, 6);

  // candles
  for (let i = -1; i <= 1; i += 2) {
    const cx = W / 2 + i * 40;
    ctx.fillStyle = "#f0d0b0";
    ctx.fillRect(cx - 2, 158, 4, 14);
    const flick = Math.sin(frame * 0.3 + i) * 1;
    ctx.fillStyle = "#ffd060";
    ctx.fillRect(cx - 1, 152 + flick, 2, 6);
    ctx.fillStyle = "#ffd06044";
    ctx.beginPath();
    ctx.arc(cx, 154 + flick, 8, 0, Math.PI * 2);
    ctx.fill();
  }

  // plates (more appear over time)
  if (step >= 1) drawPlate(ctx, W / 2 - 40, 180, "#f0d0b0");
  if (step >= 1) drawPlate(ctx, W / 2 + 40, 180, "#f0d0b0");
  if (step >= 2)
    drawPlate(ctx, W / 2, 178, "#ff6090"); // shared dish

  // YOU + DATE ghosts
  const youColor = "#ffd060";
  const dateColor = "#ff6090";
  const bob = Math.sin(frame * 0.08) * 1.5;
  drawGhost(ctx, W / 2 - 70, 140 + bob, youColor, 3, GHOST_NORMAL);
  drawGhost(ctx, W / 2 + 70, 140 - bob, dateColor, 3, GHOST_NORMAL);

  // labels
  ctx.font = "bold 9px monospace";
  ctx.textAlign = "center";
  ctx.fillStyle = "#ffd060";
  ctx.fillText("YOU", W / 2 - 70, 110);
  ctx.fillStyle = "#ff6090";
  ctx.fillText("DATE", W / 2 + 70, 110);

  // hearts above when answered
  if (step >= 3) {
    const hf = 0.5 + 0.5 * Math.sin(frame * 0.15);
    ctx.font = `${10 + hf * 2}px sans-serif`;
    ctx.fillStyle = "#ff6090";
    ctx.fillText("♥", W / 2, 100 - hf * 4);
  }

  // step indicator dots
  for (let i = 0; i < 5; i++) {
    ctx.fillStyle = i <= step ? "#ffd060" : "#3a2014";
    ctx.fillRect(W - 80 + i * 12, H - 16, 8, 8);
  }

  // sparkles
  for (let i = 0; i < 12; i++) {
    const sx = (i * 137 + 11) % W | 0;
    const sy = ((i * 91 + 7) % (H - 80)) | 0;
    if (Math.sin(frame * 0.07 + i) > 0.4) {
      ctx.fillStyle = "#ffd06088";
      ctx.fillRect(sx, sy, 1, 1);
    }
  }

  // scanlines
  ctx.fillStyle = "rgba(0,0,0,.06)";
  for (let y = 0; y < H; y += 2) ctx.fillRect(0, y, W, 1);
}

function drawPlate(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  color: string,
) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.ellipse(cx, cy, 18, 6, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#0d0806";
  ctx.beginPath();
  ctx.ellipse(cx, cy - 1, 14, 4, 0, 0, Math.PI * 2);
  ctx.fill();
}
