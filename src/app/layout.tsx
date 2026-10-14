import type { Metadata, Viewport } from "next";
import { Lato, Geist_Mono } from "next/font/google";
import "./globals.css";

// Lato Light is the brand font; 700 is loaded only so bold labels render true bold instead of faux bold.
const body = Lato({
  variable: "--f-body",
  subsets: ["latin"],
  weight: ["300", "700"],
});

const mono = Geist_Mono({
  variable: "--f-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "New Patriotic Party — Become a member",
  description:
    "Join the New Patriotic Party in four short steps. Your face is matched to your ID on your own device, and your membership card is issued instantly.",
};

export const viewport: Viewport = {
  themeColor: "#0b3b9c",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${body.variable} ${mono.variable} h-full`}>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
