"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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
import {
  GHOST_NORMAL,
  GHOST_WINK,
  drawGhost,
} from "@/components/pixel/PixelGhost";
import { PixelButton } from "@/components/pixel/PixelUI";
import {
  AGENT_TYPES,
  COMMENTARY,
  COMPAT_FACTS,
  PIXEL_COLORS as C,
  type Agent,
  type MatchEvent,
  compat,
  initCompatDistribution,
  makeAgent,
} from "@/lib/pixel-world";
import { api } from "@/lib/api";
import { getOrCreateAgentWallet } from "@/lib/agent-wallet";

const CW = 720;
const CH = 420;
const N = 75;
const TICK = 100;
const MATCH_LIFE = 35;
const MY_ID = 0;

type Tab = "god" | "feed" | "dash";
type Stats = {
  matched: number;
  round: number;
  progress: number;
  avgScore: number;
  rateHistory: { rate: number }[];
};

const r = (n = 100) => Math.floor(Math.random() * n);
const pick = <T,>(arr: readonly T[]): T => arr[r(arr.length)] as T;

export default function MatchingPage() {
  const [tab, setTab] = useState<Tab>("god");
  const [agents, setAgents] = useState<Agent[]>(() => {
    const arr = [makeAgent({ isMe: true, width: CW, height: CH })];
    for (let i = 1; i < N; i++)
      arr.push(makeAgent({ isMe: false, width: CW, height: CH }));
    return arr;
  });
  const [events, setEvents] = useState<MatchEvent[]>([]);
  const [stats, setStats] = useState<Stats>({
    matched: 0,
    round: 1,
    progress: 12.3,
    avgScore: 0,
    rateHistory: Array.from({ length: 24 }, () => ({ rate: 0 })),
  });
  const [dist] = useState(initCompatDistribution);
  const tickRef = useRef(0);
  const accRef = useRef({ matched: 0, scoreSum: 0, progress: 12.3 });

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

  // simulation tick
  useEffect(() => {
    const id = setInterval(() => {
      const t = ++tickRef.current;
      setAgents((prev) => {
        let next = prev.map((a) => {
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
          if (x < 16 || x > CW - 16) {
            dx = -dx;
            x = Math.max(16, Math.min(CW - 16, x));
          }
          if (y < 16 || y > CH - 16) {
            dy = -dy;
            y = Math.max(16, Math.min(CH - 16, y));
          }
          if (Math.random() < 0.015) {
            const ang = Math.random() * Math.PI * 2;
            const spd = a.isMe ? 0.8 : 1.3;
            dx = Math.cos(ang) * spd;
            dy = Math.sin(ang) * spd;
          }
          return { ...a, x, y, dx, dy };
        });

        if (t % 5 === 0) {
          const w = next.filter((a) => a.state === "wander");
          if (w.length >= 2) {
            let A: Agent | undefined;
            let B: Agent | undefined;
            const me = w.find((a) => a.isMe);
            if (me && Math.random() < 0.3) {
              A = me;
              const others = w.filter((a) => !a.isMe);
              B = pick(others);
            } else {
              const ai = r(w.length);
              let bi = ai;
              while (bi === ai) bi = r(w.length);
              A = w[ai];
              B = w[bi];
            }
            if (A && B) {
              const sc = compat(A, B);
              const isMyMatch = A.isMe || B.isMe;
              const ev: MatchEvent = {
                id: t,
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
              setEvents((prevEv) => [ev, ...prevEv.slice(0, 39)]);
              accRef.current.matched++;
              accRef.current.scoreSum += sc;
              accRef.current.progress = Math.min(
                100,
                12.3 + accRef.current.matched * 0.4,
              );
              setStats((prev) => ({
                ...prev,
                matched: accRef.current.matched,
                avgScore: Math.round(
                  accRef.current.scoreSum / accRef.current.matched,
                ),
                progress: accRef.current.progress,
                round:
                  accRef.current.progress >= 50 ? 2 : 1,
                rateHistory: [
                  ...prev.rateHistory.slice(1),
                  { rate: accRef.current.matched },
                ],
              }));
              next = next.map((a) => {
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
        return next;
      });
    }, TICK);
    return () => clearInterval(id);
  }, []);

  const myAgent = agents.find((a) => a.isMe);
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
      {tab === "god" && (
        <GodView
          agents={agents}
          events={events}
          stats={stats}
          myAgent={myAgent}
        />
      )}
      {tab === "feed" && <LiveFeed events={events} myAgent={myAgent} />}
      {tab === "dash" && (
        <Dashboard stats={stats} dist={dist} events={events} />
      )}

      {/* CTA when complete */}
      {isComplete && (
        <div className="fixed bottom-6 right-6">
          <Link href={`/candidates?session=${sessionId}`}>
            <PixelButton>See your top 10 →</PixelButton>
          </Link>
        </div>
      )}
    </div>
  );
}

/* ───────────────────── GOD VIEW ───────────────────── */
function GodView({
  agents,
  events,
  stats,
  myAgent,
}: {
  agents: Agent[];
  events: MatchEvent[];
  stats: Stats;
  myAgent: Agent | undefined;
}) {
  const cvs = useRef<HTMLCanvasElement | null>(null);
  const aRef = useRef(agents);
  const fRef = useRef(0);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    aRef.current = agents;
  });

  useEffect(() => {
    const ctx = cvs.current?.getContext("2d");
    if (!ctx) return;
    const loop = () => {
      drawWorld(ctx, aRef.current, fRef.current++);
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px]" style={{ height: "calc(100vh - 64px)" }}>
      <div className="relative overflow-hidden border-r border-pixel-border">
        <canvas
          ref={cvs}
          width={CW}
          height={CH}
          className="block w-full h-full pixelated"
        />
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
            <div
              key={ev.id}
              className="px-3 py-1.5 border-b border-[#130908] transition"
              style={{
                opacity: Math.max(0.2, 1 - i * 0.032),
                background: ev.isMyAgent ? "rgba(255,208,96,.05)" : "transparent",
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
            </div>
          ))}
        </div>
      </aside>
    </div>
  );
}

/* ───────────────────── LIVE FEED ───────────────────── */
function LiveFeed({
  events,
  myAgent,
}: {
  events: MatchEvent[];
  myAgent: Agent | undefined;
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
          <div
            key={ev.id}
            className="bg-pixel-bg2 border rounded p-3 mb-1.5"
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
          </div>
        ))}
      </div>

      {/* global stream */}
      <div className="flex-1">
        <p className="font-mono text-[9px] tracking-widest text-pixel-orange mb-3.5">
          ── GLOBAL MATCH STREAM ──
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {events.slice(0, 18).map((ev) => (
            <div
              key={ev.id}
              className="bg-pixel-bg2 border rounded p-3"
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
            </div>
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

/* ───────────────────── canvas world drawing ───────────────────── */
function drawWorld(
  ctx: CanvasRenderingContext2D,
  agents: Agent[],
  frame: number,
) {
  ctx.fillStyle = C.bg;
  ctx.fillRect(0, 0, CW, CH);
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
  for (let i = 0; i < 40; i++) {
    const sx = (i * 137.508 + 23) % CW | 0;
    const sy = (i * 97.314 + 17) % CH | 0;
    const blink = Math.sin(frame * 0.04 + i * 1.73) > 0.15;
    if (!blink) continue;
    const sc = C.orange + (i % 3 === 0 ? "55" : i % 3 === 1 ? "40" : "30");
    ctx.fillStyle = sc;
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
  ctx.fillStyle = "rgba(0,0,0,.04)";
  for (let y = 0; y < CH; y += 2) ctx.fillRect(0, y, CW, 1);
  // unused vars for type checking
  void MY_ID;
}
