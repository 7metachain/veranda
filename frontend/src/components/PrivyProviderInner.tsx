"use client";

import { PrivyProvider } from "@privy-io/react-auth";
import { toSolanaWalletConnectors } from "@privy-io/react-auth/solana";

export default function PrivyProviderInner({
  appId,
  children,
}: {
  appId: string;
  children: React.ReactNode;
}) {
  return (
    <PrivyProvider
      appId={appId}
      config={{
        embeddedWallets: { createOnLogin: "users-without-wallets" },
        loginMethods: ["email", "google"],
        appearance: {
          theme: "light",
          accentColor: "#0E0B16",
        },
        externalWallets: {
          solana: { connectors: toSolanaWalletConnectors() },
        },
      }}
    >
      {children}
    </PrivyProvider>
  );
}
