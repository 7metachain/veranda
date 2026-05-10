"use client";

import { ButtonHTMLAttributes, ReactNode } from "react";

/* ─────────────── PixelButton ─────────────── */
export function PixelButton({
  children,
  variant = "primary",
  className = "",
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "ghost" | "danger";
}) {
  const base =
    "px-5 py-2.5 font-mono text-sm tracking-widest uppercase border-2 transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed select-none";
  const styles = {
    primary:
      "bg-pixel-orange/15 hover:bg-pixel-orange/25 text-pixel-gold border-pixel-orange shadow-pixel-glow hover:translate-x-[1px] hover:translate-y-[1px]",
    ghost:
      "bg-transparent text-pixel-text/70 hover:text-pixel-gold border-pixel-border hover:border-pixel-orange",
    danger:
      "bg-pixel-pink/10 hover:bg-pixel-pink/20 text-pixel-pink border-pixel-pink",
  } as const;
  return (
    <button {...rest} className={`${base} ${styles[variant]} ${className}`}>
      {children}
    </button>
  );
}

/* ─────────────── PixelPanel ─────────────── */
export function PixelPanel({
  title,
  children,
  className = "",
  accent = "#e8724a",
}: {
  title?: string;
  children: ReactNode;
  className?: string;
  accent?: string;
}) {
  return (
    <div
      className={`bg-pixel-bg2 border border-pixel-border rounded-md ${className}`}
      style={{ boxShadow: `inset 0 0 0 1px ${accent}10` }}
    >
      {title && (
        <div className="px-4 py-2 border-b border-pixel-border flex items-center gap-2">
          <span
            className="inline-block w-2 h-2 rounded-sm"
            style={{ background: accent }}
          />
          <span className="font-mono text-[10px] tracking-[0.3em] text-pixel-dim">
            ── {title.toUpperCase()} ──
          </span>
        </div>
      )}
      <div className="p-4">{children}</div>
    </div>
  );
}

/* ─────────────── PixelStat ─────────────── */
export function PixelStat({
  label,
  value,
  sub,
  color = "#e8724a",
}: {
  label: string;
  value: ReactNode;
  sub?: string;
  color?: string;
}) {
  return (
    <div
      className="bg-pixel-bg2 border rounded-md p-4 relative overflow-hidden"
      style={{ borderColor: `${color}33` }}
    >
      <div
        className="absolute top-0 left-0 right-0 h-[2px]"
        style={{
          background: `linear-gradient(90deg, transparent, ${color}, transparent)`,
          opacity: 0.7,
        }}
      />
      <div className="font-mono text-[9px] tracking-[0.2em] text-pixel-dim mb-2 uppercase">
        {label}
      </div>
      <div
        className="font-pixel text-3xl leading-none"
        style={{ color }}
      >
        {value}
      </div>
      {sub && (
        <div className="font-mono text-[9px] text-pixel-dim/70 mt-2">
          {sub}
        </div>
      )}
    </div>
  );
}

/* ─────────────── PixelDivider ─────────────── */
export function PixelDivider({ label }: { label?: string }) {
  return (
    <div className="flex items-center gap-3 my-4">
      <div className="flex-1 h-px bg-pixel-border" />
      {label && (
        <span className="font-mono text-[10px] tracking-[0.3em] text-pixel-dim">
          {label}
        </span>
      )}
      <div className="flex-1 h-px bg-pixel-border" />
    </div>
  );
}
