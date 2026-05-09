#!/usr/bin/env bash
# Run a single-circuit Groth16 trusted setup using snarkjs.
# For PRODUCTION: use a multi-party ceremony; this script is dev-only.
set -euo pipefail

cd "$(dirname "$0")/.."
mkdir -p build ptau

PTAU_FILE="ptau/pot15_final.ptau"
if [ ! -f "$PTAU_FILE" ]; then
  echo "▶ Downloading powers-of-tau (15 — supports up to 32k constraints)"
  curl -L -o "$PTAU_FILE" \
    https://hermez.s3-eu-west-1.amazonaws.com/powersOfTau28_hez_final_15.ptau
fi

for circuit in membership; do
  R1CS="build/${circuit}.r1cs"
  ZKEY_0="build/${circuit}_0000.zkey"
  ZKEY_1="build/${circuit}_final.zkey"
  VKEY="build/${circuit}_vkey.json"

  echo "▶ Phase-2 setup for ${circuit}"
  npx snarkjs groth16 setup "$R1CS" "$PTAU_FILE" "$ZKEY_0"
  npx snarkjs zkey contribute "$ZKEY_0" "$ZKEY_1" \
    --name="veranda-dev-contribution" -v -e="random entropy"
  npx snarkjs zkey export verificationkey "$ZKEY_1" "$VKEY"
done

echo "✅ trusted setup done (DEV-ONLY); verification keys in circuits/build/"
