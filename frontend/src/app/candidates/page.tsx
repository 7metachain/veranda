"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { PixelGhost } from "@/components/pixel/PixelGhost";
import {
  PixelButton,
  PixelDivider,
  PixelPanel,
} from "@/components/pixel/PixelUI";
import { api, type CandidateBrief } from "@/lib/api";
import {
  unlockDatingAddress,
  type DatingAddressUnlock,
} from "@/lib/dating";

/* ─────────── shared mock data (kept self-contained) ─────────── */

const MOCK_TEASERS = [
  "Loves cooking weeknight pasta from scratch.",
  "Travels with one carry-on; reads on planes.",
  "Family-first; weekly Sunday dinners are sacred.",
  "Mediates in disagreements; rarely raises voice.",
  "Coffee snob. Knows every cafe within walking distance.",
  "Reads two books a month, mostly fiction.",
  "Climbs on weekends; runs sub-25 5Ks.",
  "Hosts board game nights. Plays to win.",
  "Worked overseas; speaks three languages.",
  "Volunteers at the animal shelter every Saturday.",
  "Plays piano badly but enthusiastically.",
  "Makes playlists for every mood.",
  "Grows herbs on a tiny balcony.",
  "Watches documentaries on repeat.",
  "Journals every morning before coffee.",
];

const MOCK_NAMES = [
  "Emma Johnson",
  "Liam Garcia",
  "Sophia M.",
  "Noah Williams",
  "Olivia Brown",
  "Ethan K.",
  "Ava Davis",
  "Lucas Martinez",
  "Mia R.",
  "Mason Taylor",
  "Isabella Lee",
  "Logan W.",
  "Amelia Walker",
  "James Allen",
  "Harper N.",
];

const TIER_CANDIDATE_LIMITS: Record<string, number> = {
  starter: 5,
  core: 10,
  premier: 15,
  patron: 15,
};

type DialogueMessage = {
  id: number;
  sender: "my_agent" | "their_agent" | "system";
  text: string;
  timestamp: string;
  emotion?: string;
};

const MOCK_DIALOGUE: DialogueMessage[] = [
  { id: 1, sender: "system", text: "Scene: A small bistro on a quiet Tuesday evening. Both agents arrive.", timestamp: "19:00" },
  { id: 2, sender: "my_agent", text: "I picked the corner booth — less noise, more space to actually talk.", timestamp: "19:02", emotion: "calm" },
  { id: 3, sender: "their_agent", text: "Good call. I was going to suggest the same one. The window table looked too exposed.", timestamp: "19:02", emotion: "approving" },
  { id: 4, sender: "my_agent", text: "Do you want to split a starter? The burrata here is supposedly unreal.", timestamp: "19:05", emotion: "curious" },
  { id: 5, sender: "their_agent", text: "Already reading my mind. I'll handle dessert selection — deal?", timestamp: "19:05", emotion: "playful" },
  { id: 6, sender: "system", text: "Compatibility signal: collaborative decision-making detected.", timestamp: "19:06" },
  { id: 7, sender: "my_agent", text: "So what's the thing you do that nobody knows about?", timestamp: "19:12", emotion: "direct" },
  { id: 8, sender: "their_agent", text: "I keep a spreadsheet of every sunset I've watched. Most cells are empty.", timestamp: "19:13", emotion: "vulnerable" },
  { id: 9, sender: "my_agent", text: "That's not weird. That's a person who pays attention.", timestamp: "19:13", emotion: "warm" },
  { id: 10, sender: "their_agent", text: "You didn't flinch at that. Most people laugh.", timestamp: "19:14", emotion: "surprised" },
  { id: 11, sender: "system", text: "Vulnerability exchange successful · Empathy index: 94%.", timestamp: "19:14" },
  { id: 12, sender: "my_agent", text: "Tell me the last thing that genuinely made you lose track of time.", timestamp: "19:20", emotion: "engaged" },
  { id: 13, sender: "their_agent", text: "Building a shelf from reclaimed wood. Six hours gone. The shelf is crooked but I love it.", timestamp: "19:21", emotion: "passionate" },
  { id: 14, sender: "my_agent", text: "We're the same kind of obsessive. That's either great or terrifying.", timestamp: "19:22", emotion: "amused" },
  { id: 15, sender: "system", text: "Simulation complete. Outcome: COMPATIBLE.", timestamp: "22:30" },
];

