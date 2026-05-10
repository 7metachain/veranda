"use client";

import Link from "next/link";
import { usePrivy } from "@privy-io/react-auth";
import { PixelButton } from "./pixel/PixelUI";

export default function PrivyCta() {
  const { ready, authenticated, login, logout } = usePrivy();
  if (!ready) return <PixelButton disabled>Loading…</PixelButton>;
  if (!authenticated) {
    return (
      <PixelButton onClick={() => login({ loginMethods: ["wallet"] })}>
        ▶ Connect wallet
      </PixelButton>
    );
  }
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Link href="/onboarding">
        <PixelButton>▶ Continue onboarding</PixelButton>
      </Link>
      <PixelButton variant="ghost" onClick={logout}>
        Log out
      </PixelButton>
    </div>
  );
}
