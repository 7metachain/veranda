"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { PixelButton } from "@/components/pixel/PixelUI";
import { PixelWorldCanvas } from "@/components/pixel/PixelWorldCanvas";
import {
  AGENT_TYPES,
  COMPAT_FACTS,
  COMMENTARY,
  PIXEL_COLORS as C,
  type Agent,
  type MatchEvent,
  initCompatDistribution,
} from "@/lib/pixel-world";
import { api } from "@/lib/api";
import { getOrCreateAgentWallet } from "@/lib/agent-wallet";

type Tab = "god" | "feed" | "dash";
type Stats = {
  matched: number;
  round: number;
  progress: number;
  avgScore: number;
  rateHistory: { rate: number }[];
};

/** A high-scoring match involving the user's agent — surfaced live as
 *  shareable "top matches" so the user can jump to /candidates the
 *  moment one is ready, without waiting for the round to finish. */
export type TopMatch = {
  id: number;
  name: string;
  typeName: string;
  color: string;
  score: number;
  fact: string;
  commentary: string;
  ts: number;
};

const TOP_THRESHOLD = 78;
const TOP_LIMIT = 15;

export default function MatchingPage() {
  const [tab, setTab] = useState<Tab>("god");
  // Live world state — populated by PixelWorldCanvas via onTick.
  // We deliberately do NOT run our own simulation tick here anymore;
  // the canvas component owns the world (same component used on the
  // landing page) so the visual is identical and the "ghosts smearing
  // into vertical bars" bug is gone.
  const [agents, setAgents] = useState<Agent[]>([]);
  const [events, setEvents] = useState<MatchEvent[]>([]);
  const [stats, setStats] = useState<Stats>({
    matched: 0,
    round: 1,
    progress: 12.3,
    avgScore: 0,
    rateHistory: Array.from({ length: 24 }, () => ({ rate: 0 })),
  });
  const [dist] = useState(initCompatDistribution);

  // Track which match-event IDs we've already processed so the same
  // tick doesn't re-fire setEvents on every animation frame.
  const seenEventIds = useRef<Set<number>>(new Set());
  const rateHistoryRef = useRef<{ rate: number }[]>(
    Array.from({ length: 24 }, () => ({ rate: 0 })),
  );
  // Throttle the heavyweight react updates — onTick fires at rAF
  // (~60fps) but the world only matters at sim cadence (~10fps).
  const lastUpdateRef = useRef(0);

  // Live top matches (your-agent only, score ≥ threshold). Surfaced
  // through the floating notification + persisted so /candidates can
  // render partial results without waiting for the round to finish.
  const [topMatches, setTopMatches] = useState<TopMatch[]>([]);
  const [showTopList, setShowTopList] = useState(false);
  const [reason, setReason] = useState<MatchEvent | null>(null);

  // Backend session bootstrap (best-effort).
  const [sessionId, setSessionId] = useState<string>(
    "demo-" + Date.now().toString(36),
  );
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await getOrCreateAgentWallet();
        const res = await api.startMatch();
        if (!cancelled) setSessionId(res.match_session_id);
      } catch {
        // Backend offline — keep the demo session id.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // PixelWorldCanvas snapshot consumer. Diff-and-merge on each tick.
  const handleTick = useCallback(
    (snap: {
      agents: Agent[];
      events: MatchEvent[];
      stats: { matched: number; round: number; progress: number; avgScore: number };
      myAgent: Agent | undefined;
    }) => {
      // Throttle: only react-update every ~150ms.
      const now = Date.now();
      if (now - lastUpdateRef.current < 150) return;
      lastUpdateRef.current = now;

      setAgents(snap.agents);

      // Pick out events we haven't seen yet (events come in newest-first).
      const fresh: MatchEvent[] = [];
      for (const ev of snap.events) {
        if (seenEventIds.current.has(ev.id)) break;
        fresh.push(ev);
      }
      if (fresh.length) {
        for (const ev of fresh) seenEventIds.current.add(ev.id);
        setEvents((prev) => [...fresh, ...prev].slice(0, 60));

        // Surface high-scoring "your-agent" matches as top matches.
        const newTops: TopMatch[] = [];
        for (const ev of fresh) {
          if (!ev.isMyAgent || ev.score < TOP_THRESHOLD) continue;
          // Pick the side that ISN'T "Your Agent" as the candidate.
          const candidateName =
            ev.a === "Your Agent" ? ev.b : ev.b === "Your Agent" ? ev.a : ev.b;
          const candidateType =
            ev.a === "Your Agent" ? ev.typeB : ev.b === "Your Agent" ? ev.typeA : ev.typeB;
          const candidateColor =
            ev.a === "Your Agent" ? ev.colorB : ev.b === "Your Agent" ? ev.colorA : ev.colorB;
          newTops.push({
            id: ev.id,
            name: candidateName,
            typeName: candidateType,
            color: candidateColor,
            score: ev.score,
            fact: ev.fact,
            commentary: ev.commentary,
            ts: Date.now(),
          });
        }
        if (newTops.length) {
          setTopMatches((prev) => {
            const merged = [...newTops, ...prev]
              .sort((x, y) => y.score - x.score)
              .slice(0, TOP_LIMIT);
            try {
              localStorage.setItem(
                "veranda:top_matches",
                JSON.stringify(merged),
              );
            } catch {
              /* ignore */
            }
            return merged;
          });
        }
      }

      // Stats + rolling rate history.
      rateHistoryRef.current = [
        ...rateHistoryRef.current.slice(1),
        { rate: snap.stats.matched },
      ];
      setStats({
        matched: snap.stats.matched,
        round: snap.stats.round,
        progress: snap.stats.progress,
        avgScore: snap.stats.avgScore,
        rateHistory: rateHistoryRef.current,
      });
    },
    [],
  );

  const myAgent = useMemo(() => agents.find((a) => a.isMe), [agents]);
  const isComplete = stats.progress >= 100;

  return (
    <div className="min-h-screen bg-pixel-bg text-pixel-text font-mono">
      {/* HEADER */}
      <header className="h-16 border-b border-pixel-border flex items-center justify-between px-6 bg-gradient-to-r from-[#0f0807] via-[#110b07] to-[#0f0807]">
        <div>
          <p className="font-mono text-[9px] tracking-[0.4em] text-pixel-dim mb-0.5">
            MATCHING · DEMO REEL
          </p>
          <p className="font-pixel text-xl text-pixel-text leading-none">
            YOUR AGENT IS MEETING 30,000 OTHERS
          </p>
        </div>
        <div className="flex-1 max-w-sm mx-7 hidden md:block">
          <div className="flex justify-between font-mono text-[9px] text-pixel-dim mb-1">
            <span>
              Round {stats.round} of 2 — {stats.progress.toFixed(1)}%
            </span>
            <span className="text-pixel-dim/70">
              30,000 → 100 · ETA ~{Math.max(1, Math.round((100 - stats.progress) * 0.5))}s
            </span>
          </div>
          <div className="h-1.5 bg-pixel-bg2 rounded-sm overflow-hidden">
            <div
              className="h-full transition-[width] duration-700"
              style={{
                width: `${stats.progress}%`,
                background: `linear-gradient(90deg, ${C.orange}, ${C.gold})`,
                boxShadow: `0 0 8px ${C.orange}80`,
              }}
            />
          </div>
        </div>
        <div className="flex border border-pixel-border rounded overflow-hidden">
          {(
            [
              ["god", "⊞ GOD VIEW"],
              ["feed", "♥ LIVE FEED"],
              ["dash", "◈ DASHBOARD"],
            ] as const
          ).map(([k, label], i, arr) => (
            <button
              key={k}
              onClick={() => setTab(k)}
              className={`px-4 py-2 font-mono text-[9px] tracking-widest uppercase transition ${
                tab === k
                  ? "bg-[#1f100a] text-pixel-orange"
                  : "text-pixel-dim hover:text-pixel-text"
              } ${i < arr.length - 1 ? "border-r border-pixel-border" : ""}`}
            >
              {label}
            </button>
          ))}
        </div>
      </header>

      {/* CONTENT */}
      {/* The PixelWorldCanvas mounts ONCE and stays mounted regardless
          of the active tab — switching to LIVE FEED / DASHBOARD just
          hides it visually. This keeps the world running without
          remounting (which would reset agent positions and look weird
          when the user toggles back). */}
      <div style={{ height: "calc(100vh - 64px)" }}>
        <div
          className="grid grid-cols-1 lg:grid-cols-[1fr_300px] h-full"
          style={{ display: tab === "god" ? "grid" : "none" }}
        >
          <GodView
            myAgent={myAgent}
            events={events}
            stats={stats}
            agents={agents}
            onSelectReason={setReason}
            onTick={handleTick}
          />
        </div>
        {tab === "feed" && (
          <LiveFeed
            events={events}
            myAgent={myAgent}
            onSelectReason={setReason}
          />
        )}
        {tab === "dash" && (
          <Dashboard stats={stats} dist={dist} events={events} />
        )}
      </div>

      {/* LIVE TOP-MATCHES NOTIFICATION */}
      {topMatches.length > 0 && (
        <div className="fixed bottom-6 right-6 z-40 flex flex-col items-end gap-2">
          {showTopList && (
            <div className="w-80 max-h-96 overflow-y-auto bg-pixel-bg2 border border-pixel-border rounded shadow-pixel-glow">
              <div className="px-3 py-2 border-b border-pixel-border flex items-center justify-between">
                <span className="font-mono text-[9px] tracking-[0.3em] text-pixel-gold">
                  ── LIVE TOP MATCHES ──
                </span>
                <button
                  onClick={() => setShowTopList(false)}
                  className="font-mono text-[10px] text-pixel-dim hover:text-pixel-orange"
                >
                  ✕
                </button>
              </div>
              {topMatches.map((tm, i) => (
                <div
                  key={tm.id}
                  className="px-3 py-2 border-b border-[#130908] flex items-center justify-between"
                >
                  <div>
                    <div
                      className="font-mono text-[10px] font-bold"
                      style={{ color: tm.color }}
                    >
                      #{String(i + 1).padStart(2, "0")} · {tm.name}
                    </div>
                    <div className="font-mono text-[8px] text-pixel-dim italic">
                      "{tm.fact}"
                    </div>
                  </div>
                  <span
                    className="font-mono text-[11px] font-bold"
                    style={{
                      color:
                        tm.score >= 90
                          ? C.green
                          : tm.score >= 80
                            ? C.gold
                            : C.orange,
                    }}
                  >
                    {tm.score}%
                  </span>
                </div>
              ))}
            </div>
          )}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowTopList((v) => !v)}
              className="relative bg-pixel-bg2 border border-pixel-border rounded px-3 py-2 font-mono text-[10px] text-pixel-gold hover:bg-pixel-bg2/80 transition"
            >
              {showTopList ? "Hide" : "Live"} top matches
              <span className="absolute -top-2 -right-2 min-w-[18px] h-[18px] px-1 bg-pixel-pink text-pixel-bg rounded-full font-mono text-[9px] font-bold flex items-center justify-center animate-livePulse">
                {topMatches.length}
              </span>
            </button>
            <Link href={`/candidates?session=${sessionId}`}>
              <PixelButton>
                {isComplete ? "See your top 10 →" : "Open top matches →"}
              </PixelButton>
            </Link>
          </div>
        </div>
      )}

      {isComplete && topMatches.length === 0 && (
        <div className="fixed bottom-6 right-6">
          <Link href={`/candidates?session=${sessionId}`}>
            <PixelButton>See your top 10 →</PixelButton>
          </Link>
        </div>
      )}

      {reason && <ReasonModal ev={reason} onClose={() => setReason(null)} />}
    </div>
  );
}

