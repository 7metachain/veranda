const BASE = process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:8080";

async function jsonReq<T>(
  path: string,
  init?: RequestInit & { agentWallet?: string },
): Promise<T> {
  const headers: Record<string, string> = {
    "content-type": "application/json",
    ...((init?.headers as Record<string, string>) ?? {}),
  };
  if (init?.agentWallet) headers["x-agent-wallet"] = init.agentWallet;

  const res = await fetch(`${BASE}/api/v1${path}`, { ...init, headers });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`HTTP ${res.status}: ${body}`);
  }
  return res.json();
}

export type CandidateBrief = {
  index: number;
  score: number;
  teaser: string;
  agent_wallet: string;
};

export type DisclosedProfile = {
  display_name: string;
  photos: string[];
  recordings: string[];
  bio: string;
};

export const api = {
  startMatch: () =>
    jsonReq<{ match_session_id: string }>("/match/start", {
      method: "POST",
      body: JSON.stringify({
        agent_wallet: localStorage.getItem("veranda:agent_wallet") ?? "",
        scenarios: JSON.parse(
          localStorage.getItem("veranda:selected_scenarios") ?? "[]",
        ),
      }),
    }),

  matchStatus: (id: string) =>
    jsonReq<{
      round: number;
      progress: number;
      eta_seconds: number;
      status: string;
    }>(`/match/status/${id}`),

  candidates: (id: string) =>
    jsonReq<{ candidates: CandidateBrief[] }>(`/candidates/${id}`),

  disclose: (sessionId: string, index: number, txSignature: string) =>
    jsonReq<DisclosedProfile>(
      `/candidates/${sessionId}/disclose/${index}`,
      {
        method: "POST",
        body: JSON.stringify({ tx_signature: txSignature }),
      },
    ),

  triggerCeremony: (candidate_agent_wallet: string) =>
    jsonReq<{ video_url: string }>("/ceremony/trigger", {
      method: "POST",
      body: JSON.stringify({ candidate_agent_wallet }),
    }),

  deposit: async (_args: { amount: number }) => {
    // TODO: build/sign/send the on-chain `deposit` instruction via anchor-client.
    // The backend doesn't need to be involved (no body, no fetch); we keep
    // this as `api.deposit` so the deposit page reads cleanly.
    return { ok: true };
  },
};
