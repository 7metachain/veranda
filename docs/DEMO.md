# Demo Script

The canonical happy path is automated by `scripts/run_demo.sh`. This doc is
the verbal walkthrough used during a live demo.

> **Setup:** ensure Postgres is up, the backend is running on `:8080`, the
> frontend is running on `:3000`, and the ROS docker stack is up
> (`just dev` does all of this).

---

## 1. Sign-up

Open `localhost:3000`. Click **Begin**. The Privy modal shows up; log in
with a magic-link email. Privy mints an embedded Solana wallet
(`alice_real_wallet`).

The frontend then prompts for a passphrase and derives
`alice_agent_wallet` via BIP32 (`m/44'/501'/0'/0'`). The seed never
leaves the browser.

## 2. Profile creation

Navigate to `/onboarding`. Pick `Sharing a meal` and `With family`.
Tap "Mock upload" on each scenario card; canned audio file names are
shipped to the backend, which returns a deterministic 5-dim vector.

## 3. Scenario selection persisted

The backend stores the profile keyed by `agent_wallet` only. Pull up
Postgres in another tab to confirm: `agents` row has the wallet but
no link to `users`.

## 4. Deposit

Navigate to `/deposit`. The LI.FI widget bridges $20 USDC from Base. After
the bridge confirms, click **Deposit $20 USDC** — frontend signs an
on-chain `deposit` ix; USDC moves to the `escrow_vault`.

## 5. Anonymous registration

The frontend computes the commitment, pushes the leaf into Light Protocol,
and signs `register_agent` with `agent_wallet`. The on-chain event
`AgentRegistered { agent_wallet, leaf_index }` fires.

## 6+7. Matching pipeline

`/matching` polls `match/status`. The progress bar walks 0 → 50% (round
1, 30k → 100) → 100% (round 2, 100 → 10). The "matches per second"
counter shows real `record_match` txs hitting the ER explorer.

## 8. Browse candidates

`/candidates?session=<id>` displays 10 anonymous cards. Each card shows
compatibility score, scenario fit, blurred avatar, and a teaser line.

## 9. Disclosure

Tap card #3. Modal: "$2 to reveal". Confirm. Frontend signs
`request_disclosure(candidate_index=3, merkle_proof=…)`. Treasury balance
ticks up by $2; backend listens for `DisclosureGranted` and unlocks the
profile fetch.

## 10. Match acceptance + Virtuals ceremony

Send a message. On accept, backend POSTs to `rosbridge`; the TurtleBot
in `veranda_cafe.world` rolls up to the cafe table, pauses 5s, and the
recording lands at `/tmp/match_ceremony.mp4`. `<CeremonyVideo />` plays
it inline.

---

## What to point at on screen

- Solana Explorer for: `initialize_user`, `deposit ($20)`,
  `register_agent`, `commit_match_batch (×2)`, `request_disclosure ($2)`.
- MagicBlock ER explorer for: 50+ `record_match` txs.
- Postgres `agents` table — observe that NO row contains both `real_wallet`
  AND `agent_wallet`.
