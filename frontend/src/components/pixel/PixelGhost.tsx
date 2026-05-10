"use client";

import { useEffect, useRef } from "react";

// ── Ghost pixel art (10×12 grid). Inspired by classic CRT sprites. ──
// 0 = transparent, 1 = body color, 2 = eye-white, 3 = dark (pupil/smile)
export const GHOST_NORMAL: number[][] = [
  [0, 0, 1, 1, 1, 1, 1, 1, 0, 0],
  [0, 1, 1, 1, 1, 1, 1, 1, 1, 0],
  [1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
  [1, 1, 2, 2, 1, 1, 2, 2, 1, 1],
  [1, 1, 2, 3, 1, 1, 2, 3, 1, 1],
  [1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
  [1, 1, 1, 3, 1, 1, 3, 1, 1, 1],
  [1, 1, 1, 1, 3, 3, 1, 1, 1, 1],
  [1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
  [1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
  [1, 1, 0, 1, 1, 1, 1, 0, 1, 1],
  [1, 0, 0, 1, 1, 1, 1, 0, 0, 1],
];

// Wink face — the right eye becomes a dash (matched state)
export const GHOST_WINK: number[][] = [
  [0, 0, 1, 1, 1, 1, 1, 1, 0, 0],
  [0, 1, 1, 1, 1, 1, 1, 1, 1, 0],
  [1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
  [1, 1, 2, 2, 1, 1, 1, 1, 1, 1],
  [1, 1, 2, 3, 1, 1, 3, 3, 1, 1],
  [1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
  [1, 1, 1, 3, 1, 1, 3, 1, 1, 1],
  [1, 1, 1, 1, 3, 3, 1, 1, 1, 1],
  [1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
  [1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
  [1, 1, 0, 1, 1, 1, 1, 0, 1, 1],
  [1, 0, 0, 1, 1, 1, 1, 0, 0, 1],
];

export function drawGhost(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  color: string,
  scale: number,
  map: number[][] = GHOST_NORMAL,
) {
  const ox = cx - 5 * scale;
  const oy = cy - 6 * scale;
  map.forEach((row, ri) =>
    row.forEach((cell, ci) => {
      if (!cell) return;
      ctx.fillStyle =
        cell === 1 ? color : cell === 2 ? "#fff5ee" : "#1a0906";
      ctx.fillRect(ox + ci * scale, oy + ri * scale, scale - 0.4, scale - 0.4);
    }),
  );
}

/**
 * Standalone PixelGhost — renders one ghost on its own tiny canvas.
 * Useful for cards, headers, decorative spots.
 */
export function PixelGhost({
  color = "#ffd060",
  scale = 4,
  wink = false,
  floaty = false,
  className,
}: {
  color?: string;
  scale?: number;
  wink?: boolean;
  floaty?: boolean;
  className?: string;
}) {
  const ref = useRef<HTMLCanvasElement | null>(null);
  const w = 10 * scale + 4;
  const h = 12 * scale + 4;

  useEffect(() => {
    const ctx = ref.current?.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, w, h);
    drawGhost(ctx, w / 2, h / 2, color, scale, wink ? GHOST_WINK : GHOST_NORMAL);
  }, [color, scale, wink, w, h]);

  return (
    <canvas
      ref={ref}
      width={w}
      height={h}
      className={`${className ?? ""} pixelated ${floaty ? "animate-floaty" : ""}`}
      style={{ width: w, height: h }}
    />
  );
}
