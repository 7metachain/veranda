"use client";

// Legacy route. The simulation now lives inside /candidates as the
// right pane of the split layout, so we just redirect any direct hits
// here back to the new combined page.

import { Suspense, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";

function SimulationRedirectInner() {
  const params = useSearchParams();
  const router = useRouter();
  useEffect(() => {
    const session = params.get("session") ?? "";
    router.replace(`/candidates?session=${session}`);
  }, [params, router]);
  return (
    <main className="p-12 font-mono text-pixel-orange">
      Redirecting to the new combined view…
    </main>
  );
}

export default function SimulationPage() {
  return (
    <Suspense
      fallback={
        <main className="p-12 font-mono text-pixel-orange">Loading…</main>
      }
    >
      <SimulationRedirectInner />
    </Suspense>
  );
}
