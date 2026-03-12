import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { BarChart3, Globe2, PackageSearch } from "lucide-react";
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
    <html lang="en">
      <body className={`${inter.variable} antialiased`}>
        <div className="grid min-h-screen grid-cols-1 bg-background text-foreground lg:grid-cols-[264px_1fr]">
          <aside className="border-b border-sidebar-border bg-sidebar-background lg:border-r lg:border-b-0">
            <div className="flex h-full flex-col p-5">
              <div className="mb-8 flex items-center gap-3">
                <div className="inline-flex size-10 items-center justify-center rounded-xl bg-sidebar-primary text-sidebar-primary-foreground shadow-md shadow-primary/20">
                  <Globe2 className="size-5" />
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Platform</p>
                  <h1 className="text-lg font-semibold tracking-tight">Trade Intel</h1>
                </div>
              </div>
              <nav className="space-y-2">
                <div className="flex items-center gap-2 rounded-lg bg-sidebar-accent px-3 py-2 text-sm font-medium text-sidebar-accent-foreground">
                  <BarChart3 className="size-4" />
                  Overview
                </div>
                <div className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-sidebar-foreground/75">
                  <PackageSearch className="size-4" />
                  Orders
                </div>
              </nav>
            </div>
          </aside>
          <div className="flex min-h-screen flex-col">
            <header className="sticky top-0 z-10 border-b border-border/80 bg-background/90 px-5 py-3 backdrop-blur-sm">
              <div className="mx-auto flex w-full max-w-7xl items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Export Order Management</p>
                  <p className="text-xs text-muted-foreground">Operational clarity for global teams</p>
                </div>
                <div className="inline-flex items-center rounded-full bg-accent px-3 py-1 text-xs font-medium text-accent-foreground">
                  Live System
                </div>
              </div>
            </header>
            <main className="flex-1 p-5 lg:p-8">
              <div className="mx-auto w-full max-w-7xl">{children}</div>
            </main>
          </div>
        </div>
      </body>
    </html>
  );
}
