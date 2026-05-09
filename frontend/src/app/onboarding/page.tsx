"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ScenarioRecorder } from "@/components/ScenarioRecorder";

const SCENARIOS = [
  { id: "casual_dining", label: "Sharing a meal" },
  { id: "work_colleagues", label: "Among coworkers" },
  { id: "family_interaction", label: "With family" },
  { id: "conflict_resolution", label: "Disagreement" },
  { id: "travel_companion", label: "On a trip" },
];

export default function OnboardingPage() {
  const router = useRouter();
  const [selected, setSelected] = useState<string[]>([]);
  const [recorded, setRecorded] = useState<string[]>([]);
  const [step, setStep] = useState<1 | 2>(1);

  useEffect(() => {
    if (selected.length >= 2 && step === 1) {
      // No-op; transition is user-driven via the explicit button below.
    }
  }, [selected, step]);

  const toggle = (id: string) => {
    setSelected((s) =>
      s.includes(id) ? s.filter((x) => x !== id) : s.length < 4 ? [...s, id] : s,
    );
  };

  const canProceedToRecording = selected.length >= 2;
  const canProceedToDeposit =
    selected.length >= 2 && recorded.length >= selected.length;

  const handleNext = () => {
    localStorage.setItem("veranda:selected_scenarios", JSON.stringify(selected));
    localStorage.setItem("veranda:recorded_files", JSON.stringify(recorded));
    router.push("/deposit");
  };

  return (
    <main className="min-h-screen px-6 py-16 max-w-3xl mx-auto space-y-12">
      <header className="space-y-2">
        <p className="text-veranda-gold uppercase tracking-[0.4em] text-xs">
          Onboarding · Step {step} of 2
        </p>
        <h1 className="font-display text-4xl mt-2">
          {step === 1 ? "Pick 2–4 scenarios." : "Record each scenario."}
        </h1>
        <p className="text-veranda-ink/60">
          {step === 1
            ? "Your agent will only be matched on what you select."
            : "Speak ~30s per scenario, or use the mock upload below."}
        </p>
      </header>

      {step === 1 && (
        <>
          <section className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {SCENARIOS.map((s) => (
              <button
                key={s.id}
                onClick={() => toggle(s.id)}
                className={`px-5 py-6 rounded-2xl border text-left transition ${
                  selected.includes(s.id)
                    ? "bg-veranda-ink text-veranda-fog border-veranda-ink"
                    : "border-veranda-ink/20 hover:border-veranda-ink/60"
                }`}
              >
                <span className="font-display text-xl">{s.label}</span>
              </button>
            ))}
          </section>

          <p className="text-veranda-ink/40 text-sm">
            Selected: {selected.length} / 2–4 required
          </p>

          <button
            onClick={() => setStep(2)}
            disabled={!canProceedToRecording}
            className={`inline-block px-8 py-3 rounded-full transition ${
              canProceedToRecording
                ? "bg-veranda-ink text-veranda-fog hover:bg-veranda-ink/80"
                : "bg-veranda-ink/30 text-veranda-fog cursor-not-allowed"
            }`}
          >
            Next → Record scenarios
          </button>
        </>
      )}

      {step === 2 && (
        <>
          <section className="space-y-4">
            {selected.map((id) => (
              <ScenarioRecorder
                key={id}
                scenarioId={id}
                onComplete={(file) =>
                  setRecorded((r) => (r.includes(file) ? r : [...r, file]))
                }
              />
            ))}
          </section>

          <p className="text-veranda-ink/40 text-sm">
            Recorded: {recorded.length} / {selected.length}
          </p>

          <div className="flex gap-3">
            <button
              onClick={() => setStep(1)}
              className="px-6 py-3 rounded-full border border-veranda-ink/20"
            >
              ← Back
            </button>
            <button
              onClick={handleNext}
              disabled={!canProceedToDeposit}
              className={`px-8 py-3 rounded-full transition ${
                canProceedToDeposit
                  ? "bg-veranda-ink text-veranda-fog hover:bg-veranda-ink/80"
                  : "bg-veranda-ink/30 text-veranda-fog cursor-not-allowed"
              }`}
            >
              Next → Deposit
            </button>
          </div>
        </>
      )}
    </main>
  );
}
