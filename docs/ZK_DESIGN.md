# Veranda ZK Design

## Two circuits, two roles

### 1. `circuits/membership.circom` — REAL

Proves the prover knows `(real_wallet, agent_wallet, nonce)` such that
`commitment = poseidon(real_wallet, agent_wallet, nonce)` is the leaf at
some `leaf_index` of a Light Protocol compressed merkle tree whose root is
public.

| Signal           | Type     | Visibility |
|------------------|----------|------------|
| real_wallet      | scalar   | private    |
| agent_wallet     | scalar   | private    |
| nonce            | scalar   | private    |
| leaf_index       | scalar   | private    |
| pathElements[20] | scalar[] | private    |
| pathIndices[20]  | bool[]   | private    |
| commitment       | scalar   | **public** |
| merkle_root      | scalar   | **public** |

**Why both `commitment` and `merkle_root` public?** Because the on-chain
verifier needs `commitment` to bind the proof to the specific
`AgentRegistration` PDA being created, and `merkle_root` to bind it to the
Light tree state at the time of registration.

**Tree depth = 20** = up to 1,048,576 distinct agents, conservatively
sized for several years of growth.

**Circuit is shared across two call sites:**
- `register_agent` — gates Sybil registration. Anyone whose commitment
  isn't in the tree can't open an `AgentRegistration` PDA.
- `reveal_identity` — proves a `real_wallet` controls a particular
  `commitment`, used after disclosure if the matched pair want
  symmetric reveal.

### 2. `circuits/compatibility.circom` — STUB

The real compatibility computation runs INSIDE Arcium's MPC network,
not as a SNARK. We keep the `.circom` file as an interface contract:
the public inputs (`scenario_weights`) and the output range
(`score: u16`) match what Arcium emits.

If we ever fork to a "single-prover SNARK fallback" — where the platform
proves it computed scores correctly without exposing trait vectors —
this file is the seed for that work.

## Verifier on Solana

Solana ships an `alt_bn128_*` syscall family that lets us verify Groth16
proofs over BN254 in-program at ~1.4M CU when the G2 component is
**prepared** off-chain and stored in the program binary. The flow:

1. `circuits/scripts/trusted_setup.sh` runs the Powers-of-Tau ceremony
   and exports `verification_key.json`.
2. A small Rust build script reads the JSON and writes a Rust `static`
   array of the prepared G2 elements that the program can include.
3. The instruction unpacks the proof's three components (A in G1, B in G2,
   C in G1), computes the input commitment via Poseidon-friendly hashing,
   and calls `solana_program::syscalls::sol_alt_bn128_pairing`.

For the scaffold we keep the verifier as a TODO function in
`programs/veranda-escrow/src/instructions/reveal_identity.rs` so that
`anchor build` succeeds without the trusted-setup artifacts being
checked in. Wire the real verifier in once `circuits/build/` is populated.

## Why Poseidon over BN254 specifically

- Native to Light Protocol's tree implementation.
- Native to circom + snarkjs.
- Native to Solana's `alt_bn128_*` syscalls — no extra precomputation
  besides the standard prepared-G2 trick.

## Open questions / future work

- **Compatibility privacy.** Today the round-1 score is computed by a
  trusted server (the Arcium stub). Migrating to real Arcium gets us
  per-pair score privacy (neither side learns the other's profile), but
  doesn't yet give us *score* privacy from the platform — work-in-progress.
- **Range proofs.** Some of our public inputs (`commitment_leaf_index`)
  could leak ordering information about registration time. We're
  considering shuffling leaf indices via a per-epoch permutation
  committed to in the Light tree config.
