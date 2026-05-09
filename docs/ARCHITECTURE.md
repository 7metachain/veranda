# Veranda Architecture

## Layers

```
┌────────────────────────────────────────────────────────────────────────┐
│                              FRONTEND                                  │
│  Next.js 14 (App Router) · Privy embedded wallet · LI.FI Widget        │
│  client-side BIP32 agent-wallet derivation · circomlibjs Poseidon       │
│  snarkjs Groth16 proof generation                                      │
└──────────────────────────────────┬─────────────────────────────────────┘
                                   │ /api/v1/* (axum)
┌──────────────────────────────────▼─────────────────────────────────────┐
│                              BACKEND                                   │
│  axum HTTP gateway · x402 middleware · matching pipeline orchestrator  │
│  Postgres (sqlx) · OpenAI via rig · LI.FI REST proxy                   │
│  Light Protocol stateless RPC · Arcium (mocked) compatibility          │
│  rosbridge WS client                                                   │
└──────┬───────────────────┬──────────────────────────────┬──────────────┘
       │ anchor-client     │ ephemeral-rollups-sdk        │ JSON-WS
       ▼                   ▼                              ▼
┌──────────────┐   ┌──────────────────┐         ┌──────────────────┐
│ veranda-     │   │ veranda-rollup   │         │  Gazebo + ROS 2  │
│  escrow      │   │ (MagicBlock ER)  │         │  TurtleBot       │
│ (Anchor /    │   │ record_match     │         │  ceremony video  │
│  mainnet)    │   │ × thousands/run  │         │                  │
└──────────────┘   └──────────────────┘         └──────────────────┘
```

## Privacy invariants

1. **Server never sees the link between `real_wallet` and `agent_wallet`.**
   The browser computes `commitment = poseidon(real, agent, nonce)` and only
   the commitment + a Light merkle proof go on chain.
2. **`real_wallet` and `agent_wallet` are independent ed25519 keypairs.**
   `agent_wallet` is BIP32-derived from a passphrase the user types into the
   browser; the seed never leaves the browser.
3. **Reveal is per-candidate and explicit.** `request_disclosure` is the only
   instruction that emits an event linking a candidate's `agent_wallet` to a
   particular `user_pda`. Until that event fires, the backend has no way to
   tell two `user_pda` instances apart by who they matched with.

## Matching pipeline

The orchestrator (`backend/src/orchestrator/matching_pipeline.rs`) runs a
two-round funnel per matching session:

| Round | Filter            | Compute                      | Output       |
|-------|-------------------|------------------------------|--------------|
| 1     | scenario bitmap   | Arcium MPC (mocked)          | Top 100      |
| 2     | output of round 1 | OpenAI scenario simulation   | Top 10       |

Each pairwise call in round 1 also issues a `record_match` tx on the
MagicBlock ER (so each score is independently verifiable on chain), and an
x402 middleware charges `$0.01 USDC` from each side per call. Round-1
settlement and round-2 settlement each commit a merkle root of their
winners back to mainnet via `commit_match_batch`.

## Why MagicBlock ER

3M score txs at ~$0.01 mainnet priority fees would cost $30k per round.
On the ER each tx is sub-cent. We delegate the user's match-state account to
the ER for the duration of a round, run all the writes there, then `commit!`
+ `undelegate!` to settle.

## Why Light Protocol compressed accounts

The pool has 30k+ registered agents. A regular Anchor account per agent
would mean 30k × ~150 bytes × rent. Light's compressed merkle tree compresses
this into a single concise root account; per-agent storage drops to a leaf
(plus an off-chain index). Inclusion is verified via Groth16 / Poseidon —
the same primitives the membership circuit already uses.

## Testing strategy

- **Anchor** (`tests/escrow_program.ts`): exercise each instruction against a
  local validator with a cloned USDC mint.
- **Backend** (`cargo test -p backend`): unit-tests for merkle helpers,
  scenario weighting, fee accounting; integration tests behind a
  `--features integration` flag that spin up Postgres in Docker.
- **E2E** (`tests/e2e_devnet.ts`): real devnet flow.
