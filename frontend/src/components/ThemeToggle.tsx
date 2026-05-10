"use client";

import { useEffect, useRef } from "react";
import { useTheme, useThemeRevision } from "./ThemeProvider";
import { readThemeColor } from "@/lib/pixel-world";

/**
 * Pixel-art theme toggle: a tiny canvas showing a 9×9 sun on the left and
 * 9×9 moon on the right. The active half pulses; clicking flips theme.
 *
 * Designed to live in the corner of the global header strip. It is fully
 * keyboard-accessible (button + aria-label) and gets repainted whenever
 * the theme changes so it always uses the current palette.
 */
const SUN: number[][] = [
  [0, 0, 0, 1, 1, 1, 0, 0, 0],
  [0, 0, 0, 1, 1, 1, 0, 0, 0],
  [0, 0, 1, 1, 1, 1, 1, 0, 0],
  [1, 1, 1, 1, 1, 1, 1, 1, 1],
  [1, 1, 1, 1, 1, 1, 1, 1, 1],
  [1, 1, 1, 1, 1, 1, 1, 1, 1],
  [0, 0, 1, 1, 1, 1, 1, 0, 0],
  [0, 0, 0, 1, 1, 1, 0, 0, 0],
  [0, 0, 0, 1, 1, 1, 0, 0, 0],
];

// Crescent moon
const MOON: number[][] = [
  [0, 0, 1, 1, 1, 1, 0, 0, 0],
  [0, 1, 1, 1, 1, 1, 1, 0, 0],
  [1, 1, 1, 1, 0, 0, 1, 0, 0],
  [1, 1, 1, 0, 0, 0, 0, 0, 0],
  [1, 1, 1, 0, 0, 0, 0, 0, 0],
  [1, 1, 1, 0, 0, 0, 0, 0, 0],
  [1, 1, 1, 1, 0, 0, 1, 0, 0],
  [0, 1, 1, 1, 1, 1, 1, 0, 0],
  [0, 0, 1, 1, 1, 1, 0, 0, 0],
];

function drawSprite(
  ctx: CanvasRenderingContext2D,
  sprite: number[][],
  ox: number,
  oy: number,
  scale: number,
  color: string,
) {
  ctx.fillStyle = color;
  for (let r = 0; r < sprite.length; r++) {
    const row = sprite[r]!;
    for (let c = 0; c < row.length; c++) {
      if (row[c]) {
        ctx.fillRect(ox + c * scale, oy + r * scale, scale, scale);
      }
    }
  }
}

export function ThemeToggle({ className = "" }: { className?: string }) {
  const { theme, toggle } = useTheme();
  const rev = useThemeRevision();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rafRef = useRef<number | null>(null);

  const SCALE = 2;
  const SPRITE = 9;
  const PAD = 4;
  const GAP = 4;
  const W = SPRITE * SCALE * 2 + PAD * 2 + GAP;
  const H = SPRITE * SCALE + PAD * 2;

  useEffect(() => {
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;

    const text = readThemeColor("text");
    const dim = readThemeColor("dim");
    const gold = readThemeColor("gold");
    const blue = readThemeColor("blue");

    let frame = 0;
    const draw = () => {
      ctx.clearRect(0, 0, W, H);

      const sunActive = theme === "light";
      const moonActive = theme === "dark";
      const pulse = 0.7 + Math.sin(frame * 0.08) * 0.3;

      // Sun
      const sunX = PAD;
      const sunY = PAD;
      const sunColor = sunActive ? gold : dim;
      if (sunActive) {
        ctx.globalAlpha = pulse;
        drawSprite(ctx, SUN, sunX, sunY, SCALE, sunColor);
        ctx.globalAlpha = 1;
      }
      drawSprite(ctx, SUN, sunX, sunY, SCALE, sunColor);

      // Moon
      const moonX = PAD + SPRITE * SCALE + GAP;
      const moonY = PAD;
      const moonColor = moonActive ? text : dim;
      if (moonActive) {
        ctx.globalAlpha = pulse;
        drawSprite(ctx, MOON, moonX, moonY, SCALE, moonColor);
        ctx.globalAlpha = 1;
      }
      drawSprite(ctx, MOON, moonX, moonY, SCALE, moonColor);

      frame++;
      rafRef.current = requestAnimationFrame(draw);
    };
    rafRef.current = requestAnimationFrame(draw);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [theme, rev, W, H]);

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
      title={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
      className={`group inline-flex items-center gap-2 px-2.5 py-1.5 border border-pixel-border bg-pixel-bg2/60 hover:bg-pixel-bg2 hover:border-pixel-orange/60 transition-colors rounded-sm ${className}`}
    >
      <canvas
        ref={canvasRef}
        width={W}
        height={H}
        className="pixelated block"
        style={{ width: W, height: H }}
        aria-hidden="true"
      />
      <span className="font-mono text-[10px] tracking-[0.25em] text-pixel-dim group-hover:text-pixel-orange transition-colors">
        {theme === "dark" ? "DARK" : "LIGHT"}
      </span>
    </button>
  );
}
