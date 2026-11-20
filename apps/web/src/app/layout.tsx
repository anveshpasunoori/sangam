import type { Metadata, Viewport } from "next";
import "./globals.css";
import { StoreProvider } from "@/lib/store";
import { UIProvider } from "@/components/UIProvider";
import { AppShell } from "@/components/AppShell";

export const metadata: Metadata = {
  title: "Sangam",
  description: "Connect. Create. Belong. Be Heard. A trust-first social and civic network for India.",
  icons: { icon: "/icon.svg" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#F8FAFC" },
    { media: "(prefers-color-scheme: dark)", color: "#0F172A" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Anek+Latin:wght@500;600;700&family=Anek+Devanagari:wght@400;600&family=Anek+Telugu:wght@400;600&family=Hind:wght@400;500;600&display=swap"
        />
      </head>
      <body>
        <StoreProvider>
          <UIProvider>
            <AppShell>{children}</AppShell>
          </UIProvider>
        </StoreProvider>
      </body>
    </html>
  );
}