/* ───────────────────── GOD VIEW ─────────────────────
   The world canvas is now PixelWorldCanvas — same component used on
   the landing page — so the ghosts behave exactly like /. The
   sidebar list still works as before; clicking any row pops the
   reason modal. */
function GodView({
  myAgent,
  events,
  stats,
  agents,
  onSelectReason,
  onTick,
}: {
  myAgent: Agent | undefined;
  events: MatchEvent[];
  stats: Stats;
  agents: Agent[];
  onSelectReason: (ev: MatchEvent) => void;
  onTick: (snap: {
    agents: Agent[];
    events: MatchEvent[];
    stats: { matched: number; round: number; progress: number; avgScore: number };
    myAgent: Agent | undefined;
  }) => void;
}) {
  // Click anywhere on the world: hit-test against the live agent
  // positions to find a "heart" (mid-point of a matched pair) close
  // to the click, then surface the reason for that pair.
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const wrap = wrapRef.current;
    if (!wrap) return;
    const canvas = wrap.querySelector("canvas");
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;
    // Internal canvas size matches what PixelWorldCanvas was given.
    const CW_INTERNAL = canvas.width;
    const CH_INTERNAL = canvas.height;
    const cx = ((e.clientX - rect.left) / rect.width) * CW_INTERNAL;
    const cy = ((e.clientY - rect.top) / rect.height) * CH_INTERNAL;

    const seen = new Set<number>();
    let hit: { dist: number; A: Agent; B: Agent } | null = null;
    for (const a of agents) {
      if (a.state !== "matched" || a.matchId == null || seen.has(a.id)) continue;
      const b = agents.find((x) => x.id === a.matchId);
      if (!b) continue;
      seen.add(a.id);
      seen.add(b.id);
      const mx = (a.x + b.x) / 2;
      const my = (a.y + b.y) / 2;
      const d = Math.hypot(mx - cx, my - cy);
      if (d <= 22 && (!hit || d < hit.dist)) hit = { dist: d, A: a, B: b };
    }
    if (!hit) return;
    const { A, B } = hit;
    // Look up the most recent event involving this exact pair so we
    // can show the same fact/commentary the sidebar already showed.
    const pairEv = events.find(
      (ev) =>
        (ev.a === A.name && ev.b === B.name) ||
        (ev.a === B.name && ev.b === A.name),
    );
    onSelectReason(
      pairEv ?? {
        id: Math.random(),
        a: A.name,
        b: B.name,
        colorA: A.type.color,
        colorB: B.type.color,
        typeA: A.type.name,
        typeB: B.type.name,
        score: A.score,
        isMyAgent: A.isMe || B.isMe,
        fact: COMPAT_FACTS[0]!,
        commentary: COMMENTARY[0]!,
      },
    );
  };

  return (
    <>
      <div
        className="relative overflow-hidden border-r border-pixel-border"
        ref={wrapRef}
        onClick={handleClick}
        style={{ cursor: "crosshair" }}
        title="Click any heart to see why these agents matched"
      >
        <div className="absolute inset-0">
          <PixelWorldCanvas
            width={720}
            height={420}
            agentCount={75}
            showLegend={false}
            showStatus={false}
            showLiveBadge={false}
            className="w-full h-full !rounded-none !border-0"
            onTick={onTick}
          />
        </div>
        <Badge
          className="top-3 left-3"
          color={myAgent?.state === "matched" ? C.green : C.orange}
        >
          <div className="font-bold mb-0.5">
            {myAgent?.state === "matched"
              ? `♥ MATCH FOUND · ${myAgent.score}%`
              : "⟳ YOUR AGENT IS SEARCHING"}
          </div>
          <div className="text-pixel-dim font-normal">
            Screened: {myAgent?.meetCount ?? 0} candidates · 30,000 in pool
          </div>
        </Badge>
        <Badge className="top-3 right-3" color="#c87040">
          BACKEND OFFLINE · LOCAL DEMO
        </Badge>
        <div className="absolute bottom-2.5 left-2.5 flex flex-wrap gap-1">
          {AGENT_TYPES.map((t) => (
            <Badge key={t.id} color={t.color} className="static">
              <span className="flex items-center gap-1">
                <span
                  className="w-1.5 h-1.5 rounded-sm"
                  style={{ background: t.color }}
                />
                {t.name.toUpperCase()}
              </span>
            </Badge>
          ))}
        </div>
        <Badge className="bottom-2.5 right-3" color={C.green}>
          <span className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-pixel-green animate-livePulse" />
            LIVE
          </span>
        </Badge>
      </div>

      {/* sidebar */}
      <aside className="bg-pixel-bg2 flex flex-col">
        <div className="p-3 grid grid-cols-2 gap-1.5 border-b border-pixel-border">
          <MiniStat label="SCREENED" value={stats.matched.toLocaleString()} color={C.orange} />
          <MiniStat label="AVG COMPAT" value={`${stats.avgScore || "—"}%`} color={C.gold} />
          <MiniStat label="ROUND" value={`${stats.round}/2`} color={C.blue} />
          <MiniStat label="PROGRESS" value={`${stats.progress.toFixed(1)}%`} color={C.pink} />
        </div>
        <div className="px-3 pt-2 pb-1 font-mono text-[8px] tracking-widest text-pixel-border">
          ── MATCH LOG ──
        </div>
        <div className="flex-1 overflow-y-auto">
          {events.slice(0, 25).map((ev, i) => (
            <button
              key={ev.id}
              onClick={() => onSelectReason(ev)}
              className="w-full text-left px-3 py-1.5 border-b border-[#130908] transition hover:bg-[#1a0e08] cursor-pointer"
              style={{
                opacity: Math.max(0.2, 1 - i * 0.032),
                background: ev.isMyAgent ? "rgba(255,208,96,.05)" : undefined,
              }}
            >
              {ev.isMyAgent ? (
                <>
                  <div className="font-mono text-[9px] text-pixel-gold font-bold mb-0.5">
                    ★ YOUR AGENT EVALUATED
                  </div>
                  <div className="font-mono text-[10px]" style={{ color: ev.colorB }}>
                    {ev.b}
                  </div>
                  <div className="font-mono text-[8px] italic text-[#5a3828] mt-0.5">
                    "{ev.fact}"
                  </div>
                  <div
                    className="font-mono text-[10px] font-bold mt-0.5"
                    style={{ color: ev.score >= 85 ? C.green : ev.score >= 70 ? C.orange : C.pink }}
                  >
                    {ev.score}% compatible
                  </div>
                </>
              ) : (
                <>
                  <div className="flex justify-between font-mono text-[9px] mb-1">
                    <span style={{ color: ev.colorA }}>{ev.a}</span>
                    <span className="text-[#3d1808]">×</span>
                    <span style={{ color: ev.colorB }}>{ev.b}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-mono text-[8px] text-[#4a2818]">
                      {ev.typeA}×{ev.typeB}
                    </span>
                    <span
                      className="font-mono text-[9px] font-bold"
                      style={{
                        color:
                          ev.score >= 85 ? C.green : ev.score >= 70 ? C.orange : C.pink,
                      }}
                    >
                      {ev.score}%
                    </span>
                  </div>
                </>
              )}
            </button>
          ))}
        </div>
      </aside>
    </>
  );
}

