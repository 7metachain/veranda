/**
 * Thin Anchor client wrapper. Loads the IDL emitted by `anchor build`
 * (target/idl/veranda_escrow.json) and exposes the few instruction
 * helpers the frontend actually needs.
 *
 * NOTE: at scaffold time `target/idl/veranda_escrow.json` doesn't exist yet
 * — `anchor build` produces it. We import lazily so the type-check still
 * succeeds before the first build.
 */

import {
  PROGRAM_ID_ESCROW,
  connection,
  USDC_MINT,
} from "./solana";
import { PublicKey } from "@solana/web3.js";

export async function signRequestDisclosureTx(args: {
  candidateIndex: number;
  candidateAgentWallet: string;
}): Promise<string> {
  // TODO: load IDL via dynamic import once `anchor build` has produced it,
  // build the `request_disclosure` instruction with the merkle proof
  // fetched from /candidates, send via the user's Privy embedded wallet.
  console.log("request_disclosure", args, {
    program: PROGRAM_ID_ESCROW,
    rpc: connection.rpcEndpoint,
    usdcMint: USDC_MINT,
  });
  return "DEV_TX_SIGNATURE_PLACEHOLDER";
}

export function userPda(realWallet: PublicKey): PublicKey {
  const [pda] = PublicKey.findProgramAddressSync(
    [Buffer.from("user"), realWallet.toBuffer()],
    new PublicKey(PROGRAM_ID_ESCROW),
  );
  return pda;
}

export function agentPda(agentWallet: PublicKey): PublicKey {
  const [pda] = PublicKey.findProgramAddressSync(
    [Buffer.from("agent"), agentWallet.toBuffer()],
    new PublicKey(PROGRAM_ID_ESCROW),
  );
  return pda;
}

export function treasuryPda(): PublicKey {
  const [pda] = PublicKey.findProgramAddressSync(
    [Buffer.from("treasury")],
    new PublicKey(PROGRAM_ID_ESCROW),
  );
  return pda;
}
