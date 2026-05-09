"use client";

import { useState } from "react";

const FILE_BY_SCENARIO: Record<string, string> = {
  casual_dining: "alice_meal.wav",
  work_colleagues: "alice_work.wav",
  family_interaction: "alice_family.wav",
  conflict_resolution: "alice_conflict.wav",
  travel_companion: "alice_travel.wav",
};

export function ScenarioRecorder({
  scenarioId,
  onComplete,
}: {
  scenarioId: string;
  onComplete: (file: string) => void;
}) {
  const [done, setDone] = useState(false);

  const handleMockUpload = () => {
    // MOCK: in the real flow this would record from the mic, normalize, and
    // POST to /api/v1/profile. We just hand the canned file path to the parent.
    const file = FILE_BY_SCENARIO[scenarioId] ?? "default.wav";
    onComplete(file);
    setDone(true);
  };

  return (
    <div className="border border-veranda-ink/10 rounded-2xl p-5 flex items-center justify-between">
      <div>
        <p className="font-display text-lg capitalize">
          {scenarioId.replace(/_/g, " ")}
        </p>
        <p className="text-veranda-ink/50 text-sm">
          Speak for ~30s. Or upload an existing recording.
        </p>
      </div>
      <button
        onClick={handleMockUpload}
        disabled={done}
        className="px-4 py-2 rounded-full bg-veranda-ink text-veranda-fog disabled:opacity-50"
      >
        {done ? "Uploaded ✓" : "Mock upload"}
      </button>
    </div>
  );
}
