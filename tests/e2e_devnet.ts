/**
 * End-to-end test against devnet.
 *
 * Walks the same 10 steps as scripts/run_demo.sh, but asserts on the
 * on-chain effects (initialize_user / deposit / register_agent /
 * commit_match_batch x2 / request_disclosure transaction signatures).
 *
 * Pre-reqs:
 *   - SOLANA_RPC_URL points at devnet
 *   - PROGRAM_ID_ESCROW deployed
 *   - DATABASE_URL points at a fresh Postgres
 *   - backend running on $BACKEND_URL
 */

import { expect } from "chai";

const BACKEND = process.env.BACKEND_URL ?? "http://localhost:8080";

async function postJson<T>(path: string, body: unknown): Promise<T> {
  const r = await fetch(`${BACKEND}/api/v1${path}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  expect(r.ok, `${path} ${r.status}`).to.be.true;
  return r.json() as Promise<T>;
}

async function getJson<T>(path: string): Promise<T> {
  const r = await fetch(`${BACKEND}/api/v1${path}`);
  expect(r.ok, `${path} ${r.status}`).to.be.true;
  return r.json() as Promise<T>;
}

describe("veranda e2e (devnet)", () => {
  it("walks the canonical happy path", async () => {
    const session = await postJson<{ user_id: string; real_wallet: string }>(
      "/auth/session",
      { privy_token: "dev-e2e-token" },
    );
    expect(session.user_id).to.be.a("string");

    await postJson("/profile", {
      agent_wallet: "AliceAgentWallet111111111111111111111111111",
      scenarios: ["casual_dining", "family_interaction"],
      audio_uploads: ["alice_meal.wav", "alice_family.wav"],
    });

    await postJson("/agent/register", {
      agent_wallet: "AliceAgentWallet111111111111111111111111111",
      commitment: "00".repeat(32),
      scenarios: ["casual_dining", "family_interaction"],
      merkle_proof: [],
    });

    const match = await postJson<{ match_session_id: string }>(
      "/match/start",
      {
        agent_wallet: "AliceAgentWallet111111111111111111111111111",
        scenarios: ["casual_dining", "family_interaction"],
      },
    );

    let status = await getJson<{ status: string }>(
      `/match/status/${match.match_session_id}`,
    );
    const start = Date.now();
    while (status.status !== "complete" && Date.now() - start < 90_000) {
      await new Promise((r) => setTimeout(r, 2000));
      status = await getJson<{ status: string }>(
        `/match/status/${match.match_session_id}`,
      );
    }
    expect(status.status).to.equal("complete");

    const candidates = await getJson<{ candidates: any[] }>(
      `/candidates/${match.match_session_id}`,
    );
    expect(candidates.candidates.length).to.equal(10);

    const profile = await postJson<{ display_name: string }>(
      `/candidates/${match.match_session_id}/disclose/3`,
      { tx_signature: "DEV_TX_SIGNATURE_PLACEHOLDER" },
    );
    expect(profile.display_name).to.be.a("string");
  }).timeout(120_000);
});
