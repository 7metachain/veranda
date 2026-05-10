"use client";

import { useEffect, useRef } from "react";
import { useThemeRevision } from "../ThemeProvider";
import { readThemeColor } from "@/lib/pixel-world";
import { GHOST_NORMAL, GHOST_WINK, drawGhost } from "./PixelGhost";

/**
 * VerandaLogo — two pixel ghosts forming a heart with their hands,
 * surrounded by sparkles. Drawn on canvas for crisp pixel rendering.
 *
 * Two layouts:
 *   layout="hero"  → full composition w/ sparkles, larger format
 *   layout="mark"  → tight composition, no sparkles, used as brand mark
 *
 * If `primary` / `accent` aren't passed the logo follows the active theme
 * by reading the corresponding CSS variables.
 */
export function VerandaLogo({
  scale = 6,
  layout = "hero",
  primary,
  accent,
  className = "",
  animated = true,
}: {
  scale?: number;
  layout?: "hero" | "mark";
  primary?: string;
  accent?: string;
  className?: string;
  animated?: boolean;
}) {
  const themeRev = useThemeRevision();
  const resolvedPrimary = primary ?? readThemeColor("orange");
  const resolvedAccent = accent ?? readThemeColor("pink");
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const frameRef = useRef(0);
  const rafRef = useRef<number | null>(null);

  // Composition geometry
  const isHero = layout === "hero";
  const padX = isHero ? 6 : 2;
  const padY = isHero ? 5 : 1;
  const ghostW = 10;
  const ghostH = 12;
  // Wider gap on the hero so the heart between the ghosts is unmistakable.
  const gap = isHero ? 9 : 3;
  const cells_w = ghostW * 2 + gap + padX * 2;
  const cells_h = ghostH + padY * 2;
  const W = cells_w * scale;
  const H = cells_h * scale;

  useEffect(() => {
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;

    const draw = () => {
      const f = frameRef.current++;
      ctx.clearRect(0, 0, W, H);

      // Sparkles (only for hero layout)
      if (isHero) {
        const sparks = SPARKLES;
        for (let i = 0; i < sparks.length; i++) {
          const s = sparks[i]!;
          // gentle blink phase
          const phase = animated ? Math.sin(f * 0.04 + i) : 1;
          if (phase < -0.4) continue;
          const alpha = Math.min(1, Math.max(0.3, (phase + 1) / 2));
          ctx.globalAlpha = alpha;
          const sc = scale;
          const sx = s.x * sc;
          const sy = s.y * sc;
          ctx.fillStyle = i % 4 === 0 ? resolvedAccent : resolvedPrimary;
          if (s.type === "plus") {
            ctx.fillRect(sx, sy, sc, sc);
            ctx.fillRect(sx - sc, sy, sc, sc);
            ctx.fillRect(sx + sc, sy, sc, sc);
            ctx.fillRect(sx, sy - sc, sc, sc);
            ctx.fillRect(sx, sy + sc, sc, sc);
          } else {
            ctx.fillRect(sx, sy, sc, sc);
          }
        }
        ctx.globalAlpha = 1;
      }

      // Floaty bob
      const bob = animated ? Math.sin(f * 0.06) * (scale * 0.25) : 0;

      // Ghost positions
      const leftCx = (padX + ghostW / 2) * scale;
      const leftCy = (padY + ghostH / 2) * scale + bob;
      const rightCx = (padX + ghostW + gap + ghostW / 2) * scale;
      const rightCy = (padY + ghostH / 2) * scale - bob;

      // Faint glow behind each ghost
      if (isHero) {
        const glowR = ghostW * scale * 0.6;
        ctx.fillStyle = `${resolvedPrimary}22`;
        ctx.beginPath();
        ctx.arc(leftCx, leftCy, glowR, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(rightCx, rightCy, glowR, 0, Math.PI * 2);
        ctx.fill();
      }

      // Heart between them (drawn pixel-perfect)
      const heartCx = (padX + ghostW + gap / 2) * scale;
      const heartCy = (padY + ghostH / 2 + 0.25) * scale;
      const heartPulse = animated ? 0.92 + Math.sin(f * 0.12) * 0.12 : 1;
      const heartScale =
        scale * (isHero ? 0.95 : 0.9) * heartPulse;
      // glow disc behind heart
      ctx.fillStyle = `${resolvedPrimary}22`;
      ctx.beginPath();
      ctx.arc(heartCx, heartCy, heartScale * 4.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = `${resolvedAccent}33`;
      ctx.beginPath();
      ctx.arc(heartCx, heartCy, heartScale * 3, 0, Math.PI * 2);
      ctx.fill();
      drawHeart(ctx, heartCx, heartCy, heartScale, resolvedPrimary);

      // Ghosts
      drawGhost(ctx, leftCx, leftCy, resolvedPrimary, scale, GHOST_NORMAL);
      drawGhost(ctx, rightCx, rightCy, resolvedPrimary, scale, GHOST_WINK);

      if (animated) {
        rafRef.current = requestAnimationFrame(draw);
      }
    };

    rafRef.current = requestAnimationFrame(draw);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [W, H, scale, resolvedPrimary, resolvedAccent, animated, isHero, themeRev]);

  return (
    <canvas
      ref={canvasRef}
      width={W}
      height={H}
      className={`pixelated block ${className}`}
      style={{ width: W, height: H }}
      aria-label="Veranda — two agents, one heart"
    />
  );
}

/**
 * Pixel-perfect heart sprite (9×8 grid). Drawn as a hollow outline so the
 * shape reads as the negative space between the two ghosts holding hands.
 * 0 = transparent, 1 = outline.
 */
const HEART_OUTLINE: number[][] = [
  [0, 1, 1, 0, 0, 0, 1, 1, 0],
  [1, 0, 0, 1, 0, 1, 0, 0, 1],
  [1, 0, 0, 0, 0, 0, 0, 0, 1],
  [1, 0, 0, 0, 0, 0, 0, 0, 1],
  [0, 1, 0, 0, 0, 0, 0, 1, 0],
  [0, 0, 1, 0, 0, 0, 1, 0, 0],
  [0, 0, 0, 1, 0, 1, 0, 0, 0],
  [0, 0, 0, 0, 1, 0, 0, 0, 0],
];

function drawHeart(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  scale: number,
  color: string,
) {
  const cols = HEART_OUTLINE[0]!.length;
  const rows = HEART_OUTLINE.length;
  const ox = cx - (cols * scale) / 2;
  const oy = cy - (rows * scale) / 2;
  HEART_OUTLINE.forEach((row, ri) =>
    row.forEach((cell, ci) => {
      if (!cell) return;
      ctx.fillStyle = color;
      ctx.fillRect(
        ox + ci * scale,
        oy + ri * scale,
        scale - 0.4,
        scale - 0.4,
      );
    }),
  );
}

/** Sparkle dot positions in cell-space, around the two-ghost composition. */
const SPARKLES: { x: number; y: number; type: "dot" | "plus" }[] = [
  // top scatter (composition is ~41 cells wide for hero)
  { x: 3, y: 1, type: "plus" },
  { x: 8, y: 0, type: "dot" },
  { x: 13, y: 1, type: "dot" },
  { x: 18, y: 0, type: "plus" },
  { x: 23, y: 1, type: "dot" },
  { x: 28, y: 0, type: "dot" },
  { x: 33, y: 1, type: "plus" },
  { x: 37, y: 2, type: "dot" },
  // upper sides
  { x: 1, y: 4, type: "dot" },
  { x: 5, y: 3, type: "dot" },
  { x: 16, y: 2, type: "dot" },
  { x: 20, y: 3, type: "dot" },
  { x: 24, y: 2, type: "dot" },
  { x: 30, y: 3, type: "dot" },
  { x: 36, y: 4, type: "plus" },
  { x: 39, y: 6, type: "dot" },
  // mid sides
  { x: 0, y: 8, type: "dot" },
  { x: 2, y: 11, type: "dot" },
  { x: 38, y: 9, type: "dot" },
  { x: 40, y: 12, type: "dot" },
  // lower scatter
  { x: 4, y: 15, type: "dot" },
  { x: 9, y: 16, type: "plus" },
  { x: 14, y: 15, type: "dot" },
  { x: 20, y: 16, type: "dot" },
  { x: 26, y: 15, type: "plus" },
  { x: 31, y: 16, type: "dot" },
  { x: 36, y: 15, type: "dot" },
  // bottom drift
  { x: 6, y: 18, type: "dot" },
  { x: 13, y: 19, type: "dot" },
  { x: 22, y: 18, type: "dot" },
  { x: 28, y: 19, type: "plus" },
  { x: 34, y: 18, type: "dot" },
];
