import type { Metadata } from "next";
import "./globals.css";
import { PrivyProviderWrapper } from "@/components/PrivyProviderWrapper";
import { ThemeProvider, themeBootstrapScript } from "@/components/ThemeProvider";
import { FloatingThemeToggle } from "@/components/FloatingThemeToggle";

export const metadata: Metadata = {
  title: "Veranda · Match through your agent",
  description:
    "Privacy-preserving dating on Solana. Your AI agent meets 30,000 others. You only reveal who they are when you decide to.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Set data-theme on <html> before React hydrates to avoid FOUC. */}
        <script
          dangerouslySetInnerHTML={{ __html: themeBootstrapScript }}
        />
      </head>
      <body className="font-mono min-h-screen bg-pixel-bg text-pixel-text crt-scan">
        <ThemeProvider>
          <PrivyProviderWrapper>{children}</PrivyProviderWrapper>
          <FloatingThemeToggle />
        </ThemeProvider>
      </body>
    </html>
  );
}
