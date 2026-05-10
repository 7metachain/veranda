"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  PixelDiningScene,
  type ScenarioChoice,
} from "@/components/pixel/PixelDiningScene";
import { PixelGhost } from "@/components/pixel/PixelGhost";
import {
  PixelButton,
  PixelDivider,
  PixelPanel,
} from "@/components/pixel/PixelUI";

type Stage = "scene" | "profile" | "review";

type Profile = {
  display_name: string;
  age: string;
  pronouns: string;
  city: string;
  bio: string;
  vibes: string[];
};

const VIBES = [
  "deep-talker",
  "weeknight-cook",
  "weekend-runner",
  "art-house",
  "tech-builder",
  "outdoorsy",
  "homebody",
  "night-owl",
  "early-bird",
  "wordy",
  "wandering",
  "quiet-luxury",
];

const TRAITS = ["logic", "empathy", "creativity", "ambition", "humor"] as const;

export default function OnboardingPage() {
  const router = useRouter();
  const [stage, setStage] = useState<Stage>("scene");
  const [choices, setChoices] = useState<ScenarioChoice[]>([]);
  const [traits, setTraits] = useState<Record<(typeof TRAITS)[number], number> | null>(
    null,
  );
  const [profile, setProfile] = useState<Profile>({
    display_name: "",
    age: "",
    pronouns: "",
    city: "",
    bio: "",
    vibes: [],
  });

  const tags = useMemo(() => choices.map((c) => c.tag), [choices]);

  const handleSceneDone = (r: {
    choices: ScenarioChoice[];
    traits: Record<(typeof TRAITS)[number], number>;
  }) => {
    setChoices(r.choices);
    setTraits(r.traits);
    setStage("profile");
  };

  const toggleVibe = (v: string) => {
    setProfile((p) => ({
      ...p,
      vibes: p.vibes.includes(v)
        ? p.vibes.filter((x) => x !== v)
        : p.vibes.length < 6
          ? [...p.vibes, v]
          : p.vibes,
    }));
  };

  // Soft validation — used only to show hints, never to block the Review button.
  const profileValid =
    profile.display_name.trim().length >= 1 ||
    profile.bio.trim().length >= 1 ||
    profile.vibes.length >= 1;

  const handleSubmit = () => {
    const payload = {
      profile,
      tags,
      traits,
      choices: choices.map((c) => ({ id: c.id, label: c.label, tag: c.tag })),
      scenario: "casual_dining",
      created_at: new Date().toISOString(),
    };
    localStorage.setItem("veranda:profile", JSON.stringify(payload));
    localStorage.setItem(
      "veranda:selected_scenarios",
      JSON.stringify(["casual_dining"]),
    );
    router.push("/deposit");
  };

  return (
    <main className="min-h-screen pixel-grid-bg">
      <Header stage={stage} />

      <div className="max-w-3xl mx-auto px-6 py-10 space-y-8">
        {stage === "scene" && (
          <>
            <Intro />
            <PixelDiningScene onComplete={handleSceneDone} />
          </>
        )}

        {stage === "profile" && (
          <>
            <ChoicesRecap choices={choices} traits={traits} />
            <PixelPanel title="UPLOAD YOUR DETAILS" accent="#ffd060">
              <p className="font-mono text-[11px] text-pixel-dim mb-4">
                ▸ Type your own info below. The grey text is just an example —
                tap each field and replace it.
              </p>
              <div className="grid sm:grid-cols-2 gap-4">
                <Field
                  label="Display name"
                  required
                  value={profile.display_name}
                  onChange={(v) =>
                    setProfile((p) => ({ ...p, display_name: v }))
                  }
                  placeholder="e.g. Aria"
                />
                <Field
                  label="Age"
                  value={profile.age}
                  onChange={(v) => setProfile((p) => ({ ...p, age: v }))}
                  placeholder="e.g. 29"
                />
                <Field
                  label="Pronouns"
                  value={profile.pronouns}
                  onChange={(v) => setProfile((p) => ({ ...p, pronouns: v }))}
                  placeholder="e.g. she/her"
                />
                <Field
                  label="City"
                  value={profile.city}
                  onChange={(v) => setProfile((p) => ({ ...p, city: v }))}
                  placeholder="e.g. Lisbon"
                />
              </div>
              <div className="mt-4">
                <label className="font-mono text-[10px] tracking-[0.3em] text-pixel-dim uppercase flex items-center gap-2">
                  <span>
                    Short bio
                    <span className="text-pixel-pink ml-1">★</span>
                  </span>
                  <span className="text-pixel-dim/60 normal-case tracking-normal">
                    · stays encrypted until you reveal
                  </span>
                </label>
                <textarea
                  rows={3}
                  className="mt-2 w-full bg-pixel-bg border border-pixel-border focus:border-pixel-orange rounded font-mono text-sm text-pixel-text px-3 py-2 outline-none placeholder:text-pixel-dim/40 placeholder:italic"
                  placeholder="e.g. Architect by training, dumpling specialist by Sunday. Reads two books at once."
                  value={profile.bio}
                  onChange={(e) =>
                    setProfile((p) => ({ ...p, bio: e.target.value }))
                  }
                />
                <div className="flex items-center justify-between mt-1">
                  <span
                    className={`font-mono text-[10px] ${
                      profile.bio.trim().length >= 20
                        ? "text-pixel-green"
                        : "text-pixel-dim"
                    }`}
                  >
                    {profile.bio.trim().length >= 20
                      ? "✓ long enough"
                      : `${profile.bio.trim().length} / 20 chars min`}
                  </span>
                </div>
              </div>

              <PixelDivider label="VIBES · pick 2-6" />
              <div className="flex flex-wrap gap-2">
                {VIBES.map((v) => {
                  const on = profile.vibes.includes(v);
                  return (
                    <button
                      key={v}
                      onClick={() => toggleVibe(v)}
                      className={`px-3 py-1.5 font-mono text-[11px] uppercase tracking-wider border rounded transition-all ${
                        on
                          ? "bg-pixel-orange/20 border-pixel-orange text-pixel-gold"
                          : "border-pixel-border text-pixel-dim hover:text-pixel-text hover:border-pixel-orange"
                      }`}
                    >
                      #{v}
                    </button>
                  );
                })}
              </div>
              <p className="font-mono text-[10px] text-pixel-dim mt-2">
                Selected · {profile.vibes.length} / 2 min
              </p>
            </PixelPanel>

            <RequirementsPanel profile={profile} valid={profileValid} />

            <div className="flex justify-between gap-3">
              <PixelButton variant="ghost" onClick={() => setStage("scene")}>
                ← Replay scenario
              </PixelButton>
              <PixelButton onClick={() => setStage("review")}>
                Review →
              </PixelButton>
            </div>
          </>
        )}

        {stage === "review" && (
          <>
            <PixelPanel title="REVIEW & CONFIRM" accent="#50e890">
              <div className="grid sm:grid-cols-[auto_1fr] gap-5 items-start">
                <div className="flex flex-col items-center gap-2">
                  <PixelGhost color="#ffd060" scale={5} floaty />
                  <span className="font-mono text-[10px] text-pixel-dim">
                    YOUR AGENT
                  </span>
                </div>
                <div className="space-y-3">
                  <div>
                    <p className="font-pixel text-2xl text-pixel-gold leading-none">
                      {profile.display_name || "Anonymous"}
                    </p>
                    <p className="font-mono text-[11px] text-pixel-dim mt-1">
                      {[profile.age, profile.pronouns, profile.city]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                  </div>
                  <p className="font-mono text-sm text-pixel-text/80">
                    {profile.bio}
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {profile.vibes.map((v) => (
                      <span
                        key={v}
                        className="font-mono text-[10px] px-2 py-0.5 rounded border border-pixel-orange text-pixel-gold"
                      >
                        #{v}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <PixelDivider label="ENCRYPTED PREFERENCE VECTOR" />
              <TraitBars traits={traits} />

              <PixelDivider label="SCENARIO TAGS" />
              <div className="flex flex-wrap gap-1.5">
                {tags.map((t) => (
                  <span
                    key={t}
                    className="font-mono text-[10px] px-2 py-0.5 rounded border border-pixel-border text-pixel-dim"
                  >
                    {t}
                  </span>
                ))}
              </div>
            </PixelPanel>

            <div className="flex justify-between gap-3">
              <PixelButton variant="ghost" onClick={() => setStage("profile")}>
                ← Back to details
              </PixelButton>
              <PixelButton onClick={handleSubmit}>
                Encrypt & continue → fund agent
              </PixelButton>
            </div>
          </>
        )}
      </div>
    </main>
  );
}

function Header({ stage }: { stage: Stage }) {
  const stageMap: Record<Stage, [number, string]> = {
    scene: [1, "PLAY · DINNER DATE"],
    profile: [2, "UPLOAD · YOUR DETAILS"],
    review: [3, "REVIEW · ENCRYPT & SHIP"],
  };
  const [n, label] = stageMap[stage];
  return (
    <div className="border-b border-pixel-border bg-pixel-bg2/60">
      <div className="max-w-3xl mx-auto px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <PixelGhost color="#ffd060" scale={3} floaty />
          <div>
            <p className="font-mono text-[9px] tracking-[0.4em] text-pixel-dim">
              ONBOARDING · STEP {n} OF 3
            </p>
            <p className="font-pixel text-2xl text-pixel-gold leading-none">
              {label}
            </p>
          </div>
        </div>
        <div className="flex gap-1.5">
          {[1, 2, 3].map((i) => (
            <span
              key={i}
              className={`w-3 h-3 rounded-sm ${
                i <= n ? "bg-pixel-gold" : "bg-pixel-border"
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function Intro() {
  return (
    <div className="text-center space-y-3 mb-2">
      <p className="font-mono text-[10px] tracking-[0.5em] text-pixel-orange">
        ── DEMO SCENARIO · DINNER DATE ──
      </p>
      <h1 className="font-pixel text-4xl md:text-5xl text-pixel-text leading-tight">
        Play a 5-step scene.
        <br />
        Your agent <span className="text-pixel-gold">learns from how you choose</span>.
      </h1>
      <p className="font-mono text-sm text-pixel-dim max-w-xl mx-auto">
        Don't think too hard. There are no wrong answers — only signals.
      </p>
    </div>
  );
}

function ChoicesRecap({
  choices,
  traits,
}: {
  choices: ScenarioChoice[];
  traits: Record<(typeof TRAITS)[number], number> | null;
}) {
  return (
    <PixelPanel title="WHAT YOUR AGENT JUST LEARNED" accent="#ff6090">
      <div className="grid sm:grid-cols-2 gap-x-6 gap-y-2">
        {choices.map((c, i) => (
          <div key={c.id} className="flex items-start gap-2">
            <span className="font-pixel text-pixel-orange">{i + 1}.</span>
            <span className="font-mono text-[12px] text-pixel-text/80">
              {c.label.replace(/^▸\s*/, "")}{" "}
              <span className="text-pixel-dim">· #{c.tag}</span>
            </span>
          </div>
        ))}
      </div>
      <PixelDivider label="DERIVED PREFERENCE VECTOR" />
      <TraitBars traits={traits} />
    </PixelPanel>
  );
}

function TraitBars({
  traits,
}: {
  traits: Record<(typeof TRAITS)[number], number> | null;
}) {
  if (!traits) return null;
  const max = Math.max(...Object.values(traits), 1);
  return (
    <div className="space-y-2">
      {TRAITS.map((k) => {
        const v = traits[k];
        const pct = (v / max) * 100;
        const color =
          k === "logic"
            ? "#60c0ff"
            : k === "empathy"
              ? "#50e890"
              : k === "creativity"
                ? "#c060ff"
                : k === "ambition"
                  ? "#e8724a"
                  : "#ffd060";
        return (
          <div key={k} className="flex items-center gap-3">
            <span
              className="font-mono text-[10px] uppercase tracking-widest w-20"
              style={{ color }}
            >
              {k}
            </span>
            <div className="flex-1 h-2 bg-pixel-bg rounded-sm overflow-hidden">
              <div
                className="h-full rounded-sm"
                style={{
                  width: `${pct}%`,
                  background: color,
                  boxShadow: `0 0 8px ${color}66`,
                }}
              />
            </div>
            <span
              className="font-mono text-[10px] w-8 text-right"
              style={{ color }}
            >
              {v}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  required = false,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  required?: boolean;
}) {
  return (
    <label className="block">
      <span className="font-mono text-[10px] tracking-[0.3em] text-pixel-dim uppercase">
        {label}
        {required && <span className="text-pixel-pink ml-1">★</span>}
      </span>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="mt-1.5 w-full bg-pixel-bg border border-pixel-border focus:border-pixel-orange rounded font-mono text-sm text-pixel-text px-3 py-2 outline-none placeholder:text-pixel-dim/40 placeholder:italic"
      />
    </label>
  );
}

function RequirementsPanel({
  profile,
}: {
  profile: Profile;
  valid: boolean;
}) {
  const items = [
    {
      ok: profile.display_name.trim().length >= 2,
      label: "Display name (≥ 2 chars · recommended)",
    },
    {
      ok: profile.bio.trim().length >= 20,
      label: "Short bio (≥ 20 chars · recommended)",
    },
    {
      ok: profile.vibes.length >= 2,
      label: "Pick at least 2 vibes (recommended)",
    },
  ];

  const allFilled = items.every((it) => it.ok);

  if (allFilled) {
    return (
      <div className="border border-pixel-green/40 bg-pixel-green/5 rounded px-4 py-2.5 font-mono text-[11px] text-pixel-green flex items-center gap-2">
        <span className="w-1.5 h-1.5 rounded-full bg-pixel-green animate-livePulse" />
        ✓ Looking great — tap REVIEW when ready.
      </div>
    );
  }

  return (
    <div className="border border-pixel-border bg-pixel-bg2 rounded p-4">
      <p className="font-mono text-[10px] tracking-[0.3em] text-pixel-dim mb-2">
        ── OPTIONAL POLISH (TAP REVIEW ANY TIME) ──
      </p>
      <ul className="space-y-1">
        {items.map((it, i) => (
          <li key={i} className="font-mono text-[12px] flex items-center gap-2">
            <span
              className={`inline-block w-3 h-3 rounded-sm border ${
                it.ok
                  ? "bg-pixel-green border-pixel-green"
                  : "border-pixel-dim"
              }`}
            >
              {it.ok && (
                <span className="block text-pixel-bg text-[9px] leading-3 text-center">
                  ✓
                </span>
              )}
            </span>
            <span
              className={
                it.ok ? "text-pixel-dim line-through" : "text-pixel-text"
              }
            >
              {it.label}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
