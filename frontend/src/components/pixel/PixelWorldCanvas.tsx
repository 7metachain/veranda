"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Agent,
  AGENT_TYPES,
  COMMENTARY,
  COMPAT_FACTS,
  MatchEvent,
  PIXEL_COLORS as C,
  compat,
  makeAgent,
} from "@/lib/pixel-world";
import {
  GHOST_NORMAL,
  GHOST_WINK,
  drawGhost,
} from "./PixelGhost";

const TICK_MS = 100;
const MATCH_LIFE = 35;

const r = (n = 100) => Math.floor(Math.random() * n);
const pick = <T,>(arr: readonly T[]): T => arr[r(arr.length)] as T;

type Stats = {
  matched: number;
  round: number;
  progress: number;
  avgScore: number;
};

export function PixelWorldCanvas({
  width = 720,
  height = 420,
  agentCount = 60,
  showLegend = true,
  showStatus = true,
  showLiveBadge = true,
  className = "",
  onTick,
}: {
  width?: number;
  height?: number;
  agentCount?: number;
  showLegend?: boolean;
  showStatus?: boolean;
  showLiveBadge?: boolean;
  className?: string;
  onTick?: (snapshot: {
    agents: Agent[];
    events: MatchEvent[];
    stats: Stats;
    myAgent: Agent | undefined;
  }) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Initialize agents synchronously so the very first paint already has ghosts.
  const initialAgents = useMemo(() => {
    const arr: Agent[] = [makeAgent({ isMe: true, width, height })];
    for (let i = 1; i < agentCount; i++)
      arr.push(makeAgent({ isMe: false, width, height }));
    return arr;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [agentCount, width, height]);

  const agentsRef = useRef<Agent[]>(initialAgents);
  const eventsRef = useRef<MatchEvent[]>([]);
  const frameRef = useRef(0);
  const tickRef = useRef(0);
  const lastTickAtRef = useRef(0);
  const accRef = useRef({ matched: 0, scoreSum: 0, progress: 12.3 });
  const rafRef = useRef<number | null>(null);
  const onTickRef = useRef(onTick);
  const [, setRerenderKey] = useState(0);

  // Reset agents whenever the seed inputs change.
  useEffect(() => {
    agentsRef.current = initialAgents;
    eventsRef.current = [];
    frameRef.current = 0;
    tickRef.current = 0;
    lastTickAtRef.current = 0;
    accRef.current = { matched: 0, scoreSum: 0, progress: 12.3 };
  }, [initialAgents]);

  // Keep latest onTick reference without retriggering effects.
  useEffect(() => {
    onTickRef.current = onTick;
  }, [onTick]);

  // Single rAF loop drives BOTH simulation tick AND draw. This avoids
  // setInterval drift / Strict-Mode double-mount races and guarantees the
  // first paint already shows agents.
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    let cancelled = false;

    const loop = (now: number) => {
      if (cancelled) return;

      // Simulation tick at TICK_MS cadence.
      if (!lastTickAtRef.current) lastTickAtRef.current = now;
      while (now - lastTickAtRef.current >= TICK_MS) {
        lastTickAtRef.current += TICK_MS;
        runSimTick(width, height);
      }

      // Always draw every animation frame.
      drawWorld(ctx, agentsRef.current, frameRef.current++, width, height);

      // Surface lightweight snapshot to parent.
      if (onTickRef.current) {
        const myAgent = agentsRef.current.find((a) => a.isMe);
        const round = accRef.current.progress > 50 ? 2 : 1;
        onTickRef.current({
          agents: agentsRef.current,
          events: eventsRef.current,
          stats: {
            matched: accRef.current.matched,
            round,
            progress: accRef.current.progress,
            avgScore: accRef.current.matched
              ? Math.round(accRef.current.scoreSum / accRef.current.matched)
              : 0,
          },
          myAgent,
        });
      }

      // Throttled React re-render so the status overlay refreshes.
      if (frameRef.current % 6 === 0) {
        setRerenderKey((k) => (k + 1) % 1_000_000);
      }

      rafRef.current = requestAnimationFrame(loop);
    };

    // Force one immediate draw before the first rAF fires so there is never
    // an empty black canvas on initial paint.
    drawWorld(ctx, agentsRef.current, 0, width, height);
    rafRef.current = requestAnimationFrame(loop);

    return () => {
      cancelled = true;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [width, height]);

  function runSimTick(W: number, H: number) {
    const t = ++tickRef.current;
    const next = agentsRef.current.map((a) => {
      if (a.state === "matched" && t - a.matchTick > MATCH_LIFE) {
        const ang = Math.random() * Math.PI * 2;
        const spd = a.isMe ? 0.8 : 1.3;
        return {
          ...a,
          state: "wander" as const,
          matchId: null,
          score: 0,
          dx: Math.cos(ang) * spd,
          dy: Math.sin(ang) * spd,
        };
      }
      if (a.state === "matched") return a;
      let { x, y, dx, dy } = a;
      x += dx;
      y += dy;
      if (x < 16 || x > W - 16) {
        dx = -dx;
        x = Math.max(16, Math.min(W - 16, x));
      }
      if (y < 16 || y > H - 16) {
        dy = -dy;
        y = Math.max(16, Math.min(H - 16, y));
      }
      if (Math.random() < 0.015) {
        const ang = Math.random() * Math.PI * 2;
        const spd = a.isMe ? 0.8 : 1.3;
        dx = Math.cos(ang) * spd;
        dy = Math.sin(ang) * spd;
      }
      return { ...a, x, y, dx, dy };
    });

    let mutated = next;
    if (t % 5 === 0) {
      const wandering = next.filter((a) => a.state === "wander");
      if (wandering.length >= 2) {
        let A: Agent | undefined;
        let B: Agent | undefined;
        const me = wandering.find((a) => a.isMe);
        if (me && Math.random() < 0.3) {
          A = me;
          const others = wandering.filter((a) => !a.isMe);
          B = pick(others);
        } else {
          const ai = r(wandering.length);
          let bi = ai;
          while (bi === ai) bi = r(wandering.length);
          A = wandering[ai];
          B = wandering[bi];
        }
        if (A && B) {
          const sc = compat(A, B);
          const isMyMatch = A.isMe || B.isMe;
          const ev: MatchEvent = {
            id: t + Math.random(),
            a: A.name,
            b: B.name,
            colorA: A.type.color,
            colorB: B.type.color,
            typeA: A.type.name,
            typeB: B.type.name,
            score: sc,
            isMyAgent: isMyMatch,
            fact: pick(COMPAT_FACTS),
            commentary: pick(COMMENTARY),
          };
          eventsRef.current = [ev, ...eventsRef.current.slice(0, 39)];
          accRef.current.matched++;
          accRef.current.scoreSum += sc;
          accRef.current.progress = Math.min(
            100,
            12.3 + accRef.current.matched * 0.4,
          );
          mutated = next.map((a) => {
            if (a.id === A!.id)
              return {
                ...a,
                state: "matched" as const,
                matchId: B!.id,
                matchTick: t,
                score: sc,
                meetCount: a.meetCount + (a.isMe ? 1 : 0),
              };
            if (a.id === B!.id)
              return {
                ...a,
                state: "matched" as const,
                matchId: A!.id,
                matchTick: t,
                score: sc,
                meetCount: a.meetCount + (a.isMe ? 1 : 0),
              };
            return a;
          });
        }
      }
    }

    agentsRef.current = mutated;
  }

  const myAgent = agentsRef.current.find((a) => a.isMe);

  return (
    <div
      className={`relative overflow-hidden border border-pixel-border rounded-md ${className}`}
      style={{ minHeight: 220 }}
    >
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        className="pixelated block w-full h-full"
        style={{ width: "100%", height: "100%", display: "block" }}
      />

      {showStatus && (
        <div className="absolute top-3 left-3 bg-pixel-bg/90 border border-pixel-border rounded px-3 py-1.5 font-mono text-[9px]">
          <div
            className="font-bold mb-0.5"
            style={{
              color:
                myAgent?.state === "matched" ? C.green : C.orange,
            }}
          >
            {myAgent?.state === "matched"
              ? `♥ MATCH FOUND · ${myAgent.score}%`
              : "⟳ YOUR AGENT IS SEARCHING"}
          </div>
          <div className="text-pixel-dim">
            Screened: {myAgent?.meetCount ?? 0} candidates · 30,000 in pool
          </div>
        </div>
      )}

      {showLegend && (
        <div className="absolute bottom-2.5 left-2.5 flex gap-1.5 flex-wrap">
          {AGENT_TYPES.map((t) => (
            <div
              key={t.id}
              className="bg-pixel-bg/90 border border-pixel-border rounded px-2 py-1 font-mono text-[7px] flex items-center gap-1"
              style={{ color: t.color }}
            >
              <span
                className="w-1.5 h-1.5 rounded-sm"
                style={{ background: t.color }}
              />
              {t.name.toUpperCase()}
            </div>
          ))}
        </div>
      )}

      {showLiveBadge && (
        <div className="absolute bottom-2.5 right-3 bg-pixel-bg/90 border border-pixel-border rounded px-2 py-1 flex items-center gap-1.5 font-mono text-[9px] text-pixel-green">
          <span
            className="w-1.5 h-1.5 rounded-full bg-pixel-green animate-livePulse"
          />
          LIVE
        </div>
      )}
    </div>
  );
}

// ── World renderer ──
function drawWorld(
  ctx: CanvasRenderingContext2D,
  agents: Agent[],
  frame: number,
  CW: number,
  CH: number,
) {
  ctx.fillStyle = C.bg;
  ctx.fillRect(0, 0, CW, CH);

  // Grid
  ctx.strokeStyle = "#190d07";
  ctx.lineWidth = 0.5;
  for (let x = 0; x <= CW; x += 30) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, CH);
    ctx.stroke();
  }
  for (let y = 0; y <= CH; y += 30) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(CW, y);
    ctx.stroke();
  }

  // Sparkles
  for (let i = 0; i < 40; i++) {
    const sx = (i * 137.508 + 23) % CW | 0;
    const sy = (i * 97.314 + 17) % CH | 0;
    const blink = Math.sin(frame * 0.04 + i * 1.73) > 0.15;
    if (!blink) continue;
    const alpha = i % 3 === 0 ? "55" : i % 3 === 1 ? "40" : "30";
    ctx.fillStyle = C.orange + alpha;
    if (i % 4 === 0) {
      ctx.fillRect(sx, sy, 2, 2);
      ctx.fillRect(sx - 3, sy, 1, 2);
      ctx.fillRect(sx + 3, sy, 1, 2);
      ctx.fillRect(sx, sy - 3, 2, 1);
      ctx.fillRect(sx, sy + 3, 2, 1);
    } else {
      ctx.fillRect(sx, sy, 2, 2);
    }
  }

  // Vignette
  const vg = ctx.createRadialGradient(
    CW / 2,
    CH / 2,
    CH * 0.25,
    CW / 2,
    CH / 2,
    CH * 0.9,
  );
  vg.addColorStop(0, "rgba(0,0,0,0)");
  vg.addColorStop(1, "rgba(0,0,0,.65)");
  ctx.fillStyle = vg;
  ctx.fillRect(0, 0, CW, CH);

  // Match lines
  const done = new Set<number>();
  agents.forEach((a) => {
    if (a.state !== "matched" || a.matchId == null || done.has(a.id)) return;
    const b = agents.find((x) => x.id === a.matchId);
    if (!b) return;
    done.add(a.id);
    done.add(b.id);
    const col = a.isMe || b.isMe ? C.gold : C.orange;
    ctx.save();
    ctx.setLineDash([5, 5]);
    ctx.lineDashOffset = -((frame * 1.8) % 18);
    ctx.strokeStyle = col + "55";
    ctx.lineWidth = a.isMe || b.isMe ? 2 : 1;
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
    ctx.restore();
    const mx = (a.x + b.x) / 2;
    const my = (a.y + b.y) / 2;
    const hp = 0.6 + 0.4 * Math.sin(frame * 0.12);
    ctx.font = `${11 + hp * 2}px sans-serif`;
    ctx.fillStyle = col;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("♥", mx, my - 2);
    ctx.font = "bold 8px monospace";
    ctx.fillStyle = col + "cc";
    ctx.fillText(`${a.score}%`, mx, my + 11);
  });

  // Draw agents (my agent on top)
  const sorted = [
    ...agents.filter((a) => !a.isMe),
    ...agents.filter((a) => a.isMe),
  ];
  const GN = 2;
  const GM = 3;
  sorted.forEach((a) => {
    const col = a.isMe ? C.gold : a.type.color;
    if (a.state === "matched") {
      const p = 0.4 + 0.6 * Math.sin(frame * 0.1);
      const gr = a.isMe ? 5 * GM + 3 : 5 * GN + 4;
      ctx.beginPath();
      ctx.arc(a.x, a.y, gr + p * 5, 0, Math.PI * 2);
      ctx.fillStyle = col + "18";
      ctx.fill();
      ctx.beginPath();
      ctx.arc(a.x, a.y, gr, 0, Math.PI * 2);
      ctx.strokeStyle = col + "50";
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }
    if (a.isMe) {
      const pr = (frame * 1.3) % 110;
      ctx.beginPath();
      ctx.arc(a.x, a.y, pr, 0, Math.PI * 2);
      const alpha = Math.max(0, Math.floor((1 - pr / 110) * 110))
        .toString(16)
        .padStart(2, "0");
      ctx.strokeStyle = C.gold + alpha;
      ctx.lineWidth = 1;
      ctx.stroke();
    }
    const gs = a.isMe ? GM : GN;
    ctx.globalAlpha = a.state === "matched" ? 1 : 0.85;
    drawGhost(
      ctx,
      a.x,
      a.y,
      col,
      gs,
      a.state === "matched" ? GHOST_WINK : GHOST_NORMAL,
    );
    ctx.globalAlpha = 1;
    if (a.state === "matched" && a.isMe) {
      const hf = 0.5 + 0.5 * Math.sin(frame * 0.18);
      ctx.font = `${12 + hf * 3}px sans-serif`;
      ctx.fillStyle = C.gold;
      ctx.textAlign = "center";
      ctx.textBaseline = "bottom";
      ctx.fillText("♥", a.x, a.y - 6 * gs - 8 - hf * 3);
    }
    if (a.isMe) {
      ctx.font = "bold 9px monospace";
      ctx.fillStyle = C.gold;
      ctx.textAlign = "center";
      ctx.textBaseline = "bottom";
      ctx.fillText("YOU ▾", a.x, a.y - 6 * GM - 5);
    }
  });

  // Scanlines
  ctx.fillStyle = "rgba(0,0,0,.04)";
  for (let y = 0; y < CH; y += 2) ctx.fillRect(0, y, CW, 1);
}
