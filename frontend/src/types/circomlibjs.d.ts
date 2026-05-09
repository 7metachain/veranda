declare module "circomlibjs" {
  export function buildPoseidon(): Promise<{
    (inputs: Array<bigint | number | Uint8Array>): Uint8Array | bigint;
    F: {
      fromMontgomery?: (b: Uint8Array | bigint) => Uint8Array;
      toObject?: (b: any) => bigint;
    };
  }>;
}

declare module "snarkjs" {
  export const groth16: {
    fullProve(
      input: Record<string, unknown>,
      wasm: string | Uint8Array,
      zkey: string | Uint8Array,
    ): Promise<{ proof: any; publicSignals: string[] }>;
    verify(
      vKey: any,
      publicSignals: string[],
      proof: any,
    ): Promise<boolean>;
  };
}