/* ───────────────────── REASON MODAL ───────────────────── */
function ReasonModal({
  ev,
  onClose,
}: {
  ev: MatchEvent;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-[420px] max-w-[92vw] bg-pixel-bg2 border-2 rounded-md p-5 shadow-pixel-glow"
        onClick={(e) => e.stopPropagation()}
        style={{
          borderColor: ev.isMyAgent ? `${C.gold}80` : C.border,
        }}
      >
        <div className="flex items-center justify-between mb-3">
          <span className="font-mono text-[9px] tracking-[0.3em] text-pixel-dim">
            ── MATCH REASON ──
          </span>
          <button
            onClick={onClose}
            className="font-mono text-[12px] text-pixel-dim hover:text-pixel-orange"
          >
            ✕
          </button>
        </div>
        <div className="flex items-center justify-between mb-2">
          <div className="font-mono text-[12px] font-bold" style={{ color: ev.colorA }}>
            {ev.a}
          </div>
          <span className="font-mono text-[10px] text-pixel-border">×</span>
          <div className="font-mono text-[12px] font-bold" style={{ color: ev.colorB }}>
            {ev.b}
          </div>
        </div>
        <div className="flex items-center justify-between mb-4 font-mono text-[9px] text-pixel-dim">
          <span>{ev.typeA}</span>
          <span>·</span>
          <span>{ev.typeB}</span>
        </div>
        <div
          className="text-center font-pixel text-4xl mb-3"
          style={{
            color:
              ev.score >= 85 ? C.green : ev.score >= 70 ? C.orange : C.pink,
          }}
        >
          {ev.score}%
        </div>
        <div className="bg-pixel-bg border border-pixel-border rounded p-3 mb-2">
          <div className="font-mono text-[8px] tracking-[0.3em] text-pixel-dim mb-1">
            FACT
          </div>
          <div className="font-mono text-[11px] text-pixel-text/90">
            {ev.fact}
          </div>
        </div>
        <div className="bg-pixel-bg border border-pixel-border rounded p-3">
          <div className="font-mono text-[8px] tracking-[0.3em] text-pixel-dim mb-1">
            COMMENTARY
          </div>
          <div className="font-mono text-[11px] text-pixel-text/90">
            {ev.commentary}
          </div>
        </div>
        {ev.isMyAgent && (
          <div className="mt-3 text-center font-mono text-[9px] text-pixel-gold tracking-widest">
            ★ INVOLVES YOUR AGENT
          </div>
        )}
      </div>
    </div>
  );
}

