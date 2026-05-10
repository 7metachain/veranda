"use client";

import { usePrivy, useWallets } from "@privy-io/react-auth";
import { PixelButton } from "./pixel/PixelUI";

type WalletConnectButtonInnerProps = {
  compact?: boolean;
  showSignOut?: boolean;
  className?: string;
};

type SolanaLinkedWallet = {
  type: "wallet";
  chainType: "solana";
  address: string;
};

function shortAddress(address: string) {
  return `${address.slice(0, 4)}...${address.slice(-4)}`;
}

function isSolanaLinkedWallet(account: unknown): account is SolanaLinkedWallet {
  return (
    typeof account === "object" &&
    account !== null &&
    "type" in account &&
    "chainType" in account &&
    "address" in account &&
    account.type === "wallet" &&
    account.chainType === "solana" &&
    typeof account.address === "string"
  );
}

export default function WalletConnectButtonInner({
  compact = false,
  showSignOut = false,
  className = "",
}: WalletConnectButtonInnerProps) {
  const {
    ready: authReady,
    authenticated,
    login,
    logout,
    connectWallet,
    user,
  } = usePrivy();
  const { ready: walletsReady, wallets } = useWallets();
  const ready = authReady && walletsReady;
  const wallet = wallets.find((item) => item.walletClientType === "privy") ?? wallets[0];
  const linkedSolanaWallet = (user?.linkedAccounts as unknown[] | undefined)?.find(
    isSolanaLinkedWallet,
  );
  const address =
    wallet?.address ??
    linkedSolanaWallet?.address ??
    null;

  if (!ready) {
    return (
      <PixelButton disabled className={className}>
        Loading...
      </PixelButton>
    );
  }

  if (!authenticated) {
    return (
      <PixelButton onClick={login} className={className}>
        {compact ? "Connect" : "Connect wallet"}
      </PixelButton>
    );
  }

  if (!address) {
    return (
      <PixelButton onClick={connectWallet} className={className}>
        {compact ? "Add wallet" : "Add Solana wallet"}
      </PixelButton>
    );
  }

  return (
    <div className={`flex flex-wrap items-center gap-2 ${className}`}>
      <span className="font-mono text-[10px] tracking-[0.18em] uppercase text-pixel-green border border-pixel-green/40 bg-pixel-green/10 rounded px-3 py-2">
        {compact ? shortAddress(address) : `Connected · ${shortAddress(address)}`}
      </span>
      <PixelButton variant="ghost" onClick={connectWallet}>
        Switch
      </PixelButton>
      {showSignOut && (
        <PixelButton variant="ghost" onClick={logout}>
          Sign out
        </PixelButton>
      )}
    </div>
  );
}
