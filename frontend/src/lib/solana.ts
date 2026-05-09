import { Connection, clusterApiUrl } from "@solana/web3.js";

export const RPC =
  process.env.NEXT_PUBLIC_SOLANA_RPC ?? clusterApiUrl("devnet");

export const connection = new Connection(RPC, "confirmed");

export const PROGRAM_ID_ESCROW =
  process.env.NEXT_PUBLIC_PROGRAM_ID_ESCROW ??
  "kH4G28phYLsi8FsJouSLBUbNhyxDeXVmvVYZ1GuZgUc";

export const USDC_MINT =
  process.env.NEXT_PUBLIC_USDC_MINT ??
  "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU";