/* ───────────────────── LIVE FEED ───────────────────── */
function LiveFeed({
  events,
  myAgent,
  onSelectReason,
}: {
  events: MatchEvent[];
  myAgent: Agent | undefined;
  onSelectReason: (ev: MatchEvent) => void;
}) {
  const myEvs = events.filter((e) => e.isMyAgent);
  const topScore = myEvs.reduce((m, e) => (e.score > m ? e.score : m), 0);

  return (
    <div
      className="p-5 overflow-y-auto flex gap-4"
      style={{ height: "calc(100vh - 64px)" }}
    >
      {/* my agent column */}
      <div className="w-[300px] shrink-0">
        <p className="font-mono text-[9px] tracking-widest text-pixel-gold mb-3.5">
          ── YOUR AGENT'S JOURNEY ──
        </p>
        <div className="bg-pixel-bg2 border-2 rounded-lg p-5 mb-3 text-center" style={{ borderColor: `${C.gold}40` }}>
          <div className="text-4xl mb-2">
            {myAgent?.state === "matched" ? "♥" : "⟳"}
          </div>
          <div className="font-mono text-xs text-pixel-gold mb-1">
            {myAgent?.state === "matched"
              ? `MATCH FOUND: ${myAgent.score}% compat`
              : "Evaluating candidates..."}
          </div>
          <div className="flex justify-center gap-6 mt-3">
            <div className="text-center">
              <div className="font-pixel text-2xl text-pixel-orange">
                {myAgent?.meetCount ?? 0}
              </div>
              <div className="font-mono text-[8px] text-pixel-dim">Screened</div>
            </div>
            <div className="text-center">
              <div className="font-pixel text-2xl text-pixel-green">
                {topScore ? `${topScore}%` : "—"}
              </div>
              <div className="font-mono text-[8px] text-pixel-dim">Top Score</div>
            </div>
          </div>
        </div>
        {myEvs.length === 0 && (
          <div className="text-center py-7 font-mono text-[10px] text-pixel-dim">
            Your agent is warming up...
          </div>
        )}
        {myEvs.slice(0, 10).map((ev) => (
          <button
            key={ev.id}
            onClick={() => onSelectReason(ev)}
            className="w-full text-left bg-pixel-bg2 border rounded p-3 mb-1.5 hover:bg-[#1a0e08] transition cursor-pointer"
            style={{
              borderColor: ev.score >= 80 ? `${C.gold}40` : C.border,
            }}
          >
            <div className="flex justify-between mb-0.5">
              <span className="font-mono text-[10px]" style={{ color: ev.colorB }}>
                {ev.b}
              </span>
              <span
                className="font-mono text-[11px] font-bold"
                style={{
                  color:
                    ev.score >= 85 ? C.green : ev.score >= 70 ? C.orange : C.pink,
                }}
              >
                {ev.score}%
              </span>
            </div>
            <div className="font-mono text-[8px] text-pixel-dim mb-0.5">
              {ev.commentary}
            </div>
            <div className="font-mono text-[8px] text-[#6a4030] italic">
              "{ev.fact}"
            </div>
          </button>
        ))}
      </div>

      {/* global stream */}
      <div className="flex-1">
        <p className="font-mono text-[9px] tracking-widest text-pixel-orange mb-3.5">
          ── GLOBAL MATCH STREAM ──
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {events.slice(0, 18).map((ev) => (
            <button
              key={ev.id}
              onClick={() => onSelectReason(ev)}
              className="w-full text-left bg-pixel-bg2 border rounded p-3 hover:bg-[#1a0e08] transition cursor-pointer"
              style={{
                borderColor: ev.isMyAgent ? `${C.gold}50` : C.border,
              }}
            >
              <div className="flex justify-between mb-1">
                <div className="font-mono text-[9px]">
                  <span style={{ color: ev.colorA }}>
                    {ev.a.split(/[-+.]/)[0]}
                  </span>
                  <span className="text-pixel-border"> × </span>
                  <span style={{ color: ev.colorB }}>
                    {ev.b.split(/[-+.]/)[0]}
                  </span>
                </div>
                <span
                  className="font-mono text-[10px] font-bold"
                  style={{
                    color:
                      ev.score >= 85 ? C.green : ev.score >= 70 ? C.orange : C.pink,
                  }}
                >
                  {ev.score}%
                </span>
              </div>
              <div className="font-mono text-[8px] text-[#5a3828]">
                {ev.commentary}
              </div>
              {ev.isMyAgent && (
                <div className="font-mono text-[8px] text-pixel-gold mt-1">
                  ★ your agent
                </div>
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ───────────────────── DASHBOARD ───────────────────── */
function Dashboard({
  stats,
  dist,
  events,
}: {
  stats: Stats;
  dist: { range: string; count: number }[];
  events: MatchEvent[];
}) {
  const pairs = useMemo(() => {
    const m: Record<string, { key: string; total: number; count: number }> = {};
    events.forEach((e) => {
      const k = [e.typeA, e.typeB].sort().join(" × ");
      if (!m[k]) m[k] = { key: k, total: 0, count: 0 };
      m[k]!.total += e.score;
      m[k]!.count++;
    });
    return Object.values(m)
      .map((p) => ({ ...p, avg: Math.round(p.total / p.count) }))
      .sort((a, b) => b.avg - a.avg)
      .slice(0, 6);
  }, [events]);

  const rateData = stats.rateHistory.map((d, i) => ({ i, v: d.rate }));
  const tt = {
    contentStyle: {
      background: C.bg,
      border: `1px solid ${C.border}`,
      fontFamily: "Share Tech Mono, monospace",
      fontSize: 11,
      borderRadius: 4,
      color: C.text,
    },
    cursor: { fill: "rgba(255,255,255,.02)" },
  };
  const ax = {
    fill: "#5a3828",
    fontSize: 9,
    fontFamily: "Share Tech Mono, monospace",
  };

  return (
    <div
      className="p-5 overflow-y-auto flex flex-col gap-3.5"
      style={{ height: "calc(100vh - 64px)" }}
    >
      {/* stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <DashStat
          label="TOTAL SCREENED"
          value={stats.matched.toLocaleString()}
          sub="All pairings evaluated"
          color={C.orange}
        />
        <DashStat
          label="AVG COMPAT"
          value={`${stats.avgScore || 0}%`}
          sub="Across all matches"
          color={C.gold}
        />
        <DashStat
          label="TOP PAIRING"
          value={pairs[0]?.key ?? "—"}
          sub="Highest scoring type combo"
          color={C.green}
        />
        <DashStat
          label="COMPLETION"
          value={`${stats.progress.toFixed(1)}%`}
          sub="30,000 → 100 finalists"
          color={C.pink}
        />
      </div>

      <div className="grid md:grid-cols-[3fr_2fr] gap-3.5">
        <Box title="COMPATIBILITY DISTRIBUTION">
          <ResponsiveContainer width="100%" height={170}>
            <BarChart data={dist} margin={{ top: 5, right: 10, bottom: 5, left: -10 }}>
              <CartesianGrid strokeDasharray="2 4" stroke="#1a0e08" vertical={false} />
              <XAxis dataKey="range" tick={ax} />
              <YAxis tick={ax} />
              <Tooltip {...tt} />
              <Bar dataKey="count" radius={[3, 3, 0, 0]}>
                {dist.map((_, i) => (
                  <Cell key={i} fill={i < 3 ? C.pink : i < 6 ? C.orange : C.green} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Box>
        <Box title="TOP TYPE PAIRINGS">
          {pairs.length === 0 ? (
            <div className="text-center py-10 text-[#3d1a08] font-mono text-[10px]">
              Collecting data...
            </div>
          ) : (
            pairs.map((p, i) => (
              <div
                key={p.key}
                className="flex justify-between items-center py-1.5 border-b border-[#1a0d06]"
              >
                <span>
                  <span className="text-[#3d1808] text-[9px] mr-1">{i + 1}.</span>
                  <span className="text-[#7a5040] text-[10px]">{p.key}</span>
                </span>
                <span
                  className="font-mono text-[11px] font-bold"
                  style={{
                    color: p.avg >= 85 ? C.green : p.avg >= 70 ? C.orange : C.pink,
                  }}
                >
                  {p.avg}%
                </span>
              </div>
            ))
          )}
        </Box>
      </div>

      <div className="grid md:grid-cols-[3fr_2fr] gap-3.5">
        <Box title="MATCH VELOCITY">
          <ResponsiveContainer width="100%" height={150}>
            <AreaChart data={rateData} margin={{ top: 5, right: 10, bottom: 5, left: -10 }}>
              <defs>
                <linearGradient id="og" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={C.orange} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={C.orange} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="2 4" stroke="#1a0e08" vertical={false} />
              <XAxis dataKey="i" tick={ax} />
              <YAxis tick={ax} />
              <Tooltip {...tt} />
              <Area
                type="monotone"
                dataKey="v"
                stroke={C.orange}
                strokeWidth={2}
                fill="url(#og)"
                dot={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </Box>
        <Box title="AGENT COMPOSITION">
          {AGENT_TYPES.map((t) => (
            <div key={t.id} className="flex items-center gap-2 mb-2">
              <span
                className="font-mono text-[10px] w-16"
                style={{ color: t.color }}
              >
                {t.name}
              </span>
              <div className="flex-1 h-1.5 bg-[#1a0e06] rounded-sm overflow-hidden">
                <div
                  className="h-full rounded-sm"
                  style={{
                    width: `${(t.total / 7200) * 100}%`,
                    background: t.color,
                    boxShadow: `0 0 4px ${t.color}60`,
                  }}
                />
              </div>
              <span className="font-mono text-[9px] text-[#5a3828] w-10 text-right">
                {(t.total / 1000).toFixed(1)}k
              </span>
            </div>
          ))}
        </Box>
      </div>
    </div>
  );
}

/* ───────────────────── small helpers ───────────────────── */

function Badge({
  children,
  color = C.dim,
  className = "",
}: {
  children: React.ReactNode;
  color?: string;
  className?: string;
}) {
  return (
    <div
      className={`absolute bg-pixel-bg/90 border border-pixel-border rounded px-2.5 py-1 font-mono text-[9px] ${className}`}
      style={{ color }}
    >
      {children}
    </div>
  );
}

function MiniStat({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color: string;
}) {
  return (
    <div
      className="bg-pixel-bg border rounded p-2"
      style={{ borderColor: `${color}30` }}
    >
      <div className="font-mono text-[7px] tracking-widest text-[#4a2818] mb-1">
        {label}
      </div>
      <div className="font-pixel text-base font-bold" style={{ color }}>
        {value}
      </div>
    </div>
  );
}

function DashStat({
  label,
  value,
  sub,
  color,
}: {
  label: string;
  value: string;
  sub: string;
  color: string;
}) {
  return (
    <div
      className="bg-pixel-bg2 border rounded relative overflow-hidden p-4"
      style={{ borderColor: `${color}28` }}
    >
      <div
        className="absolute top-0 left-0 right-0 h-[2px] opacity-80"
        style={{
          background: `linear-gradient(90deg, transparent, ${color}, transparent)`,
        }}
      />
      <div className="font-mono text-[8px] tracking-widest text-pixel-dim mb-2">
        {label}
      </div>
      <div
        className="font-pixel text-2xl font-bold leading-tight mb-1"
        style={{ color }}
      >
        {value}
      </div>
      <div className="font-mono text-[8px] text-[#3d1a08]">{sub}</div>
    </div>
  );
}

function Box({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-pixel-bg2 border border-pixel-border rounded p-4">
      <div className="font-mono text-[8px] tracking-widest text-[#5a3020] mb-3">
        ── {title} ──
      </div>
      {children}
    </div>
  );
}
