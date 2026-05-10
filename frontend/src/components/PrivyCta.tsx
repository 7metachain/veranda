"use client";

import Link from "next/link";
import { usePrivy } from "@privy-io/react-auth";
import { PixelButton } from "./pixel/PixelUI";

export default function PrivyCta() {
  const { ready, authenticated, login } = usePrivy();
  if (!ready) return <PixelButton disabled>Loading…</PixelButton>;
  if (!authenticated) {
    return <PixelButton onClick={login}>▶ Begin</PixelButton>;
  }
  return (
    <Link href="/onboarding">
      <PixelButton>▶ Continue onboarding</PixelButton>
    </Link>
  );
}
