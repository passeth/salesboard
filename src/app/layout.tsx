import { AgentationWrapper } from "@/components/agentation-wrapper";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter"
});

export const metadata: Metadata = {
  title: "Trade Intel",
  description: "B2B export order management platform"
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body suppressHydrationWarning className={`${inter.variable} min-h-screen bg-background text-foreground antialiased`}>
        {children}
        <AgentationWrapper />
      </body>
    </html>
  );
}
