import type { Metadata, Viewport } from "next";
import { Reddit_Sans } from "next/font/google";
import "./globals.css";

const reddit = Reddit_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-reddit",
  display: "swap",
});

export const metadata: Metadata = {
  title: { default: "Triio", template: "%s · Triio" },
  description: "Tap-to-review and tap-to-connect NFC cards for local businesses.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#111827",
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={reddit.variable}>
      <body className="min-h-dvh bg-surface text-ink antialiased">{children}</body>
    </html>
  );
}
