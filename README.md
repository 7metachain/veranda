# Veranda

> **Match through your agent. Reveal on your terms.**

Veranda is a privacy-preserving dating platform built on Solana. Each user is represented by an autonomous AI agent that enters a matching pool of 30,000+ peer agents. Compatibility is scored privately on user-selected relationship scenarios; the pool narrows from 30,000 → 100 → top-10 via ZK-committed matching, and a candidate's identity is revealed only when the user pays a per-candidate disclosure fee.

---

## Architecture at a glance

```
┌────────────────────┐    ┌──────────────────────┐    ┌───────────────────┐
│  Next.js frontend  │◄──►│  Rust axum backend   │◄──►│  Solana mainnet   │
│  Privy + LI.FI     │    │  matching pipeline   │    │  veranda-escrow   │
└────────────────────┘    └──────────┬───────────┘    └─────────▲─────────┘
                                     │                          │
                                     │ delegate / commit         │
                                     ▼                          │
                          ┌──────────────────────┐               │
                          │  MagicBlock ER       │               │
                          │  veranda-rollup      │───────────────┘
                          │  ~50 record_match/s  │   batch settle
                          └──────────────────────┘
```

See [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md) for the deep dive,
[`docs/ZK_DESIGN.md`](./docs/ZK_DESIGN.md) for the proof system, and
[`docs/DEMO.md`](./docs/DEMO.md) for the canonical happy-path script.

---

## Quick start

```bash
# 1. install toolchains
#    rustup, solana-cli ≥1.18, anchor 0.30.1, pnpm 9, docker, just
# 2. clone + install
pnpm install
cargo fetch

# 3. configure
cp .env.example .env   # fill in PRIVY_APP_ID, OPENAI_API_KEY, etc.

# 4. run dev stack
just dev

# 5. (devnet only) deploy + demo
just deploy-devnet
just demo
```

---

## Repo layout

| Path                        | Purpose                                                          |
| --------------------------- | ---------------------------------------------------------------- |
| `programs/veranda-escrow/`  | Main Anchor program — user PDAs, escrow vaults, batch commits    |
| `programs/veranda-rollup/`  | MagicBlock ER program — high-frequency `record_match` txs        |
| `circuits/`                 | Circom (Groth16) — `membership.circom`, `compatibility.circom`   |
| `backend/`                  | axum HTTP server, matching pipeline, x402 middleware             |
| `frontend/`                 | Next.js 14 (App Router) — Privy login, LI.FI Widget, candidates  |
| `ros-sim/`                  | Gazebo + ROS 2 — TurtleBot ceremony for the Virtuals track       |
| `scripts/`                  | Devnet deploy, demo runner, mock data seeder                     |
| `tests/`                    | Anchor + backend integration + e2e tests                         |
| `docs/`                     | Architecture, ZK design, demo script                             |

---

## Acceptance gates

- `cargo check --workspace` passes
- `anchor build` produces both `.so` artifacts
- `pnpm --filter frontend build` succeeds
- `scripts/run_demo.sh` walks all 10 steps of the canonical happy path

---

## Pricing

| Action                                | Price (USDC) | Recipient            |
| ------------------------------------- | ------------ | -------------------- |
| Initial deposit (minimum)             | $20          | User's escrow PDA    |
| Per agent-to-agent match (both sides) | $0.01        | Platform treasury    |
| Per candidate disclosure              | $2.00        | Platform treasury    |

---

## License

Apache-2.0
