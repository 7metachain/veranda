import type { Metadata } from "next";
import "./globals.css";
import { PrivyProviderWrapper } from "@/components/PrivyProviderWrapper";

export const metadata: Metadata = {
  title: "Veranda",
  description: "Match through your agent. Reveal on your terms.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="font-body min-h-screen">
        <PrivyProviderWrapper>{children}</PrivyProviderWrapper>
      </body>
    </html>
  );
}
