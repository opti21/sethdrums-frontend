import type { Metadata } from "next";
import { Inter, Orbitron } from "next/font/google";
import Script from "next/script";
import { Toaster } from "sonner";
import { Nav } from "@/components/nav";
import { Konami } from "@/components/konami";
import { SessionProvider } from "@/components/session";
import { getSession } from "@/lib/server/session";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const display = Orbitron({ subsets: ["latin"], variable: "--font-display", weight: ["600", "700", "800"] });

export const metadata: Metadata = {
  metadataBase: new URL("https://sethdrums.com"),
  title: { default: "SethDrums Song Panel", template: "%s · SethDrums Song Panel" },
  description: "Suggest a song for SethDrums' stream.",
  openGraph: {
    title: "SethDrums Song Panel",
    siteName: "SethDrums Song Panel",
    description: "Song Panel to suggest a song for SethDrums' stream.",
    images: ["/SethDrums_Twitter_2022-min.jpg"],
  },
  twitter: { card: "summary_large_image", creator: "@imSethDrums", images: ["/SethDrums_Twitter_2022-min.jpg"] },
};

export const dynamic = "force-dynamic";

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  return (
    <html lang="en" className={`${inter.variable} ${display.variable}`}>
      <body className="font-sans antialiased">
        <SessionProvider value={session}>
          <Nav />
          <main className="mx-auto max-w-7xl px-4 py-6 sm:py-8">{children}</main>
          <footer className="mx-auto flex max-w-7xl flex-wrap gap-4 px-4 pb-10 text-xs text-ink-400">
            <a href="/privacy-policy" className="hover:text-ink-100">Privacy</a>
            <a href="/terms-conditions" className="hover:text-ink-100">Terms</a>
            <a href="/merch" className="hover:text-ink-100">Merch</a>
          </footer>
          <Konami />
          <Toaster theme="dark" position="bottom-left" richColors closeButton />
        </SessionProvider>
        <Script defer data-domain="sethdrums.com" src="https://plausible.io/js/script.js" strategy="afterInteractive" />
      </body>
    </html>
  );
}
