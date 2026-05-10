// Shared pixel-world simulation utilities.
// Used by the landing-page hero preview AND the /matching dashboard.
//
// Colors are theme-aware: PIXEL_COLORS is a getter-style proxy that always
// reads the current values from the CSS custom properties on <html>. This
// means every paint call automatically picks up the active theme.

type ColorKey =
  | "bg"
  | "bg2"
  | "panel"
  | "border"
  | "dim"
  | "text"
  | "orange"
  | "gold"
  | "green"
  | "pink"
  | "blue"
  | "purple";

const FALLBACK_COLORS: Record<ColorKey, string> = {
  bg: "#0d0806",
  bg2: "#110b07",
  panel: "#160d08",
  border: "#2d1808",
  dim: "#7a5040",
  text: "#f0d0b0",
  orange: "#e8724a",
  gold: "#ffd060",
  green: "#50e890",
  pink: "#ff6090",
  blue: "#60c0ff",
  purple: "#c060ff",
};

const VAR_MAP: Record<ColorKey, string> = {
  bg: "--pixel-bg",
  bg2: "--pixel-bg2",
  panel: "--pixel-panel",
  border: "--pixel-border",
  dim: "--pixel-dim",
  text: "--pixel-text",
  orange: "--pixel-orange",
  gold: "--pixel-gold",
  green: "--pixel-green",
  pink: "--pixel-pink",
  blue: "--pixel-blue",
  purple: "--pixel-purple",
};

/**
 * Read a CSS variable that holds an "R G B" triplet and return a
 * 6-char hex string (e.g. "#e8724a"). Hex is used so existing canvas
 * code that appends an alpha hex pair (`color + "55"`) keeps working
 * across themes.
 */
export function readThemeColor(key: ColorKey): string {
  if (typeof window === "undefined" || typeof document === "undefined") {
    return FALLBACK_COLORS[key];
  }
  const triplet = getComputedStyle(document.documentElement)
    .getPropertyValue(VAR_MAP[key])
    .trim();
  if (!triplet) return FALLBACK_COLORS[key];
  const parts = triplet.split(/\s+/).map((n) => {
    const v = Math.max(0, Math.min(255, parseInt(n, 10) || 0));
    return v.toString(16).padStart(2, "0");
  });
  return `#${parts.join("")}`;
}

/**
 * Live theme-aware color object. Reading e.g. `PIXEL_COLORS.bg` always
 * returns the *current* theme value at access time.
 */
export const PIXEL_COLORS: Record<ColorKey, string> = new Proxy(
  {} as Record<ColorKey, string>,
  {
    get(_t, prop: string) {
      if ((prop as ColorKey) in VAR_MAP) {
        return readThemeColor(prop as ColorKey);
      }
      return undefined;
    },
  },
);

/**
 * Agent archetype catalog. Colors here intentionally stay as fixed hex —
 * each archetype's color is part of its identity (Optimizer = blue,
 * Creative = pink, etc.) and should read the same across themes.
 * Use `agentTypeColor(t)` if you ever need theme-aware variants.
 */
export const AGENT_TYPES = [
  { id: 0, name: "Optimizer", color: "#60c0ff", total: 5200 },
  { id: 1, name: "Creative", color: "#ff6090", total: 6100 },
  { id: 2, name: "Analyst", color: "#c060ff", total: 4800 },
  { id: 3, name: "Empath", color: "#50e890", total: 7200 },
  { id: 4, name: "Pioneer", color: "#ffd060", total: 6700 },
] as const;

export const COMPAT_FACTS = [
  "Matched on: async-first communication",
  "Shared: deep work over meetings",
  "Both reject hustle culture",
  "Humor compatibility: 91.3%",
  "Sleep schedule overlap: 94%",
  "Reading list: 7 shared titles",
  "Complementary risk tolerance",
  "Aesthetic alignment: brutalist calm",
  "Shared love: fermented foods",
  "Introvert recharge patterns match",
  "Morning person × morning person",
  "Decision style: deliberate+intuitive",
];

export const COMMENTARY = [
  "847 options evaluated in 0.3ms",
  "Attachment style: compatible",
  "Deal-breakers: 0 detected",
  "Green flags: 14 confirmed",
  "Future sim: 10,000 scenarios",
  "Value alignment: 97.2%",
  "Chemistry score: running...",
  "Red flags: none found",
  "Long-term outlook: positive",
  "Rejected 3 faster-talkers",
  'Passed the "3am call" test',
];

// Real-person English names. Used for both your agent's "scene-mate" labels
// and global match-stream entries. Kept intentionally common/easy-to-read so
// the demo feels human, not robotic.
const FIRST_NAMES = [
  "Emma",
  "Liam",
  "Sophia",
  "Noah",
  "Olivia",
  "Ethan",
  "Ava",
  "Lucas",
  "Mia",
  "Mason",
  "Isabella",
  "Logan",
  "Amelia",
  "James",
  "Harper",
  "Benjamin",
  "Evelyn",
  "Henry",
  "Charlotte",
  "Alexander",
  "Abigail",
  "Daniel",
  "Emily",
  "Michael",
  "Elizabeth",
  "Jackson",
  "Sofia",
  "Sebastian",
  "Avery",
  "Aiden",
  "Ella",
  "Matthew",
  "Madison",
  "Samuel",
  "Scarlett",
  "David",
  "Victoria",
  "Joseph",
  "Aria",
  "Carter",
  "Grace",
  "Owen",
  "Chloe",
  "Wyatt",
  "Camila",
  "John",
  "Penelope",
  "Jack",
  "Layla",
  "Luke",
];

