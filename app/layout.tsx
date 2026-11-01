import type { Metadata, Viewport } from "next";
import "./globals.css";

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : "http://localhost:3000");

export const metadata: Metadata = {
  metadataBase: new URL(SITE),
  title: "Afrobeats King",
  description: "Run a record label in Lagos. Sign artists, drop singles, chase the trend and grow from a bedroom studio to a continental label. Free in your browser.",
  applicationName: "Afrobeats King",
  openGraph: { title: "Afrobeats King", description: "From bedroom studio to continental label. Can you run Lagos music?", type: "website" },
};

export const viewport: Viewport = { themeColor: "#120a1f", width: "device-width", initialScale: 1, viewportFit: "cover" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full">{children}</body>
    </html>
  );
}
