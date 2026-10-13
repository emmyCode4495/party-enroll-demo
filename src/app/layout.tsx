import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque, Instrument_Sans, Geist_Mono } from "next/font/google";
import "./globals.css";

const display = Bricolage_Grotesque({
  variable: "--f-display",
  subsets: ["latin"],
  weight: ["500", "600", "700", "800"],
});

const body = Instrument_Sans({
  variable: "--f-body",
  subsets: ["latin"],
});

const mono = Geist_Mono({
  variable: "--f-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Unity Party — Become a member",
  description:
    "Join Unity Party in four short steps. Your face is matched to your ID on your own device, and your membership card is issued instantly.",
};

export const viewport: Viewport = {
  themeColor: "#08382b",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${display.variable} ${body.variable} ${mono.variable} h-full`}>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