const LAST_NAMES = [
  "Smith",
  "Johnson",
  "Williams",
  "Brown",
  "Jones",
  "Garcia",
  "Miller",
  "Davis",
  "Rodriguez",
  "Martinez",
  "Hernandez",
  "Lopez",
  "Gonzalez",
  "Wilson",
  "Anderson",
  "Thomas",
  "Taylor",
  "Moore",
  "Jackson",
  "Martin",
  "Lee",
  "Perez",
  "Thompson",
  "White",
  "Harris",
  "Sanchez",
  "Clark",
  "Ramirez",
  "Lewis",
  "Robinson",
  "Walker",
  "Young",
  "Allen",
  "King",
  "Wright",
  "Scott",
  "Torres",
  "Nguyen",
  "Hill",
  "Flores",
  "Green",
  "Adams",
  "Nelson",
  "Baker",
  "Hall",
  "Rivera",
  "Campbell",
  "Mitchell",
  "Carter",
  "Roberts",
];

function generatePersonName(seed: number): string {
  const first = FIRST_NAMES[seed % FIRST_NAMES.length]!;
  const last = LAST_NAMES[(seed * 31 + 7) % LAST_NAMES.length]!;
  // Use last-initial style ~30% of the time so the feed has rhythm:
  // "Emma S." / "Olivia Brown" / "Liam G." mixed together.
  return seed % 3 === 0 ? `${first} ${last[0]}.` : `${first} ${last}`;
}

export type AgentTraits = {
  logic: number;
  empathy: number;
  creativity: number;
  ambition: number;
  humor: number;
};

export type Agent = {
  id: number;
  isMe: boolean;
  type: (typeof AGENT_TYPES)[number];
  name: string;
  x: number;
  y: number;
  dx: number;
  dy: number;
  state: "wander" | "matched";
  matchId: number | null;
  matchTick: number;
  score: number;
  meetCount: number;
  traits: AgentTraits;
  /** Set when the agent enters the "matched" state — used so heart-clicks
   *  on the canvas can pop a reason card without joining the events list. */
  lastFact?: string;
  lastCommentary?: string;
  lastEventId?: number;
};

export type MatchEvent = {
  id: number;
  a: string;
  b: string;
  colorA: string;
  colorB: string;
  typeA: string;
  typeB: string;
  score: number;
  isMyAgent: boolean;
  fact: string;
  commentary: string;
};

const r = (n = 100) => Math.floor(Math.random() * n);
const pick = <T>(arr: readonly T[]): T => arr[r(arr.length)] as T;

let _uid = 1;

export function makeAgent(opts: {
  isMe?: boolean;
  width: number;
  height: number;
}): Agent {
  const { isMe = false, width, height } = opts;
  const t = AGENT_TYPES[r(AGENT_TYPES.length)] ?? AGENT_TYPES[0];
  const ang = Math.random() * Math.PI * 2;
  const spd = isMe ? 0.8 : 1.3;
  return {
    id: isMe ? 0 : _uid++,
    isMe,
    type: t,
    name: isMe ? "Your Agent" : generatePersonName(_uid),
    x: isMe ? width / 2 : 20 + Math.random() * (width - 40),
    y: isMe ? height / 2 : 20 + Math.random() * (height - 40),
    dx: Math.cos(ang) * spd,
    dy: Math.sin(ang) * spd,
    state: "wander",
    matchId: null,
    matchTick: 0,
    score: 0,
    meetCount: 0,
    traits: {
      logic: r(),
      empathy: r(),
      creativity: r(),
      ambition: r(),
      humor: r(),
    },
  };
}

export function compat(a: Agent, b: Agent): number {
  const keys: (keyof AgentTraits)[] = [
    "logic",
    "empathy",
    "creativity",
    "ambition",
    "humor",
  ];
  const d = keys.reduce((s, k) => s + Math.abs(a.traits[k] - b.traits[k]), 0);
  return Math.min(99, Math.max(38, Math.round(100 - d * 0.08 + r(14) - 7)));
}

export function initCompatDistribution() {
  return ["0-9", "10-19", "20-29", "30-39", "40-49", "50-59", "60-69", "70-79", "80-89", "90-100"].map(
    (range, i) => ({
      range,
      count: Math.round(
        [0.02, 0.04, 0.08, 0.12, 0.15, 0.18, 0.18, 0.13, 0.07, 0.03][i]! *
          3000 +
          r(200) -
          100,
      ),
    }),
  );
}

export function rndMatchEvent(): MatchEvent {
  const A = AGENT_TYPES[r(AGENT_TYPES.length)]!;
  let B = AGENT_TYPES[r(AGENT_TYPES.length)]!;
  if (B === A) B = AGENT_TYPES[(A.id + 1) % AGENT_TYPES.length]!;
  return {
    id: Math.random(),
    a: generatePersonName(r(10000)),
    b: generatePersonName(r(10000) + 7),
    colorA: A.color,
    colorB: B.color,
    typeA: A.name,
    typeB: B.name,
    score: 50 + r(50),
    isMyAgent: false,
    fact: pick(COMPAT_FACTS),
    commentary: pick(COMMENTARY),
  };
}
