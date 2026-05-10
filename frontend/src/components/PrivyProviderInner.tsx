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
        loginMethods: ["wallet", "email", "google"],
        appearance: {
          theme: "light",
          accentColor: "#0E0B16",
          showWalletLoginFirst: true,
          walletChainType: "solana-only",
          walletList: [
            "detected_solana_wallets",
            "phantom",
            "wallet_connect",
          ],
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
