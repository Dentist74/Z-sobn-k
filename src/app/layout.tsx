import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin", "latin-ext"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin", "latin-ext"],
});

export const metadata: Metadata = {
  title: "Svět úsměvů – Zásobník",
  description: "Zásobník – skladový systém zubní kliniky Svět úsměvů",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, title: "Zásobník", statusBarStyle: "default" },
  icons: { icon: "/brand-logo.png", apple: "/brand-logo.png" },
};

export const viewport: Viewport = {
  themeColor: "#103D63",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="cs"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-slate-50">
        {children}
        <Toaster richColors position="top-right" />
      </body>
    </html>
  );
}
