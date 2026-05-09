#!/usr/bin/env bash
# Deploy both Anchor programs to devnet, register the rollup with MagicBlock,
# and initialize the platform treasury.
set -euo pipefail

cd "$(dirname "$0")/.."

solana config set --url https://api.devnet.solana.com >/dev/null
solana airdrop 2 || true

echo "▶ anchor build"
anchor build

echo "▶ anchor deploy (devnet)"
anchor deploy --provider.cluster devnet

echo "▶ Registering rollup program with MagicBlock"
ROLLUP_KEYPAIR="target/deploy/veranda_rollup-keypair.json"
if command -v ephemeral-rollup-cli >/dev/null 2>&1; then
  ephemeral-rollup-cli register \
    --program-id "$(solana address -k "$ROLLUP_KEYPAIR")"
else
  echo "  (ephemeral-rollup-cli not installed; skipping registration)"
fi

echo "▶ Initialising platform treasury"
if command -v anchor >/dev/null 2>&1; then
  anchor run init-treasury || \
    echo "  (init-treasury script missing or failed; run manually)"
fi

echo "✅ Veranda deployed to devnet"
solana address -k target/deploy/veranda_escrow-keypair.json | xargs -I{} \
  echo "   escrow program: {}"
solana address -k target/deploy/veranda_rollup-keypair.json | xargs -I{} \
  echo "   rollup program: {}"
