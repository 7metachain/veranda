/**
 * Client-side BIP32 derivation of the user's anonymous agent wallet.
 *
 * The user enters a passphrase ONCE; we derive a deterministic Solana
 * keypair from it via the BIP44 path m/44'/501'/0'/0' — same path Solana
 * uses by convention. The seed never leaves the browser and never gets
 * sent to the server.
 *
 * For the scaffold we cache the derived keypair in localStorage. Production
 * would gate this behind a dedicated <PassphraseModal /> on first onboarding
 * step, encrypt with a session-only AES-GCM key, and persist in IndexedDB.
 */

import { HDKey } from "@scure/bip32";
import { mnemonicToSeedSync } from "@scure/bip39";
import { Keypair } from "@solana/web3.js";

// Two keys:
//   - the JSON blob (pubkey + secretKey) lives under STORAGE_KEY_JSON
//   - the bare pubkey string lives under STORAGE_KEY_PUBKEY (read by api.ts)
const STORAGE_KEY_JSON = "veranda:agent_wallet:json";
const STORAGE_KEY_PUBKEY = "veranda:agent_wallet";

const DEV_DEFAULT_PASSPHRASE = "veranda-dev-passphrase-change-in-prod";

export type AgentWallet = {
  publicKey: string;
  secretKey: Uint8Array;
};

export async function getOrCreateAgentWallet(opts?: {
  passphrase?: string;
  prompt?: boolean;
}): Promise<AgentWallet> {
  const cached = localStorage.getItem(STORAGE_KEY_JSON);
  if (cached) {
    try {
      const parsed = JSON.parse(cached);
      // Old format used to store {publicKey, secretKey: number[]}; the
      // new format stores just the publicKey alongside a separate secretKey
      // entry. Either way we accept and return.
      if (parsed.publicKey && parsed.secretKey) {
        return {
          publicKey: parsed.publicKey,
          secretKey: Uint8Array.from(parsed.secretKey),
        };
      }
    } catch {
      // fall through to re-derive
    }
  }

  let passphrase: string | null | undefined = opts?.passphrase;
  if (!passphrase && opts?.prompt && typeof window !== "undefined") {
    passphrase = window.prompt("Choose a passphrase for your agent wallet");
  }
  if (!passphrase) {
    // dev fallback — silently derive from a constant so the UI never blocks
    passphrase = DEV_DEFAULT_PASSPHRASE;
  }

  const seed = mnemonicToSeedSync(
    "abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about",
    passphrase,
  );
  const root = HDKey.fromMasterSeed(seed);
  const child = root.derive("m/44'/501'/0'/0'");
  if (!child.privateKey) throw new Error("derivation failed");

  const kp = Keypair.fromSeed(child.privateKey.slice(0, 32));
  const wallet = {
    publicKey: kp.publicKey.toBase58(),
    secretKey: kp.secretKey,
  };
  localStorage.setItem(
    STORAGE_KEY_JSON,
    JSON.stringify({
      publicKey: wallet.publicKey,
      secretKey: Array.from(wallet.secretKey),
    }),
  );
  // The bare pubkey string is what api.ts and other lib helpers read.
  localStorage.setItem(STORAGE_KEY_PUBKEY, wallet.publicKey);
  return wallet;
}
