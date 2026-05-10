"use client";

import dynamic from "next/dynamic";

// Privy pulls in @privy-io/react-auth, which transitively requires
// @react-native-async-storage and react-native. With pnpm + Next.js 14
// the SSR vendor-chunk resolver chokes on those paths. Lazy-loading the
// inner provider with ssr:false keeps SSR completely Privy-free.
const PrivyProviderInner = dynamic(() => import("./PrivyProviderInner"), {
  ssr: false,
  loading: () => null,
});

export function PrivyProviderWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  const appId = process.env.NEXT_PUBLIC_PRIVY_APP_ID;

  // Without an app id (or during the very first SSR pass) just render the
  // tree without Privy — pages still work in dev mode without auth.
  if (!appId) return <>{children}</>;

  return <PrivyProviderInner appId={appId}>{children}</PrivyProviderInner>;
}
