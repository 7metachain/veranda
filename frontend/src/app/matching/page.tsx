"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { getOrCreateAgentWallet } from "@/lib/agent-wallet";

type Status = {
  round: number;
  progress: number;
  eta_seconds: number;
  status: string;
};

type Mode = "live" | "mock";

export default function MatchingPage() {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [status, setStatus] = useState<Status | null>(null);
  const [mode, setMode] = useState<Mode>("live");
  const [error, setError] = useState<string | null>(null);
  const mockTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  // ─── kick off matching ───────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    (async () => {
      // Make sure we have an agent wallet derived (no prompt — uses dev default)
      try {
        await getOrCreateAgentWallet();
      } catch {
        // ignore — we'll fall through to mock mode
      }

      try {
        const res = await api.startMatch();
        if (cancelled) return;
        setSessionId(res.match_session_id);
      } catch (e) {
        if (cancelled) return;
        // Backend unreachable — fall back to a synthesized progress reel.
        setMode("mock");
        setError(
          "Backend offline — running a local demo reel. Start the backend (see README) to wire the real matching pipeline.",
        );
        setSessionId("mock-session-" + Date.now().toString(36));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // ─── poll real status ────────────────────────────────────────────────
  useEffect(() => {
    if (!sessionId || mode !== "live") return;
    const t = setInterval(async () => {
      try {
        const s = await api.matchStatus(sessionId);
        setStatus(s);
        if (s.status === "complete") clearInterval(t);
      } catch {
        // backend dropped — switch to mock from where we are
        setMode("mock");
      }
    }, 1500);
    return () => clearInterval(t);
  }, [sessionId, mode]);

  // ─── mock progress reel ──────────────────────────────────────────────
  useEffect(() => {
    if (mode !== "mock" || mockTimer.current) return;
    let progress = 0;
    let round = 1;
    setStatus({ round, progress, eta_seconds: 30, status: "running" });

    mockTimer.current = setInterval(() => {
      progress += 0.04;
      if (progress >= 0.5 && round === 1) round = 2;
      const eta = Math.max(1, Math.round((1 - progress) * 30));
      const status: Status = {
        round,
        progress: Math.min(progress, 1),
        eta_seconds: eta,
        status: progress >= 1 ? "complete" : "running",
      };
      setStatus(status);
      if (progress >= 1 && mockTimer.current) {
        clearInterval(mockTimer.current);
        mockTimer.current = null;
      }
    }, 400);

    return () => {
      if (mockTimer.current) {
        clearInterval(mockTimer.current);
        mockTimer.current = null;
      }
    };
  }, [mode]);

  const round = status?.round ?? 1;
  const pct = Math.floor((status?.progress ?? 0) * 100);

  return (
    <main className="min-h-screen px-6 py-16 max-w-2xl mx-auto space-y-12 text-center">
      <header>
        <p className="text-veranda-gold uppercase tracking-[0.4em] text-xs">
          Matching {mode === "mock" && "· demo reel"}
        </p>
        <h1 className="font-display text-5xl mt-2">
          Your agent is meeting 30 000 others.
        </h1>
        {error && (
          <p className="text-veranda-ink/40 text-xs mt-3 max-w-md mx-auto">
            {error}
          </p>
        )}
      </header>

      <div className="space-y-2">
        <p className="text-veranda-ink/60">
          Round {round} of 2 — {pct}%{" "}
          <span className="text-veranda-ink/30">
            ({round === 1 ? "30 000 → 100" : "100 → 10"})
          </span>
        </p>
        <div className="h-2 w-full bg-veranda-ink/10 rounded-full overflow-hidden">
          <div
            className="h-full bg-veranda-ink transition-all duration-500"
            style={{ width: `${pct}%` }}
          />
        </div>
        <p className="text-xs text-veranda-ink/40">
          ETA ~{status?.eta_seconds ?? "—"}s
        </p>
      </div>

      {status?.status === "complete" && sessionId && (
        <Link
          href={`/candidates?session=${sessionId}`}
          className="inline-block px-8 py-3 rounded-full bg-veranda-ink text-veranda-fog hover:bg-veranda-ink/80 transition"
        >
          See your top 10 →
        </Link>
      )}
    </main>
  );
}
