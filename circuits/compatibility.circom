pragma circom 2.1.6;

// Veranda — Compatibility compute (STUB)
// ────────────────────────────────────────────────────────────────────────────
// This file is intentionally a STUB. The real compatibility computation
// happens INSIDE Arcium's MPC network, which is not Circom-based — Arcium
// uses garbled circuits / SS-MPC under the hood.
//
// We keep this circom file around as a *contract* for what the public/private
// inputs and outputs of the compatibility function look like, so that:
//
//   - the off-chain `arcium_stub.rs` mock returns data shaped like the real
//     Arcium output, and
//   - if we ever want a self-hosted SNARK fallback (e.g. a single-prover
//     ZKP version where the platform attests to having computed scores
//     correctly), the inputs are documented.
//
// TODO: implement actual logic when migrating off Arcium-stub.

template CompatibilityIO() {
    // ─── Private witness (sealed inputs from each user) ──────────────────
    signal input profile_a[5];          // 5-dim trait vector for user A
    signal input profile_b[5];          // 5-dim trait vector for user B

    // ─── Public ──────────────────────────────────────────────────────────
    signal input scenario_weights[5];   // user A's selected scenarios
    signal output score;                // 0..10000 (basis points)

    // STUB: trivial cosine-style aggregation. Real version is private MPC.
    var s = 0;
    for (var i = 0; i < 5; i++) {
        s += profile_a[i] * profile_b[i] * scenario_weights[i];
    }
    score <== s;
}

component main { public [scenario_weights] } = CompatibilityIO();
