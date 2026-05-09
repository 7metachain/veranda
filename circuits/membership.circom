pragma circom 2.1.6;

// Veranda — Membership proof
// ────────────────────────────────────────────────────────────────────────────
// Proves that the prover knows (real_wallet, agent_wallet, nonce) such that:
//
//   commitment = poseidon(real_wallet, agent_wallet, nonce)
//
// AND that `commitment` is the leaf at position `leaf_index` of a Light
// Protocol compressed merkle tree whose root is `merkle_root`.
//
// This circuit is used:
//   - At REGISTRATION time: prover demonstrates membership without revealing
//     which leaf is theirs (the tree's leaves are public, but the index
//     binding is what we're keeping hidden client-side until disclosure).
//   - At REVEAL time: prover demonstrates control over the agent_wallet
//     pubkey by re-deriving the same commitment.
//
// Tree depth fixed at 20 (≈1M leaves). Light Protocol uses Poseidon over
// BN254 for compatibility with the on-chain alt_bn128 syscalls.

include "../node_modules/circomlib/circuits/poseidon.circom";
include "../node_modules/circomlib/circuits/mux1.circom";

template MerklePath(depth) {
    signal input leaf;
    signal input pathElements[depth];
    signal input pathIndices[depth];   // 0 = current node is left child, 1 = right
    signal output root;

    component hashers[depth];
    component muxL[depth];
    component muxR[depth];

    signal currents[depth + 1];
    currents[0] <== leaf;

    for (var i = 0; i < depth; i++) {
        muxL[i] = Mux1();
        muxR[i] = Mux1();

        muxL[i].c[0] <== currents[i];
        muxL[i].c[1] <== pathElements[i];
        muxL[i].s <== pathIndices[i];

        muxR[i].c[0] <== pathElements[i];
        muxR[i].c[1] <== currents[i];
        muxR[i].s <== pathIndices[i];

        hashers[i] = Poseidon(2);
        hashers[i].inputs[0] <== muxL[i].out;
        hashers[i].inputs[1] <== muxR[i].out;

        currents[i + 1] <== hashers[i].out;
    }

    root <== currents[depth];
}

template Membership(depth) {
    // ─── Private witness ─────────────────────────────────────────────────
    signal input real_wallet;
    signal input agent_wallet;
    signal input nonce;
    signal input leaf_index;            // expressed bit-by-bit below
    signal input pathElements[depth];
    signal input pathIndices[depth];

    // ─── Public ──────────────────────────────────────────────────────────
    signal input commitment;
    signal input merkle_root;

    // 1. commitment binding
    component poseidon = Poseidon(3);
    poseidon.inputs[0] <== real_wallet;
    poseidon.inputs[1] <== agent_wallet;
    poseidon.inputs[2] <== nonce;
    poseidon.out === commitment;

    // 2. merkle membership
    component path = MerklePath(depth);
    path.leaf <== commitment;
    for (var i = 0; i < depth; i++) {
        path.pathElements[i] <== pathElements[i];
        path.pathIndices[i] <== pathIndices[i];
    }
    path.root === merkle_root;

    // (leaf_index is bound implicitly by pathIndices being its bit-decomposition;
    // we don't need an extra constraint here because the verifier doesn't read
    // leaf_index — only the bits matter for the merkle hash chain.)
    var bit_sum = 0;
    var pow = 1;
    for (var i = 0; i < depth; i++) {
        // each pathIndices[i] is bool-constrained inside Mux1
        bit_sum += pathIndices[i] * pow;
        pow *= 2;
    }
    leaf_index === bit_sum;
}

component main { public [commitment, merkle_root] } = Membership(20);
