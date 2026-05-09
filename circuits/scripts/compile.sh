#!/usr/bin/env bash
# Compile circom circuits to r1cs / wasm / sym
set -euo pipefail

cd "$(dirname "$0")/.."
mkdir -p build

for circuit in membership compatibility; do
  echo "▶ Compiling ${circuit}.circom"
  circom "${circuit}.circom" \
    --r1cs --wasm --sym \
    -o build \
    -l node_modules
done

echo "✅ circuits compiled to circuits/build/"