const EMOTION_COLORS: Record<string, string> = {
  calm: "#60c0ff",
  approving: "#50e890",
  curious: "#ffd060",
  playful: "#ff6090",
  direct: "#e8724a",
  vulnerable: "#c060ff",
  warm: "#50e890",
  surprised: "#ffd060",
  engaged: "#60c0ff",
  passionate: "#e8724a",
  amused: "#50e890",
};

/* ─────────── helpers ─────────── */

function buildMockCandidates(count: number): CandidateBrief[] {
  return Array.from({ length: count }).map((_, i) => ({
    index: i,
    score: 9500 - i * 260 - Math.floor(Math.random() * 80),
    teaser: MOCK_TEASERS[i % MOCK_TEASERS.length]!,
    agent_wallet: `MockCandidateAgent${String(i).padStart(2, "0")}1111111111111111111`,
  }));
}

function nameForIndex(i: number) {
  return MOCK_NAMES[i % MOCK_NAMES.length]!;
}

/* ─────────── PAGE ─────────── */

function CandidatesPageInner() {
  const params = useSearchParams();
  const sessionId = params.get("session");

  const [candidates, setCandidates] = useState<CandidateBrief[]>([]);
  const [mockMode, setMockMode] = useState(false);
  const [tier, setTier] = useState<string>("core");
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);

  // Read tier from localStorage.
  useEffect(() => {
    const saved = localStorage.getItem("veranda:tier");
    if (saved) setTier(saved);
  }, []);

  const maxCandidates = TIER_CANDIDATE_LIMITS[tier] ?? 10;

  // Backend fetch + immediately seed from any live top-matches the
  // matching page already produced, so this page renders something
  // the moment the user navigates here (no waiting on the round to
  // finish).
  useEffect(() => {
    if (!sessionId) return;
    let cancelled = false;

    // 1. seed from local cache so the left list isn't empty on arrival.
    try {
      const raw = localStorage.getItem("veranda:top_matches");
      if (raw) {
        const arr = JSON.parse(raw) as Array<{
          id: number;
          name: string;
          color: string;
          score: number;
          fact: string;
          commentary: string;
        }>;
        if (arr.length) {
          const seeded: CandidateBrief[] = arr.map((m, i) => ({
            index: i,
            score: m.score * 100,
            teaser: m.fact,
            agent_wallet: `MockTopMatch${String(i).padStart(2, "0")}xxxxxxxxxxxxxxxxxxxxxxx`,
          }));
          setCandidates(seeded.slice(0, maxCandidates));
          setMockMode(true);
        }
      }
    } catch {
      /* ignore */
    }

    // 2. then try the backend; replace if it returns real data.
    (async () => {
      try {
        const r = await api.candidates(sessionId);
        if (cancelled) return;
        if (r.candidates.length === 0) {
          setMockMode(true);
          // Only synthesize if we still have nothing useful.
          setCandidates((prev) =>
            prev.length > 0 ? prev : buildMockCandidates(maxCandidates),
          );
        } else {
          setMockMode(false);
          setCandidates(r.candidates.slice(0, maxCandidates));
        }
      } catch {
        if (cancelled) return;
        setMockMode(true);
        setCandidates((prev) =>
          prev.length > 0 ? prev : buildMockCandidates(maxCandidates),
        );
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [sessionId, maxCandidates]);

  // Live "still cooking" feel: while the page is open, occasionally
  // pull fresh top-matches from localStorage so users see the list
  // grow even after the matching page has been navigated away.
  useEffect(() => {
    if (!sessionId) return;
    const interval = setInterval(() => {
      try {
        const raw = localStorage.getItem("veranda:top_matches");
        if (!raw) return;
        const arr = JSON.parse(raw) as Array<{
          name: string;
          score: number;
          fact: string;
        }>;
        if (!arr.length) return;
        setCandidates((prev) => {
          // If backend already returned real data with names, leave it.
          if (!mockMode) return prev;
          const seeded: CandidateBrief[] = arr.map((m, i) => ({
            index: i,
            score: m.score * 100,
            teaser: m.fact,
            agent_wallet: `MockTopMatch${String(i).padStart(2, "0")}xxxxxxxxxxxxxxxxxxxxxxx`,
          }));
          return seeded.slice(0, maxCandidates);
        });
      } catch {
        /* ignore */
      }
    }, 1500);
    return () => clearInterval(interval);
  }, [sessionId, maxCandidates, mockMode]);

  const selectedCandidate =
    selectedIdx == null
      ? null
      : candidates.find((c) => c.index === selectedIdx) ?? null;

  if (!sessionId)
    return (
      <main className="p-12 font-mono text-pixel-orange">
        Missing session id.
      </main>
    );

  return (
    <main className="min-h-screen pixel-grid-bg flex flex-col">
      {/* HEADER */}
      <div className="border-b border-pixel-border bg-pixel-bg2/60 shrink-0">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <PixelGhost color="#ffd060" scale={3} floaty />
            <div>
              <p className="font-mono text-[9px] tracking-[0.4em] text-pixel-dim">
                ROUND 2 · TOP MATCHES + LIVE SIMULATION
              </p>
              <p className="font-pixel text-2xl text-pixel-gold leading-none">
                PICK A CANDIDATE · WATCH THE LOVE SIMULATION
              </p>
            </div>
          </div>
          <div className="flex flex-col items-end gap-1">
            <span className="font-mono text-[9px] tracking-[0.4em] text-pixel-dim">
              TIER
            </span>
            <span className="font-mono text-[11px] px-2 py-1 border border-pixel-border rounded text-pixel-orange uppercase">
              {tier} · up to {maxCandidates} candidates
            </span>
          </div>
        </div>
      </div>

      {/* SPLIT LAYOUT */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-[420px_1fr] min-h-0">
        {/* LEFT: live candidates list */}
        <aside className="border-r border-pixel-border overflow-y-auto bg-pixel-bg2/30">
          <div className="px-4 py-3 border-b border-pixel-border flex items-center justify-between">
            <span className="font-mono text-[9px] tracking-[0.3em] text-pixel-dim">
              ── TOP MATCHES · LIVE ──
            </span>
            <span className="font-mono text-[10px] text-pixel-orange">
              {candidates.length} / {maxCandidates}
            </span>
          </div>
          {mockMode && (
            <div className="px-4 py-2 border-b border-pixel-border font-mono text-[10px] text-pixel-dim">
              Backend offline — showing live mock matches.
            </div>
          )}
          {candidates.length === 0 && (
            <div className="px-4 py-8 text-center font-mono text-[11px] text-pixel-dim">
              Your agent is still scoring candidates…
            </div>
          )}
          <div className="p-2 space-y-2">
            {candidates.map((c, i) => (
              <CandidateRow
                key={c.index}
                candidate={c}
                rank={i}
                selected={selectedIdx === c.index}
                onClick={() => setSelectedIdx(c.index)}
              />
            ))}
          </div>
        </aside>

        {/* RIGHT: simulation / results */}
        <section className="overflow-y-auto">
          {selectedCandidate ? (
            <SimulationPane
              key={selectedCandidate.index}
              candidate={selectedCandidate}
              sessionId={sessionId}
            />
          ) : (
            <EmptySimulationPane hasAny={candidates.length > 0} />
          )}
        </section>
      </div>
    </main>
  );
}

/* ─────────── candidate row (left list) ─────────── */

const PALETTE = ["#ffd060", "#50e890", "#ff6090", "#60c0ff", "#c060ff", "#e8724a"];

function CandidateRow({
  candidate,
  rank,
  selected,
  onClick,
}: {
  candidate: CandidateBrief;
  rank: number;
  selected: boolean;
  onClick: () => void;
}) {
  const pct = (candidate.score / 100).toFixed(1);
  const color = PALETTE[candidate.index % PALETTE.length] ?? "#ffd060";
  const grade =
    candidate.score >= 9000
      ? "S+"
      : candidate.score >= 8500
        ? "S"
        : candidate.score >= 8000
          ? "A+"
          : "A";
  const name = nameForIndex(candidate.index);
  return (
    <button
      onClick={onClick}
      className={`w-full text-left bg-pixel-bg2 border-2 rounded-md p-3 transition-all relative overflow-hidden ${
        selected ? "shadow-pixel-glow" : "hover:bg-pixel-bg2/80"
      }`}
      style={{
        borderColor: selected ? color : "var(--pixel-border)",
        color,
      }}
    >
      <div
        className="absolute top-0 left-0 right-0 h-[2px]"
        style={{
          background: `linear-gradient(90deg, transparent, ${color}, transparent)`,
        }}
      />
      <div className="flex items-center gap-3">
        <PixelGhost color={color} scale={3} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <span className="font-pixel text-[15px] truncate" style={{ color }}>
              #{String(rank + 1).padStart(2, "0")} · {name}
            </span>
            <span className="font-pixel text-base shrink-0" style={{ color }}>
              {grade}
            </span>
          </div>
          <p className="font-mono text-[11px] text-pixel-text/70 truncate mt-1">
            {candidate.teaser}
          </p>
          <div className="flex items-center justify-between mt-1.5">
            <span className="font-pixel text-xl" style={{ color }}>
              {pct}%
            </span>
            <span
              className={`font-mono text-[9px] tracking-widest ${
                selected ? "text-pixel-gold" : "text-pixel-dim"
              }`}
            >
              {selected ? "▸ SIMULATING" : "▸ START LOVE SIMULATION"}
            </span>
          </div>
        </div>
      </div>
    </button>
  );
}

/* ─────────── empty state ─────────── */

function EmptySimulationPane({ hasAny }: { hasAny: boolean }) {
  return (
    <div className="h-full flex items-center justify-center p-10">
      <div className="text-center max-w-md space-y-3">
        <PixelGhost color="#ffd060" scale={5} floaty />
        <p className="font-pixel text-2xl text-pixel-text">
          {hasAny
            ? "Pick a candidate to start the love simulation."
            : "Waiting for top matches to arrive…"}
        </p>
        <p className="font-mono text-[12px] text-pixel-dim">
          Tap any card on the left. Their agent dialogue will play out here in
          real time.
        </p>
      </div>
    </div>
  );
}

/* ─────────── simulation pane (right) ─────────── */

type SimPhase = "playing" | "complete";

function SimulationPane({
  candidate,
  sessionId,
}: {
  candidate: CandidateBrief;
  sessionId: string;
}) {
  const [messages, setMessages] = useState<DialogueMessage[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [phase, setPhase] = useState<SimPhase>("playing");
  const [showRecommendation, setShowRecommendation] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const allDialogue = MOCK_DIALOGUE;

  useEffect(() => {
    setMessages([]);
    setCurrentIndex(0);
    setPhase("playing");
    setShowRecommendation(false);
  }, [candidate.index]);

  useEffect(() => {
    if (currentIndex >= allDialogue.length) {
      setPhase("complete");
      return;
    }
    const msg = allDialogue[currentIndex];
    const delay = msg?.sender === "system" ? 1400 : 900 + Math.random() * 600;
    const timer = setTimeout(() => {
      setMessages((prev) => [...prev, allDialogue[currentIndex]!]);
      setCurrentIndex((i) => i + 1);
    }, delay);
    return () => clearTimeout(timer);
  }, [currentIndex, allDialogue]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Auto-advance to recommendation page when simulation completes.
  useEffect(() => {
    if (phase !== "complete") return;
    const timer = setTimeout(() => setShowRecommendation(true), 1200);
    return () => clearTimeout(timer);
  }, [phase]);

  const compat = (candidate.score / 100).toFixed(1);
  const progress = currentIndex / allDialogue.length;
  // Bias the recommendation to the score: ≥ 75% → recommended.
  const recommended = candidate.score / 100 >= 75;

  if (showRecommendation) {
    return (
      <RecommendationPane
        candidate={candidate}
        recommended={recommended}
        sessionId={sessionId}
        onReplay={() => {
          setMessages([]);
          setCurrentIndex(0);
          setPhase("playing");
          setShowRecommendation(false);
        }}
      />
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* sub-header */}
      <div className="border-b border-pixel-border bg-pixel-bg2/60 shrink-0 px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <PixelGhost color="#ffd060" scale={3} floaty />
          <div>
            <p className="font-mono text-[9px] tracking-[0.4em] text-pixel-dim">
              LOVE SIMULATION · AGENT DIALOGUE
            </p>
            <p className="font-pixel text-xl text-pixel-gold leading-none">
              {nameForIndex(candidate.index)} · {compat}%
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {phase === "playing" && (
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-pixel-green animate-livePulse" />
              <span className="font-mono text-[9px] text-pixel-green tracking-widest">
                LIVE
              </span>
            </div>
          )}
          <div className="text-right">
            <p className="font-mono text-[8px] text-pixel-dim">
              {Math.round(progress * 100)}% complete
            </p>
            <div className="w-24 h-1.5 bg-pixel-bg2 rounded-sm overflow-hidden mt-0.5">
              <div
                className="h-full rounded-sm transition-[width] duration-500"
                style={{
                  width: `${progress * 100}%`,
                  background: "linear-gradient(90deg, #e8724a, #ffd060)",
                }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* agents row */}
      <div className="px-6 py-3 grid grid-cols-2 gap-3 shrink-0">
        <div className="bg-pixel-bg2 border border-pixel-border rounded-md p-2.5 flex items-center gap-3">
          <PixelGhost color="#ffd060" scale={2} />
          <div>
            <p className="font-mono text-[9px] tracking-[0.3em] text-pixel-gold">
              YOUR AGENT
            </p>
            <p className="font-mono text-[10px] text-pixel-dim">
              Encrypted preferences
            </p>
          </div>
        </div>
        <div className="bg-pixel-bg2 border border-pixel-border rounded-md p-2.5 flex items-center gap-3">
          <PixelGhost color="#ff6090" scale={2} />
          <div>
            <p className="font-mono text-[9px] tracking-[0.3em] text-pixel-pink">
              {nameForIndex(candidate.index).toUpperCase()}
            </p>
            <p className="font-mono text-[10px] text-pixel-dim">
              Candidate #{(candidate.index + 1).toString().padStart(2, "0")}
            </p>
          </div>
        </div>
      </div>

      {/* chat */}
      <div className="flex-1 overflow-y-auto px-6 pb-4 min-h-0">
        <div className="space-y-3">
          {messages.map((msg) => (
            <ChatBubble key={msg.id} message={msg} />
          ))}
          {phase === "playing" && (
            <div className="flex items-center gap-2 py-2">
              <span className="w-1.5 h-1.5 rounded-full bg-pixel-orange animate-livePulse" />
              <span className="font-mono text-[10px] text-pixel-dim">
                {allDialogue[currentIndex]?.sender === "my_agent"
                  ? "Your agent is composing..."
                  : allDialogue[currentIndex]?.sender === "their_agent"
                    ? "Their agent is responding..."
                    : "System analyzing..."}
              </span>
            </div>
          )}
          <div ref={chatEndRef} />
        </div>
      </div>

      {/* footer */}
      <div className="border-t border-pixel-border bg-pixel-bg2/80 shrink-0 px-6 py-3 flex items-center justify-between">
        <p className="font-mono text-[10px] text-pixel-dim">
          Observing your agent's dialogue in real-time. No PII is exchanged.
        </p>
        <span className="font-mono text-[10px] text-pixel-orange">
          {currentIndex} / {allDialogue.length} exchanges
        </span>
      </div>
    </div>
  );
}

function ChatBubble({ message }: { message: DialogueMessage }) {
  if (message.sender === "system") {
    return (
      <div className="flex justify-center">
        <div className="bg-pixel-bg2 border border-pixel-border rounded px-4 py-2 max-w-lg">
          <p className="font-mono text-[9px] tracking-[0.3em] text-pixel-dim text-center mb-1">
            ── SYSTEM ──
          </p>
          <p className="font-mono text-[10px] text-pixel-orange text-center">
            {message.text}
          </p>
          <p className="font-mono text-[8px] text-pixel-dim text-center mt-1">
            {message.timestamp}
          </p>
        </div>
      </div>
    );
  }

  const isMe = message.sender === "my_agent";
  const color = isMe ? "#ffd060" : "#ff6090";
  const emotionColor = message.emotion
    ? EMOTION_COLORS[message.emotion] ?? "#ffd060"
    : undefined;

  return (
    <div className={`flex ${isMe ? "justify-start" : "justify-end"}`}>
      <div
        className={`flex items-start gap-2.5 max-w-[80%] ${isMe ? "flex-row" : "flex-row-reverse"}`}
      >
        <div className="shrink-0 pt-1">
          <PixelGhost color={color} scale={2} />
        </div>
        <div>
          <div
            className={`flex items-center gap-2 mb-1 ${isMe ? "" : "justify-end"}`}
          >
            <span
              className="font-mono text-[8px] tracking-[0.3em] uppercase"
              style={{ color }}
            >
              {isMe ? "YOUR AGENT" : "THEIR AGENT"}
            </span>
            <span className="font-mono text-[8px] text-pixel-dim">
              {message.timestamp}
            </span>
          </div>
          <div
            className="border rounded-md px-3 py-2"
            style={{
              borderColor: `${color}40`,
              background: `${color}08`,
            }}
          >
            <p className="font-mono text-[12px] text-pixel-text/90 leading-relaxed">
              {message.text}
            </p>
          </div>
          {message.emotion && (
            <div className={`mt-1 ${isMe ? "" : "text-right"}`}>
              <span
                className="font-mono text-[8px] px-1.5 py-0.5 rounded border"
                style={{
                  color: emotionColor,
                  borderColor: `${emotionColor}40`,
                }}
              >
                {message.emotion}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─────────── recommendation pane (post-simulation) ─────────── */

function RecommendationPane({
  candidate,
  recommended,
  sessionId,
  onReplay,
}: {
  candidate: CandidateBrief;
  recommended: boolean;
  sessionId: string;
  onReplay: () => void;
}) {
  const [unlock, setUnlock] = useState<DatingAddressUnlock | null>(null);
  const [paying, setPaying] = useState(false);
  const compat = (candidate.score / 100).toFixed(1);
  const name = nameForIndex(candidate.index);

  const handlePay = async () => {
    if (paying || unlock) return;
    setPaying(true);
    try {
      const res = await unlockDatingAddress({
        sessionId,
        candidateIndex: candidate.index,
        candidateName: name,
      });
      setUnlock(res);
    } finally {
      setPaying(false);
    }
  };

  return (
    <div className="h-full overflow-y-auto p-6">
      <div className="max-w-xl mx-auto space-y-5">
        <PixelPanel
          title={recommended ? "AI RECOMMENDS DATING" : "AI DOES NOT RECOMMEND"}
          accent={recommended ? "#50e890" : "#ff6090"}
        >
          <div className="grid sm:grid-cols-[auto_1fr] gap-5 items-center">
            <div className="flex flex-col items-center gap-2">
              <PixelGhost color={recommended ? "#50e890" : "#ff6090"} scale={5} />
              <span
                className={`font-pixel text-3xl ${
                  recommended ? "text-pixel-green" : "text-pixel-pink"
                }`}
              >
                {recommended ? "♥" : "✕"}
              </span>
            </div>
            <div className="space-y-2">
              <p className="font-mono text-[10px] tracking-[0.4em] text-pixel-dim">
                {nameForIndex(candidate.index).toUpperCase()} · CANDIDATE #
                {(candidate.index + 1).toString().padStart(2, "0")}
              </p>
              <p className="font-pixel text-4xl text-pixel-gold leading-none">
                {compat}%
              </p>
              <p className="font-mono text-[12px] text-pixel-text/80">
                {candidate.teaser}
              </p>
            </div>
          </div>
          <PixelDivider
            label={recommended ? "WHY IT WORKS" : "WHY IT MISSES"}
          />
          {recommended ? (
            <ul className="space-y-1.5">
              <li className="font-mono text-[11px] text-pixel-text/80 flex gap-2">
                <span className="text-pixel-green">▸</span>
                Empathy index hit 94% during vulnerability exchange.
              </li>
              <li className="font-mono text-[11px] text-pixel-text/80 flex gap-2">
                <span className="text-pixel-green">▸</span>
                Both agents defer on small decisions without friction.
              </li>
              <li className="font-mono text-[11px] text-pixel-text/80 flex gap-2">
                <span className="text-pixel-green">▸</span>
                Humor sync was 96% — they laugh at the same beats.
              </li>
              <li className="font-mono text-[11px] text-pixel-text/80 flex gap-2">
                <span className="text-pixel-green">▸</span>
                Long-term outlook: positive. Worth meeting in person.
              </li>
            </ul>
          ) : (
            <ul className="space-y-1.5">
              <li className="font-mono text-[11px] text-pixel-text/80 flex gap-2">
                <span className="text-pixel-pink">▸</span>
                Communication cadence mismatch — different pacing.
              </li>
              <li className="font-mono text-[11px] text-pixel-text/80 flex gap-2">
                <span className="text-pixel-pink">▸</span>
                Long-term priority vectors diverged on 2/5 axes.
              </li>
              <li className="font-mono text-[11px] text-pixel-text/80 flex gap-2">
                <span className="text-pixel-pink">▸</span>
                Emotional safety threshold not reached during scene.
              </li>
            </ul>
          )}
        </PixelPanel>

        {/* Paywall — only on recommended path */}
        {recommended && !unlock && (
          <PixelPanel title="UNLOCK DATING ADDRESS" accent="#ffd060">
            <div className="space-y-3">
              <p className="font-mono text-[12px] text-pixel-text/80">
                Pay to reveal {name}'s contact info so you can actually meet
                up. Their agent agreed in-simulation; the address stays hidden
                until you pay.
              </p>
              <div className="bg-pixel-bg border border-pixel-border rounded p-3 flex items-center justify-between">
                <div>
                  <p className="font-mono text-[10px] tracking-[0.3em] text-pixel-dim">
                    REVEAL FEE
                  </p>
                  <p className="font-pixel text-2xl text-pixel-gold leading-none mt-1">
                    0.01 SOL
                  </p>
                  <p className="font-mono text-[9px] text-pixel-dim mt-1">
                    Mock payment for demo · non-refundable
                  </p>
                </div>
                <PixelButton onClick={handlePay} disabled={paying}>
                  {paying ? "Unlocking…" : "Pay & reveal address →"}
                </PixelButton>
              </div>
              <p className="font-mono text-[10px] text-pixel-dim text-center">
                Real payment integration is wired through{" "}
                <span className="text-pixel-gold">unlockDatingAddress()</span>
                {" "}— swap in the real disclosure component to switch.
              </p>
            </div>
          </PixelPanel>
        )}

        {/* Unlocked address card */}
        {unlock && (
          <PixelPanel title="ADDRESS UNLOCKED" accent="#50e890">
            <div className="space-y-3">
              <div className="grid sm:grid-cols-[auto_1fr] gap-4 items-start">
                <PixelGhost color="#50e890" scale={5} />
                <div>
                  <p className="font-pixel text-3xl text-pixel-text leading-none">
                    {unlock.displayName}
                  </p>
                  <p className="font-mono text-[12px] text-pixel-dim mt-1">
                    Suggested first meet
                  </p>
                </div>
              </div>
              <PixelDivider label="DATING ADDRESS" />
              <div className="bg-pixel-bg border border-pixel-border rounded p-3 space-y-1.5">
                <p className="font-mono text-[12px] text-pixel-gold">
                  {unlock.venue}
                </p>
                <p className="font-mono text-[11px] text-pixel-text/80">
                  {unlock.address}
                </p>
                <p className="font-mono text-[10px] text-pixel-dim">
                  Suggested time · {unlock.suggestedTime}
                </p>
              </div>
              <PixelDivider label="CONTACT" />
              <div className="bg-pixel-bg border border-pixel-border rounded p-3 grid sm:grid-cols-2 gap-2">
                <div>
                  <p className="font-mono text-[9px] tracking-[0.3em] text-pixel-dim">
                    HANDLE
                  </p>
                  <p className="font-mono text-[12px] text-pixel-text">
                    {unlock.handle}
                  </p>
                </div>
                <div>
                  <p className="font-mono text-[9px] tracking-[0.3em] text-pixel-dim">
                    AGENT WALLET
                  </p>
                  <p className="font-mono text-[10px] text-pixel-text/80 break-all">
                    {candidate.agent_wallet}
                  </p>
                </div>
              </div>
              <p className="font-mono text-[10px] text-pixel-green text-center">
                Both agents have agreed. Have fun — be safe.
              </p>
            </div>
          </PixelPanel>
        )}

        {!recommended && (
          <PixelPanel title="WHAT NOW" accent="#ff6090">
            <p className="font-mono text-[12px] text-pixel-text/80">
              The simulation flagged this pairing as low-fit. Pick another
              candidate from the list — your agent is still scoring more.
            </p>
          </PixelPanel>
        )}

        <div className="flex flex-wrap gap-3 justify-between">
          <PixelButton variant="ghost" onClick={onReplay}>
            ↻ Replay this simulation
          </PixelButton>
          <span className="font-mono text-[10px] text-pixel-dim">
            Pick another candidate from the list to start a new one →
          </span>
        </div>
      </div>
    </div>
  );
}

/* ─────────── default export ─────────── */

export default function CandidatesPage() {
  return (
    <Suspense
      fallback={
        <main className="p-12 font-mono text-pixel-orange">Loading...</main>
      }
    >
      <CandidatesPageInner />
    </Suspense>
  );
}
