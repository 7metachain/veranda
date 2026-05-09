/**
 * Client-side commitment construction & Groth16 proof generation.
 *
 *   commitment = poseidon(real_wallet, agent_wallet, nonce)
 *
 * `circomlibjs.poseidon` returns a `bigint`; we serialize as 32-byte BE so it
 * lines up with how the on-chain verifier reads its public input.
 */

import { buildPoseidon } from "circomlibjs";

let poseidonCache: any = null;
async function poseidon() {
  if (!poseidonCache) poseidonCache = await buildPoseidon();
  return poseidonCache;
}

export async function buildCommitment(
  realWallet: Uint8Array,
  agentWallet: Uint8Array,
  nonce: Uint8Array,
): Promise<Uint8Array> {
  const p = await poseidon();
  const out = p([realWallet, agentWallet, nonce]);
  return p.F.fromMontgomery
    ? Uint8Array.from(p.F.fromMontgomery(out))
    : Uint8Array.from(out);
}

export function randomNonce(): Uint8Array {
  const buf = new Uint8Array(32);
  crypto.getRandomValues(buf);
  return buf;
}

export async function proveMembership(_args: {
  realWallet: Uint8Array;
  agentWallet: Uint8Array;
  nonce: Uint8Array;
  leafIndex: number;
  pathElements: Uint8Array[];
}): Promise<{ proof: Uint8Array; publicSignals: string[] }> {
  // TODO: dynamic import('snarkjs') and call groth16.fullProve once the
  // circuit's wasm + zkey have been compiled into `circuits/build/`. We
  // load them via fetch from /public so the bundle stays small.
  return { proof: new Uint8Array(192), publicSignals: [] };
}
