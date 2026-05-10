<p align="center">
  <img
    src="./docs/assets/veranda-match-banner.png"
    alt="Veranda Match — agent at a console screening a crowd of candidates, funneling hearts to the user’s hand. Tagline: Agent-vetted. Heart-selected."
    width="100%"
  />
</p>

<h1 align="center">Veranda</h1>

<p align="center">
  <strong>Match through your agent. Reveal on your terms.</strong><br />
  <em>Veranda: Agent-vetted. Heart-selected.</em>
</p>

<p align="center">
  <a href="./LICENSE"><img src="https://img.shields.io/badge/license-Apache--2.0-blue.svg" alt="License Apache-2.0" /></a>
  <img src="https://img.shields.io/badge/Solana-devnet-green.svg" alt="Solana devnet" />
  <img src="https://img.shields.io/badge/frontend-Next.js_14-black?logo=next.js&logoColor=white" alt="Next.js 14" />
  <img src="https://img.shields.io/badge/backend-Rust_%2F_Axum-orange?logo=rust&logoColor=white" alt="Rust Axum" />
</p>

---

## Overview

**Veranda** is a privacy-oriented matchmaking stack on **Solana**. Each person is represented by an **AI agent** that moves through a large candidate pool; compatibility is scored on **scenario-based** signals, the shortlist narrows across rounds, and **identity is only revealed when the user chooses** (with an on-chain disclosure / fee model in the product design).

The banner art above reflects the product story: **data analyzed**, **chemistry simulated**, and **mass screening** funneling down to **the match** you actually want to meet.

---

## Highlights

| Theme | What it means in Veranda |
| ----- | ------------------------ |
| **Agent-vetted** | Preferences and behavior signals are gathered through guided flows; the agent represents you in the pool. |
| **Heart-selected** | You pick from a shortlist; optional romance-style simulation before paying to disclose. |
| **Privacy-first** | ZK / compressed-account narrative in the architecture docs; escrow and x402-style micropayments in the codebase. |
| **Solana-native** | Anchor programs (`veranda-escrow`, `veranda-rollup`), devnet-friendly demo, Privy wallet login, LI.FI for cross-chain USDC into Solana. |

---

## Architecture

```
┌────────────────────┐    ┌──────────────────────┐    ┌───────────────────┐
│  Next.js frontend  │◄──►│  Rust axum backend   │◄──►│  Solana devnet    │
│  Privy + LI.FI     │    │  matching pipeline   │    │  veranda-escrow   │
└────────────────────┘    └──────────┬───────────┘    └─────────▲─────────┘
                                     │                          │
                                     │ delegate / commit         │
                                     ▼                          │
                          ┌──────────────────────┐               │
                          │  MagicBlock ER       │               │
                          │  veranda-rollup      │───────────────┘
                          │  high-frequency txs  │   batch settle
                          └──────────────────────┘
```

| Document | Description |
| -------- | ----------- |
| [Architecture](./docs/ARCHITECTURE.md) | System design and data flow |
| [ZK design](./docs/ZK_DESIGN.md) | Proof / commitment direction |
| [Demo script](./docs/DEMO.md) | Canonical happy-path walkthrough |

---

## Repository layout

| Path | Purpose |
| ---- | ------- |
| [`programs/veranda-escrow/`](./programs/veranda-escrow/) | Anchor — user PDAs, escrow vaults, batch commits |
| [`programs/veranda-rollup/`](./programs/veranda-rollup/) | MagicBlock-style ER program — high-frequency `record_match` path |
| [`circuits/`](./circuits/) | Circom (Groth16) — membership & compatibility circuits |
| [`backend/`](./backend/) | Axum HTTP server, matching orchestration, x402 middleware, Privy session |
| [`frontend/`](./frontend/) | Next.js 14 (App Router) — pixel UI, Privy, LI.FI widget, candidates flow |
| [`ros-sim/`](./ros-sim/) | Gazebo + ROS 2 — optional ceremony / robotics demo |
| [`scripts/`](./scripts/) | Devnet deploy, demo runner, seed helpers |
| [`tests/`](./tests/) | Anchor + integration tests |
| [`docs/`](./docs/) | Deep-dive docs and **README banner** asset |

---

## Prerequisites

- **Rust** (`rustup`) and **Cargo**
- **Solana CLI** and **Anchor** (versions aligned with workspace; see `Anchor.toml`)
- **Node** ≥ 18 and **pnpm** 9+
- **Docker** (for Postgres in local dev, if you use the compose / `just` stack)
- **just** (optional but recommended for `just dev`)

---

## Quick start

```bash
# 1. Toolchains: rustup, solana-cli, anchor, pnpm, docker, just (as needed)

# 2. Install dependencies
pnpm install
cargo fetch

# 3. Configure environment
cp .env.example .env
# Fill: DATABASE_URL, PRIVY_* / NEXT_PUBLIC_PRIVY_APP_ID, OPENAI_API_KEY (optional), etc.

# 4. Run the dev stack (if you use just)
just dev

# 5. Devnet deploy + demo (when ready)
just deploy-devnet
just demo
```

Frontend only:

```bash
pnpm dev:frontend
# Open http://localhost:3000
```

---

## Pricing (product model)

| Action | Approx. USDC | Notes |
| ------ | ------------- | ----- |
| Initial deposit (minimum tier) | From tier config | Escrow / agent funding in the design |
| Per agent-to-agent match (both sides) | $0.01 | x402-style treasury (`X402_TREASURY_WALLET`) |
| Per candidate disclosure | $2.00 | Reveal identity / profile |

---

## Acceptance gates (for contributors)

- `cargo check --workspace` passes  
- `anchor build` produces program artifacts  
- `pnpm --filter frontend build` succeeds  
- `scripts/run_demo.sh` completes the documented happy path (when wired)

---

## License

[Apache-2.0](./LICENSE)
